import { Component, computed, input, signal } from '@angular/core';

export interface DonutSlice {
  label: string;
  value: number;
  /** Any CSS colour, including var(--token). */
  color: string;
}

const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Animated SVG donut with a legend; hovering a slice or legend row highlights it. */
@Component({
  selector: 'app-donut-chart',
  template: `
    <div class="donut">
      <svg viewBox="0 0 200 200" role="img" [attr.aria-label]="ariaLabel()">
        <circle class="track" cx="100" cy="100" [attr.r]="radius" />
        @for (arc of arcs(); track arc.label) {
          <circle
            class="arc"
            cx="100"
            cy="100"
            [attr.r]="radius"
            [style.stroke]="arc.color"
            [style.stroke-dasharray]="arc.dash"
            [style.stroke-dashoffset]="arc.offset"
            [style.--length]="circumference"
            [style.animation-delay.ms]="$index * 90"
            [class.dim]="active() !== null && active() !== arc.label"
            (mouseenter)="active.set(arc.label)"
            (mouseleave)="active.set(null)"
          />
        }
        <text x="100" y="94" class="total">{{ highlighted().value }}</text>
        <text x="100" y="118" class="caption">{{ highlighted().label }}</text>
      </svg>
      <ul class="legend">
        @for (slice of slices(); track slice.label) {
          <li
            [class.dim]="active() !== null && active() !== slice.label"
            (mouseenter)="active.set(slice.label)"
            (mouseleave)="active.set(null)"
          >
            <span class="swatch" [style.background]="slice.color"></span>
            <span class="label">{{ slice.label }}</span>
            <span class="value">{{ slice.value }}</span>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    .donut {
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
    }
    svg {
      width: 180px;
      height: 180px;
      flex: none;
      transform: rotate(-90deg);
    }
    circle {
      fill: none;
      stroke-width: 22;
    }
    .track {
      stroke: var(--mat-sys-surface-container-high);
    }
    .arc {
      cursor: pointer;
      animation: draw 900ms var(--ease-out) both;
      transition:
        opacity var(--motion-fast),
        stroke-width var(--motion-fast);
    }
    .arc:hover {
      stroke-width: 28;
    }
    .dim {
      opacity: 0.3;
    }
    text {
      transform: rotate(90deg);
      transform-origin: 100px 100px;
      text-anchor: middle;
      fill: var(--mat-sys-on-surface);
    }
    .total {
      font: 600 32px Roboto, sans-serif;
    }
    .caption {
      font: 13px Roboto, sans-serif;
      fill: var(--mat-sys-on-surface-variant);
    }
    .legend {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 6px;
      min-width: 180px;
    }
    .legend li {
      display: grid;
      grid-template-columns: 12px 1fr auto;
      align-items: center;
      gap: 10px;
      cursor: default;
      transition: opacity var(--motion-fast);
    }
    .swatch {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }
    .value {
      font-variant-numeric: tabular-nums;
      font-weight: 500;
    }
  `,
})
export class DonutChart {
  readonly slices = input.required<DonutSlice[]>();
  readonly centerLabel = input('Total');

  protected readonly radius = RADIUS;
  protected readonly circumference = CIRCUMFERENCE;
  protected readonly active = signal<string | null>(null);

  protected readonly total = computed(() => this.slices().reduce((sum, s) => sum + s.value, 0));

  protected readonly arcs = computed(() => {
    const total = this.total() || 1;
    let consumed = 0;
    return this.slices()
      .filter((slice) => slice.value > 0)
      .map((slice) => {
        const length = (slice.value / total) * CIRCUMFERENCE;
        // A 2px gap between slices keeps them readable.
        const visible = Math.max(0, length - 2);
        const arc = {
          label: slice.label,
          color: slice.color,
          dash: `${visible} ${CIRCUMFERENCE - visible}`,
          offset: -consumed,
        };
        consumed += length;
        return arc;
      });
  });

  protected readonly highlighted = computed(() => {
    const label = this.active();
    const slice = this.slices().find((s) => s.label === label);
    return slice ? { label: slice.label, value: slice.value } : { label: this.centerLabel(), value: this.total() };
  });

  protected readonly ariaLabel = computed(() =>
    this.slices()
      .map((s) => `${s.label}: ${s.value}`)
      .join(', '),
  );
}
