package dev.grouplife.dashboard;

import dev.grouplife.claim.ClaimStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class DashboardDtos {

    private DashboardDtos() {}

    /** Operations overview for staff. */
    public record Dashboard(
            Map<ClaimStatus, Long> claimsByStatus,
            long openClaims,
            long assignedToMe,
            long unassigned,
            BigDecimal paidOut,
            BigDecimal awaitingPayment,
            Double averageDecisionHours,
            long decidedWithinSla,
            long decided,
            List<MonthCount> submittedByMonth,
            List<AgingClaim> oldestOpen,
            List<ActivityItem> recentActivity,
            long activeMembers,
            long schemes,
            Instant generatedAt) {}

    /** Claims submitted in a calendar month, labelled {@code yyyy-MM}. */
    public record MonthCount(String month, long count) {}

    public record AgingClaim(UUID id, String claimNumber, String memberName, ClaimStatus status, String assignee,
            Instant submittedAt, long ageDays) {}

    public record ActivityItem(UUID claimId, String claimNumber, String memberName, ClaimStatus fromStatus,
            ClaimStatus toStatus, String actor, String reason, Instant occurredAt) {}
}
