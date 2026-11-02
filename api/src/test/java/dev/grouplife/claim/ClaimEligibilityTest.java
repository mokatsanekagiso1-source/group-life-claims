package dev.grouplife.claim;

import static dev.grouplife.support.Fixtures.TODAY;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import dev.grouplife.common.error.BusinessRuleException;
import dev.grouplife.member.Member;
import dev.grouplife.policy.CoverType;
import dev.grouplife.policy.Policy;
import dev.grouplife.support.Fixtures;
import java.time.LocalDate;
import java.util.EnumSet;
import org.junit.jupiter.api.Test;

class ClaimEligibilityTest {

    private final Policy policy = Fixtures.policy();

    @Test
    void acceptsAClaimForAnActiveMemberPastTheWaitingPeriod() {
        Member member = Fixtures.member(policy);

        assertThatCode(() -> ClaimEligibility.check(member, CoverType.DEATH, TODAY.minusDays(1), TODAY))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsAnEventDateInTheFuture() {
        assertRule(Fixtures.member(policy), CoverType.DEATH, TODAY.plusDays(1), "EVENT_DATE_IN_FUTURE");
    }

    @Test
    void rejectsACoverTypeThePolicyDoesNotInclude() {
        Policy deathOnly = Fixtures.policy(EnumSet.of(CoverType.DEATH), 6, TODAY.minusYears(5));

        assertRule(Fixtures.member(deathOnly), CoverType.DISABILITY, TODAY, "COVER_TYPE_NOT_COVERED");
    }

    @Test
    void rejectsAnEventBeforeThePolicyTookEffect() {
        Policy recent = Fixtures.policy(EnumSet.allOf(CoverType.class), 0, TODAY.minusMonths(1));

        assertRule(Fixtures.member(recent, TODAY.minusYears(1)), CoverType.DEATH, TODAY.minusMonths(2),
                "POLICY_NOT_IN_FORCE");
    }

    @Test
    void rejectsAnEventBeforeTheMemberJoined() {
        Member member = Fixtures.member(policy, TODAY.minusMonths(1));

        assertRule(member, CoverType.DEATH, TODAY.minusMonths(2), "MEMBER_NOT_ACTIVE");
    }

    @Test
    void rejectsAnEventAfterTheMemberExited() {
        Member member = Fixtures.member(policy);
        member.exit(TODAY.minusMonths(1));

        assertRule(member, CoverType.DEATH, TODAY.minusDays(1), "MEMBER_NOT_ACTIVE");
    }

    @Test
    void acceptsAnEventOnTheExitDate() {
        Member member = Fixtures.member(policy);
        member.exit(TODAY.minusDays(1));

        assertThatCode(() -> ClaimEligibility.check(member, CoverType.DEATH, TODAY.minusDays(1), TODAY))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsAnEventInsideTheWaitingPeriod() {
        LocalDate joined = TODAY.minusMonths(3);

        assertRule(Fixtures.member(policy, joined), CoverType.DEATH, TODAY, "WAITING_PERIOD");
    }

    @Test
    void acceptsAnEventOnTheDayTheWaitingPeriodEnds() {
        Member member = Fixtures.member(policy, TODAY.minusMonths(6));

        assertThatCode(() -> ClaimEligibility.check(member, CoverType.DEATH, TODAY, TODAY))
                .doesNotThrowAnyException();
    }

    private static void assertRule(Member member, CoverType type, LocalDate eventDate, String code) {
        assertThatThrownBy(() -> ClaimEligibility.check(member, type, eventDate, TODAY))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code").isEqualTo(code);
    }
}
