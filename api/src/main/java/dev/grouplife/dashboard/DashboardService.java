package dev.grouplife.dashboard;

import dev.grouplife.claim.ClaimRepository;
import dev.grouplife.claim.ClaimRepository.DecisionTiming;
import dev.grouplife.claim.ClaimStatus;
import dev.grouplife.claim.ClaimTransition;
import dev.grouplife.claim.ClaimTransitionRepository;
import dev.grouplife.common.PageResponse;
import dev.grouplife.dashboard.DashboardDtos.ActivityItem;
import dev.grouplife.dashboard.DashboardDtos.AgingClaim;
import dev.grouplife.dashboard.DashboardDtos.Dashboard;
import dev.grouplife.dashboard.DashboardDtos.MonthCount;
import dev.grouplife.member.MemberRepository;
import dev.grouplife.member.MemberStatus;
import dev.grouplife.scheme.SchemeRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Aggregates for the staff dashboard, computed from the database on each request. */
@Service
@Transactional(readOnly = true)
public class DashboardService {

    /** Target for a decision after submission; drives the "decided within SLA" figure. */
    static final Duration DECISION_SLA = Duration.ofDays(3);
    static final int MONTHS = 6;

    private static final Set<ClaimStatus> OPEN = EnumSet.of(ClaimStatus.SUBMITTED, ClaimStatus.UNDER_ASSESSMENT);

    private final ClaimRepository claims;
    private final ClaimTransitionRepository transitions;
    private final MemberRepository members;
    private final SchemeRepository schemes;
    private final Clock clock;

    public DashboardService(ClaimRepository claims, ClaimTransitionRepository transitions, MemberRepository members,
            SchemeRepository schemes, Clock clock) {
        this.claims = claims;
        this.transitions = transitions;
        this.members = members;
        this.schemes = schemes;
        this.clock = clock;
    }

    public Dashboard dashboard(String username) {
        Instant now = clock.instant();

        Map<ClaimStatus, Long> byStatus = new EnumMap<>(ClaimStatus.class);
        for (ClaimStatus status : ClaimStatus.values()) {
            byStatus.put(status, 0L);
        }
        claims.countByStatusGrouped().forEach(row -> byStatus.put(row.getStatus(), row.getCount()));

        List<DecisionTiming> timings = claims.findDecisionTimings();
        Double averageHours = timings.isEmpty() ? null : timings.stream()
                .mapToLong(t -> Duration.between(t.getSubmittedAt(), t.getDecidedAt()).toMinutes())
                .average()
                .orElse(0) / 60.0;
        long withinSla = timings.stream()
                .filter(t -> Duration.between(t.getSubmittedAt(), t.getDecidedAt()).compareTo(DECISION_SLA) <= 0)
                .count();

        return new Dashboard(
                byStatus,
                byStatus.get(ClaimStatus.SUBMITTED) + byStatus.get(ClaimStatus.UNDER_ASSESSMENT),
                claims.countByStatusInAndAssignee(OPEN, username),
                claims.countByStatusInAndAssigneeIsNull(OPEN),
                claims.sumCoverAmountByStatus(ClaimStatus.PAID),
                claims.sumCoverAmountByStatus(ClaimStatus.APPROVED),
                averageHours == null ? null : Math.round(averageHours * 10) / 10.0,
                withinSla,
                timings.size(),
                submittedByMonth(now),
                claims.findTop5ByStatusInOrderBySubmittedAtAsc(OPEN).stream()
                        .map(c -> new AgingClaim(c.getId(), c.getClaimNumber(), c.getMember().fullName(), c.getStatus(),
                                c.getAssignee(), c.getSubmittedAt(),
                                Duration.between(c.getSubmittedAt(), now).toDays()))
                        .toList(),
                transitions.findTop12ByOrderByOccurredAtDesc().stream().map(DashboardService::toActivity).toList(),
                members.countByStatus(MemberStatus.ACTIVE),
                schemes.count(),
                now);
    }

    public PageResponse<ActivityItem> activity(Pageable pageable) {
        return PageResponse.of(transitions.findAllByOrderByOccurredAtDesc(pageable).map(DashboardService::toActivity));
    }

    /** Counts per month for the last {@link #MONTHS} months, including empty months. */
    private List<MonthCount> submittedByMonth(Instant now) {
        ZoneId zone = clock.getZone();
        YearMonth current = YearMonth.from(LocalDate.ofInstant(now, zone));
        YearMonth first = current.minusMonths(MONTHS - 1L);

        Map<YearMonth, Long> counts = new LinkedHashMap<>();
        for (int i = 0; i < MONTHS; i++) {
            counts.put(first.plusMonths(i), 0L);
        }
        Instant from = first.atDay(1).atStartOfDay(zone).toInstant();
        claims.findSubmissionTimesSince(from).forEach(at ->
                counts.computeIfPresent(YearMonth.from(LocalDate.ofInstant(at, zone)), (month, n) -> n + 1));

        return counts.entrySet().stream().map(e -> new MonthCount(e.getKey().toString(), e.getValue())).toList();
    }

    private static ActivityItem toActivity(ClaimTransition t) {
        return new ActivityItem(t.getClaim().getId(), t.getClaim().getClaimNumber(), t.getClaim().getMember().fullName(),
                t.getFromStatus(), t.getToStatus(), t.getActor(), t.getReason(), t.getOccurredAt());
    }
}
