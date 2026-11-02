import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, effect, inject, input, OnInit, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipListboxChange, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ClaimFilter, ClaimsApi } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { CLAIM_STATUSES, ClaimStatus, ClaimSummary } from '../../core/models';
import { problemMessage } from '../../core/problem';
import { EmptyState } from '../../shared/empty-state';
import { COVER_LABELS, STATUS_LABELS } from '../../shared/labels';
import { SlaBadge } from '../../shared/sla-badge';
import { StatusChip } from '../../shared/status-chip';

type AssigneeFilter = 'all' | 'me' | 'none';

const OPEN: ClaimStatus[] = ['SUBMITTED', 'UNDER_ASSESSMENT'];

/** Assessor work queue: open claims, oldest first, with filters and CSV export. */
@Component({
  selector: 'app-claim-queue-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTableModule,
    MatTooltipModule,
    EmptyState,
    SlaBadge,
    StatusChip,
  ],
  template: `
    <header class="page-header">
      <div>
        <h1>Claims queue</h1>
        <p class="subtitle">Oldest first, so nothing waits longer than it has to.</p>
      </div>
      <button mat-stroked-button (click)="exportCsv()" [disabled]="claims().length === 0" matTooltip="Download this page as CSV">
        <mat-icon>download</mat-icon> Export
      </button>
    </header>

    <div class="filters">
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="search">
        <mat-icon matPrefix>search</mat-icon>
        <mat-label>Claim number or member</mat-label>
        <input matInput [formControl]="text" data-cy="claim-search" />
      </mat-form-field>
      <mat-button-toggle-group [value]="assignee()" (change)="onAssignee($event.value)" aria-label="Assignee" data-cy="assignee-filter">
        <mat-button-toggle value="all">Everyone</mat-button-toggle>
        @if (isAssessor()) {
          <mat-button-toggle value="me">Mine</mat-button-toggle>
        }
        <mat-button-toggle value="none">Unassigned</mat-button-toggle>
      </mat-button-toggle-group>
    </div>

    <mat-chip-listbox
      multiple
      aria-label="Filter by status"
      [value]="statuses()"
      (change)="onFilter($event)"
      data-cy="status-filter"
    >
      @for (status of allStatuses; track status) {
        <mat-chip-option [value]="status">{{ statusLabels[status] }}</mat-chip-option>
      }
    </mat-chip-listbox>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }

    <div class="table-scroll">
      <table mat-table [dataSource]="claims()" class="clickable-rows" data-cy="claim-queue">
        <ng-container matColumnDef="claimNumber">
          <th mat-header-cell *matHeaderCellDef>Claim</th>
          <td mat-cell *matCellDef="let c">{{ c.claimNumber }}</td>
        </ng-container>
        <ng-container matColumnDef="member">
          <th mat-header-cell *matHeaderCellDef>Member</th>
          <td mat-cell *matCellDef="let c">{{ c.memberName }}</td>
        </ng-container>
        <ng-container matColumnDef="coverType">
          <th mat-header-cell *matHeaderCellDef>Cover</th>
          <td mat-cell *matCellDef="let c">{{ coverLabels[c.coverType] }}</td>
        </ng-container>
        <ng-container matColumnDef="amount">
          <th mat-header-cell *matHeaderCellDef class="numeric">Amount</th>
          <td mat-cell *matCellDef="let c" class="numeric">{{ c.coverAmount | currency: 'ZAR' : 'symbol-narrow' : '1.0-0' }}</td>
        </ng-container>
        <ng-container matColumnDef="submitted">
          <th mat-header-cell *matHeaderCellDef>Submitted</th>
          <td mat-cell *matCellDef="let c">
            <span class="submitted">
              {{ c.submittedAt | date: 'mediumDate' }}
              @if (c.status === 'SUBMITTED' || c.status === 'UNDER_ASSESSMENT') {
                <app-sla-badge [since]="c.submittedAt" />
              }
            </span>
          </td>
        </ng-container>
        <ng-container matColumnDef="assignee">
          <th mat-header-cell *matHeaderCellDef>Assessor</th>
          <td mat-cell *matCellDef="let c" [class.unassigned]="!c.assignee">{{ c.assignee ?? '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let c"><app-status-chip [status]="c.status" /></td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr
          mat-row
          *matRowDef="let row; columns: columns; let i = index"
          class="enter-rise"
          [style.--i]="i"
          tabindex="0"
          (click)="open(row)"
          (keydown.enter)="open(row)"
        ></tr>
        <tr class="mat-row" *matNoDataRow>
          <td class="mat-cell" [attr.colspan]="columns.length">
            @if (!loading()) {
              <app-empty-state icon="task_alt" title="No claims match" hint="Try another status or assignee filter." />
            }
          </td>
        </tr>
      </table>
    </div>

    <mat-paginator
      [length]="total()"
      [pageIndex]="pageIndex()"
      [pageSize]="20"
      [hidePageSize]="true"
      (page)="onPage($event)"
    />
  `,
  styles: `
    .filters {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .search {
      width: min(340px, 100%);
    }
    mat-chip-listbox {
      display: block;
      margin-bottom: 16px;
    }
    .submitted {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .unassigned {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class ClaimQueuePage implements OnInit {
  private readonly api = inject(ClaimsApi);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  /** Optional ?assignee=me|none from dashboard links. */
  readonly assigneeParam = input<string | undefined>(undefined, { alias: 'assignee' });

  protected readonly allStatuses = CLAIM_STATUSES;
  protected readonly statusLabels = STATUS_LABELS;
  /** Widened for table cells, whose row variables are untyped. */
  protected readonly coverLabels: Record<string, string> = COVER_LABELS;
  protected readonly columns = ['claimNumber', 'member', 'coverType', 'amount', 'submitted', 'assignee', 'status'];

  protected readonly text = new FormControl('', { nonNullable: true });
  protected readonly statuses = signal<ClaimStatus[]>(OPEN);
  protected readonly assignee = signal<AssigneeFilter>('all');
  protected readonly claims = signal<ClaimSummary[]>([]);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isAssessor = () => this.auth.hasRole('ASSESSOR');

  constructor() {
    effect(() => {
      const param = this.assigneeParam();
      if (param === 'me' || param === 'none') {
        untracked(() => {
          this.assignee.set(param);
          this.reload();
        });
      }
    });
  }

  ngOnInit(): void {
    this.text.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reload());
    this.load();
  }

  protected onFilter(event: MatChipListboxChange): void {
    this.statuses.set(event.value as ClaimStatus[]);
    this.reload();
  }

  protected onAssignee(value: AssigneeFilter): void {
    this.assignee.set(value);
    this.reload();
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.load();
  }

  protected open(claim: ClaimSummary): void {
    void this.router.navigate(['/claims', claim.id]);
  }

  /** The current page as CSV, built in the browser. */
  protected exportCsv(): void {
    const header = ['Claim', 'Member', 'Cover', 'Amount', 'Status', 'Assessor', 'Submitted', 'Decided'];
    const rows = this.claims().map((c) => [
      c.claimNumber,
      c.memberName,
      COVER_LABELS[c.coverType],
      c.coverAmount.toFixed(2),
      STATUS_LABELS[c.status],
      c.assignee ?? '',
      c.submittedAt,
      c.decidedAt ?? '',
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: 'claims.csv' });
    link.click();
    URL.revokeObjectURL(url);
  }

  private reload(): void {
    this.pageIndex.set(0);
    this.load();
  }

  private load(): void {
    const assignee = this.assignee();
    const filter: ClaimFilter = {
      statuses: this.statuses(),
      assignee: assignee === 'all' ? undefined : assignee,
      text: this.text.value,
    };
    this.loading.set(true);
    this.error.set(null);
    this.api.search(filter, this.pageIndex(), 20).subscribe({
      next: (page) => {
        this.claims.set(page.content);
        this.total.set(page.totalElements);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(problemMessage(err));
        this.loading.set(false);
      },
    });
  }
}

/** Quotes a CSV cell and neutralises leading characters spreadsheets would treat as formulas. */
export function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
