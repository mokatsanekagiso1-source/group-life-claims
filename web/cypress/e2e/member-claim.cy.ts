import { chooseOption, claimAction, todayForInput } from '../support/e2e';

describe('A member submitting a claim', () => {
  beforeEach(() => {
    cy.loginAs('member');
    cy.visit('/');
  });

  it('lands on their own cover', () => {
    cy.get('[data-cy=member-name]').should('contain', 'Thandiwe Mokoena');
    cy.get('[data-cy=cover-amount]').invoke('text').should('match', /R\s?[\d,]+\.\d{2}/);
  });

  // Ends by cancelling the claim, so the spec can run again against the same database.
  it('submits a claim, sees it in the timeline and withdraws it', () => {
    cy.get('[data-cy=new-claim]').click();

    chooseOption('cover-type', 'Disability');
    cy.get('[data-cy=event-date]').type(todayForInput());
    cy.get('[data-cy=description]').type('Injured in a fall at work; unable to return.');
    cy.get('[data-cy=submit-claim]').click();

    cy.location('pathname').should('match', /^\/claims\/[0-9a-f-]{36}$/);
    cy.get('[data-cy=claim-number]').invoke('text').should('match', /^CLM-\d{6}$/);
    cy.get('[data-cy=claim-status]').should('contain', 'Submitted');
    cy.get('[data-cy=timeline] li').should('have.length', 1).first().should('contain', 'by member');

    // Members may only withdraw: no assessment actions are offered.
    cy.get('[data-cy=claim-actions] button').should('have.length', 1);
    claimAction('CANCELLED', 'Lodged with the wrong cover type.');

    cy.get('[data-cy=claim-status]').should('contain', 'Cancelled');
    cy.get('[data-cy=timeline] li').should('have.length', 2).last().should('contain', 'Lodged with the wrong cover type.');
    cy.get('[data-cy=claim-actions] button').should('not.exist');
  });

  it('is told why a claim is refused', () => {
    // The seed data already has an open funeral claim for this member.
    cy.get('[data-cy=new-claim]').click();
    chooseOption('cover-type', 'Funeral');
    cy.get('[data-cy=event-date]').type(todayForInput());
    cy.get('[data-cy=description]').type('Second funeral claim.');
    cy.get('[data-cy=submit-claim]').click();

    cy.get('[data-cy=submit-error]').should('contain', 'already has an open or paid FUNERAL claim');
    cy.location('pathname').should('match', /\/claims\/new$/);
  });
});
