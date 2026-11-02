package dev.grouplife.policy;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PolicyRepository extends JpaRepository<Policy, UUID> {

    List<Policy> findBySchemeIdOrderByPolicyNumber(UUID schemeId);

    long countBySchemeId(UUID schemeId);

    boolean existsByPolicyNumber(String policyNumber);
}
