package dev.grouplife.claim;

public class InvalidClaimTransitionException extends RuntimeException {

    private final ClaimStatus from;
    private final ClaimStatus to;

    public InvalidClaimTransitionException(ClaimStatus from, ClaimStatus to) {
        super("A claim cannot move from %s to %s".formatted(from, to));
        this.from = from;
        this.to = to;
    }

    public ClaimStatus getFrom() {
        return from;
    }

    public ClaimStatus getTo() {
        return to;
    }
}
