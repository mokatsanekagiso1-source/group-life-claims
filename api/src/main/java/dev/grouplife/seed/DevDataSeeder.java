package dev.grouplife.seed;

import dev.grouplife.claim.Claim;
import dev.grouplife.claim.ClaimDocument;
import dev.grouplife.claim.ClaimDocumentRepository;
import dev.grouplife.claim.ClaimDtos.SubmitClaimRequest;
import dev.grouplife.claim.ClaimDtos.TransitionRequest;
import dev.grouplife.claim.ClaimNote;
import dev.grouplife.claim.ClaimNoteRepository;
import dev.grouplife.claim.ClaimRepository;
import dev.grouplife.claim.ClaimService;
import dev.grouplife.claim.ClaimStatus;
import dev.grouplife.claim.DocumentCategory;
import dev.grouplife.claim.LegacyClaimImporter;
import dev.grouplife.claim.LegacyClaimImporter.Step;
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
 * and demo profiles). Every name, number and amount here is invented.
 */
@Component
@Order(1)
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
class DevDataSeeder implements ApplicationRunner {

    static final String DEMO_PASSWORD = "Password1!";

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);
    private static final long DAY_SECONDS = 86_400;

    private static final String[][] PEOPLE = {
        {"Thandiwe", "Mokoena"}, {"Pieter", "van der Merwe"}, {"Ayesha", "Patel"}, {"Sipho", "Dlamini"},
        {"Lerato", "Nkosi"}, {"Johan", "Botha"}, {"Nomvula", "Khumalo"}, {"Rajesh", "Naidoo"},
        {"Zanele", "Mthembu"}, {"Michael", "Smith"}, {"Palesa", "Molefe"}, {"Ahmed", "Ebrahim"},
        {"Karabo", "Sithole"}, {"Annelie", "du Plessis"}, {"Bongani", "Zulu"}, {"Fatima", "Hendricks"},
    };

    /** A step in a historical claim, timed in days after its submission. */
    private record Later(ClaimStatus status, String actor, String reason, double afterDays) {}

    private final SchemeRepository schemes;
    private final PolicyRepository policies;
    private final MemberRepository members;
    private final AppUserRepository users;
    private final ClaimService claimService;
    private final ClaimRepository claims;
    private final LegacyClaimImporter importer;
    private final ClaimNoteRepository notes;
    private final ClaimDocumentRepository documents;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    DevDataSeeder(SchemeRepository schemes, PolicyRepository policies, MemberRepository members,
            AppUserRepository users, ClaimService claimService, ClaimRepository claims, LegacyClaimImporter importer,
            ClaimNoteRepository notes, ClaimDocumentRepository documents, PasswordEncoder passwordEncoder,
            Clock clock) {
        this.schemes = schemes;
        this.policies = policies;
        this.members = members;
        this.users = users;
        this.claimService = claimService;
        this.claims = claims;
        this.importer = importer;
        this.notes = notes;
        this.documents = documents;
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
        createUser("assessor2", Role.ASSESSOR, null);
        createUser("member", Role.MEMBER, seeded.get(0).getId());
        createUser("member2", Role.MEMBER, seeded.get(1).getId());

        seedHistory(seeded, now);
        seedCurrentClaims(seeded, today, now);
        log.info("Seeded synthetic demo data: 2 schemes, {} members, {} claims, demo users "
                + "admin/assessor/assessor2/member/member2", seeded.size(), claims.count());
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

    /**
     * Six months of decided claims plus a few aging open ones, imported with their original
     * timestamps so the dashboard has trends, SLA figures and a realistic queue. Members 0, 1, 3
     * and 14 are left alone because the end-to-end tests rely on their state.
     */
    private void seedHistory(List<Member> seeded, Instant now) {
        historic(seeded.get(2), CoverType.FUNERAL, now, 160, "Funeral of a parent.",
                paid(1, 2, 5, "Death notice verified.", "EFT batch SYN-0102."));
        historic(seeded.get(4), CoverType.FUNERAL, now, 150, "Funeral of a spouse.",
                paid(0.2, 0.9, 3, "Fast-tracked: complete documents.", "EFT batch SYN-0107."));
        historic(seeded.get(5), CoverType.FUNERAL, now, 140, "Funeral of an uncle.",
                rejected(2, 6, "Uncles are not covered family members under this policy."));
        historic(seeded.get(6), CoverType.FUNERAL, now, 120, "Funeral of a child.",
                paid(0.5, 2, 4, "Birth and death certificates verified.", "EFT batch SYN-0115."));
        historic(seeded.get(8), CoverType.DEATH, now, 110, "Death after a short illness.",
                rejected(1, 4, "Pre-existing condition exclusion applies within the first 12 months."));
        historic(seeded.get(9), CoverType.DEATH, now, 95, "Death in a workplace accident.",
                paid(0.3, 1, 3, "Inquest finding and death notice verified.", "EFT batch SYN-0121."));
        historic(seeded.get(10), CoverType.FUNERAL, now, 80, "Funeral of a parent.",
                paid(1, 3, 6, "Death notice verified.", "EFT batch SYN-0126."));
        historic(seeded.get(12), CoverType.FUNERAL, now, 70, "Funeral of a sibling.",
                rejected(0.5, 2, "Siblings are not covered family members under this policy."));
        historic(seeded.get(13), CoverType.DISABILITY, now, 60, "Loss of sight after an infection.",
                paid(2, 8, 12, "Two specialist reports confirm permanent impairment.", "EFT batch SYN-0133."));
        historic(seeded.get(2), CoverType.DEATH, now, 50, "Lodged for a member who is alive.",
                List.of(new Later(ClaimStatus.CANCELLED, "assessor2", "Member is alive; lodged in error by HR.", 0.2)),
                null);
        historic(seeded.get(12), CoverType.DEATH, now, 45, "Death following a cardiac arrest.",
                paid(0.5, 2, 5, "Medical certificate verified.", "EFT batch SYN-0140."));
        historic(seeded.get(10), CoverType.DISABILITY, now, 35, "Back injury from lifting.",
                rejected(1, 5, "Medical evidence shows the condition is expected to improve."));
        historic(seeded.get(6), CoverType.DISABILITY, now, 25, "Amputation after a road accident.",
                List.of(new Later(ClaimStatus.UNDER_ASSESSMENT, "assessor", null, 0.5),
                        new Later(ClaimStatus.APPROVED, "assessor", "Hospital discharge summary verified.", 2)),
                "assessor");
        historic(seeded.get(13), CoverType.FUNERAL, now, 15, "Funeral of a spouse.",
                paid(0.2, 1, 2, "Death notice verified.", "EFT batch SYN-0151."));

        Claim waiting = historic(seeded.get(8), CoverType.FUNERAL, now, 9, "Funeral of a parent.", List.of(), null);
        Claim inProgress = historic(seeded.get(10), CoverType.DEATH, now, 16, "Death after a stroke.",
                List.of(new Later(ClaimStatus.UNDER_ASSESSMENT, "assessor", null, 1)), "assessor");
        Claim overdue = historic(seeded.get(12), CoverType.DISABILITY, now, 31, "Spinal injury from a fall.",
                List.of(new Later(ClaimStatus.UNDER_ASSESSMENT, "assessor2", null, 2)), "assessor2");
        historic(seeded.get(11), CoverType.FUNERAL, now, 2, "Funeral of a grandparent.", List.of(), null);

        note(inProgress, "assessor", Role.ASSESSOR, false, daysAgo(now, 14.8),
                "Hello. I'm assessing this claim. Please upload a certified copy of the deceased's ID.");
        note(inProgress, "assessor", Role.ASSESSOR, true, daysAgo(now, 14.7),
                "Employer confirmed salary and employment dates by email.");
        document(inProgress, "death-notice.pdf", DocumentCategory.DEATH_CERTIFICATE, daysAgo(now, 15.9),
                "Death notice", "Name: " + seeded.get(10).fullName(), "Cause: natural causes (stroke)");
        note(overdue, "assessor2", Role.ASSESSOR, true, daysAgo(now, 20),
                "Waiting on the second specialist opinion. Escalated to the medical officer.");
        document(overdue, "orthopaedic-report.pdf", DocumentCategory.MEDICAL_REPORT, daysAgo(now, 30.5),
                "Orthopaedic report", "Patient: " + seeded.get(12).fullName(), "Finding: T12 fracture");
        document(waiting, "death-certificate.pdf", DocumentCategory.DEATH_CERTIFICATE, daysAgo(now, 8.9),
                "Death certificate", "Deceased: parent of " + seeded.get(8).fullName());
    }

    /** Claims in the main demo states, created through the service so events and notifications fire. */
    private void seedCurrentClaims(List<Member> seeded, LocalDate today, Instant now) {
        var admin = new CurrentUser("admin", Role.ADMIN, null);
        var assessor = new CurrentUser("assessor", Role.ASSESSOR, null);

        UUID funeral = submit(seeded.get(0), CoverType.FUNERAL, today.minusDays(3),
                "Funeral of a covered family member.", admin);
        claims.findById(funeral).ifPresent(claim -> note(claim, "assessor", Role.ASSESSOR, false, now,
                "Thanks for your claim. We'll start the assessment once the death certificate is uploaded."));

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

    private static List<Later> paid(double startAfter, double approveAfter, double payAfter, String reason,
            String paymentReference) {
        return List.of(
                new Later(ClaimStatus.UNDER_ASSESSMENT, "assessor", null, startAfter),
                new Later(ClaimStatus.APPROVED, "assessor", reason, approveAfter),
                new Later(ClaimStatus.PAID, "assessor", paymentReference, payAfter));
    }

    private static List<Later> rejected(double startAfter, double rejectAfter, String reason) {
        return List.of(
                new Later(ClaimStatus.UNDER_ASSESSMENT, "assessor", null, startAfter),
                new Later(ClaimStatus.REJECTED, "assessor", reason, rejectAfter));
    }

    private Claim historic(Member member, CoverType coverType, Instant now, double daysAgo, String description,
            List<Later> later) {
        return historic(member, coverType, now, daysAgo, description, later, "assessor");
    }

    private Claim historic(Member member, CoverType coverType, Instant now, double daysAgo, String description,
            List<Later> later, String assignee) {
        Instant submitted = daysAgo(now, daysAgo);
        LocalDate eventDate = LocalDate.ofInstant(submitted, clock.getZone()).minusDays(3);
        List<Step> steps = later.stream()
                .map(s -> new Step(s.status(), s.actor(), s.reason(), submitted.plusSeconds(seconds(s.afterDays()))))
                .toList();
        return importer.importClaim(member, coverType, eventDate, description, "admin", submitted, steps, assignee);
    }

    private UUID submit(Member member, CoverType coverType, LocalDate eventDate, String description,
            CurrentUser user) {
        return claimService.submit(new SubmitClaimRequest(member.getId(), coverType, eventDate, description), user)
                .id();
    }

    private void move(UUID claimId, ClaimStatus target, String reason, CurrentUser user) {
        claimService.transition(claimId, new TransitionRequest(target, reason), user);
    }

    private void note(Claim claim, String author, Role role, boolean internal, Instant at, String body) {
        notes.save(new ClaimNote(claim, author, role, body, internal, at));
    }

    private void document(Claim claim, String fileName, DocumentCategory category, Instant at, String... lines) {
        documents.save(new ClaimDocument(claim, fileName, "application/pdf", category, SamplePdf.withLines(lines),
                "admin", at));
    }

    private static Instant daysAgo(Instant now, double days) {
        return now.minusSeconds(seconds(days));
    }

    private static long seconds(double days) {
        return Math.round(days * DAY_SECONDS);
    }
}
