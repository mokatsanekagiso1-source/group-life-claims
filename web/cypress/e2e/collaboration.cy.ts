describe('Working together on a claim', () => {
  it('lets a member message the assessor, who sees it in their notifications', () => {
    cy.loginAs('member');
    cy.visit('/');
    // The seeded funeral claim is the member's open claim.
    cy.get('[data-cy=member-claims]').contains('CLM-').click();

    const message = `Certificate is on its way (${Date.now()})`;
    cy.get('[data-cy=note-input]').type(message);
    cy.get('[data-cy=send-note]').click();
    cy.get('[data-cy=notes]').should('contain', message);

    cy.loginAs('assessor');
    cy.visit('/dashboard');
    cy.get('[data-cy=notifications]').click();
    cy.get('.notification-menu').should('contain', 'New message');
  });

  it('lets a member upload a supporting document', () => {
    cy.loginAs('member');
    cy.visit('/');
    cy.get('[data-cy=member-claims]').contains('CLM-').click();

    cy.get('[data-cy=drop-zone] input[type=file]').selectFile(
      {
        contents: Cypress.Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\n%%EOF\n'),
        fileName: 'death-certificate.pdf',
        mimeType: 'application/pdf',
      },
      { force: true },
    );

    cy.get('[data-cy=documents]').should('contain', 'death-certificate.pdf');
  });

  it('lets an assessor pick up an unassigned claim', () => {
    cy.loginAs('assessor');
    cy.visit('/claims?assignee=none');
    cy.get('[data-cy=claim-queue] tr.mat-mdc-row').first().click();

    cy.get('[data-cy=pick-up]').click();
    cy.get('[data-cy=assignee]').should('contain', 'assessor');
  });
});

describe('Member self-service', () => {
  it('rebalances beneficiaries with the allocation ring', () => {
    cy.loginAs('member');
    cy.visit('/');
    cy.get('[data-cy=edit-beneficiaries]').click();

    cy.get('[data-cy=beneficiary-share-0]').clear().type('70');
    cy.get('[data-cy=save-beneficiaries]').should('be.disabled');
    cy.contains('Add beneficiary').click();
    cy.get('[data-cy=beneficiary-name-1]').type('Lindiwe Mokoena');
    cy.get('[data-cy=save-beneficiaries]').should('not.be.disabled').click();

    cy.location('pathname').should('match', /^\/members\/[0-9a-f-]{36}$/);
    cy.contains('Lindiwe Mokoena');

    // Put things back so the spec can run again.
    cy.get('[data-cy=edit-beneficiaries]').click();
    cy.get('[data-cy=beneficiary-share-0]').clear().type('100');
    cy.get('button[aria-label="Remove beneficiary"]').eq(1).click();
    cy.get('[data-cy=save-beneficiaries]').click();
  });

  it('prices cover in the calculator', () => {
    cy.loginAs('member');
    cy.visit('/calculator');

    cy.get('[data-cy=quote]').invoke('text').should('match', /R\s?[\d\s,]+/);
  });
});

describe('Command palette', () => {
  it('jumps to a member with Ctrl+K', () => {
    cy.loginAs('admin');
    cy.visit('/dashboard');

    cy.get('body').type('{ctrl}k');
    cy.get('[data-cy=palette-input]').type('Zulu');
    cy.get('[data-cy=command-palette]').contains('Bongani Zulu').click();

    cy.get('[data-cy=member-name]').should('contain', 'Bongani Zulu');
  });
});
