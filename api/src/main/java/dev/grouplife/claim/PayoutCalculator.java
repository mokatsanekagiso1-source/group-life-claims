package dev.grouplife.claim;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Splits a payout across beneficiaries by allocation percentage. Each share is rounded down to the
 * cent and leftover cents go to the largest allocations first, so the shares always add up to the
 * exact payout.
 */
public final class PayoutCalculator {

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal CENT = new BigDecimal("0.01");

    public record Allocation(String beneficiaryName, BigDecimal percent) {}

    public record Share(String beneficiaryName, BigDecimal percent, BigDecimal amount) {}

    private PayoutCalculator() {}

    public static List<Share> split(BigDecimal payout, List<Allocation> allocations) {
        if (allocations.isEmpty()) {
            throw new IllegalArgumentException("At least one allocation is required");
        }
        BigDecimal totalPercent = allocations.stream().map(Allocation::percent).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (totalPercent.compareTo(HUNDRED) != 0) {
            throw new IllegalArgumentException("Allocations must total 100%, got " + totalPercent);
        }

        BigDecimal[] amounts = new BigDecimal[allocations.size()];
        BigDecimal allocated = BigDecimal.ZERO;
        for (int i = 0; i < allocations.size(); i++) {
            amounts[i] = payout.multiply(allocations.get(i).percent())
                    .divide(HUNDRED, 2, RoundingMode.DOWN);
            allocated = allocated.add(amounts[i]);
        }

        List<Integer> byLargestAllocation = new ArrayList<>();
        for (int i = 0; i < allocations.size(); i++) {
            byLargestAllocation.add(i);
        }
        byLargestAllocation.sort(Comparator.comparing((Integer i) -> allocations.get(i).percent()).reversed()
                .thenComparing(i -> i));

        BigDecimal remainder = payout.setScale(2, RoundingMode.HALF_UP).subtract(allocated);
        for (int k = 0; remainder.signum() > 0; k = (k + 1) % allocations.size()) {
            int i = byLargestAllocation.get(k);
            amounts[i] = amounts[i].add(CENT);
            remainder = remainder.subtract(CENT);
        }

        List<Share> shares = new ArrayList<>();
        for (int i = 0; i < allocations.size(); i++) {
            shares.add(new Share(allocations.get(i).beneficiaryName(), allocations.get(i).percent(), amounts[i]));
        }
        return shares;
    }
}
