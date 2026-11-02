package dev.grouplife.member;

import static dev.grouplife.support.Fixtures.TODAY;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import dev.grouplife.common.error.BusinessRuleException;
import dev.grouplife.member.Member.NewBeneficiary;
import dev.grouplife.support.Fixtures;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class MemberTest {

    private final Member member = Fixtures.member(Fixtures.policy());

    @Test
    void coverIsSalaryTimesThePolicyMultiple() {
        assertThat(member.coverAmount()).isEqualByComparingTo("1200000.00");
    }

    @Test
    void waitingPeriodRunsFromTheJoinDate() {
        assertThat(member.waitingPeriodEndsOn()).isEqualTo(member.getJoinDate().plusMonths(6));
    }

    @Test
    void activeFromJoinDateUntilExitDateInclusive() {
        member.exit(TODAY);

        assertThat(member.isActiveOn(member.getJoinDate().minusDays(1))).isFalse();
        assertThat(member.isActiveOn(member.getJoinDate())).isTrue();
        assertThat(member.isActiveOn(TODAY)).isTrue();
        assertThat(member.isActiveOn(TODAY.plusDays(1))).isFalse();
        assertThat(member.getStatus()).isEqualTo(MemberStatus.EXITED);
    }

    @Test
    void cannotExitBeforeJoining() {
        assertThatThrownBy(() -> member.exit(member.getJoinDate().minusDays(1)))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code").isEqualTo("EXIT_BEFORE_JOIN");
    }

    @Test
    void beneficiaryAllocationsMustTotal100() {
        assertThatThrownBy(() -> member.replaceBeneficiaries(List.of(
                new NewBeneficiary("A", "Spouse", new BigDecimal("50")),
                new NewBeneficiary("B", "Child", new BigDecimal("49.99")))))
                .isInstanceOfSatisfying(BusinessRuleException.class, ex -> {
                    assertThat(ex.getCode()).isEqualTo("ALLOCATION_NOT_100");
                    assertThat(ex.getMessage()).contains("99.99%");
                });
        assertThat(member.getBeneficiaries()).isEmpty();
    }

    @Test
    void replacingBeneficiariesSwapsTheWholeList() {
        member.replaceBeneficiaries(List.of(new NewBeneficiary("A", "Spouse", new BigDecimal("100"))));
        member.replaceBeneficiaries(List.of(
                new NewBeneficiary("B", "Child", new BigDecimal("50.00")),
                new NewBeneficiary("C", "Child", new BigDecimal("50.00"))));

        assertThat(member.getBeneficiaries()).extracting(Beneficiary::getFullName).containsExactly("B", "C");
        assertThat(member.hasCompleteBeneficiaryAllocation()).isTrue();
    }

    @Test
    void atLeastOneBeneficiaryIsRequired() {
        assertThatThrownBy(() -> member.replaceBeneficiaries(List.of()))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code").isEqualTo("NO_BENEFICIARIES");
    }
}
