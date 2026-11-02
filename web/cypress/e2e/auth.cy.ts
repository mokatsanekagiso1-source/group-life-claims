import { DEMO_PASSWORD } from '../support/e2e';

describe('Signing in', () => {
  it('rejects a wrong password with a clear message', () => {
    cy.visit('/login');
    cy.get('[data-cy=username]').type('admin');
    cy.get('[data-cy=password]').type('not-the-password');
    cy.get('[data-cy=sign-in]').click();

    cy.get('[role=alert]').should('contain', 'Invalid username or password');
    cy.location('pathname').should('eq', '/login');
  });

  it('takes an admin to the dashboard and back out again', () => {
    cy.visit('/login');
    cy.get('[data-cy=username]').type('admin');
    cy.get('[data-cy=password]').type(DEMO_PASSWORD);
    cy.get('[data-cy=sign-in]').click();

    cy.location('pathname').should('eq', '/dashboard');
    cy.get('[data-cy=kpi]').should('have.length', 6);

    cy.get('[data-cy=account]').click();
    cy.get('[data-cy=current-user]').should('contain', 'admin');
    cy.get('[data-cy=sign-out]').click();
    cy.location('pathname').should('eq', '/login');
  });

  it('signs in with one click from a demo account', () => {
    cy.visit('/login');
    cy.get('[data-cy=demo-member]').click();

    cy.location('pathname').should('match', /^\/members\/[0-9a-f-]{36}$/);
  });

  it('keeps members out of staff pages', () => {
    cy.loginAs('member');
    cy.visit('/members');

    cy.location('pathname').should('match', /^\/members\/[0-9a-f-]{36}$/);
    cy.get('[data-cy=nav-members]').should('not.exist');
  });

  it('sends signed-out visitors to the login page', () => {
    cy.visit('/claims');

    cy.location('pathname').should('eq', '/login');
  });
});
