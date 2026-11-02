# 7. Host the demo on Azure Container Apps

**Status:** Accepted

## Context

The live demo needs the same two containers as local development, a managed PostgreSQL database,
HTTPS and low cost when idle. It should be reproducible from the repository.

## Decision

- Azure Container Apps runs the `web` and `api` images unchanged from Docker Compose. Only `web`
  has external ingress; the API is internal and reached through nginx, as locally.
- nginx's upstream addresses come from environment variables (`API_UPSTREAM`, `HEALTH_UPSTREAM`)
  rendered at container start, so one image works in both places.
- Azure Database for PostgreSQL Flexible Server (Burstable tier) holds the data, with TLS required.
- Everything is declared in one Bicep file and deployed by a manual GitHub Actions workflow that
  signs in to Azure with OpenID Connect, so no Azure credentials are stored in GitHub.
- Images go to GitHub Container Registry, tagged with the commit SHA.

## Consequences

- No Kubernetes to manage, and the web app scales to zero.
- Prometheus and Grafana are not deployed to Azure; locally they come with Compose. Azure Monitor
  managed Prometheus is the natural next step.
- The database firewall allows Azure services rather than using a private endpoint, which is a
  deliberate demo shortcut (see [deploy-azure.md](../deploy-azure.md)).
