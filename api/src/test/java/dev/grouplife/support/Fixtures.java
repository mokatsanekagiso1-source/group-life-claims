package dev.grouplife.support;

import dev.grouplife.member.Member;
import dev.grouplife.member.Member.NewBeneficiary;
import dev.grouplife.policy.CoverType;
import dev.grouplife.policy.Policy;
import dev.grouplife.scheme.Scheme;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;

/** In-memory domain objects for unit tests. */
public final class Fixtures {

    public static final LocalDate TODAY = LocalDate.of(2026, 6, 15);
    public static final Instant NOW = Instant.parse("2026-06-15T10:00:00Z");

    private Fixtures() {}

    public static Policy policy() {
        return policy(EnumSet.allOf(CoverType.class), 6, TODAY.minusYears(5));
    }

    public static Policy policy(EnumSet<CoverType> coverTypes, int waitingMonths, LocalDate effectiveDate) {
        var scheme = new Scheme("Test Scheme Ltd", "SYN-TEST-1", "hr@test.example.com", NOW);
        return new Policy(scheme, "GL-TEST-1", coverTypes, new BigDecimal("3.00"), waitingMonths, effectiveDate, NOW);
    }

    /** A member aged 35, earning 400 000 a year (cover 1 200 000), who joined two years ago. */
    public static Member member(Policy policy) {
        return member(policy, TODAY.minusYears(2));
    }

    public static Member member(Policy policy, LocalDate joinDate) {
        return new Member(policy, "E0001", "Test", "Member", "test.member@example.com", TODAY.minusYears(35),
                new BigDecimal("400000.00"), joinDate, NOW);
    }

    public static Member memberWithBeneficiaries() {
        Member member = member(policy());
        member.replaceBeneficiaries(List.of(
                new NewBeneficiary("Spouse Member", "Spouse", new BigDecimal("60")),
                new NewBeneficiary("Child Member", "Child", new BigDecimal("40"))));
        return member;
    }
}
