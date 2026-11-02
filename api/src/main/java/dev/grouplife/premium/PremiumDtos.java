package dev.grouplife.premium;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class PremiumDtos {

    private PremiumDtos() {}

    public record PremiumQuote(UUID memberId, String memberName, int age, BigDecimal coverAmount,
            BigDecimal monthlyRate, BigDecimal monthlyPremium, LocalDate asOf) {}

    public record PremiumSchedule(UUID policyId, String policyNumber, LocalDate asOf, int memberCount,
            BigDecimal totalMonthlyPremium, List<PremiumQuote> members) {}

    public record RateBandView(int minAge, int maxAge, BigDecimal monthlyRate) {}
}
