package dev.grouplife.notification;

import dev.grouplife.claim.ClaimStatus;
import dev.grouplife.claim.ClaimTransitionedEvent;
import dev.grouplife.common.error.NotFoundException;
import dev.grouplife.notification.Notification.Type;
import dev.grouplife.notification.NotificationDtos.NotificationFeed;
import dev.grouplife.notification.NotificationDtos.NotificationView;
import dev.grouplife.security.AppUser;
import dev.grouplife.security.AppUserRepository;
import dev.grouplife.security.Role;
import java.time.Clock;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates and serves in-app notifications. Claim events are handled synchronously inside the
 * business transaction, so a notification exists if and only if the change committed.
 */
@Service
@Transactional
public class NotificationService {

    private final NotificationRepository notifications;
    private final AppUserRepository users;
    private final Clock clock;

    public NotificationService(NotificationRepository notifications, AppUserRepository users, Clock clock) {
        this.notifications = notifications;
        this.users = users;
        this.clock = clock;
    }

    @EventListener
    void on(ClaimTransitionedEvent event) {
        String link = "/claims/" + event.claimId();
        String cover = event.coverType().name().toLowerCase(Locale.ROOT);
        if (event.to() == ClaimStatus.SUBMITTED) {
            send(assessors(), event.actor(), Type.CLAIM_SUBMITTED, "New claim " + event.claimNumber(),
                    "%s submitted a %s claim.".formatted(event.memberName(), cover), link);
            return;
        }
        Set<String> memberUsers = memberUsers(event.memberId());
        if (memberUsers.contains(event.actor())) {
            // The member withdrew their own claim: tell whoever is working it.
            send(staffFor(event.assignee()), event.actor(), Type.CLAIM_WITHDRAWN,
                    event.claimNumber() + " was withdrawn",
                    reasonOr("%s withdrew their %s claim.".formatted(event.memberName(), cover), event.reason()), link);
            return;
        }
        send(memberUsers, event.actor(), Type.CLAIM_STATUS_CHANGED,
                "Claim %s: %s".formatted(event.claimNumber(), describe(event.to())),
                reasonOr(statusMessage(event.to()), event.reason()), link);
    }

    /** A note was added to a claim: tell the other side of the conversation. */
    public void noteAdded(UUID claimId, String claimNumber, UUID memberId, String assignee, String author,
            boolean fromMember, boolean internal, String preview) {
        if (internal) {
            return;
        }
        Collection<String> recipients = fromMember ? staffFor(assignee) : memberUsers(memberId);
        send(recipients, author, Type.NOTE_ADDED, "New message on " + claimNumber, preview, "/claims/" + claimId);
    }

    /** A member uploaded evidence: tell the assessor working the claim, or the whole team. */
    public void documentAdded(UUID claimId, String claimNumber, String assignee, String uploader, String fileName) {
        send(staffFor(assignee), uploader, Type.DOCUMENT_ADDED, "New document on " + claimNumber,
                "%s uploaded %s.".formatted(uploader, fileName), "/claims/" + claimId);
    }

    @Transactional(readOnly = true)
    public NotificationFeed feed(String username) {
        return new NotificationFeed(notifications.countByRecipientAndReadAtIsNull(username),
                notifications.findTop30ByRecipientOrderByCreatedAtDesc(username).stream()
                        .map(NotificationService::toView)
                        .toList());
    }

    @Transactional(readOnly = true)
    public long unreadCount(String username) {
        return notifications.countByRecipientAndReadAtIsNull(username);
    }

    public NotificationView markRead(UUID id, String username) {
        Notification notification = notifications.findByIdAndRecipient(id, username)
                .orElseThrow(() -> new NotFoundException("Notification", id));
        notification.markRead(clock.instant());
        return toView(notification);
    }

    public int markAllRead(String username) {
        return notifications.markAllRead(username, clock.instant());
    }

    private void send(Collection<String> recipients, String actor, Type type, String title, String body,
            String link) {
        String trimmed = body.length() > 1000 ? body.substring(0, 997) + "..." : body;
        recipients.stream()
                .filter(recipient -> !recipient.equals(actor))
                .forEach(recipient -> notifications.save(
                        new Notification(recipient, type, title, trimmed, link, clock.instant())));
    }

    private Set<String> assessors() {
        Set<String> names = new LinkedHashSet<>();
        users.findByRole(Role.ASSESSOR).forEach(user -> names.add(user.getUsername()));
        return names;
    }

    private Set<String> staffFor(String assignee) {
        return assignee != null ? Set.of(assignee) : assessors();
    }

    private Set<String> memberUsers(UUID memberId) {
        Set<String> names = new LinkedHashSet<>();
        users.findByMemberId(memberId).stream().map(AppUser::getUsername).forEach(names::add);
        return names;
    }

    private static String reasonOr(String message, String reason) {
        return reason == null ? message : message + " Reason: " + reason;
    }

    private static String describe(ClaimStatus status) {
        return switch (status) {
            case SUBMITTED -> "submitted";
            case UNDER_ASSESSMENT -> "under assessment";
            case APPROVED -> "approved";
            case REJECTED -> "rejected";
            case PAID -> "paid";
            case CANCELLED -> "cancelled";
        };
    }

    private static String statusMessage(ClaimStatus status) {
        return switch (status) {
            case UNDER_ASSESSMENT -> "An assessor has started reviewing your claim.";
            case APPROVED -> "Good news: your claim has been approved. Payment will follow shortly.";
            case REJECTED -> "Your claim was not approved.";
            case PAID -> "Your claim has been paid to your beneficiaries.";
            case CANCELLED -> "Your claim was cancelled.";
            case SUBMITTED -> "Your claim was received.";
        };
    }

    static NotificationView toView(Notification n) {
        return new NotificationView(n.getId(), n.getType(), n.getTitle(), n.getBody(), n.getLink(),
                n.getReadAt() != null, n.getCreatedAt());
    }
}
