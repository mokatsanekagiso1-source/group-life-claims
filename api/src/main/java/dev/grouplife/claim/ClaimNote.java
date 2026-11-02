package dev.grouplife.claim;

import dev.grouplife.security.Role;
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

/** A message on a claim. Internal notes are between staff and never shown to the member. */
@Entity
@Table(name = "claim_note")
public class ClaimNote {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "claim_id")
    private Claim claim;

    private String author;

    @Enumerated(EnumType.STRING)
    private Role authorRole;

    private String body;
    private boolean internal;
    private Instant createdAt;

    protected ClaimNote() {}

    public ClaimNote(Claim claim, String author, Role authorRole, String body, boolean internal, Instant createdAt) {
        this.claim = claim;
        this.author = author;
        this.authorRole = authorRole;
        this.body = body;
        this.internal = internal;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public String getAuthor() {
        return author;
    }

    public Role getAuthorRole() {
        return authorRole;
    }

    public String getBody() {
        return body;
    }

    public boolean isInternal() {
        return internal;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
