package dev.grouplife.seed;

import dev.grouplife.claim.ClaimDtos.SubmitClaimRequest;
import dev.grouplife.claim.ClaimDtos.TransitionRequest;
import dev.grouplife.claim.ClaimService;
import dev.grouplife.claim.ClaimStatus;
import dev.grouplife.member.Member;
import dev.grouplife.member.Member.NewBeneficiary;
import dev.grouplife.member.MemberRepository;
import dev.grouplife.policy.CoverType;
import dev.grouplife.policy.Policy;
import dev.grouplife.policy.PolicyRepository;
import dev.grouplife.scheme.Scheme;
import dev.grouplife.scheme.SchemeRepository;
import dev.grouplife.security.AppUser;
import dev.grouplife.security.AppUserRepository;
import dev.grouplife.security.CurrentUser;
import dev.grouplife.security.Role;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Loads synthetic demo data into an empty database. Enabled by {@code app.seed.enabled} (the dev
 * profile). Every name, number and amount here is invented.
 */
@Component
@Order(1)
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
class DevDataSeeder implements ApplicationRunner {

    static final String DEMO_PASSWORD = "Password1!";

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

    private static final String[][] PEOPLE = {
        {"Thandiwe", "Mokoena"}, {"Pieter", "van der Merwe"}, {"Ayesha", "Patel"}, {"Sipho", "Dlamini"},
        {"Lerato", "Nkosi"}, {"Johan", "Botha"}, {"Nomvula", "Khumalo"}, {"Rajesh", "Naidoo"},
        {"Zanele", "Mthembu"}, {"Michael", "Smith"}, {"Palesa", "Molefe"}, {"Ahmed", "Ebrahim"},
        {"Karabo", "Sithole"}, {"Annelie", "du Plessis"}, {"Bongani", "Zulu"}, {"Fatima", "Hendricks"},
    };

    private final SchemeRepository schemes;
    private final PolicyRepository policies;
    private final MemberRepository members;
    private final AppUserRepository users;
    private final ClaimService claimService;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    DevDataSeeder(SchemeRepository schemes, PolicyRepository policies, MemberRepository members,
            AppUserRepository users, ClaimService claimService, PasswordEncoder passwordEncoder, Clock clock) {
        this.schemes = schemes;
        this.policies = policies;
        this.members = members;
        this.users = users;
        this.claimService = claimService;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (schemes.count() > 0) {
            return;
        }
        Instant now = clock.instant();
        LocalDate today = LocalDate.now(clock);

        Scheme logistics = schemes.save(new Scheme("Example Logistics Ltd", "SYN-2015-000101",
                "hr@logistics.example.com", now));
        Scheme software = schemes.save(new Scheme("Sample Software Ltd", "SYN-2019-000202",
                "people@software.example.com", now));

        Policy logisticsPolicy = policies.save(new Policy(logistics, "GL-1001",
                EnumSet.of(CoverType.DEATH, CoverType.DISABILITY, CoverType.FUNERAL), new BigDecimal("3.00"), 6,
                today.minusYears(6), now));
        Policy softwarePolicy = policies.save(new Policy(software, "GL-2001",
                EnumSet.of(CoverType.DEATH, CoverType.FUNERAL), new BigDecimal("4.00"), 3,
                today.minusYears(3), now));

        List<Member> seeded = new ArrayList<>();
        for (int i = 0; i < PEOPLE.length; i++) {
            Policy policy = i % 3 == 2 ? softwarePolicy : logisticsPolicy;
            String first = PEOPLE[i][0];
            String last = PEOPLE[i][1];
            // Most joined years ago; the last two are still in their waiting period.
            LocalDate joinDate = i >= PEOPLE.length - 2
                    ? today.minusMonths(1)
                    : today.minusYears(1 + i % 5).minusMonths(i);
            if (joinDate.isBefore(policy.getEffectiveDate())) {
                joinDate = policy.getEffectiveDate();
            }
            var member = new Member(policy, "E%04d".formatted(1001 + i), first, last,
                    "%s.%s@example.com".formatted(first, last.replace(" ", "")).toLowerCase(),
                    today.minusYears(24 + (i * 37 % 38)).minusDays(i * 11L),
                    new BigDecimal(240_000 + (i * 53_000 % 700_000)), joinDate, now);
            if (i % 4 != 3) {
                member.replaceBeneficiaries(beneficiariesFor(last, i));
            }
            seeded.add(members.save(member));
        }
        seeded.get(5).exit(today.minusMonths(2));

        createUser("admin", Role.ADMIN, null);
        createUser("assessor", Role.ASSESSOR, null);
        createUser("member", Role.MEMBER, seeded.get(0).getId());
        createUser("member2", Role.MEMBER, seeded.get(1).getId());

        seedClaims(seeded, today);
        log.info("Seeded synthetic demo data: 2 schemes, {} members, demo users admin/assessor/member/member2",
                seeded.size());
    }

    private void createUser(String username, Role role, UUID memberId) {
        if (users.findByUsername(username).isEmpty()) {
            users.save(new AppUser(username, passwordEncoder.encode(DEMO_PASSWORD), role, memberId));
        }
    }

    private static List<NewBeneficiary> beneficiariesFor(String lastName, int i) {
        return switch (i % 3) {
            case 0 -> List.of(new NewBeneficiary("Naledi " + lastName, "Spouse", new BigDecimal("100")));
            case 1 -> List.of(
                    new NewBeneficiary("Grace " + lastName, "Spouse", new BigDecimal("60")),
                    new NewBeneficiary("Daniel " + lastName, "Child", new BigDecimal("40")));
            default -> List.of(
                    new NewBeneficiary("Ruth " + lastName, "Parent", new BigDecimal("33.34")),
                    new NewBeneficiary("Samuel " + lastName, "Sibling", new BigDecimal("33.33")),
                    new NewBeneficiary("Esther " + lastName, "Sibling", new BigDecimal("33.33")));
        };
    }

    /** Claims in every status, created through the service so the audit trail is real. */
    private void seedClaims(List<Member> seeded, LocalDate today) {
        var admin = new CurrentUser("admin", Role.ADMIN, null);
        var assessor = new CurrentUser("assessor", Role.ASSESSOR, null);

        submit(seeded.get(0), CoverType.FUNERAL, today.minusDays(3),
                "Funeral of a covered family member.", admin);
        // Member 3 has no beneficiaries yet, so approving this claim demonstrates the BENEFICIARIES_INCOMPLETE rule.
        UUID underAssessment = submit(seeded.get(3), CoverType.DISABILITY, today.minusDays(20),
                "Permanent disability following a workplace incident.", admin);
        move(underAssessment, ClaimStatus.UNDER_ASSESSMENT, null, assessor);

        UUID approved = submit(seeded.get(4), CoverType.DEATH, today.minusDays(40), "Death due to illness.", admin);
        move(approved, ClaimStatus.UNDER_ASSESSMENT, null, assessor);
        move(approved, ClaimStatus.APPROVED, "Medical certificate and death notice verified.", assessor);

        UUID paid = submit(seeded.get(6), CoverType.DEATH, today.minusDays(75), "Death in a road accident.", admin);
        move(paid, ClaimStatus.UNDER_ASSESSMENT, null, assessor);
        move(paid, ClaimStatus.APPROVED, "Police report and death notice verified.", assessor);
        move(paid, ClaimStatus.PAID, "EFT batch SYN-0001.", assessor);

        UUID rejected = submit(seeded.get(7), CoverType.DISABILITY, today.minusDays(30),
                "Temporary back injury.", admin);
        move(rejected, ClaimStatus.UNDER_ASSESSMENT, null, assessor);
        move(rejected, ClaimStatus.REJECTED, "Condition is temporary; policy covers permanent disability only.",
                assessor);

        UUID cancelled = submit(seeded.get(9), CoverType.FUNERAL, today.minusDays(10), "Submitted in error.", admin);
        move(cancelled, ClaimStatus.CANCELLED, "Duplicate of a claim lodged by the employer.", assessor);
    }

    private UUID submit(Member member, CoverType coverType, LocalDate eventDate, String description,
            CurrentUser user) {
        return claimService.submit(new SubmitClaimRequest(member.getId(), coverType, eventDate, description), user)
                .id();
    }

    private void move(UUID claimId, ClaimStatus target, String reason, CurrentUser user) {
        claimService.transition(claimId, new TransitionRequest(target, reason), user);
    }
}
