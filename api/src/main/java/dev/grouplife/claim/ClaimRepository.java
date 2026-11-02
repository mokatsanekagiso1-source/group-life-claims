package dev.grouplife.claim;

import dev.grouplife.policy.CoverType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClaimRepository extends JpaRepository<Claim, UUID>, JpaSpecificationExecutor<Claim> {

    @Query(value = "select nextval('claim_number_seq')", nativeQuery = true)
    long nextClaimNumber();

    boolean existsByMemberIdAndCoverTypeAndStatusIn(UUID memberId, CoverType coverType,
            Collection<ClaimStatus> statuses);

    long countByStatus(ClaimStatus status);

    long countByStatusInAndAssignee(Collection<ClaimStatus> statuses, String assignee);

    long countByStatusInAndAssigneeIsNull(Collection<ClaimStatus> statuses);

    @Query("select c.status as status, count(c) as count from Claim c group by c.status")
    List<StatusCount> countByStatusGrouped();

    @Query("select coalesce(sum(c.coverAmount), 0) from Claim c where c.status = :status")
    BigDecimal sumCoverAmountByStatus(@Param("status") ClaimStatus status);

    @Query("select c.submittedAt as submittedAt, c.decidedAt as decidedAt from Claim c where c.decidedAt is not null")
    List<DecisionTiming> findDecisionTimings();

    @Query("select c.submittedAt from Claim c where c.submittedAt >= :from")
    List<Instant> findSubmissionTimesSince(@Param("from") Instant from);

    List<Claim> findTop5ByStatusInOrderBySubmittedAtAsc(Collection<ClaimStatus> statuses);

    interface StatusCount {
        ClaimStatus getStatus();

        long getCount();
    }

    interface DecisionTiming {
        Instant getSubmittedAt();

        Instant getDecidedAt();
    }

    static Specification<Claim> withStatusIn(Collection<ClaimStatus> statuses) {
        return (root, query, cb) -> statuses == null || statuses.isEmpty() ? null : root.get("status").in(statuses);
    }

    static Specification<Claim> forMember(UUID memberId) {
        return (root, query, cb) -> memberId == null ? null : cb.equal(root.get("member").get("id"), memberId);
    }

    /** A username, or {@code "none"} for claims nobody has picked up. */
    static Specification<Claim> assignedTo(String assignee) {
        return (root, query, cb) -> {
            if (assignee == null || assignee.isBlank()) {
                return null;
            }
            return "none".equalsIgnoreCase(assignee)
                    ? cb.isNull(root.get("assignee"))
                    : cb.equal(root.get("assignee"), assignee);
        };
    }

    /** Case-insensitive match on claim number or the member's first or last name. */
    static Specification<Claim> matching(String text) {
        return (root, query, cb) -> {
            if (text == null || text.isBlank()) {
                return null;
            }
            String pattern = "%" + text.trim().toLowerCase() + "%";
            var member = root.join("member");
            return cb.or(
                    cb.like(cb.lower(root.get("claimNumber")), pattern),
                    cb.like(cb.lower(member.get("firstName")), pattern),
                    cb.like(cb.lower(member.get("lastName")), pattern));
        };
    }
}
