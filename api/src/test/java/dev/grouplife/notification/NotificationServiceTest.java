package dev.grouplife.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import dev.grouplife.claim.ClaimStatus;
import dev.grouplife.claim.ClaimTransitionedEvent;
import dev.grouplife.policy.CoverType;
import dev.grouplife.security.AppUser;
import dev.grouplife.security.AppUserRepository;
import dev.grouplife.security.Role;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class NotificationServiceTest {

    private static final Instant NOW = Instant.parse("2026-06-15T10:00:00Z");
    private static final UUID MEMBER_ID = UUID.randomUUID();

    @Mock
    NotificationRepository notifications;

    @Mock
    AppUserRepository users;

    private NotificationService service;

    @BeforeEach
    void setUp() {
        service = new NotificationService(notifications, users, Clock.fixed(NOW, ZoneOffset.UTC));
        when(users.findByRole(Role.ASSESSOR)).thenReturn(List.of(
                new AppUser("assessor", "x", Role.ASSESSOR, null),
                new AppUser("assessor2", "x", Role.ASSESSOR, null)));
        when(users.findByMemberId(MEMBER_ID)).thenReturn(List.of(new AppUser("member", "x", Role.MEMBER, MEMBER_ID)));
    }

    @Test
    void newClaimsAlertEveryAssessor() {
        service.on(event(null, ClaimStatus.SUBMITTED, "member", null, null));

        List<Notification> sent = sent(2);
        assertThat(sent).extracting(Notification::getRecipient).containsExactly("assessor", "assessor2");
        assertThat(sent.get(0).getTitle()).isEqualTo("New claim CLM-001001");
        assertThat(sent.get(0).getLink()).startsWith("/claims/");
    }

    @Test
    void decisionsAreSentToTheMemberWithTheReason() {
        service.on(event(ClaimStatus.UNDER_ASSESSMENT, ClaimStatus.REJECTED, "assessor", "Not covered", "assessor"));

        Notification sent = sent(1).get(0);
        assertThat(sent.getRecipient()).isEqualTo("member");
        assertThat(sent.getTitle()).isEqualTo("Claim CLM-001001: rejected");
        assertThat(sent.getBody()).endsWith("Reason: Not covered");
    }

    @Test
    void aWithdrawalGoesToTheAssignedAssessorOnly() {
        service.on(event(ClaimStatus.UNDER_ASSESSMENT, ClaimStatus.CANCELLED, "member", "Changed my mind", "assessor2"));

        Notification sent = sent(1).get(0);
        assertThat(sent.getRecipient()).isEqualTo("assessor2");
        assertThat(sent.getType()).isEqualTo(Notification.Type.CLAIM_WITHDRAWN);
    }

    @Test
    void nobodyIsNotifiedAboutTheirOwnAction() {
        when(users.findByRole(Role.ASSESSOR)).thenReturn(List.of(new AppUser("assessor", "x", Role.ASSESSOR, null)));

        service.on(event(null, ClaimStatus.SUBMITTED, "assessor", null, null));

        verify(notifications, never()).save(any());
    }

    @Test
    void internalNotesNeverNotifyTheMember() {
        service.noteAdded(UUID.randomUUID(), "CLM-001001", MEMBER_ID, "assessor", "assessor", false, true, "Internal");

        verify(notifications, never()).save(any());
    }

    @Test
    void aMemberMessageGoesToTheAssignee() {
        service.noteAdded(UUID.randomUUID(), "CLM-001001", MEMBER_ID, "assessor2", "member", true, false, "Hello");

        assertThat(sent(1).get(0).getRecipient()).isEqualTo("assessor2");
    }

    private List<Notification> sent(int expected) {
        var captor = ArgumentCaptor.forClass(Notification.class);
        verify(notifications, times(expected)).save(captor.capture());
        return captor.getAllValues();
    }

    private static ClaimTransitionedEvent event(ClaimStatus from, ClaimStatus to, String actor, String reason,
            String assignee) {
        return new ClaimTransitionedEvent(UUID.randomUUID(), "CLM-001001", MEMBER_ID, "Test Member", CoverType.DEATH,
                from, to, actor, reason, assignee, NOW.minusSeconds(3600), NOW);
    }
}
