import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SchemesApi } from '../../core/api';
import { MemberDetail, Policy, Scheme } from '../../core/models';
import { problemMessage } from '../../core/problem';
import { EmptyState } from '../../shared/empty-state';
import { COVER_LABELS } from '../../shared/labels';
import { AddMemberDialog, CreatePolicyDialog } from './admin-dialogs';

/** One employer: its policies, their cover terms, and adding members. */
@Component({
  selector: 'app-scheme-detail-page',
  imports: [DatePipe, DecimalPipe, RouterLink, MatButtonModule, MatCardModule, MatIconModule, EmptyState],
  template: `
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (scheme(); as s) {
      <header class="page-header">
        <div>
          <a routerLink="/schemes" class="crumb"><mat-icon>arrow_back</mat-icon> Schemes</a>
          <h1>{{ s.name }}</h1>
          <p class="subtitle">{{ s.registrationNumber }} · {{ s.contactEmail }}</p>
        </div>
        <button mat-flat-button (click)="createPolicy(s)"><mat-icon>add</mat-icon> New policy</button>
      </header>

      <div class="policies">
        @for (policy of policies(); track policy.id) {
          <mat-card appearance="outlined" class="policy lift" [style.--i]="$index" animate.enter="enter-rise">
            <mat-card-header>
              <mat-card-title>{{ policy.policyNumber }}</mat-card-title>
              <mat-card-subtitle>Effective {{ policy.effectiveDate | date: 'mediumDate' }} · {{ policy.status.toLowerCase() }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="chips">
                @for (type of policy.coverTypes; track type) {
                  <span class="chip">{{ coverLabels[type] }}</span>
                }
              </div>
              <dl>
                <dt>Cover</dt>
                <dd>{{ policy.coverMultiple | number: '1.0-2' }}× annual salary</dd>
                <dt>Waiting period</dt>
                <dd>{{ policy.waitingPeriodMonths }} months</dd>
                <dt>Members</dt>
                <dd><strong>{{ policy.memberCount }}</strong></dd>
              </dl>
            </mat-card-content>
            <mat-card-actions align="end">
              <a mat-button routerLink="/members" [queryParams]="{ policyId: policy.id }">View members</a>
              <button mat-stroked-button (click)="addMember(policy)"><mat-icon>person_add</mat-icon> Add member</button>
            </mat-card-actions>
          </mat-card>
        } @empty {
          <app-empty-state icon="policy" title="No policies yet" hint="Create this scheme's first group policy." />
        }
      </div>
    }
  `,
  styles: `
    .crumb {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 8px;
      text-decoration: none;
      font-size: 0.875rem;
    }
    .crumb mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .policies {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }
    .chips {
      display: flex;
      gap: 6px;
      margin: 8px 0 12px;
    }
    .chip {
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 0.8rem;
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }
  `,
})
export class SchemeDetailPage {
  private readonly api = inject(SchemesApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  /** Bound from the :id route parameter. */
  readonly id = input.required<string>();

  protected readonly coverLabels = COVER_LABELS;
  protected readonly scheme = signal<Scheme | null>(null);
  protected readonly policies = signal<Policy[]>([]);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.id();
      forkJoin({ scheme: this.api.get(id), policies: this.api.policies(id) }).subscribe({
        next: ({ scheme, policies }) => {
          this.scheme.set(scheme);
          this.policies.set(policies);
        },
        error: (err: unknown) => this.error.set(problemMessage(err)),
      });
    });
  }

  protected createPolicy(scheme: Scheme): void {
    this.dialog
      .open<CreatePolicyDialog, Scheme, Policy>(CreatePolicyDialog, { data: scheme })
      .afterClosed()
      .subscribe((policy) => {
        if (policy) {
          this.policies.update((list) => [...list, policy]);
          this.snackBar.open(`Policy ${policy.policyNumber} created`, 'OK', { duration: 3000 });
        }
      });
  }

  protected addMember(policy: Policy): void {
    this.dialog
      .open<AddMemberDialog, Policy, MemberDetail>(AddMemberDialog, { data: policy })
      .afterClosed()
      .subscribe((member) => {
        if (member) {
          this.policies.update((list) =>
            list.map((p) => (p.id === policy.id ? { ...p, memberCount: p.memberCount + 1 } : p)),
          );
          this.snackBar
            .open(`${member.firstName} ${member.lastName} added`, 'View', { duration: 5000 })
            .onAction()
            .subscribe(() => void this.router.navigate(['/members', member.id]));
        }
      });
  }
}
