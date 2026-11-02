import { Component, computed, input } from '@angular/core';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Progress ring for beneficiary allocations: fills smoothly, turns green at exactly 100%. */
@Component({
  selector: 'app-allocation-ring',
  template: `
    <div class="ring" [attr.data-state]="state()">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle class="track" cx="60" cy="60" [attr.r]="radius" />
        <circle
          class="fill"
          cx="60"
          cy="60"
          [attr.r]="radius"
          [style.stroke-dasharray]="circumference"
          [style.stroke-dashoffset]="offset()"
        />
      </svg>
      <div class="center">
        <strong>{{ display() }}%</strong>
        <span>{{ caption() }}</span>
      </div>
    </div>
  `,
  styles: `
    .ring {
      position: relative;
      width: 140px;
      height: 140px;
    }
    svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    circle {
      fill: none;
      stroke-width: 10;
      stroke-linecap: round;
    }
    .track {
      stroke: var(--mat-sys-surface-container-high);
    }
    .fill {
      stroke: var(--mat-sys-primary);
      transition:
        stroke-dashoffset var(--motion-slow) var(--ease-out),
        stroke var(--motion-medium);
    }
    [data-state='complete'] .fill {
      stroke: var(--status-approved);
    }
    [data-state='over'] .fill {
      stroke: var(--status-rejected);
    }
    [data-state='complete'] {
      animation: pop-in var(--motion-medium) var(--ease-spring);
    }
    .center {
      position: absolute;
      inset: 0;
      display: grid;
      place-content: center;
      text-align: center;
    }
    strong {
      font-size: 1.6rem;
      font-variant-numeric: tabular-nums;
    }
    span {
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
    }
    [data-state='complete'] span {
      color: var(--status-approved);
    }
    [data-state='over'] span {
      color: var(--status-rejected);
    }
  `,
})
export class AllocationRing {
  readonly total = input.required<number>();

  protected readonly radius = RADIUS;
  protected readonly circumference = CIRCUMFERENCE;

  protected readonly state = computed(() => {
    const total = Math.round(this.total() * 100) / 100;
    return total === 100 ? 'complete' : total > 100 ? 'over' : 'under';
  });
  protected readonly offset = computed(() => CIRCUMFERENCE * (1 - Math.min(this.total(), 100) / 100));
  protected readonly display = computed(() => (Math.round(this.total() * 100) / 100).toString());
  protected readonly caption = computed(() => {
    const remaining = Math.round((100 - this.total()) * 100) / 100;
    switch (this.state()) {
      case 'complete':
        return 'All allocated';
      case 'over':
        return `${-remaining}% too much`;
      default:
        return `${remaining}% left`;
    }
  });
}
