# 6. Business metrics from the database, actuator on a private port

**Status:** Accepted

## Context

Operations want claims by status and time to decision on a dashboard. Counts kept in memory would
reset on restart and disagree across replicas.

## Decision

- `grouplife_claims_status{status}` is a gauge that counts claims in the database at scrape time.
- `grouplife_claims_transitions_total{from,to}` counts committed transitions, and
  `grouplife_claims_decision_time_seconds{outcome}` times submission to decision with
  service-level buckets (1h, 1d, 3d, 7d, 14d, 30d). Both are recorded by a
  `@TransactionalEventListener`, so rolled-back work is never counted.
- Actuator runs on port 8081, which is not published outside the compose network. Only the
  aggregate health status is proxied through the web server.
- Prometheus scrapes the API; Grafana is provisioned from files with the datasource and the
  "Group Life Claims" dashboard.

## Consequences

- The status gauge costs six cheap indexed count queries per scrape.
- Decision-time percentiles are estimates from coarse buckets, which suits a metric measured in
  days.
