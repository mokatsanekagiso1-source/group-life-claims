package dev.grouplife.premium;

import dev.grouplife.common.error.BusinessRuleException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;

/**
 * Age-band rate table. Monthly premium = cover amount × the rate for the member's age band,
 * rounded to cents.
 */
public final class RateTable {

    public record Band(int minAge, int maxAge, BigDecimal monthlyRate) {

        public Band {
            if (minAge > maxAge) {
                throw new IllegalArgumentException("minAge must not exceed maxAge");
            }
            if (monthlyRate.signum() <= 0) {
                throw new IllegalArgumentException("monthlyRate must be positive");
            }
        }

        boolean contains(int age) {
            return age >= minAge && age <= maxAge;
        }
    }

    private final List<Band> bands;

    public RateTable(List<Band> bands) {
        List<Band> sorted = bands.stream().sorted(Comparator.comparingInt(Band::minAge)).toList();
        for (int i = 1; i < sorted.size(); i++) {
            if (sorted.get(i).minAge() <= sorted.get(i - 1).maxAge()) {
                throw new IllegalArgumentException("Age bands overlap: %s and %s".formatted(sorted.get(i - 1), sorted.get(i)));
            }
        }
        this.bands = sorted;
    }

    public BigDecimal rateFor(int age) {
        return bands.stream()
                .filter(band -> band.contains(age))
                .findFirst()
                .map(Band::monthlyRate)
                .orElseThrow(() -> new BusinessRuleException("NO_RATE_FOR_AGE",
                        "No premium rate is defined for age %d".formatted(age)));
    }

    public BigDecimal monthlyPremium(BigDecimal coverAmount, int age) {
        return coverAmount.multiply(rateFor(age)).setScale(2, RoundingMode.HALF_UP);
    }

    public List<Band> bands() {
        return bands;
    }
}
