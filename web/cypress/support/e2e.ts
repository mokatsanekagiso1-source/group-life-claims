/** Password shared by the dev profile's synthetic demo users. */
export const DEMO_PASSWORD = 'Password1!';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Signs in through the API and stores the session, skipping the login form. */
      loginAs(username: string): Chainable<void>;
      /** A bearer token for API-level test setup. */
      apiToken(username: string): Chainable<string>;
    }
  }
}

Cypress.Commands.add('apiToken', (username: string) =>
  cy
    .request('POST', '/api/auth/login', { username, password: DEMO_PASSWORD })
    .then((response) => response.body.accessToken as string),
);

Cypress.Commands.add('loginAs', (username: string) => {
  cy.request('POST', '/api/auth/login', { username, password: DEMO_PASSWORD }).then((response) => {
    window.localStorage.setItem('grouplife.session', JSON.stringify(response.body));
  });
});

/** Today as the date picker's M/D/YYYY input format. */
export function todayForInput(): string {
  const now = new Date();
  return `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
}

/** Picks an option from a Material select. */
export function chooseOption(selectCy: string, label: string): void {
  cy.get(`[data-cy=${selectCy}]`).click();
  cy.get('mat-option').contains(label).click();
}

/** Clicks a claim action and confirms its dialog, optionally with a reason. */
export function claimAction(target: string, reason?: string): void {
  cy.get(`[data-cy=action-${target}]`).click();
  cy.get('mat-dialog-container').within(() => {
    if (reason) {
      cy.get('textarea').type(reason);
    }
    cy.get('button').last().click();
  });
  cy.get('mat-dialog-container').should('not.exist');
}
