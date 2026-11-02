# Web

Angular front end for the Group Life Claims Platform. See the [root README](../README.md) for how to
run the whole stack.

```bash
npm ci
npm start                      # dev server on http://localhost:4200, proxies /api to localhost:8080
npm test -- --watch=false      # unit tests (Vitest)
npm run build                  # production build in dist/web
npm run e2e                    # Cypress, against a running stack (docker compose up --build --wait)
```

Code layout:

```
src/app/core/       auth session, interceptor, guards, API clients, models
src/app/shared/     status chip, reason dialog, labels
src/app/features/   login, members, claims (one lazy-loaded page per route)
cypress/e2e/        end-to-end specs
```
