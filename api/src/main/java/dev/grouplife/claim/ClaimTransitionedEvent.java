package dev.grouplife.claim;

import dev.grouplife.policy.CoverType;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Published inside the transaction whenever a claim changes status, including the initial
 * submission ({@code from} is null).
 */
public record ClaimTransitionedEvent(UUID claimId, String claimNumber, UUID memberId, String memberName,
        CoverType coverType, ClaimStatus from, ClaimStatus to, String actor, String reason, String assignee,
        Instant submittedAt, Instant occurredAt) {

    static ClaimTransitionedEvent of(Claim claim, ClaimStatus from, String actor, String reason, Instant occurredAt) {
        return new ClaimTransitionedEvent(claim.getId(), claim.getClaimNumber(), claim.getMember().getId(),
                claim.getMember().fullName(), claim.getCoverType(), from, claim.getStatus(), actor, reason,
                claim.getAssignee(), claim.getSubmittedAt(), occurredAt);
    }

    /** Time from submission to this transition. */
    public Duration sinceSubmission() {
        return Duration.between(submittedAt, occurredAt);
    }
}
