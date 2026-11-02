package dev.grouplife.claim;

import static dev.grouplife.support.Fixtures.NOW;
import static dev.grouplife.support.Fixtures.TODAY;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import dev.grouplife.common.error.BusinessRuleException;
import dev.grouplife.policy.CoverType;
import dev.grouplife.support.Fixtures;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ClaimTest {

    private Claim claim;

    @BeforeEach
    void setUp() {
        claim = Claim.submit("CLM-000001", Fixtures.memberWithBeneficiaries(), CoverType.DEATH, TODAY.minusDays(5),
                "Test claim", "member", NOW);
    }

    @Test
    void submissionStartsTheAuditTrail() {
        assertThat(claim.getStatus()).isEqualTo(ClaimStatus.SUBMITTED);
        assertThat(claim.getCoverAmount()).isEqualByComparingTo(new BigDecimal("1200000.00"));
        assertThat(claim.getTransitions()).singleElement().satisfies(t -> {
            assertThat(t.getFromStatus()).isNull();
            assertThat(t.getToStatus()).isEqualTo(ClaimStatus.SUBMITTED);
            assertThat(t.getActor()).isEqualTo("member");
            assertThat(t.getOccurredAt()).isEqualTo(NOW);
        });
    }

    @Test
    void everyTransitionIsAudited() {
        Instant assessed = NOW.plus(Duration.ofHours(1));
        Instant approved = NOW.plus(Duration.ofDays(2));

        claim.transitionTo(ClaimStatus.UNDER_ASSESSMENT, "assessor", null, assessed);
        claim.transitionTo(ClaimStatus.APPROVED, "assessor", "  Documents verified  ", approved);

        assertThat(claim.getStatus()).isEqualTo(ClaimStatus.APPROVED);
        assertThat(claim.getTransitions()).extracting(ClaimTransition::getToStatus)
                .containsExactly(ClaimStatus.SUBMITTED, ClaimStatus.UNDER_ASSESSMENT, ClaimStatus.APPROVED);
        assertThat(claim.getTransitions().get(2)).satisfies(t -> {
            assertThat(t.getFromStatus()).isEqualTo(ClaimStatus.UNDER_ASSESSMENT);
            assertThat(t.getReason()).isEqualTo("Documents verified");
            assertThat(t.getOccurredAt()).isEqualTo(approved);
        });
    }

    @Test
    void decisionTimeIsRecordedOnApprovalOrRejection() {
        claim.transitionTo(ClaimStatus.UNDER_ASSESSMENT, "assessor", null, NOW.plusSeconds(60));
        assertThat(claim.getDecidedAt()).isNull();

        Instant decided = NOW.plusSeconds(3600);
        claim.transitionTo(ClaimStatus.REJECTED, "assessor", "Not covered", decided);

        assertThat(claim.getDecidedAt()).isEqualTo(decided);
    }

    @Test
    void invalidTransitionIsRejectedAndLeavesTheClaimUnchanged() {
        assertThatThrownBy(() -> claim.transitionTo(ClaimStatus.PAID, "assessor", null, NOW))
                .isInstanceOfSatisfying(InvalidClaimTransitionException.class, ex -> {
                    assertThat(ex.getFrom()).isEqualTo(ClaimStatus.SUBMITTED);
                    assertThat(ex.getTo()).isEqualTo(ClaimStatus.PAID);
                    assertThat(ex).hasMessage("A claim cannot move from SUBMITTED to PAID");
                });

        assertThat(claim.getStatus()).isEqualTo(ClaimStatus.SUBMITTED);
        assertThat(claim.getTransitions()).hasSize(1);
    }

    @Test
    void terminalClaimsCannotMove() {
        claim.transitionTo(ClaimStatus.CANCELLED, "member", "Lodged in error", NOW);

        assertThatThrownBy(() -> claim.transitionTo(ClaimStatus.UNDER_ASSESSMENT, "assessor", null, NOW))
                .isInstanceOf(InvalidClaimTransitionException.class);
    }

    @Test
    void cancellationNeedsAReason() {
        assertThatThrownBy(() -> claim.transitionTo(ClaimStatus.CANCELLED, "member", "   ", NOW))
                .isInstanceOfSatisfying(BusinessRuleException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("REASON_REQUIRED"));

        assertThat(claim.getStatus()).isEqualTo(ClaimStatus.SUBMITTED);
    }
}
