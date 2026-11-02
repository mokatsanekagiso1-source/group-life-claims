import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatChipListboxChange, MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { ClaimsApi } from '../../core/api';
import { CLAIM_STATUSES, ClaimStatus, ClaimSummary } from '../../core/models';
import { problemMessage } from '../../core/problem';
import { COVER_LABELS, STATUS_LABELS } from '../../shared/labels';
import { StatusChip } from '../../shared/status-chip';

const DAY_MS = 86_400_000;

/** Assessor work queue: open claims, oldest first. */
@Component({
  selector: 'app-claim-queue-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    MatChipsModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTableModule,
    StatusChip,
  ],
  template: `
    <header class="page-header">
      <div>
        <h1>Claims queue</h1>
        <p class="subtitle">Oldest first, so nothing waits longer than it has to.</p>
      </div>
    </header>

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
            {{ c.submittedAt | date: 'mediumDate' }}
            <span class="muted">({{ ageInDays(c) }}d)</span>
          </td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let c"><app-status-chip [status]="c.status" /></td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr
          mat-row
          *matRowDef="let row; columns: columns"
          tabindex="0"
          (click)="open(row)"
          (keydown.enter)="open(row)"
        ></tr>
        <tr class="mat-row" *matNoDataRow>
          <td class="mat-cell empty" [attr.colspan]="columns.length">No claims in the selected statuses.</td>
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
    mat-chip-listbox {
      display: block;
      margin-bottom: 16px;
    }
  `,
})
export class ClaimQueuePage implements OnInit {
  private readonly api = inject(ClaimsApi);
  private readonly router = inject(Router);

  protected readonly allStatuses = CLAIM_STATUSES;
  protected readonly statusLabels = STATUS_LABELS;
  /** Widened for table cells, whose row variables are untyped. */
  protected readonly coverLabels: Record<string, string> = COVER_LABELS;
  protected readonly columns = ['claimNumber', 'member', 'coverType', 'amount', 'submitted', 'status'];

  protected readonly statuses = signal<ClaimStatus[]>(['SUBMITTED', 'UNDER_ASSESSMENT']);
  protected readonly claims = signal<ClaimSummary[]>([]);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected onFilter(event: MatChipListboxChange): void {
    this.statuses.set(event.value as ClaimStatus[]);
    this.pageIndex.set(0);
    this.load();
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.load();
  }

  protected open(claim: ClaimSummary): void {
    void this.router.navigate(['/claims', claim.id]);
  }

  protected ageInDays(claim: ClaimSummary): number {
    return Math.floor((Date.now() - Date.parse(claim.submittedAt)) / DAY_MS);
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.search({ statuses: this.statuses() }, this.pageIndex(), 20).subscribe({
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
