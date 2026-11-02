package dev.grouplife.claim;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.time.Duration;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Business metrics for the claims workflow:
 *
 * <ul>
 *   <li>{@code grouplife.claims.status}: claims currently in each status, read from the database at
 *       scrape time so it is correct across restarts and replicas.
 *   <li>{@code grouplife.claims.transitions}: committed status changes, by from and to status.
 *   <li>{@code grouplife.claims.decision.time}: submission to approval or rejection, by outcome.
 * </ul>
 */
@Component
class ClaimMetrics {

    static final String STATUS_GAUGE = "grouplife.claims.status";
    static final String TRANSITIONS = "grouplife.claims.transitions";
    static final String DECISION_TIME = "grouplife.claims.decision.time";

    private final MeterRegistry registry;

    ClaimMetrics(MeterRegistry registry, ClaimRepository claims) {
        this.registry = registry;
        for (ClaimStatus status : ClaimStatus.values()) {
            Gauge.builder(STATUS_GAUGE, claims, repo -> repo.countByStatus(status))
                    .description("Claims currently in each status")
                    .tag("status", status.name())
                    .register(registry);
        }
    }

    /** Runs after commit, so rolled-back transitions are never counted. */
    @TransactionalEventListener
    void on(ClaimTransitionedEvent event) {
        Counter.builder(TRANSITIONS)
                .description("Claim status changes")
                .tag("from", event.from() == null ? "NONE" : event.from().name())
                .tag("to", event.to().name())
                .register(registry)
                .increment();

        if (event.to().isDecision()) {
            Timer.builder(DECISION_TIME)
                    .description("Time from submission to an approve or reject decision")
                    .tag("outcome", event.to().name())
                    .serviceLevelObjectives(Duration.ofHours(1), Duration.ofDays(1), Duration.ofDays(3),
                            Duration.ofDays(7), Duration.ofDays(14), Duration.ofDays(30))
                    .register(registry)
                    .record(event.sinceSubmission());
        }
    }
}
