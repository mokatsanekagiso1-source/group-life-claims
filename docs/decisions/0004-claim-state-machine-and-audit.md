# 4. Claim state machine in the domain, with an append-only audit trail

**Status:** Accepted

## Context

Claims follow a fixed lifecycle (SUBMITTED → UNDER_ASSESSMENT → APPROVED/REJECTED → PAID, with
cancellation while open). Every change must record who, when and why, and invalid moves must fail
clearly.

## Decision

- `ClaimStatus` owns the transition table. `Claim.transitionTo` is the only way to change status:
  it checks the table, requires a reason for REJECTED and CANCELLED, and appends a
  `ClaimTransition` row. Submission writes the first row (from `null`).
- Invalid moves throw `InvalidClaimTransitionException`, returned as 409 with `from`, `to` and the
  `allowed` targets.
- Who may make each move is decided in `ClaimService.mayPerform`. Claim responses include
  `allowedTransitions` for the current user, so the UI shows only actions that will succeed.
- On approval, the payout split is calculated from the current beneficiaries and stored in
  `claim_payout`, so later beneficiary changes cannot alter a decided claim.
- `Claim` has an `@Version` column; concurrent decisions on the same claim fail with 409.

## Consequences

- The rules are plain Java, unit tested without Spring (`ClaimStatusTest`, `ClaimTest`).
- The audit table is append-only by convention, not by database permission. A production system
  would revoke UPDATE/DELETE on it for the application role.
- A library such as Spring Statemachine was not needed for six states.
