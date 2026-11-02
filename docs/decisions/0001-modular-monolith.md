# 1. Modular monolith, packaged by domain

**Status:** Accepted

## Context

The domain has five clear areas (scheme, policy, member, premium, claim) with tight consistency
needs between them: a claim's eligibility depends on the member, the policy and the dates, and an
approval must snapshot beneficiaries in the same transaction. The team is one person and the
workload is small.

## Decision

Build a single Spring Boot service with one top-level package per domain
(`scheme`, `policy`, `member`, `premium`, `claim`) plus `security`, `common` and `seed`. Each
package owns its entities, repository, service, controller and DTOs. Cross-domain calls go through
services (for example `ClaimService` → `MemberService.findVisibleTo`), not other domains' repositories.

## Consequences

- One deployable, one database, ACID transactions across domains, simple local setup.
- Package boundaries keep a later split possible, but nothing enforces them yet. ArchUnit or Spring
  Modulith would make them checkable if the codebase grows.
