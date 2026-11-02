package dev.grouplife.policy;

import dev.grouplife.scheme.Scheme;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

/** A group life policy held by a scheme. Cover is a multiple of each member's annual salary. */
@Entity
@Table(name = "policy")
public class Policy {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "scheme_id")
    private Scheme scheme;

    private String policyNumber;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "policy_cover_type", joinColumns = @JoinColumn(name = "policy_id"))
    @Column(name = "cover_type")
    @Enumerated(EnumType.STRING)
    private Set<CoverType> coverTypes = EnumSet.noneOf(CoverType.class);

    private BigDecimal coverMultiple;
    private int waitingPeriodMonths;
    private LocalDate effectiveDate;

    @Enumerated(EnumType.STRING)
    private PolicyStatus status;

    private Instant createdAt;

    protected Policy() {}

    public Policy(Scheme scheme, String policyNumber, Set<CoverType> coverTypes, BigDecimal coverMultiple,
            int waitingPeriodMonths, LocalDate effectiveDate, Instant createdAt) {
        this.scheme = scheme;
        this.policyNumber = policyNumber;
        this.coverTypes = EnumSet.copyOf(coverTypes);
        this.coverMultiple = coverMultiple;
        this.waitingPeriodMonths = waitingPeriodMonths;
        this.effectiveDate = effectiveDate;
        this.status = PolicyStatus.ACTIVE;
        this.createdAt = createdAt;
    }

    public boolean covers(CoverType coverType) {
        return coverTypes.contains(coverType);
    }

    public boolean isInForceOn(LocalDate date) {
        return status == PolicyStatus.ACTIVE && !date.isBefore(effectiveDate);
    }

    public UUID getId() {
        return id;
    }

    public Scheme getScheme() {
        return scheme;
    }

    public String getPolicyNumber() {
        return policyNumber;
    }

    public Set<CoverType> getCoverTypes() {
        return Set.copyOf(coverTypes);
    }

    public BigDecimal getCoverMultiple() {
        return coverMultiple;
    }

    public int getWaitingPeriodMonths() {
        return waitingPeriodMonths;
    }

    public LocalDate getEffectiveDate() {
        return effectiveDate;
    }

    public PolicyStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
