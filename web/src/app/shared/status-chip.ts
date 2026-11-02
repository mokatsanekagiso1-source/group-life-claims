import { Component, computed, input } from '@angular/core';
import { ClaimStatus } from '../core/models';
import { STATUS_LABELS } from './labels';

@Component({
  selector: 'app-status-chip',
  template: `<span class="chip" [attr.data-status]="status()">{{ label() }}</span>`,
  styles: `
    .chip {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 500;
      white-space: nowrap;
      background: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-on-surface);
    }
    [data-status='UNDER_ASSESSMENT'] {
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }
    [data-status='APPROVED'],
    [data-status='PAID'] {
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }
    [data-status='REJECTED'] {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
  `,
})
export class StatusChip {
  readonly status = input.required<ClaimStatus>();
  protected readonly label = computed(() => STATUS_LABELS[this.status()]);
}
