package dev.grouplife.claim;

import static dev.grouplife.support.Fixtures.NOW;
import static dev.grouplife.support.Fixtures.TODAY;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import dev.grouplife.claim.ClaimDtos.ClaimDetail;
import dev.grouplife.claim.ClaimDtos.PayoutView;
import dev.grouplife.claim.ClaimDtos.SubmitClaimRequest;
import dev.grouplife.claim.ClaimDtos.TransitionRequest;
import dev.grouplife.common.error.BusinessRuleException;
import dev.grouplife.common.error.NotFoundException;
import dev.grouplife.member.Member;
import dev.grouplife.member.MemberService;
import dev.grouplife.policy.CoverType;
import dev.grouplife.security.CurrentUser;
import dev.grouplife.security.Role;
import dev.grouplife.support.Fixtures;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ClaimServiceTest {

    private static final UUID MEMBER_ID = UUID.randomUUID();
    private static final UUID CLAIM_ID = UUID.randomUUID();

    private static final CurrentUser OWNER = new CurrentUser("member", Role.MEMBER, MEMBER_ID);
    private static final CurrentUser OTHER_MEMBER = new CurrentUser("other", Role.MEMBER, UUID.randomUUID());
    private static final CurrentUser ASSESSOR = new CurrentUser("assessor", Role.ASSESSOR, null);
    private static final CurrentUser ADMIN = new CurrentUser("admin", Role.ADMIN, null);

    @Mock
    ClaimRepository claims;

    @Mock
    MemberService memberService;

    @Mock
    ApplicationEventPublisher events;

    private ClaimService service;
    private Member member;

    @BeforeEach
    void setUp() {
        service = new ClaimService(claims, memberService, events, Clock.fixed(NOW, ZoneOffset.UTC));
        member = Fixtures.memberWithBeneficiaries();
        ReflectionTestUtils.setField(member, "id", MEMBER_ID);
    }

    @Test
    void memberSubmitsAClaimForThemselves() {
        when(memberService.findVisibleTo(MEMBER_ID, OWNER)).thenReturn(member);
        when(claims.nextClaimNumber()).thenReturn(1001L);
        when(claims.save(any(Claim.class))).thenAnswer(inv -> inv.getArgument(0));

        ClaimDetail detail = service.submit(request(CoverType.DEATH), OWNER);

        assertThat(detail.claimNumber()).isEqualTo("CLM-001001");
        assertThat(detail.status()).isEqualTo(ClaimStatus.SUBMITTED);
        assertThat(detail.coverAmount()).isEqualByComparingTo("1200000.00");
        assertThat(detail.allowedTransitions()).containsExactly(ClaimStatus.CANCELLED);
        assertThat(detail.transitions()).singleElement().extracting("actor").isEqualTo("member");

        var event = ArgumentCaptor.forClass(ClaimTransitionedEvent.class);
        verify(events).publishEvent(event.capture());
        assertThat(event.getValue().from()).isNull();
        assertThat(event.getValue().to()).isEqualTo(ClaimStatus.SUBMITTED);
    }

    @Test
    void assessorsCannotSubmitClaims() {
        assertThatThrownBy(() -> service.submit(request(CoverType.DEATH), ASSESSOR))
                .isInstanceOf(AccessDeniedException.class);
        verify(claims, never()).save(any());
    }

    @Test
    void rejectsASecondOpenClaimForTheSameCover() {
        when(memberService.findVisibleTo(MEMBER_ID, ADMIN)).thenReturn(member);
        when(claims.existsByMemberIdAndCoverTypeAndStatusIn(eq(MEMBER_ID), eq(CoverType.DEATH), any()))
                .thenReturn(true);

        assertThatThrownBy(() -> service.submit(request(CoverType.DEATH), ADMIN))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code").isEqualTo("DUPLICATE_CLAIM");
        verify(claims, never()).save(any());
    }

    @Test
    void approvalFreezesThePayoutSplit() {
        Claim claim = claimUnderAssessment(member);

        ClaimDetail detail = service.transition(CLAIM_ID,
                new TransitionRequest(ClaimStatus.APPROVED, "Verified"), ASSESSOR);

        assertThat(detail.status()).isEqualTo(ClaimStatus.APPROVED);
        assertThat(detail.payouts()).extracting(PayoutView::amount)
                .usingElementComparator(BigDecimal::compareTo)
                .containsExactly(new BigDecimal("720000.00"), new BigDecimal("480000.00"));
        assertThat(detail.allowedTransitions()).containsExactly(ClaimStatus.PAID);
        assertThat(claim.getDecidedAt()).isEqualTo(NOW);
    }

    @Test
    void approvalNeedsCompleteBeneficiaryAllocations() {
        Member noBeneficiaries = Fixtures.member(Fixtures.policy());
        ReflectionTestUtils.setField(noBeneficiaries, "id", MEMBER_ID);
        claimUnderAssessment(noBeneficiaries);

        assertThatThrownBy(() -> service.transition(CLAIM_ID,
                new TransitionRequest(ClaimStatus.APPROVED, null), ASSESSOR))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code").isEqualTo("BENEFICIARIES_INCOMPLETE");
    }

    @Test
    void membersCannotDecideTheirOwnClaims() {
        claimUnderAssessment(member);

        assertThatThrownBy(() -> service.transition(CLAIM_ID,
                new TransitionRequest(ClaimStatus.APPROVED, null), OWNER))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void membersMayWithdrawTheirOwnClaim() {
        claimUnderAssessment(member);

        ClaimDetail detail = service.transition(CLAIM_ID,
                new TransitionRequest(ClaimStatus.CANCELLED, "Changed my mind"), OWNER);

        assertThat(detail.status()).isEqualTo(ClaimStatus.CANCELLED);
        assertThat(detail.allowedTransitions()).isEmpty();
        verify(events).publishEvent(any(ClaimTransitionedEvent.class));
    }

    @Test
    void otherMembersCannotSeeTheClaimAtAll() {
        claimUnderAssessment(member);

        assertThatThrownBy(() -> service.get(CLAIM_ID, OTHER_MEMBER)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void adminsHaveReadOnlyAccessToClaims() {
        claimUnderAssessment(member);

        assertThat(service.get(CLAIM_ID, ADMIN).allowedTransitions()).isEmpty();
        assertThatThrownBy(() -> service.transition(CLAIM_ID,
                new TransitionRequest(ClaimStatus.REJECTED, "No"), ADMIN))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void invalidTransitionIsReportedAfterTheRoleCheck() {
        claimUnderAssessment(member);

        assertThatThrownBy(() -> service.transition(CLAIM_ID,
                new TransitionRequest(ClaimStatus.PAID, null), ASSESSOR))
                .isInstanceOf(InvalidClaimTransitionException.class);
    }

    private SubmitClaimRequest request(CoverType coverType) {
        return new SubmitClaimRequest(MEMBER_ID, coverType, TODAY.minusDays(2), "Test claim");
    }

    private Claim claimUnderAssessment(Member claimant) {
        Claim claim = Claim.submit("CLM-001001", claimant, CoverType.DEATH, TODAY.minusDays(2), "Test claim",
                "member", NOW.minusSeconds(86_400));
        claim.transitionTo(ClaimStatus.UNDER_ASSESSMENT, "assessor", null, NOW.minusSeconds(3_600));
        ReflectionTestUtils.setField(claim, "id", CLAIM_ID);
        when(claims.findById(CLAIM_ID)).thenReturn(Optional.of(claim));
        return claim;
    }
}
