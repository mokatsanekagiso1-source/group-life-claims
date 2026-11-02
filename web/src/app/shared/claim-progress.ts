import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ClaimStatus } from '../core/models';
import { STATUS_ICONS, STATUS_LABELS } from './labels';

type StageState = 'done' | 'current' | 'upcoming' | 'stopped';

interface Stage {
  label: string;
  icon: string;
  state: StageState;
}

/** Index reached on the four-step track for each status. */
const REACHED: Record<ClaimStatus, number> = {
  SUBMITTED: 0,
  CANCELLED: 0,
  UNDER_ASSESSMENT: 1,
  APPROVED: 2,
  REJECTED: 2,
  PAID: 3,
};

/**
 * The claim's journey as a horizontal track: Submitted → Under assessment → Decision → Paid.
 * Rejected and cancelled claims stop the track early in an error colour.
 */
@Component({
  selector: 'app-claim-progress',
  imports: [MatIconModule],
  template: `
    <div class="track" [style.--progress]="progress()">
      <div class="rail" aria-hidden="true"><div class="fill" [class.stopped]="stopped()"></div></div>
      <ol [attr.aria-label]="'Claim progress: ' + currentLabel()">
        @for (stage of stages(); track $index) {
          <li [attr.data-state]="stage.state" [style.--i]="$index">
            <span class="dot"><mat-icon>{{ stage.icon }}</mat-icon></span>
            <span class="label">{{ stage.label }}</span>
          </li>
        }
      </ol>
    </div>
  `,
  styles: `
    .track {
      position: relative;
      margin: 8px 0 24px;
    }
    ol {
      position: relative;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .rail {
      position: absolute;
      top: 20px;
      left: 12.5%;
      right: 12.5%;
      height: 4px;
      border-radius: 4px;
      background: var(--mat-sys-surface-container-high);
      overflow: hidden;
    }
    .fill {
      height: 100%;
      width: calc(var(--progress) * 100%);
      background: var(--brand-gradient);
      transition: width var(--motion-slow) var(--ease-out);
    }
    .fill.stopped {
      background: var(--status-rejected);
    }
    li {
      display: grid;
      justify-items: center;
      gap: 8px;
      text-align: center;
      animation: rise-in var(--motion-medium) var(--ease-out) both;
      animation-delay: calc(var(--i) * 70ms);
    }
    .dot {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-on-surface-variant);
      transition:
        background var(--motion-medium),
        color var(--motion-medium),
        transform var(--motion-medium) var(--ease-spring);
    }
    [data-state='done'] .dot {
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
    }
    [data-state='current'] .dot {
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
      transform: scale(1.12);
      box-shadow: 0 0 0 6px color-mix(in srgb, var(--mat-sys-primary) 18%, transparent);
    }
    [data-state='stopped'] .dot {
      background: var(--status-rejected);
      color: #fff;
      transform: scale(1.12);
    }
    .label {
      font-size: 0.8rem;
      color: var(--mat-sys-on-surface-variant);
    }
    [data-state='current'] .label,
    [data-state='stopped'] .label {
      color: var(--mat-sys-on-surface);
      font-weight: 500;
    }
  `,
})
export class ClaimProgress {
  readonly status = input.required<ClaimStatus>();

  protected readonly stopped = computed(() => this.status() === 'REJECTED' || this.status() === 'CANCELLED');

  /** 0..1 along the rail. */
  protected readonly progress = computed(() => REACHED[this.status()] / 3);

  protected readonly stages = computed<Stage[]>(() => {
    const status = this.status();
    const reached = REACHED[status];
    const decided = status === 'APPROVED' || status === 'PAID';
    const steps: { label: string; icon: string }[] = [
      { label: STATUS_LABELS.SUBMITTED, icon: STATUS_ICONS.SUBMITTED },
      { label: STATUS_LABELS.UNDER_ASSESSMENT, icon: STATUS_ICONS.UNDER_ASSESSMENT },
      { label: decided ? STATUS_LABELS.APPROVED : 'Decision', icon: STATUS_ICONS.APPROVED },
      { label: STATUS_LABELS.PAID, icon: STATUS_ICONS.PAID },
    ];
    return steps.map((step, index) => {
      if (this.stopped() && index === reached) {
        return { label: STATUS_LABELS[status], icon: STATUS_ICONS[status], state: 'stopped' };
      }
      const state: StageState =
        index < reached || (index === reached && status === 'PAID')
          ? 'done'
          : index === reached
            ? 'current'
            : 'upcoming';
      return { ...step, state };
    });
  });

  protected readonly currentLabel = computed(() => STATUS_LABELS[this.status()]);
}
