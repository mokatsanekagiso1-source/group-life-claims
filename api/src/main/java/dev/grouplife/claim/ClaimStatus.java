package dev.grouplife.claim;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Claim lifecycle.
 *
 * <pre>
 * SUBMITTED ──► UNDER_ASSESSMENT ──► APPROVED ──► PAID
 *     │                │      └────► REJECTED
 *     └──► CANCELLED ◄─┘
 * </pre>
 */
public enum ClaimStatus {
    SUBMITTED,
    UNDER_ASSESSMENT,
    APPROVED,
    REJECTED,
    PAID,
    CANCELLED;

    private static final Map<ClaimStatus, Set<ClaimStatus>> ALLOWED = Map.of(
            SUBMITTED, EnumSet.of(UNDER_ASSESSMENT, CANCELLED),
            UNDER_ASSESSMENT, EnumSet.of(APPROVED, REJECTED, CANCELLED),
            APPROVED, EnumSet.of(PAID),
            REJECTED, EnumSet.noneOf(ClaimStatus.class),
            PAID, EnumSet.noneOf(ClaimStatus.class),
            CANCELLED, EnumSet.noneOf(ClaimStatus.class));

    /** Statuses in which a claim still counts against the member's cover. */
    public static final Set<ClaimStatus> OPEN_OR_SETTLED = EnumSet.of(SUBMITTED, UNDER_ASSESSMENT, APPROVED, PAID);

    public boolean canTransitionTo(ClaimStatus target) {
        return ALLOWED.get(this).contains(target);
    }

    public Set<ClaimStatus> allowedTargets() {
        Set<ClaimStatus> targets = EnumSet.noneOf(ClaimStatus.class);
        targets.addAll(ALLOWED.get(this));
        return targets;
    }

    public boolean isTerminal() {
        return ALLOWED.get(this).isEmpty();
    }

    /** A decision ends assessment; time to decision is measured up to this point. */
    public boolean isDecision() {
        return this == APPROVED || this == REJECTED;
    }

    public boolean requiresReason() {
        return this == REJECTED || this == CANCELLED;
    }
}
