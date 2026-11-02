package dev.grouplife.claim;

import dev.grouplife.policy.CoverType;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface ClaimRepository extends JpaRepository<Claim, UUID>, JpaSpecificationExecutor<Claim> {

    @Query(value = "select nextval('claim_number_seq')", nativeQuery = true)
    long nextClaimNumber();

    boolean existsByMemberIdAndCoverTypeAndStatusIn(UUID memberId, CoverType coverType,
            Collection<ClaimStatus> statuses);

    long countByStatus(ClaimStatus status);

    @Query("select c.status as status, count(c) as count from Claim c group by c.status")
    List<StatusCount> countByStatusGrouped();

    interface StatusCount {
        ClaimStatus getStatus();

        long getCount();
    }

    static Specification<Claim> withStatusIn(Collection<ClaimStatus> statuses) {
        return (root, query, cb) -> statuses == null || statuses.isEmpty() ? null : root.get("status").in(statuses);
    }

    static Specification<Claim> forMember(UUID memberId) {
        return (root, query, cb) -> memberId == null ? null : cb.equal(root.get("member").get("id"), memberId);
    }
}
