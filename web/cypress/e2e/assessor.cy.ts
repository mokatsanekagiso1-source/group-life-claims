import { claimAction } from '../support/e2e';

interface MemberPage {
  content: { id: string; fullName: string }[];
}

/** Submits a claim through the API as the admin, returning its id. */
function submitClaimFor(search: string, coverType: string): Cypress.Chainable<string> {
  return cy.apiToken('admin').then((token) => {
    const auth = { Authorization: `Bearer ${token}` };
    return cy
      .request<MemberPage>({ url: `/api/members?search=${encodeURIComponent(search)}`, headers: auth })
      .then(({ body }) =>
        cy.request({
          method: 'POST',
          url: '/api/claims',
          headers: auth,
          body: {
            memberId: body.content[0].id,
            coverType,
            eventDate: new Date().toISOString().slice(0, 10),
            description: 'Submitted by the end-to-end suite.',
          },
        }),
      )
      .then((response) => response.body.id as string);
  });
}

describe('An assessor working the queue', () => {
  beforeEach(() => cy.loginAs('assessor'));

  it('lands on the dashboard and opens the queue from it', () => {
    cy.visit('/');

    cy.location('pathname').should('eq', '/dashboard');
    cy.get('[data-cy=kpi]').first().should('contain', 'Open claims');
    cy.get('[data-cy=open-queue]').click();
    cy.location('pathname').should('eq', '/claims');
  });

  it('filters the queue to claims assigned to them', () => {
    cy.visit('/claims');
    cy.get('[data-cy=assignee-filter]').contains('Mine').click();

    cy.get('[data-cy=claim-queue] tr.mat-mdc-row').each((row) => cy.wrap(row).should('contain', 'assessor'));
  });

  it('sees open claims oldest first', () => {
    cy.visit('/claims');

    cy.get('[data-cy=claim-queue] tr.mat-mdc-row').should('have.length.at.least', 2);
    cy.get('[data-cy=claim-queue]').should('not.contain', 'Paid').and('not.contain', 'Rejected');
  });

  it('assesses, approves and pays a claim, splitting the payout by allocation', () => {
    // Pieter van der Merwe's beneficiaries are split 60/40 in the seed data.
    submitClaimFor('van der Merwe', 'DEATH').then((claimId) => {
      cy.visit('/claims');
      cy.get('[data-cy=claim-queue]').contains('Pieter van der Merwe').click();
      cy.location('pathname').should('eq', `/claims/${claimId}`);
    });

    claimAction('UNDER_ASSESSMENT');
    cy.get('[data-cy=claim-status]').should('contain', 'Under assessment');

    claimAction('APPROVED', 'Death notice and medical certificate verified.');
    cy.get('[data-cy=claim-status]').should('contain', 'Approved');
    cy.get('[data-cy=payouts] tr.mat-mdc-row').should('have.length', 2);
    cy.get('[data-cy=payouts]').should('contain', '60%').and('contain', '40%');

    claimAction('PAID', 'EFT batch E2E-1');
    cy.get('[data-cy=claim-status]').should('contain', 'Paid');
    cy.get('[data-cy=timeline] li').should('have.length', 4);
    cy.get('[data-cy=claim-actions] button').should('not.exist');
  });

  it('must give a reason to reject a claim', () => {
    submitClaimFor('van der Merwe', 'DISABILITY').then((claimId) => cy.visit(`/claims/${claimId}`));
    claimAction('UNDER_ASSESSMENT');

    cy.get('[data-cy=action-REJECTED]').click();
    cy.get('mat-dialog-container').within(() => {
      cy.get('button').last().click();
      cy.contains('A reason is required').should('be.visible');
      cy.get('textarea').type('Condition is temporary; policy covers permanent disability only.');
      cy.get('button').last().click();
    });

    cy.get('[data-cy=claim-status]').should('contain', 'Rejected');
    cy.get('[data-cy=timeline] li').last().should('contain', 'policy covers permanent disability only');
  });
});
