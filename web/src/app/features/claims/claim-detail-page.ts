import { CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { ClaimsApi } from '../../core/api';
import { ClaimDetail, ClaimStatus } from '../../core/models';
import { problemMessage } from '../../core/problem';
import { ACTION_LABELS, COVER_LABELS, requiresReason, STATUS_LABELS } from '../../shared/labels';
import { ReasonDialog, ReasonDialogData } from '../../shared/reason-dialog';
import { StatusChip } from '../../shared/status-chip';

const TIMELINE_ICONS: Record<ClaimStatus, string> = {
  SUBMITTED: 'upload_file',
  UNDER_ASSESSMENT: 'manage_search',
  APPROVED: 'check_circle',
  REJECTED: 'cancel',
  PAID: 'payments',
  CANCELLED: 'block',
};

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
    StatusChip,
  ],
  template: `
    @if (busy()) {
      <mat-progress-bar mode="indeterminate" />
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
          </h1>
          <p class="subtitle">
            {{ coverLabels[c.coverType] }} claim for
            <a [routerLink]="['/members', c.memberId]">{{ c.memberName }}</a> · policy {{ c.policyNumber }}
          </p>
        </div>
        <div class="actions" data-cy="claim-actions">
          @for (target of c.allowedTransitions; track target) {
            <button
              [attr.data-cy]="'action-' + target"
              [disabled]="busy()"
              (click)="act(c, target)"
              mat-stroked-button
              [class.danger]="target === 'REJECTED' || target === 'CANCELLED'"
            >
              {{ actionLabels[target] }}
            </button>
          }
        </div>
      </header>

      <div class="card-grid">
        <mat-card appearance="outlined">
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

        <mat-card appearance="outlined">
          <mat-card-header><mat-card-title>Timeline</mat-card-title></mat-card-header>
          <mat-card-content>
            <ol class="timeline" data-cy="timeline">
              @for (t of c.transitions; track $index) {
                <li>
                  <mat-icon aria-hidden="true">{{ timelineIcons[t.toStatus] }}</mat-icon>
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
      </div>

      @if (c.payouts.length > 0) {
        <section>
          <h2>Payout split</h2>
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
    h1 {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .danger {
      color: var(--mat-sys-error);
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
      padding: 8px 0;
      border-left: 2px solid var(--mat-sys-outline-variant);
      padding-left: 12px;
      margin-left: 11px;
    }
    .timeline mat-icon {
      margin-left: -26px;
      background: var(--mat-sys-surface);
      color: var(--mat-sys-primary);
    }
    .reason {
      margin: 4px 0 0;
    }
  `,
})
export class ClaimDetailPage {
  private readonly api = inject(ClaimsApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  /** Bound from the :id route parameter. */
  readonly id = input.required<string>();

  protected readonly actionLabels = ACTION_LABELS;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly coverLabels = COVER_LABELS;
  protected readonly timelineIcons = TIMELINE_ICONS;
  protected readonly payoutColumns = ['beneficiary', 'allocation', 'amount'];

  protected readonly claim = signal<ClaimDetail | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

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

  private transition(claim: ClaimDetail, target: ClaimStatus, reason: string | null): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.transition(claim.id, target, reason).subscribe({
      next: (updated) => {
        this.claim.set(updated);
        this.busy.set(false);
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
