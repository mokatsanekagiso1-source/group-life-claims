package dev.grouplife.notification;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** An in-app message for one user, such as "your claim was approved". */
@Entity
@Table(name = "notification")
public class Notification {

    public enum Type {
        CLAIM_SUBMITTED,
        CLAIM_STATUS_CHANGED,
        CLAIM_WITHDRAWN,
        NOTE_ADDED,
        DOCUMENT_ADDED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String recipient;

    @Enumerated(EnumType.STRING)
    private Type type;

    private String title;
    private String body;

    /** App route to open, for example {@code /claims/<id>}. */
    private String link;

    private Instant readAt;
    private Instant createdAt;

    protected Notification() {}

    public Notification(String recipient, Type type, String title, String body, String link, Instant createdAt) {
        this.recipient = recipient;
        this.type = type;
        this.title = title;
        this.body = body;
        this.link = link;
        this.createdAt = createdAt;
    }

    public void markRead(Instant at) {
        if (readAt == null) {
            readAt = at;
        }
    }

    public UUID getId() {
        return id;
    }

    public String getRecipient() {
        return recipient;
    }

    public Type getType() {
        return type;
    }

    public String getTitle() {
        return title;
    }

    public String getBody() {
        return body;
    }

    public String getLink() {
        return link;
    }

    public Instant getReadAt() {
        return readAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
