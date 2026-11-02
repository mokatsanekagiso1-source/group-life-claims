import { chooseOption, todayForInput } from '../support/e2e';

describe('Business rules in the UI', () => {
  it('refuses a claim inside the waiting period', () => {
    cy.loginAs('admin');
    cy.visit('/members');

    // Bongani Zulu joined a month ago, so the policy's waiting period still applies.
    cy.get('[data-cy=member-search]').type('Zulu');
    cy.get('[data-cy=member-table] tr.mat-mdc-row').should('have.length', 1).click();
    cy.get('[data-cy=new-claim]').click();

    chooseOption('cover-type', 'Death');
    cy.get('[data-cy=event-date]').type(todayForInput());
    cy.get('[data-cy=description]').type('Event inside the waiting period.');
    cy.get('[data-cy=submit-claim]').click();

    cy.get('[data-cy=submit-error]').should('contain', 'waiting period');
  });

  it('blocks approval until beneficiaries total 100%', () => {
    cy.loginAs('assessor');
    cy.visit('/claims');

    // Seeded: Sipho Dlamini's disability claim is under assessment and he has no beneficiaries.
    cy.get('[data-cy=claim-queue]').contains('Sipho Dlamini').click();
    cy.get('[data-cy=action-APPROVED]').click();
    cy.get('mat-dialog-container button').last().click();

    cy.get('[data-cy=claim-error]').should('contain', 'beneficiary allocations must total 100%');
    cy.get('[data-cy=claim-status]').should('contain', 'Under assessment');
  });
});
