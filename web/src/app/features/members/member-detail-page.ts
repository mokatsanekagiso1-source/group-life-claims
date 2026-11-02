import { CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { ClaimsApi, MembersApi } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { ClaimSummary, MemberDetail, PremiumQuote } from '../../core/models';
import { problemMessage } from '../../core/problem';
import { COVER_LABELS } from '../../shared/labels';
import { StatusChip } from '../../shared/status-chip';

@Component({
  selector: 'app-member-detail-page',
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
    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }

    @if (member(); as m) {
      <header class="page-header">
        <div>
          <h1 data-cy="member-name">{{ m.firstName }} {{ m.lastName }}</h1>
          <p class="subtitle">{{ m.employeeNumber }} · {{ m.schemeName }} · {{ m.status === 'ACTIVE' ? 'Active' : 'Exited' }}</p>
        </div>
        <div class="header-actions">
          @if (canEditBeneficiaries()) {
            <a mat-stroked-button [routerLink]="['/members', m.id, 'beneficiaries']" data-cy="edit-beneficiaries">
              <mat-icon>diversity_3</mat-icon> Beneficiaries
            </a>
          }
          @if (canSubmitClaim()) {
            <a mat-flat-button [routerLink]="['/members', m.id, 'claims', 'new']" data-cy="new-claim">
              <mat-icon>add</mat-icon> Submit a claim
            </a>
          }
        </div>
      </header>

      <div class="card-grid">
        <mat-card appearance="outlined" class="enter-rise lift">
          <mat-card-header><mat-card-title>Cover</mat-card-title></mat-card-header>
          <mat-card-content>
            <dl>
              <dt>Cover amount</dt>
              <dd data-cy="cover-amount">{{ m.coverAmount | currency: 'ZAR' : 'symbol-narrow' }}</dd>
              <dt>Cover types</dt>
              <dd>{{ coverTypes() }}</dd>
              <dt>Policy</dt>
              <dd>{{ m.policyNumber }}</dd>
              <dt>Waiting period ends</dt>
              <dd>{{ m.waitingPeriodEndsOn | date: 'mediumDate' }}</dd>
              @if (premium(); as p) {
                <dt>Monthly premium</dt>
                <dd>
                  {{ p.monthlyPremium | currency: 'ZAR' : 'symbol-narrow' }} <span class="muted">(age {{ p.age }})</span>
                  <a routerLink="/calculator" class="calc-link">What if?</a>
                </dd>
              }
            </dl>
          </mat-card-content>
        </mat-card>

        <mat-card appearance="outlined" class="enter-rise lift" style="--i: 1">
          <mat-card-header><mat-card-title>Personal details</mat-card-title></mat-card-header>
          <mat-card-content>
            <dl>
              <dt>Email</dt>
              <dd>{{ m.email }}</dd>
              <dt>Date of birth</dt>
              <dd>{{ m.dateOfBirth | date: 'mediumDate' }}</dd>
              <dt>Annual salary</dt>
              <dd>{{ m.annualSalary | currency: 'ZAR' : 'symbol-narrow' }}</dd>
              <dt>Joined</dt>
              <dd>{{ m.joinDate | date: 'mediumDate' }}</dd>
              @if (m.exitDate) {
                <dt>Exited</dt>
                <dd>{{ m.exitDate | date: 'mediumDate' }}</dd>
              }
            </dl>
          </mat-card-content>
        </mat-card>
      </div>

      <section>
        <h2>Beneficiaries</h2>
        @if (m.beneficiaries.length === 0) {
          <p class="muted">No beneficiaries nominated. A claim cannot be approved until allocations total 100%.</p>
        } @else {
          <div class="share-bar" aria-hidden="true">
            @for (b of m.beneficiaries; track b.id) {
              <span [style.flex]="b.allocationPercent" [style.--i]="$index" [title]="b.fullName"></span>
            }
          </div>
          <div class="table-scroll">
            <table mat-table [dataSource]="m.beneficiaries">
              <ng-container matColumnDef="fullName">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let b">{{ b.fullName }}</td>
              </ng-container>
              <ng-container matColumnDef="relationship">
                <th mat-header-cell *matHeaderCellDef>Relationship</th>
                <td mat-cell *matCellDef="let b">{{ b.relationship }}</td>
              </ng-container>
              <ng-container matColumnDef="allocation">
                <th mat-header-cell *matHeaderCellDef class="numeric">Allocation</th>
                <td mat-cell *matCellDef="let b" class="numeric">{{ b.allocationPercent / 100 | percent: '1.0-2' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="beneficiaryColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: beneficiaryColumns"></tr>
            </table>
          </div>
        }
      </section>

      <section>
        <h2>Claims</h2>
        @if (claims().length === 0) {
          <p class="muted">No claims yet.</p>
        } @else {
          <div class="table-scroll">
            <table mat-table [dataSource]="claims()" data-cy="member-claims">
              <ng-container matColumnDef="claimNumber">
                <th mat-header-cell *matHeaderCellDef>Claim</th>
                <td mat-cell *matCellDef="let c"><a [routerLink]="['/claims', c.id]">{{ c.claimNumber }}</a></td>
              </ng-container>
              <ng-container matColumnDef="coverType">
                <th mat-header-cell *matHeaderCellDef>Cover</th>
                <td mat-cell *matCellDef="let c">{{ coverLabels[c.coverType] }}</td>
              </ng-container>
              <ng-container matColumnDef="eventDate">
                <th mat-header-cell *matHeaderCellDef>Event date</th>
                <td mat-cell *matCellDef="let c">{{ c.eventDate | date: 'mediumDate' }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let c"><app-status-chip [status]="c.status" /></td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="claimColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: claimColumns"></tr>
            </table>
          </div>
        }
      </section>
    }
  `,
  styles: `
    .header-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .calc-link {
      margin-left: 8px;
      font-size: 0.85rem;
    }
    .share-bar {
      display: flex;
      gap: 3px;
      height: 10px;
      margin-bottom: 12px;
      border-radius: 5px;
      overflow: hidden;
    }
    .share-bar span {
      background: var(--brand-gradient);
      filter: hue-rotate(calc(var(--i) * 50deg));
      transform-origin: left;
      animation: grow-x 700ms var(--ease-out) both;
      animation-delay: calc(var(--i) * 120ms);
    }
  `,
})
export class MemberDetailPage {
  private readonly membersApi = inject(MembersApi);
  private readonly claimsApi = inject(ClaimsApi);
  private readonly auth = inject(AuthService);

  /** Bound from the :id route parameter. */
  readonly id = input.required<string>();

  /** Widened for table cells, whose row variables are untyped. */
  protected readonly coverLabels: Record<string, string> = COVER_LABELS;
  protected readonly beneficiaryColumns = ['fullName', 'relationship', 'allocation'];
  protected readonly claimColumns = ['claimNumber', 'coverType', 'eventDate', 'status'];

  protected readonly member = signal<MemberDetail | null>(null);
  protected readonly premium = signal<PremiumQuote | null>(null);
  protected readonly claims = signal<ClaimSummary[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly coverTypes = computed(
    () => this.member()?.coverTypes.map((t) => COVER_LABELS[t]).join(', ') ?? '',
  );

  /** Members claim for themselves; admins may claim on a member's behalf. */
  protected readonly canSubmitClaim = computed(() => {
    const m = this.member();
    const user = this.auth.user();
    if (!m || m.status !== 'ACTIVE' || !user) {
      return false;
    }
    return user.role === 'ADMIN' || (user.role === 'MEMBER' && user.memberId === m.id);
  });

  /** Same rule as the API: admins, or the member themselves. */
  protected readonly canEditBeneficiaries = computed(() => {
    const m = this.member();
    const user = this.auth.user();
    return !!m && !!user && (user.role === 'ADMIN' || (user.role === 'MEMBER' && user.memberId === m.id));
  });

  constructor() {
    effect(() => this.load(this.id()));
  }

  private load(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      member: this.membersApi.get(id),
      // A premium can legitimately be unavailable (for example, an age outside the rate table).
      premium: this.membersApi.premium(id).pipe(catchError(() => of(null))),
      claims: this.claimsApi.search({ memberId: id }, 0, 50),
    }).subscribe({
      next: ({ member, premium, claims }) => {
        this.member.set(member);
        this.premium.set(premium);
        this.claims.set(claims.content);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(problemMessage(err));
        this.loading.set(false);
      },
    });
  }
}
