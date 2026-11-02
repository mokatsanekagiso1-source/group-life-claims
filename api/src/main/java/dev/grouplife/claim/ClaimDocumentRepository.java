package dev.grouplife.claim;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClaimDocumentRepository extends JpaRepository<ClaimDocument, UUID> {

    /** Metadata only: a closed projection, so the content column is never selected. */
    interface DocumentInfo {
        UUID getId();

        String getFileName();

        String getContentType();

        long getSizeBytes();

        DocumentCategory getCategory();

        String getUploadedBy();

        Instant getUploadedAt();
    }

    List<DocumentInfo> findByClaimIdOrderByUploadedAtAsc(UUID claimId);

    long countByClaimId(UUID claimId);
}
