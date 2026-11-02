import { CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { ClaimsApi } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { ClaimDetail, ClaimStatus } from '../../core/models';
import { problemMessage } from '../../core/problem';
import { ClaimProgress } from '../../shared/claim-progress';
import { Confetti } from '../../shared/confetti';
import { ACTION_LABELS, COVER_LABELS, requiresReason, STATUS_COLORS, STATUS_ICONS, STATUS_LABELS } from '../../shared/labels';
import { ReasonDialog, ReasonDialogData } from '../../shared/reason-dialog';
import { SlaBadge } from '../../shared/sla-badge';
import { StatusChip } from '../../shared/status-chip';
import { ClaimDocuments } from './claim-documents';
import { ClaimNotes } from './claim-notes';

@Component({
  selector: 'app-claim-detail-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    PercentPipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
    MatTooltipModule,
    ClaimDocuments,
    ClaimNotes,
    ClaimProgress,
    SlaBadge,
    StatusChip,
  ],
  template: `
    @if (busy()) {
      <mat-progress-bar mode="indeterminate" class="busy" />
    }
    @if (error()) {
      <p class="error" role="alert" data-cy="claim-error">{{ error() }}</p>
    }

    @if (claim(); as c) {
      <header class="page-header">
        <div>
          <h1>
            <span data-cy="claim-number">{{ c.claimNumber }}</span>
            <app-status-chip [status]="c.status" data-cy="claim-status" />
            @if (isOpen()) {
              <app-sla-badge [since]="c.submittedAt" />
            }
          </h1>
          <p class="subtitle">
            {{ coverLabels[c.coverType] }} claim for
            <a [routerLink]="['/members', c.memberId]">{{ c.memberName }}</a> · policy {{ c.policyNumber }}
          </p>
        </div>
        <div class="header-side">
          <div class="assignee" data-cy="assignee">
            <mat-icon>assignment_ind</mat-icon>
            <span>{{ c.assignee ?? 'Unassigned' }}</span>
            @if (canPickUp()) {
              <button mat-button (click)="assign(c, true)" [disabled]="busy()" data-cy="pick-up">Assign to me</button>
            } @else if (canRelease()) {
              <button mat-button (click)="assign(c, false)" [disabled]="busy()">Release</button>
            }
          </div>
          <div class="actions" data-cy="claim-actions">
            @for (target of c.allowedTransitions; track target) {
              <button
                [attr.data-cy]="'action-' + target"
                [disabled]="busy()"
                (click)="act(c, target)"
                mat-stroked-button
                [class.danger]="target === 'REJECTED' || target === 'CANCELLED'"
                [class.primary-action]="target === 'APPROVED' || target === 'PAID'"
              >
                {{ actionLabels[target] }}
              </button>
            }
          </div>
        </div>
      </header>

      <app-claim-progress [status]="c.status" />

      <div class="card-grid">
        <mat-card appearance="outlined" class="enter-rise">
          <mat-card-header><mat-card-title>Details</mat-card-title></mat-card-header>
          <mat-card-content>
            <dl>
              <dt>Cover amount</dt>
              <dd>{{ c.coverAmount | currency: 'ZAR' : 'symbol-narrow' }}</dd>
              <dt>Event date</dt>
              <dd>{{ c.eventDate | date: 'mediumDate' }}</dd>
              <dt>Submitted</dt>
              <dd>{{ c.submittedAt | date: 'medium' }}</dd>
              @if (c.decidedAt) {
                <dt>Decided</dt>
                <dd>{{ c.decidedAt | date: 'medium' }}</dd>
              }
            </dl>
            <p class="description">{{ c.description }}</p>
          </mat-card-content>
        </mat-card>

        <mat-card appearance="outlined" class="enter-rise" style="--i: 1">
          <mat-card-header><mat-card-title>Timeline</mat-card-title></mat-card-header>
          <mat-card-content>
            <ol class="timeline" data-cy="timeline">
              @for (t of c.transitions; track $index) {
                <li [style.--color]="statusColors[t.toStatus]" [style.--i]="$index" class="enter-rise">
                  <mat-icon aria-hidden="true">{{ statusIcons[t.toStatus] }}</mat-icon>
                  <div>
                    <strong>{{ statusLabels[t.toStatus] }}</strong>
                    <span class="muted"> by {{ t.actor }} · {{ t.occurredAt | date: 'medium' }}</span>
                    @if (t.reason) {
                      <p class="reason">“{{ t.reason }}”</p>
                    }
                  </div>
                </li>
              }
            </ol>
          </mat-card-content>
        </mat-card>

        <mat-card appearance="outlined" class="enter-rise" style="--i: 2">
          <mat-card-header><mat-card-title>Documents</mat-card-title></mat-card-header>
          <mat-card-content><app-claim-documents [claimId]="c.id" [claimOpen]="isOpen()" /></mat-card-content>
        </mat-card>

        <mat-card appearance="outlined" class="enter-rise" style="--i: 3">
          <mat-card-header><mat-card-title>Conversation</mat-card-title></mat-card-header>
          <mat-card-content><app-claim-notes [claimId]="c.id" /></mat-card-content>
        </mat-card>
      </div>

      @if (c.payouts.length > 0) {
        <section class="enter-rise" style="--i: 4">
          <h2>Payout split</h2>
          <div class="payout-bar" aria-hidden="true">
            @for (p of c.payouts; track p.beneficiaryName) {
              <span [style.flex]="p.allocationPercent" [style.--i]="$index" [matTooltip]="p.beneficiaryName"></span>
            }
          </div>
          <div class="table-scroll">
            <table mat-table [dataSource]="c.payouts" data-cy="payouts">
              <ng-container matColumnDef="beneficiary">
                <th mat-header-cell *matHeaderCellDef>Beneficiary</th>
                <td mat-cell *matCellDef="let p">{{ p.beneficiaryName }}</td>
              </ng-container>
              <ng-container matColumnDef="allocation">
                <th mat-header-cell *matHeaderCellDef class="numeric">Allocation</th>
                <td mat-cell *matCellDef="let p" class="numeric">{{ p.allocationPercent / 100 | percent: '1.0-2' }}</td>
              </ng-container>
              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef class="numeric">Amount</th>
                <td mat-cell *matCellDef="let p" class="numeric">{{ p.amount | currency: 'ZAR' : 'symbol-narrow' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="payoutColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: payoutColumns"></tr>
            </table>
          </div>
        </section>
      }
    }
  `,
  styles: `
    .busy {
      position: sticky;
      top: 64px;
      z-index: 2;
    }
    h1 {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .header-side {
      display: grid;
      justify-items: end;
      gap: 8px;
    }
    .assignee {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--mat-sys-on-surface-variant);
    }
    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .actions button {
      animation: pop-in var(--motion-medium) var(--ease-spring);
    }
    .danger {
      color: var(--mat-sys-error);
    }
    .primary-action {
      color: var(--status-approved);
      border-color: var(--status-approved);
    }
    .description {
      white-space: pre-line;
    }
    .timeline {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .timeline li {
      display: flex;
      gap: 12px;
      padding: 8px 0 8px 12px;
      margin-left: 11px;
      border-left: 2px solid var(--mat-sys-outline-variant);
    }
    .timeline mat-icon {
      margin-left: -26px;
      background: var(--mat-sys-surface);
      color: var(--color);
      border-radius: 50%;
    }
    .reason {
      margin: 4px 0 0;
    }
    .payout-bar {
      display: flex;
      gap: 3px;
      height: 14px;
      margin-bottom: 12px;
      border-radius: 7px;
      overflow: hidden;
    }
    .payout-bar span {
      background: var(--brand-gradient);
      transform-origin: left;
      animation: grow-x 700ms var(--ease-out) both;
      animation-delay: calc(var(--i) * 120ms);
      filter: hue-rotate(calc(var(--i) * 45deg));
    }
    @media (max-width: 640px) {
      .header-side {
        justify-items: start;
      }
    }
  `,
})
export class ClaimDetailPage {
  private readonly api = inject(ClaimsApi);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly confetti = inject(Confetti);

  /** Bound from the :id route parameter. */
  readonly id = input.required<string>();

  protected readonly actionLabels = ACTION_LABELS;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statusIcons = STATUS_ICONS;
  protected readonly statusColors = STATUS_COLORS;
  protected readonly coverLabels = COVER_LABELS;
  protected readonly payoutColumns = ['beneficiary', 'allocation', 'amount'];

  protected readonly claim = signal<ClaimDetail | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly isOpen = computed(() => {
    const status = this.claim()?.status;
    return status === 'SUBMITTED' || status === 'UNDER_ASSESSMENT' || status === 'APPROVED';
  });
  private readonly me = computed(() => this.auth.user()?.username);
  protected readonly canPickUp = computed(
    () => this.auth.hasRole('ASSESSOR') && this.isOpen() && this.claim()?.assignee !== this.me(),
  );
  protected readonly canRelease = computed(
    () => this.auth.hasRole('ASSESSOR') && this.isOpen() && this.claim()?.assignee === this.me(),
  );

  constructor() {
    effect(() => {
      const id = this.id();
      this.busy.set(true);
      this.api.get(id).subscribe({
        next: (claim) => {
          this.claim.set(claim);
          this.busy.set(false);
        },
        error: (err: unknown) => {
          this.error.set(problemMessage(err));
          this.busy.set(false);
        },
      });
    });
  }

  protected act(claim: ClaimDetail, target: ClaimStatus): void {
    const data: ReasonDialogData = {
      title: `${ACTION_LABELS[target]} ${claim.claimNumber}?`,
      action: ACTION_LABELS[target],
      reasonRequired: requiresReason(target),
    };
    this.dialog
      .open<ReasonDialog, ReasonDialogData, string | null>(ReasonDialog, { data })
      .afterClosed()
      .subscribe((reason) => {
        if (reason !== undefined) {
          this.transition(claim, target, reason);
        }
      });
  }

  protected assign(claim: ClaimDetail, toMe: boolean): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.assign(claim.id, toMe).subscribe({
      next: (updated) => {
        this.claim.set(updated);
        this.busy.set(false);
        this.snackBar.open(toMe ? 'Claim assigned to you' : 'Claim released to the queue', 'OK', { duration: 3000 });
      },
      error: (err: unknown) => {
        this.error.set(problemMessage(err));
        this.busy.set(false);
      },
    });
  }

  private transition(claim: ClaimDetail, target: ClaimStatus, reason: string | null): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.transition(claim.id, target, reason).subscribe({
      next: (updated) => {
        this.claim.set(updated);
        this.busy.set(false);
        if (updated.status === 'PAID') {
          this.confetti.burst();
        }
        this.snackBar.open(`${updated.claimNumber} is now ${STATUS_LABELS[updated.status].toLowerCase()}`, 'OK', {
          duration: 4000,
        });
      },
      error: (err: unknown) => {
        this.error.set(problemMessage(err));
        this.busy.set(false);
      },
    });
  }
}
