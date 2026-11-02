package dev.grouplife.member;

import dev.grouplife.common.error.BusinessRuleException;
import dev.grouplife.policy.Policy;
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
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** An employee covered under a group policy. */
@Entity
@Table(name = "member")
public class Member {

    public static final BigDecimal FULL_ALLOCATION = new BigDecimal("100");

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "policy_id")
    private Policy policy;

    private String employeeNumber;
    private String firstName;
    private String lastName;
    private String email;
    private LocalDate dateOfBirth;
    private BigDecimal annualSalary;
    private LocalDate joinDate;
    private LocalDate exitDate;

    @Enumerated(EnumType.STRING)
    private MemberStatus status;

    private Instant createdAt;

    @OneToMany(mappedBy = "member", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("allocationPercent desc")
    private List<Beneficiary> beneficiaries = new ArrayList<>();

    protected Member() {}

    public Member(Policy policy, String employeeNumber, String firstName, String lastName, String email,
            LocalDate dateOfBirth, BigDecimal annualSalary, LocalDate joinDate, Instant createdAt) {
        this.policy = policy;
        this.employeeNumber = employeeNumber;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.dateOfBirth = dateOfBirth;
        this.annualSalary = annualSalary;
        this.joinDate = joinDate;
        this.status = MemberStatus.ACTIVE;
        this.createdAt = createdAt;
    }

    /** Covered from the join date up to and including the exit date, if any. */
    public boolean isActiveOn(LocalDate date) {
        return !date.isBefore(joinDate) && (exitDate == null || !date.isAfter(exitDate));
    }

    public LocalDate waitingPeriodEndsOn() {
        return joinDate.plusMonths(policy.getWaitingPeriodMonths());
    }

    public BigDecimal coverAmount() {
        return annualSalary.multiply(policy.getCoverMultiple()).setScale(2, RoundingMode.HALF_UP);
    }

    public int ageOn(LocalDate date) {
        return Period.between(dateOfBirth, date).getYears();
    }

    public void exit(LocalDate exitDate) {
        if (status == MemberStatus.EXITED) {
            throw new BusinessRuleException("MEMBER_ALREADY_EXITED", "Member has already exited the policy");
        }
        if (exitDate.isBefore(joinDate)) {
            throw new BusinessRuleException("EXIT_BEFORE_JOIN", "Exit date cannot be before the join date");
        }
        this.exitDate = exitDate;
        this.status = MemberStatus.EXITED;
    }

    /** Replaces all beneficiaries. Allocations must total exactly 100 percent. */
    public void replaceBeneficiaries(List<NewBeneficiary> nominations) {
        if (nominations.isEmpty()) {
            throw new BusinessRuleException("NO_BENEFICIARIES", "At least one beneficiary is required");
        }
        BigDecimal total = nominations.stream()
                .map(NewBeneficiary::allocationPercent)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (total.compareTo(FULL_ALLOCATION) != 0) {
            throw new BusinessRuleException("ALLOCATION_NOT_100",
                    "Beneficiary allocations must total 100%%, but total %s%%".formatted(total.stripTrailingZeros().toPlainString()));
        }
        beneficiaries.clear();
        nominations.forEach(n -> beneficiaries.add(
                new Beneficiary(this, n.fullName(), n.relationship(), n.allocationPercent())));
    }

    public boolean hasCompleteBeneficiaryAllocation() {
        BigDecimal total = beneficiaries.stream()
                .map(Beneficiary::getAllocationPercent)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return total.compareTo(FULL_ALLOCATION) == 0;
    }

    public String fullName() {
        return firstName + " " + lastName;
    }

    public record NewBeneficiary(String fullName, String relationship, BigDecimal allocationPercent) {}

    public UUID getId() {
        return id;
    }

    public Policy getPolicy() {
        return policy;
    }

    public String getEmployeeNumber() {
        return employeeNumber;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getEmail() {
        return email;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public BigDecimal getAnnualSalary() {
        return annualSalary;
    }

    public LocalDate getJoinDate() {
        return joinDate;
    }

    public LocalDate getExitDate() {
        return exitDate;
    }

    public MemberStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public List<Beneficiary> getBeneficiaries() {
        return List.copyOf(beneficiaries);
    }
}
