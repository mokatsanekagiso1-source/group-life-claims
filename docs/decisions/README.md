# Architecture decision records

Short records of significant design decisions, numbered in order: `NNNN-short-title.md`.

Each record has four parts: **Status** (proposed, accepted or superseded), **Context**,
**Decision** and **Consequences**. Keep them to a page or less.

| # | Decision |
| --- | --- |
| [0001](0001-modular-monolith.md) | Modular monolith, packaged by domain |
| [0002](0002-spring-boot-3.md) | Stay on Spring Boot 3.5 for now |
| [0003](0003-self-issued-jwt.md) | Self-issued JWTs with Spring's resource server |
| [0004](0004-claim-state-machine-and-audit.md) | Claim state machine in the domain, with an append-only audit trail |
| [0005](0005-problem-details.md) | RFC 9457 problem details with stable codes |
| [0006](0006-observability.md) | Business metrics from the database, actuator on a private port |
