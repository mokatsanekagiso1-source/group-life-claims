import { Component, computed, input } from '@angular/core';

export interface Bar {
  label: string;
  value: number;
}

/** Vertical bar chart whose bars grow in one after another. */
@Component({
  selector: 'app-bar-chart',
  template: `
    <div class="chart" role="img" [attr.aria-label]="ariaLabel()">
      @for (bar of bars(); track bar.label) {
        <div class="column" [attr.title]="bar.label + ': ' + bar.value">
          <span class="value">{{ bar.value }}</span>
          <div class="bar-track">
            <div
              class="bar"
              [style.height.%]="bar.height"
              [style.animation-delay.ms]="$index * 80"
              [class.peak]="bar.value === max() && bar.value > 0"
            ></div>
          </div>
          <span class="label">{{ bar.label }}</span>
        </div>
      }
    </div>
  `,
  styles: `
    .chart {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: 1fr;
      gap: 12px;
      height: 200px;
      align-items: end;
    }
    .column {
      display: grid;
      grid-template-rows: auto 1fr auto;
      height: 100%;
      text-align: center;
      gap: 6px;
    }
    .bar-track {
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .bar {
      width: min(42px, 100%);
      min-height: 3px;
      border-radius: 8px 8px 3px 3px;
      background: color-mix(in srgb, var(--mat-sys-primary) 55%, transparent);
      transform-origin: bottom;
      animation: grow-up 700ms var(--ease-spring) both;
      transition: background var(--motion-fast);
    }
    .bar.peak {
      background: var(--brand-gradient);
    }
    .column:hover .bar {
      background: var(--mat-sys-primary);
    }
    .value {
      font-weight: 500;
      font-variant-numeric: tabular-nums;
    }
    .label {
      font-size: 0.8rem;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class BarChart {
  readonly data = input.required<Bar[]>();

  protected readonly max = computed(() => Math.max(0, ...this.data().map((d) => d.value)));

  protected readonly bars = computed(() => {
    const max = this.max() || 1;
    return this.data().map((d) => ({ ...d, height: (d.value / max) * 100 }));
  });

  protected readonly ariaLabel = computed(() =>
    this.data()
      .map((d) => `${d.label}: ${d.value}`)
      .join(', '),
  );
}
