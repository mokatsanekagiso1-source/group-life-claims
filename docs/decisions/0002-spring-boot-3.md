# 2. Stay on Spring Boot 3.5 for now

**Status:** Accepted, to be revisited

## Context

The project brief specifies Spring Boot 3. By the time the project started, Spring Initializr only
offered Spring Boot 4.x, and the 3.5 line had left open-source support.

## Decision

Use Spring Boot 3.5.x (the last 3.x line) as the brief requires, pinned in `api/pom.xml`.

## Consequences

- Matches the brief and the most widely documented APIs (Spring Security 6, Hibernate 6,
  springdoc 2.8).
- Reviewers may notice the version is out of open-source support. The upgrade to Boot 4 is the
  first candidate follow-up; the code avoids deprecated APIs to keep that move small.
