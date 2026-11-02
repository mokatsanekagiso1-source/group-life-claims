# 3. Self-issued JWTs with Spring's resource server

**Status:** Accepted

## Context

The API needs stateless authentication with three roles (MEMBER, ASSESSOR, ADMIN) and an
ownership link from a MEMBER user to their member record. A portfolio demo should run with one
command and no external identity provider.

## Decision

- `POST /api/auth/login` checks a BCrypt password hash and issues an HS256 JWT carrying `sub`,
  `role` and, for members, `memberId`.
- The same service validates tokens through `spring-boot-starter-oauth2-resource-server`
  (`NimbusJwtDecoder` with issuer validation), so the validation side is what a real deployment
  with an external identity provider would use.
- Role checks use `@PreAuthorize`; ownership checks live in the services
  (`MemberService.findVisibleTo`, `ClaimService.mayPerform`).
- The signing key comes from `JWT_SECRET` and is required outside the dev profile.

## Consequences

- No refresh tokens or revocation. Tokens live for 8 hours.
- The web app keeps the token in `localStorage`, which exposes it to any XSS. Acceptable for a demo
  with no third-party scripts; production would use an identity provider (for example Microsoft
  Entra ID) with the authorization-code flow, and swap the decoder for the provider's JWKS.
