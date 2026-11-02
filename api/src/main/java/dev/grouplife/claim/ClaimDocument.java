package dev.grouplife.claim;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Supporting evidence for a claim. The bytes live in the same row; listings use
 * {@link ClaimDocumentRepository.DocumentInfo} so they never load content.
 */
@Entity
@Table(name = "claim_document")
public class ClaimDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "claim_id")
    private Claim claim;

    private String fileName;
    private String contentType;
    private long sizeBytes;

    @Enumerated(EnumType.STRING)
    private DocumentCategory category;

    @Column(name = "content")
    private byte[] content;

    private String uploadedBy;
    private Instant uploadedAt;

    protected ClaimDocument() {}

    public ClaimDocument(Claim claim, String fileName, String contentType, DocumentCategory category, byte[] content,
            String uploadedBy, Instant uploadedAt) {
        this.claim = claim;
        this.fileName = fileName;
        this.contentType = contentType;
        this.category = category;
        this.content = content;
        this.sizeBytes = content.length;
        this.uploadedBy = uploadedBy;
        this.uploadedAt = uploadedAt;
    }

    public UUID getId() {
        return id;
    }

    public Claim getClaim() {
        return claim;
    }

    public String getFileName() {
        return fileName;
    }

    public String getContentType() {
        return contentType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public DocumentCategory getCategory() {
        return category;
    }

    public byte[] getContent() {
        return content;
    }

    public String getUploadedBy() {
        return uploadedBy;
    }

    public Instant getUploadedAt() {
        return uploadedAt;
    }
}
