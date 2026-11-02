import { Component, signal, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ClaimStatus } from '../core/models';
import { csvCell } from '../features/claims/claim-queue-page';
import { AllocationRing } from './allocation-ring';
import { ClaimProgress } from './claim-progress';
import { CountUp } from './count-up';
import { DonutChart, DonutSlice } from './donut-chart';
import { SlaBadge } from './sla-badge';

function render<T>(component: Type<T>, inputs: Record<string, unknown>): HTMLElement {
  const fixture = TestBed.createComponent(component);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ClaimProgress', () => {
  const states = (status: ClaimStatus) =>
    Array.from(render(ClaimProgress, { status }).querySelectorAll('li')).map((li) => li.getAttribute('data-state'));

  it('marks earlier stages done and the current one active', () => {
    expect(states('UNDER_ASSESSMENT')).toEqual(['done', 'current', 'upcoming', 'upcoming']);
  });

  it('completes every stage once paid', () => {
    expect(states('PAID')).toEqual(['done', 'done', 'done', 'done']);
  });

  it('stops the track at a rejection', () => {
    const el = render(ClaimProgress, { status: 'REJECTED' });
    expect(states('REJECTED')).toEqual(['done', 'done', 'stopped', 'upcoming']);
    expect(el.querySelector('[data-state=stopped]')?.textContent).toContain('Rejected');
  });

  it('stops at the start when cancelled', () => {
    expect(states('CANCELLED')[0]).toBe('stopped');
  });
});

describe('AllocationRing', () => {
  const ring = (total: number) => render(AllocationRing, { total }).querySelector('.ring')!;

  it('shows how much is left to allocate', () => {
    const el = ring(60);
    expect(el.getAttribute('data-state')).toBe('under');
    expect(el.textContent).toContain('40% left');
  });

  it('turns complete at exactly 100%, ignoring floating point noise', () => {
    expect(ring(33.34 + 33.33 + 33.33).getAttribute('data-state')).toBe('complete');
  });

  it('warns when over-allocated', () => {
    const el = ring(110);
    expect(el.getAttribute('data-state')).toBe('over');
    expect(el.textContent).toContain('10% too much');
  });
});

describe('DonutChart', () => {
  const slices: DonutSlice[] = [
    { label: 'Paid', value: 6, color: 'blue' },
    { label: 'Rejected', value: 2, color: 'red' },
    { label: 'Cancelled', value: 0, color: 'grey' },
  ];

  it('draws an arc per non-empty slice and shows the total', () => {
    const el = render(DonutChart, { slices, centerLabel: 'All claims' });

    expect(el.querySelectorAll('circle.arc')).toHaveLength(2);
    expect(el.querySelector('.total')?.textContent).toBe('8');
    expect(el.querySelectorAll('.legend li')).toHaveLength(3);
  });
});

describe('SlaBadge', () => {
  const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
  const level = (days: number) => render(SlaBadge, { since: daysAgo(days) }).querySelector('.sla')!.getAttribute('data-level');

  it('grades waiting time against the three-day target', () => {
    expect(level(1)).toBe('ok');
    expect(level(5)).toBe('warn');
    expect(level(12)).toBe('breach');
  });
});

@Component({
  imports: [CountUp],
  template: `<span [appCountUp]="value()" [format]="format"></span>`,
})
class CountUpHost {
  readonly value = signal(1234);
  readonly format = (v: number) => `R${Math.round(v)}`;
}

describe('CountUp', () => {
  it('renders the formatted final value (animation is skipped in tests without rAF timing)', async () => {
    const fixture = TestBed.createComponent(CountUpHost);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect((fixture.nativeElement as HTMLElement).textContent).toBe('R1234');
  });
});

describe('csvCell', () => {
  it('quotes values and doubles embedded quotes', () => {
    expect(csvCell('Smith, "Mike"')).toBe('"Smith, ""Mike"""');
  });

  it('defuses spreadsheet formula injection', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
  });
});
