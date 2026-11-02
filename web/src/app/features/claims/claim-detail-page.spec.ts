import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ClaimDetail } from '../../core/models';
import { ClaimDetailPage } from './claim-detail-page';

const CLAIM: ClaimDetail = {
  id: 'c-1',
  claimNumber: 'CLM-001001',
  memberId: 'm-1',
  memberName: 'Thandiwe Mokoena',
  policyNumber: 'GL-1001',
  coverType: 'DEATH',
  eventDate: '2026-05-01',
  description: 'Death due to illness.',
  status: 'APPROVED',
  coverAmount: 1200000,
  submittedAt: '2026-05-03T08:00:00Z',
  decidedAt: '2026-05-10T12:00:00Z',
  assignee: 'assessor',
  allowedTransitions: ['PAID'],
  transitions: [
    { fromStatus: null, toStatus: 'SUBMITTED', actor: 'member', reason: null, occurredAt: '2026-05-03T08:00:00Z' },
    { fromStatus: 'SUBMITTED', toStatus: 'UNDER_ASSESSMENT', actor: 'assessor', reason: null, occurredAt: '2026-05-04T09:00:00Z' },
    { fromStatus: 'UNDER_ASSESSMENT', toStatus: 'APPROVED', actor: 'assessor', reason: 'Documents verified', occurredAt: '2026-05-10T12:00:00Z' },
  ],
  payouts: [
    { beneficiaryName: 'Grace Mokoena', allocationPercent: 60, amount: 720000 },
    { beneficiaryName: 'Daniel Mokoena', allocationPercent: 40, amount: 480000 },
  ],
};

describe('ClaimDetailPage', () => {
  async function render(claim: ClaimDetail) {
    TestBed.configureTestingModule({
      imports: [ClaimDetailPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(ClaimDetailPage);
    fixture.componentRef.setInput('id', claim.id);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/claims/c-1').flush(claim);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the audit trail in order with reasons', async () => {
    const el = await render(CLAIM);

    const entries = Array.from(el.querySelectorAll('[data-cy=timeline] li')).map((li) => li.textContent ?? '');
    expect(entries).toHaveLength(3);
    expect(entries[0]).toContain('Submitted');
    expect(entries[2]).toContain('Approved');
    expect(entries[2]).toContain('by assessor');
    expect(entries[2]).toContain('Documents verified');
  });

  it('offers exactly the transitions the API allows', async () => {
    const el = await render(CLAIM);

    const actions = Array.from(el.querySelectorAll('[data-cy=claim-actions] button')).map((b) => b.textContent?.trim());
    expect(actions).toEqual(['Mark as paid']);
  });

  it('shows the frozen payout split', async () => {
    const el = await render(CLAIM);

    const rows = el.querySelectorAll('[data-cy=payouts] tr.mat-mdc-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Grace Mokoena');
    expect(rows[0].textContent).toContain('720,000.00');
  });

  it('shows no actions on a closed claim', async () => {
    const el = await render({ ...CLAIM, status: 'PAID', allowedTransitions: [] });

    expect(el.querySelectorAll('[data-cy=claim-actions] button')).toHaveLength(0);
  });
});
