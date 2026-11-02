package dev.grouplife.claim;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClaimTransitionRepository extends JpaRepository<ClaimTransition, UUID> {

    @EntityGraph(attributePaths = {"claim", "claim.member"})
    Page<ClaimTransition> findAllByOrderByOccurredAtDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"claim", "claim.member"})
    List<ClaimTransition> findTop12ByOrderByOccurredAtDesc();
}
