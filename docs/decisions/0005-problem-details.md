# 5. RFC 9457 problem details with stable codes

**Status:** Accepted

## Context

Clients need to tell apart "your input is malformed", "the rules say no", "this conflicts with
current state" and "you may not do this", and show a useful message for each.

## Decision

Every error is an `application/problem+json` body with a `urn:grouplife:problem:*` type:

| Status | Type | When |
| --- | --- | --- |
| 400 | `validation` | Bean Validation failures, with an `errors` map per field |
| 401 | `unauthorized` | Missing, invalid or expired token; bad login |
| 403 | `forbidden` | Wrong role, or not the owner |
| 404 | `not-found` | Unknown id, or another member's claim |
| 409 | `invalid-claim-transition`, `conflict` | State machine violations, duplicates, concurrent edits |
| 422 | `business-rule` | A rule failed; `code` says which (for example `WAITING_PERIOD`) |

Errors raised in the security filter chain use the same format via `ProblemDetailSecurityHandler`.

## Consequences

- The UI shows `detail` directly and could switch on `code` for richer handling.
- A member asking for another member's claim gets 404 rather than 403, so claim ids cannot be probed.
