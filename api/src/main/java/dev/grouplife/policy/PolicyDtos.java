package dev.grouplife.policy;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

public final class PolicyDtos {

    private PolicyDtos() {}

    public record CreatePolicyRequest(
            @NotBlank @Size(max = 50) String policyNumber,
            @NotEmpty Set<CoverType> coverTypes,
            @NotNull @DecimalMin("0.5") @DecimalMax("10.0") BigDecimal coverMultiple,
            @NotNull @Min(0) @Max(24) Integer waitingPeriodMonths,
            @NotNull LocalDate effectiveDate) {}

    public record PolicyView(UUID id, UUID schemeId, String schemeName, String policyNumber,
            Set<CoverType> coverTypes, BigDecimal coverMultiple, int waitingPeriodMonths,
            LocalDate effectiveDate, PolicyStatus status, long memberCount) {}
}
