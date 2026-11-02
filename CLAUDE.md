# Group Life Claims Platform — project brief

## Purpose
A public portfolio project that shows production-grade fintech engineering: a group life
insurance policy administration and claims platform. The audience is technical reviewers and
hiring managers, so engineering quality and polish matter more than feature count.

**Hard rule:** no employer or client code, names, data or secrets. All data is synthetic.

## Stack
- **Backend:** Java 21, Spring Boot 3, Spring Data JPA, Spring Security (JWT), Bean Validation,
  Flyway, PostgreSQL, springdoc-openapi
- **Frontend:** Angular (current version), Angular Material
- **Testing:** JUnit 5, Mockito, Testcontainers (PostgreSQL), Cypress for end-to-end
- **Ops:** Docker Compose (db, api, web, prometheus, grafana), GitHub Actions CI,
  Micrometer → Prometheus → Grafana
- **Deploy (later):** Azure

## Repo layout
```
/api        Spring Boot service
/web        Angular app
/infra      docker-compose, prometheus config, grafana provisioning
/docs       architecture diagram, ADRs in docs/decisions/
```

## Domain model
- **Scheme (employer):** a company holding a group policy
- **Policy:** cover types (death, disability, funeral), cover as a multiple of annual salary,
  effective date, status
- **Member:** employee on a policy, with salary, date of birth, join date, status
- **Beneficiary:** belongs to a member; allocation percentages must total 100
- **Premium:** monthly premium per member = cover amount × rate from an age-band rate table
- **Claim:** state machine with an audit trail (who, when, why) for every transition
  - SUBMITTED → UNDER_ASSESSMENT → APPROVED or REJECTED
  - APPROVED → PAID
  - SUBMITTED or UNDER_ASSESSMENT → CANCELLED
  - Invalid transitions are rejected with a clear error

## Business rules
- A claim is valid only if the member was active on the event date
- A waiting period applies from the member's join date
- Payout = cover amount, split across beneficiaries by allocation
- Roles: MEMBER (submits claims), ASSESSOR (assesses), ADMIN (manages schemes and policies)

## Architecture
- Modular monolith, packaged by domain: scheme, policy, member, claim, premium
- REST API with DTOs, validation and a global error handler returning RFC 9457 problem details
- Audit log table for claim transitions
- Synthetic seed data loaded on startup in the dev profile

## Milestones (stop after each one for review)
1. **Skeleton:** monorepo layout, `docker compose up` starts db, api and web, CI builds and runs
   tests, README stub
2. **Domain and API:** entities, Flyway migrations, endpoints, claim transitions, OpenAPI docs,
   seed data
3. **Tests:** unit tests for the claim state machine and premium calculation, Testcontainers
   integration tests for the API
4. **Frontend:** login, member list and detail, submit claim, assessor queue, claim timeline
5. **Observability:** metrics (claims by status, time to decision), provisioned Grafana dashboard
6. **End-to-end:** Cypress tests running in CI
7. **README polish:** demo GIF, Mermaid architecture diagram, design decisions, one-command setup
8. **Deploy:** Azure, with the live demo link at the top of the README

## Working conventions
- Conventional commits, small commits
- Every feature ships with tests; CI stays green
- Never commit secrets; provide `.env.example`
- Record significant design decisions as short ADRs in `docs/decisions/`
