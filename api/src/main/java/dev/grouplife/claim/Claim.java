package dev.grouplife.claim;

import dev.grouplife.common.error.BusinessRuleException;
import dev.grouplife.member.Member;
import dev.grouplife.policy.CoverType;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A claim against a member's cover. All status changes go through {@link #transitionTo}, which
 * enforces the {@link ClaimStatus} state machine and appends to the audit trail.
 */
@Entity
@Table(name = "claim")
public class Claim {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String claimNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id")
    private Member member;

    @Enumerated(EnumType.STRING)
    private CoverType coverType;

    private LocalDate eventDate;
    private String description;

    @Enumerated(EnumType.STRING)
    private ClaimStatus status;

    private BigDecimal coverAmount;
    private Instant submittedAt;
    private Instant decidedAt;

    @Version
    private long version;

    @OneToMany(mappedBy = "claim", cascade = CascadeType.ALL)
    @OrderBy("occurredAt asc")
    private List<ClaimTransition> transitions = new ArrayList<>();

    @OneToMany(mappedBy = "claim", cascade = CascadeType.ALL)
    @OrderBy("amount desc")
    private List<ClaimPayout> payouts = new ArrayList<>();

    protected Claim() {}

    private Claim(String claimNumber, Member member, CoverType coverType, LocalDate eventDate, String description,
            BigDecimal coverAmount, Instant submittedAt) {
        this.claimNumber = claimNumber;
        this.member = member;
        this.coverType = coverType;
        this.eventDate = eventDate;
        this.description = description;
        this.coverAmount = coverAmount;
        this.submittedAt = submittedAt;
        this.status = ClaimStatus.SUBMITTED;
    }

    /** Creates a submitted claim and records the submission as the first audit entry. */
    public static Claim submit(String claimNumber, Member member, CoverType coverType, LocalDate eventDate,
            String description, String actor, Instant now) {
        var claim = new Claim(claimNumber, member, coverType, eventDate, description, member.coverAmount(), now);
        claim.transitions.add(new ClaimTransition(claim, null, ClaimStatus.SUBMITTED, actor, null, now));
        return claim;
    }

    /**
     * Moves the claim to {@code target}.
     *
     * @throws InvalidClaimTransitionException if the state machine does not allow the move
     * @throws BusinessRuleException if the target needs a reason and none was given
     */
    public ClaimTransition transitionTo(ClaimStatus target, String actor, String reason, Instant now) {
        if (!status.canTransitionTo(target)) {
            throw new InvalidClaimTransitionException(status, target);
        }
        String trimmedReason = reason == null || reason.isBlank() ? null : reason.trim();
        if (target.requiresReason() && trimmedReason == null) {
            throw new BusinessRuleException("REASON_REQUIRED",
                    "A reason is required to move a claim to %s".formatted(target));
        }
        var transition = new ClaimTransition(this, status, target, actor, trimmedReason, now);
        transitions.add(transition);
        status = target;
        if (target.isDecision()) {
            decidedAt = now;
        }
        return transition;
    }

    void recordPayouts(List<PayoutCalculator.Share> shares) {
        payouts.clear();
        shares.forEach(s -> payouts.add(new ClaimPayout(this, s.beneficiaryName(), s.percent(), s.amount())));
    }

    public UUID getId() {
        return id;
    }

    public String getClaimNumber() {
        return claimNumber;
    }

    public Member getMember() {
        return member;
    }

    public CoverType getCoverType() {
        return coverType;
    }

    public LocalDate getEventDate() {
        return eventDate;
    }

    public String getDescription() {
        return description;
    }

    public ClaimStatus getStatus() {
        return status;
    }

    public BigDecimal getCoverAmount() {
        return coverAmount;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public Instant getDecidedAt() {
        return decidedAt;
    }

    public List<ClaimTransition> getTransitions() {
        return List.copyOf(transitions);
    }

    public List<ClaimPayout> getPayouts() {
        return List.copyOf(payouts);
    }
}
