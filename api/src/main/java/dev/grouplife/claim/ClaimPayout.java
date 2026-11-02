package dev.grouplife.claim;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

/** One beneficiary's share of an approved claim, frozen at approval. */
@Entity
@Table(name = "claim_payout")
public class ClaimPayout {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "claim_id")
    private Claim claim;

    private String beneficiaryName;
    private BigDecimal allocationPercent;
    private BigDecimal amount;

    protected ClaimPayout() {}

    ClaimPayout(Claim claim, String beneficiaryName, BigDecimal allocationPercent, BigDecimal amount) {
        this.claim = claim;
        this.beneficiaryName = beneficiaryName;
        this.allocationPercent = allocationPercent;
        this.amount = amount;
    }

    public String getBeneficiaryName() {
        return beneficiaryName;
    }

    public BigDecimal getAllocationPercent() {
        return allocationPercent;
    }

    public BigDecimal getAmount() {
        return amount;
    }
}
