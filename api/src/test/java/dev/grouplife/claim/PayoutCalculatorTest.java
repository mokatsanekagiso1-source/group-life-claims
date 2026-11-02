package dev.grouplife.claim;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import dev.grouplife.claim.PayoutCalculator.Allocation;
import dev.grouplife.claim.PayoutCalculator.Share;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class PayoutCalculatorTest {

    @Test
    void splitsByAllocation() {
        List<Share> shares = PayoutCalculator.split(new BigDecimal("1200000.00"), List.of(
                new Allocation("A", new BigDecimal("60")),
                new Allocation("B", new BigDecimal("40"))));

        assertThat(shares).extracting(Share::amount)
                .usingElementComparator(BigDecimal::compareTo)
                .containsExactly(new BigDecimal("720000.00"), new BigDecimal("480000.00"));
    }

    @Test
    void leftoverCentsGoToTheLargestAllocation() {
        // 10.00 × 33.33% = 3.333, 10.00 × 33.34% = 3.334: each rounds down to 3.33, leaving one cent.
        List<Share> shares = PayoutCalculator.split(new BigDecimal("10.00"), List.of(
                new Allocation("A", new BigDecimal("33.33")),
                new Allocation("B", new BigDecimal("33.34")),
                new Allocation("C", new BigDecimal("33.33"))));

        assertThat(shares).extracting(Share::amount)
                .usingElementComparator(BigDecimal::compareTo)
                .containsExactly(new BigDecimal("3.33"), new BigDecimal("3.34"), new BigDecimal("3.33"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"0.01", "0.05", "999999.99", "1234567.89", "100000.00"})
    void sharesAlwaysAddUpToThePayout(String payout) {
        BigDecimal amount = new BigDecimal(payout);
        List<Share> shares = PayoutCalculator.split(amount, List.of(
                new Allocation("A", new BigDecimal("33.34")),
                new Allocation("B", new BigDecimal("33.33")),
                new Allocation("C", new BigDecimal("16.67")),
                new Allocation("D", new BigDecimal("16.66"))));

        BigDecimal total = shares.stream().map(Share::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(total).isEqualByComparingTo(amount);
        assertThat(shares).allSatisfy(s -> assertThat(s.amount().scale()).isEqualTo(2));
    }

    @Test
    void rejectsAllocationsThatDoNotTotal100() {
        assertThatThrownBy(() -> PayoutCalculator.split(BigDecimal.TEN, List.of(
                new Allocation("A", new BigDecimal("50")),
                new Allocation("B", new BigDecimal("40")))))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
