package dev.grouplife.claim;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class ClaimMetricsTest {

    private static final Instant SUBMITTED = Instant.parse("2026-06-01T08:00:00Z");

    private final SimpleMeterRegistry registry = new SimpleMeterRegistry();
    private final ClaimRepository claims = mock(ClaimRepository.class);
    private final ClaimMetrics metrics = new ClaimMetrics(registry, claims);

    @Test
    void statusGaugeReadsLiveCounts() {
        when(claims.countByStatus(ClaimStatus.UNDER_ASSESSMENT)).thenReturn(7L);

        assertThat(registry.get(ClaimMetrics.STATUS_GAUGE).tag("status", "UNDER_ASSESSMENT").gauge().value())
                .isEqualTo(7.0);
        assertThat(registry.find(ClaimMetrics.STATUS_GAUGE).gauges()).hasSize(ClaimStatus.values().length);
    }

    @Test
    void countsTransitionsByFromAndTo() {
        metrics.on(event(null, ClaimStatus.SUBMITTED, SUBMITTED));
        metrics.on(event(ClaimStatus.SUBMITTED, ClaimStatus.UNDER_ASSESSMENT, SUBMITTED.plusSeconds(60)));
        metrics.on(event(ClaimStatus.SUBMITTED, ClaimStatus.UNDER_ASSESSMENT, SUBMITTED.plusSeconds(120)));

        assertThat(registry.get(ClaimMetrics.TRANSITIONS).tags("from", "NONE", "to", "SUBMITTED").counter().count())
                .isEqualTo(1.0);
        assertThat(registry.get(ClaimMetrics.TRANSITIONS).tags("from", "SUBMITTED", "to", "UNDER_ASSESSMENT")
                .counter().count()).isEqualTo(2.0);
    }

    @Test
    void timesDecisionsFromSubmission() {
        metrics.on(event(ClaimStatus.UNDER_ASSESSMENT, ClaimStatus.APPROVED, SUBMITTED.plus(Duration.ofDays(2))));
        metrics.on(event(ClaimStatus.UNDER_ASSESSMENT, ClaimStatus.REJECTED, SUBMITTED.plus(Duration.ofHours(5))));
        metrics.on(event(ClaimStatus.APPROVED, ClaimStatus.PAID, SUBMITTED.plus(Duration.ofDays(9))));

        var approved = registry.get(ClaimMetrics.DECISION_TIME).tag("outcome", "APPROVED").timer();
        assertThat(approved.count()).isEqualTo(1);
        assertThat(approved.totalTime(TimeUnit.HOURS)).isEqualTo(48.0);
        assertThat(registry.get(ClaimMetrics.DECISION_TIME).tag("outcome", "REJECTED").timer().count()).isEqualTo(1);
        assertThat(registry.find(ClaimMetrics.DECISION_TIME).tag("outcome", "PAID").timer()).isNull();
    }

    private static ClaimTransitionedEvent event(ClaimStatus from, ClaimStatus to, Instant at) {
        return new ClaimTransitionedEvent(UUID.randomUUID(), "CLM-000001", from, to, "tester", SUBMITTED, at);
    }
}
