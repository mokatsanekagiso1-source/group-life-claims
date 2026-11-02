import { Component, computed, input } from '@angular/core';
import { SLA_DAYS } from './labels';

const DAY_MS = 86_400_000;

/** How long an open claim has waited, coloured against the decision SLA. */
@Component({
  selector: 'app-sla-badge',
  template: `<span class="sla" [attr.data-level]="level()" [attr.title]="title()">{{ text() }}</span>`,
  styles: `
    .sla {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 8px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
      background: var(--mat-sys-surface-container-high);
    }
    [data-level='warn'] {
      background: color-mix(in srgb, var(--status-assessment) 18%, transparent);
      color: var(--status-assessment);
    }
    [data-level='breach'] {
      background: color-mix(in srgb, var(--status-rejected) 16%, transparent);
      color: var(--status-rejected);
      animation: pulse-ring 1.8s ease-out infinite;
    }
  `,
})
export class SlaBadge {
  readonly since = input.required<string>();

  protected readonly days = computed(() => Math.max(0, Math.floor((Date.now() - Date.parse(this.since())) / DAY_MS)));
  protected readonly level = computed(() => {
    const days = this.days();
    return days > SLA_DAYS * 3 ? 'breach' : days > SLA_DAYS ? 'warn' : 'ok';
  });
  protected readonly text = computed(() => (this.days() === 0 ? 'today' : `${this.days()}d`));
  protected readonly title = computed(() => `Waiting ${this.days()} day(s); target is ${SLA_DAYS}`);
}
