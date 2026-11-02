package dev.grouplife.premium;

import dev.grouplife.common.error.NotFoundException;
import dev.grouplife.member.Member;
import dev.grouplife.member.MemberRepository;
import dev.grouplife.member.MemberService;
import dev.grouplife.policy.Policy;
import dev.grouplife.policy.PolicyRepository;
import dev.grouplife.premium.PremiumDtos.PremiumQuote;
import dev.grouplife.premium.PremiumDtos.PremiumSchedule;
import dev.grouplife.premium.PremiumDtos.RateBandView;
import dev.grouplife.security.CurrentUser;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PremiumService {

    private final AgeBandRateRepository rates;
    private final MemberService memberService;
    private final MemberRepository members;
    private final PolicyRepository policies;
    private final Clock clock;

    public PremiumService(AgeBandRateRepository rates, MemberService memberService, MemberRepository members,
            PolicyRepository policies, Clock clock) {
        this.rates = rates;
        this.memberService = memberService;
        this.members = members;
        this.policies = policies;
        this.clock = clock;
    }

    public PremiumQuote quoteForMember(UUID memberId, LocalDate asOf, CurrentUser user) {
        Member member = memberService.findVisibleTo(memberId, user);
        return quote(member, rateTable(), dateOrToday(asOf));
    }

    /** Monthly premium for every member active on the given date. */
    public PremiumSchedule scheduleForPolicy(UUID policyId, LocalDate asOf) {
        Policy policy = policies.findById(policyId).orElseThrow(() -> new NotFoundException("Policy", policyId));
        LocalDate date = dateOrToday(asOf);
        RateTable table = rateTable();
        List<PremiumQuote> quotes = members.findByPolicyIdOrderByLastNameAscFirstNameAsc(policyId).stream()
                .filter(m -> m.isActiveOn(date))
                .map(m -> quote(m, table, date))
                .toList();
        BigDecimal total = quotes.stream().map(PremiumQuote::monthlyPremium).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new PremiumSchedule(policyId, policy.getPolicyNumber(), date, quotes.size(), total, quotes);
    }

    public List<RateBandView> rateBands() {
        return rateTable().bands().stream()
                .map(b -> new RateBandView(b.minAge(), b.maxAge(), b.monthlyRate()))
                .toList();
    }

    private static PremiumQuote quote(Member member, RateTable table, LocalDate asOf) {
        int age = member.ageOn(asOf);
        BigDecimal cover = member.coverAmount();
        return new PremiumQuote(member.getId(), member.fullName(), age, cover, table.rateFor(age),
                table.monthlyPremium(cover, age), asOf);
    }

    private RateTable rateTable() {
        return new RateTable(rates.findAll().stream().map(AgeBandRate::toBand).toList());
    }

    private LocalDate dateOrToday(LocalDate date) {
        return date != null ? date : LocalDate.now(clock);
    }
}
