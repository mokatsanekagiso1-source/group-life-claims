package dev.grouplife.claim;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Published inside the transaction whenever a claim changes status, including the initial
 * submission ({@code from} is null).
 */
public record ClaimTransitionedEvent(UUID claimId, String claimNumber, ClaimStatus from, ClaimStatus to,
        String actor, Instant submittedAt, Instant occurredAt) {

    static ClaimTransitionedEvent of(Claim claim, ClaimStatus from, String actor, Instant occurredAt) {
        return new ClaimTransitionedEvent(claim.getId(), claim.getClaimNumber(), from, claim.getStatus(), actor,
                claim.getSubmittedAt(), occurredAt);
    }

    /** Time from submission to this transition. */
    public Duration sinceSubmission() {
        return Duration.between(submittedAt, occurredAt);
    }
}
