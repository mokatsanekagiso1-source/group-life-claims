package dev.grouplife.premium;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import dev.grouplife.common.error.BusinessRuleException;
import dev.grouplife.premium.RateTable.Band;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class RateTableTest {

    /** Same bands as the V2 migration. */
    private final RateTable table = new RateTable(List.of(
            new Band(40, 49, new BigDecimal("0.00080")),
            new Band(18, 29, new BigDecimal("0.00030")),
            new Band(30, 39, new BigDecimal("0.00045")),
            new Band(50, 59, new BigDecimal("0.00150")),
            new Band(60, 65, new BigDecimal("0.00280"))));

    @ParameterizedTest(name = "age {0} -> rate {1}")
    @CsvSource({"18, 0.00030", "29, 0.00030", "30, 0.00045", "39, 0.00045", "40, 0.00080", "65, 0.00280"})
    void findsTheBandForAnAgeIncludingBoundaries(int age, String expectedRate) {
        assertThat(table.rateFor(age)).isEqualByComparingTo(expectedRate);
    }

    @ParameterizedTest(name = "cover {0} at age {1} -> {2}")
    @CsvSource({
        "1200000.00, 35, 540.00",
        "750000.00, 52, 1125.00",
        "333333.33, 25, 100.00",
        "123456.78, 45, 98.77",
    })
    void premiumIsCoverTimesRateRoundedToCents(String cover, int age, String expected) {
        BigDecimal premium = table.monthlyPremium(new BigDecimal(cover), age);

        assertThat(premium).isEqualByComparingTo(expected);
        assertThat(premium.scale()).isEqualTo(2);
    }

    @Test
    void ageOutsideEveryBandIsABusinessRuleViolation() {
        assertThatThrownBy(() -> table.rateFor(66))
                .isInstanceOfSatisfying(BusinessRuleException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("NO_RATE_FOR_AGE"));
        assertThatThrownBy(() -> table.rateFor(17)).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void overlappingBandsAreRejected() {
        assertThatThrownBy(() -> new RateTable(List.of(
                new Band(18, 30, new BigDecimal("0.0003")),
                new Band(30, 40, new BigDecimal("0.0004")))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("overlap");
    }

    @Test
    void bandsAreSortedByAge() {
        assertThat(table.bands()).extracting(Band::minAge).containsExactly(18, 30, 40, 50, 60);
    }
}
