package dev.grouplife.claim;

import dev.grouplife.policy.CoverType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public final class ClaimDtos {

    private ClaimDtos() {}

    public record SubmitClaimRequest(
            @NotNull UUID memberId,
            @NotNull CoverType coverType,
            @NotNull LocalDate eventDate,
            @NotBlank @Size(max = 2000) String description) {}

    public record TransitionRequest(@NotNull ClaimStatus targetStatus, @Size(max = 1000) String reason) {}

    public record ClaimSummary(UUID id, String claimNumber, UUID memberId, String memberName, CoverType coverType,
            LocalDate eventDate, ClaimStatus status, BigDecimal coverAmount, Instant submittedAt, Instant decidedAt) {}

    public record TransitionView(ClaimStatus fromStatus, ClaimStatus toStatus, String actor, String reason,
            Instant occurredAt) {}

    public record PayoutView(String beneficiaryName, BigDecimal allocationPercent, BigDecimal amount) {}

    /**
     * Full claim view. {@code allowedTransitions} lists only the moves the current user may make, so
     * clients can render actions without duplicating authorisation rules.
     */
    public record ClaimDetail(UUID id, String claimNumber, UUID memberId, String memberName, String policyNumber,
            CoverType coverType, LocalDate eventDate, String description, ClaimStatus status, BigDecimal coverAmount,
            Instant submittedAt, Instant decidedAt, Set<ClaimStatus> allowedTransitions,
            List<TransitionView> transitions, List<PayoutView> payouts) {}
}
