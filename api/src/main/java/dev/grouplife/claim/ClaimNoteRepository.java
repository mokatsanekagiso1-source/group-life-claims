package dev.grouplife.claim;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClaimNoteRepository extends JpaRepository<ClaimNote, UUID> {

    List<ClaimNote> findByClaimIdOrderByCreatedAtAsc(UUID claimId);

    List<ClaimNote> findByClaimIdAndInternalFalseOrderByCreatedAtAsc(UUID claimId);
}
