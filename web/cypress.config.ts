import { defineConfig } from 'cypress';

/**
 * End-to-end tests run against the full Docker Compose stack (web, api, db) with the dev
 * profile's synthetic seed data. Start it with `docker compose up --build --wait` first.
 */
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    retries: { runMode: 1, openMode: 0 },
  },
});
