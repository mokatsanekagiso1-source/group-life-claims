package dev.grouplife.claim;

import dev.grouplife.security.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

/** Notes and documents attached to a claim. */
public final class CollaborationDtos {

    private CollaborationDtos() {}

    public record AddNoteRequest(@NotBlank @Size(max = 4000) String body, boolean internal) {}

    public record NoteView(UUID id, String author, Role authorRole, String body, boolean internal, Instant createdAt) {}

    public record DocumentView(UUID id, String fileName, String contentType, long sizeBytes, DocumentCategory category,
            String uploadedBy, Instant uploadedAt) {}
}
