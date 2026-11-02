package dev.grouplife.member;

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

@Entity
@Table(name = "beneficiary")
public class Beneficiary {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id")
    private Member member;

    private String fullName;
    private String relationship;
    private BigDecimal allocationPercent;

    protected Beneficiary() {}

    Beneficiary(Member member, String fullName, String relationship, BigDecimal allocationPercent) {
        this.member = member;
        this.fullName = fullName;
        this.relationship = relationship;
        this.allocationPercent = allocationPercent;
    }

    public UUID getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getRelationship() {
        return relationship;
    }

    public BigDecimal getAllocationPercent() {
        return allocationPercent;
    }
}
