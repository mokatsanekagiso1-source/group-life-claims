package dev.grouplife.claim;

import dev.grouplife.claim.CollaborationDtos.AddNoteRequest;
import dev.grouplife.claim.CollaborationDtos.DocumentView;
import dev.grouplife.claim.CollaborationDtos.NoteView;
import dev.grouplife.common.error.BusinessRuleException;
import dev.grouplife.common.error.NotFoundException;
import dev.grouplife.notification.NotificationService;
import dev.grouplife.security.CurrentUser;
import dev.grouplife.security.Role;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The conversation and evidence around a claim. Members and the assessors working a claim may
 * write; admins read. Members never see internal notes.
 */
@Service
@Transactional
public class ClaimCollaborationService {

    static final long MAX_DOCUMENT_BYTES = 5L * 1024 * 1024;
    private static final int MAX_DOCUMENTS_PER_CLAIM = 20;
    private static final int PREVIEW_LENGTH = 140;

    private final ClaimService claimService;
    private final ClaimNoteRepository notes;
    private final ClaimDocumentRepository documents;
    private final NotificationService notifications;
    private final Clock clock;

    public ClaimCollaborationService(ClaimService claimService, ClaimNoteRepository notes,
            ClaimDocumentRepository documents, NotificationService notifications, Clock clock) {
        this.claimService = claimService;
        this.notes = notes;
        this.documents = documents;
        this.notifications = notifications;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<NoteView> notes(UUID claimId, CurrentUser user) {
        Claim claim = claimService.findVisibleTo(claimId, user);
        List<ClaimNote> visible = user.is(Role.MEMBER)
                ? notes.findByClaimIdAndInternalFalseOrderByCreatedAtAsc(claim.getId())
                : notes.findByClaimIdOrderByCreatedAtAsc(claim.getId());
        return visible.stream().map(ClaimCollaborationService::toView).toList();
    }

    public NoteView addNote(UUID claimId, AddNoteRequest request, CurrentUser user) {
        Claim claim = claimService.findVisibleTo(claimId, user);
        requireWriter(user);
        boolean internal = request.internal() && user.is(Role.ASSESSOR);
        if (request.internal() && !internal) {
            throw new AccessDeniedException("Only assessors can write internal notes");
        }
        String body = request.body().trim();
        ClaimNote note = notes.save(new ClaimNote(claim, user.username(), user.role(), body, internal, clock.instant()));
        notifications.noteAdded(claim.getId(), claim.getClaimNumber(), claim.getMember().getId(), claim.getAssignee(),
                user.username(), user.is(Role.MEMBER), internal, preview(body));
        return toView(note);
    }

    @Transactional(readOnly = true)
    public List<DocumentView> documents(UUID claimId, CurrentUser user) {
        Claim claim = claimService.findVisibleTo(claimId, user);
        return documents.findByClaimIdOrderByUploadedAtAsc(claim.getId()).stream()
                .map(d -> new DocumentView(d.getId(), d.getFileName(), d.getContentType(), d.getSizeBytes(),
                        d.getCategory(), d.getUploadedBy(), d.getUploadedAt()))
                .toList();
    }

    public DocumentView upload(UUID claimId, String fileName, DocumentCategory category, byte[] content,
            CurrentUser user) {
        Claim claim = claimService.findVisibleTo(claimId, user);
        requireWriter(user);
        if (!claim.isOpen()) {
            throw new BusinessRuleException("CLAIM_CLOSED", "Documents cannot be added to a closed claim");
        }
        if (content.length == 0) {
            throw new BusinessRuleException("EMPTY_DOCUMENT", "The file is empty");
        }
        if (content.length > MAX_DOCUMENT_BYTES) {
            throw new BusinessRuleException("DOCUMENT_TOO_LARGE", "Documents may be at most 5 MB");
        }
        if (documents.countByClaimId(claim.getId()) >= MAX_DOCUMENTS_PER_CLAIM) {
            throw new BusinessRuleException("TOO_MANY_DOCUMENTS",
                    "A claim can have at most %d documents".formatted(MAX_DOCUMENTS_PER_CLAIM));
        }
        String contentType = FileSignature.detect(content).orElseThrow(() -> new BusinessRuleException(
                "UNSUPPORTED_DOCUMENT", "Only PDF, PNG and JPEG files are accepted"));

        ClaimDocument document = documents.save(new ClaimDocument(claim, safeFileName(fileName), contentType,
                category, content, user.username(), clock.instant()));
        if (user.is(Role.MEMBER)) {
            notifications.documentAdded(claim.getId(), claim.getClaimNumber(), claim.getAssignee(), user.username(),
                    document.getFileName());
        }
        return new DocumentView(document.getId(), document.getFileName(), document.getContentType(),
                document.getSizeBytes(), document.getCategory(), document.getUploadedBy(), document.getUploadedAt());
    }

    @Transactional(readOnly = true)
    public ClaimDocument download(UUID claimId, UUID documentId, CurrentUser user) {
        Claim claim = claimService.findVisibleTo(claimId, user);
        ClaimDocument document = documents.findById(documentId)
                .filter(d -> d.getClaim().getId().equals(claim.getId()))
                .orElseThrow(() -> new NotFoundException("Document", documentId));
        // Touch the content inside the transaction; the controller writes it after it ends.
        document.getContent();
        return document;
    }

    private static void requireWriter(CurrentUser user) {
        if (user.is(Role.ADMIN)) {
            throw new AccessDeniedException("Admins have read-only access to claims");
        }
    }

    /** Keeps only the last path segment and drops characters that could break a download header. */
    static String safeFileName(String fileName) {
        String name = fileName == null ? "" : fileName.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}\"]", "").trim();
        if (name.isEmpty()) {
            return "document";
        }
        return name.length() > 255 ? name.substring(name.length() - 255) : name;
    }

    private static String preview(String body) {
        return body.length() <= PREVIEW_LENGTH ? body : body.substring(0, PREVIEW_LENGTH - 1) + "…";
    }

    private static NoteView toView(ClaimNote note) {
        return new NoteView(note.getId(), note.getAuthor(), note.getAuthorRole(), note.getBody(), note.isInternal(),
                note.getCreatedAt());
    }
}
