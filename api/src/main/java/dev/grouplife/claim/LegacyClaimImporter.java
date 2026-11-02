package dev.grouplife.claim;

import dev.grouplife.member.Member;
import dev.grouplife.policy.CoverType;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Imports claims that were handled in a previous system, keeping their original timestamps in the
 * audit trail. Imported claims skip submission rules (they were decided elsewhere) but still go
 * through the state machine, and approvals still freeze a payout split.
 */
@Component
public class LegacyClaimImporter {

    /** One historical status change. */
    public record Step(ClaimStatus status, String actor, String reason, Instant at) {}

    private final ClaimRepository claims;

    public LegacyClaimImporter(ClaimRepository claims) {
        this.claims = claims;
    }

    @Transactional
    public Claim importClaim(Member member, CoverType coverType, LocalDate eventDate, String description,
            String submittedBy, Instant submittedAt, List<Step> steps, String assignee) {
        String claimNumber = "CLM-%06d".formatted(claims.nextClaimNumber());
        Claim claim = Claim.submit(claimNumber, member, coverType, eventDate, description, submittedBy, submittedAt);
        for (Step step : steps) {
            if (step.status() == ClaimStatus.UNDER_ASSESSMENT && assignee != null) {
                claim.assignTo(assignee);
            }
            claim.transitionTo(step.status(), step.actor(), step.reason(), step.at());
            if (step.status() == ClaimStatus.APPROVED) {
                claim.recordPayouts(ClaimService.payoutSplit(claim));
            }
        }
        return claims.save(claim);
    }
}
