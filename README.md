# Group Life Claims Platform

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

A policy administration and claims platform for group life insurance: employer schemes, member
cover, beneficiaries, premiums and a claims workflow with a full audit trail. It is a portfolio
project, and all data is synthetic.

> **Status:** early development. The skeleton is in place; the domain and API come next.

## Stack

| Layer    | Technology                                                       |
| -------- | ---------------------------------------------------------------- |
| API      | Java 21, Spring Boot 3, Spring Data JPA, Flyway, PostgreSQL      |
| Web      | Angular, served by nginx                                         |
| Testing  | JUnit 5, Testcontainers, Vitest                                  |
| Ops      | Docker Compose, GitHub Actions                                   |

## Quick start

Requires Docker.

```bash
docker compose up --build
```

| Service  | URL                                  |
| -------- | ------------------------------------ |
| Web      | http://localhost:4200                |
| API      | http://localhost:8080/actuator/health |
| Postgres | localhost:5432 (`grouplife` / `grouplife`) |

To change ports or credentials, copy `infra/.env.example` to `infra/.env` and edit it.

## Local development

```bash
# Database only
docker compose up db

# API (http://localhost:8080)
cd api && ./mvnw spring-boot:run

# Web (http://localhost:4200, proxies /api and /actuator to the API)
cd web && npm ci && npm start
```

Run the tests:

```bash
cd api && ./mvnw verify          # integration tests need Docker for Testcontainers
cd web && npm test -- --watch=false
```

## Repository layout

```
api/     Spring Boot service
web/     Angular app
infra/   Docker Compose and, later, Prometheus and Grafana config
docs/    Architecture notes and decision records (docs/decisions/)
```
