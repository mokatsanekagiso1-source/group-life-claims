package dev.grouplife.member;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface MemberRepository extends JpaRepository<Member, UUID>, JpaSpecificationExecutor<Member> {

    long countByPolicyId(UUID policyId);

    long countByStatus(MemberStatus status);

    boolean existsByPolicyIdAndEmployeeNumber(UUID policyId, String employeeNumber);

    List<Member> findByPolicyIdOrderByLastNameAscFirstNameAsc(UUID policyId);

    static Specification<Member> inPolicy(UUID policyId) {
        return (root, query, cb) -> policyId == null ? null : cb.equal(root.get("policy").get("id"), policyId);
    }

    static Specification<Member> withStatus(MemberStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    /** Case-insensitive match on first name, last name, employee number or email. */
    static Specification<Member> matching(String search) {
        return (root, query, cb) -> {
            if (search == null || search.isBlank()) {
                return null;
            }
            String pattern = "%" + search.trim().toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("firstName")), pattern),
                    cb.like(cb.lower(root.get("lastName")), pattern),
                    cb.like(cb.lower(root.get("employeeNumber")), pattern),
                    cb.like(cb.lower(root.get("email")), pattern));
        };
    }
}
