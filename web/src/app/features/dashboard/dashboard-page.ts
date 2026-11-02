import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { switchMap, timer } from 'rxjs';
import { InsightsApi } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { CLAIM_STATUSES, Dashboard } from '../../core/models';
import { problemMessage } from '../../core/problem';
import { Bar, BarChart } from '../../shared/bar-chart';
import { CountUp } from '../../shared/count-up';
import { DonutChart, DonutSlice } from '../../shared/donut-chart';
import { SLA_DAYS, STATUS_COLORS, STATUS_ICONS, STATUS_LABELS } from '../../shared/labels';
import { SlaBadge } from '../../shared/sla-badge';
import { StatusChip } from '../../shared/status-chip';

const REFRESH_MS = 60_000;
const MONTH_FORMAT = new Intl.DateTimeFormat('en-ZA', { month: 'short' });
const RAND = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 });

interface Kpi {
  label: string;
  value: number;
  icon: string;
  format?: (value: number) => string;
  hint: string;
  link?: string;
  queryParams?: Record<string, string>;
}

/** Staff home: live KPIs, claim mix, monthly volume, aging claims and recent activity. */
@Component({
  selector: 'app-dashboard-page',
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
    BarChart,
    CountUp,
    DonutChart,
    SlaBadge,
    StatusChip,
  ],
  template: `
    <header class="hero">
      <div>
        <p class="eyebrow">{{ greeting() }}, {{ username() }}</p>
        <h1>Claims at a glance</h1>
        @if (data(); as d) {
          <p class="subtitle">Updated {{ d.generatedAt | date: 'HH:mm:ss' }} · refreshes every minute</p>
        }
      </div>
      <a mat-flat-button routerLink="/claims" data-cy="open-queue"><mat-icon>inbox</mat-icon> Open the queue</a>
    </header>

    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }

    @if (data(); as d) {
      <section class="kpis">
        @for (kpi of kpis(); track kpi.label) {
          <a
            class="kpi lift"
            [routerLink]="kpi.link ?? null"
            [queryParams]="kpi.queryParams ?? null"
            [style.--i]="$index"
            [matTooltip]="kpi.hint"
            data-cy="kpi"
          >
            <span class="kpi-icon"><mat-icon>{{ kpi.icon }}</mat-icon></span>
            <span class="kpi-label">{{ kpi.label }}</span>
            <strong class="kpi-value" [appCountUp]="kpi.value" [format]="kpi.format ?? plain"></strong>
          </a>
        }
      </section>

      <div class="grid">
        <mat-card appearance="outlined" class="panel enter-rise" style="--i: 2">
          <mat-card-header><mat-card-title>Claims by status</mat-card-title></mat-card-header>
          <mat-card-content><app-donut-chart [slices]="statusSlices()" centerLabel="All claims" /></mat-card-content>
        </mat-card>

        <mat-card appearance="outlined" class="panel enter-rise" style="--i: 3">
          <mat-card-header>
            <mat-card-title>Claims submitted</mat-card-title>
            <mat-card-subtitle>Last six months</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content><app-bar-chart [data]="monthly()" /></mat-card-content>
        </mat-card>

        <mat-card appearance="outlined" class="panel enter-rise" style="--i: 4">
          <mat-card-header>
            <mat-card-title>Decision speed</mat-card-title>
            <mat-card-subtitle>Target: {{ slaDays }} days from submission</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="sla">
              <div class="sla-meter" [style.--share]="slaShare()">
                <strong [appCountUp]="slaShare() * 100" [format]="percent"></strong>
                <span>decided on time</span>
              </div>
              <dl>
                <dt>Average time to decision</dt>
                <dd>{{ averageDecision() }}</dd>
                <dt>Decisions made</dt>
                <dd>{{ d.decided }}</dd>
                <dt>Approved, awaiting payment</dt>
                <dd>{{ rand(d.awaitingPayment) }}</dd>
              </dl>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card appearance="outlined" class="panel enter-rise" style="--i: 5">
          <mat-card-header>
            <mat-card-title>Waiting longest</mat-card-title>
            <mat-card-subtitle>Open claims, oldest first</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <ul class="aging">
              @for (claim of d.oldestOpen; track claim.id) {
                <li [style.--i]="$index" class="enter-slide">
                  <a [routerLink]="['/claims', claim.id]">{{ claim.claimNumber }}</a>
                  <span class="who">{{ claim.memberName }}</span>
                  <app-status-chip [status]="claim.status" />
                  <span class="assignee" [class.unassigned]="!claim.assignee">{{ claim.assignee ?? 'Unassigned' }}</span>
                  <app-sla-badge [since]="claim.submittedAt" />
                </li>
              } @empty {
                <li class="muted">Nothing waiting. Lovely.</li>
              }
            </ul>
          </mat-card-content>
        </mat-card>

        <mat-card appearance="outlined" class="panel wide enter-rise" style="--i: 6">
          <mat-card-header>
            <mat-card-title>Recent activity</mat-card-title>
            <a mat-button routerLink="/activity" class="see-all">See all</a>
          </mat-card-header>
          <mat-card-content>
            <ol class="activity">
              @for (item of d.recentActivity; track $index) {
                <li [style.--i]="$index" class="enter-rise">
                  <span class="dot" [style.background]="statusColors[item.toStatus]">
                    <mat-icon>{{ statusIcons[item.toStatus] }}</mat-icon>
                  </span>
                  <div>
                    <a [routerLink]="['/claims', item.claimId]">{{ item.claimNumber }}</a>
                    · {{ item.memberName }} →
                    <strong>{{ statusLabels[item.toStatus] }}</strong>
                    <span class="muted"> by {{ item.actor }}</span>
                    @if (item.reason) {
                      <p class="reason">“{{ item.reason }}”</p>
                    }
                  </div>
                  <time class="muted">{{ item.occurredAt | date: 'MMM d, HH:mm' }}</time>
                </li>
              }
            </ol>
          </mat-card-content>
        </mat-card>
      </div>
    } @else if (!error()) {
      <section class="kpis">
        @for (i of [0, 1, 2, 3, 4, 5]; track i) {
          <div class="kpi skeleton" style="height: 112px"></div>
        }
      </section>
      <div class="grid">
        @for (i of [0, 1, 2, 3]; track i) {
          <div class="skeleton" style="height: 280px"></div>
        }
      </div>
    }
  `,
  styles: `
    .hero {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 24px;
    }
    .eyebrow {
      margin: 0 0 4px;
      font-weight: 500;
      background: var(--brand-gradient);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .kpis {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }
    .kpi {
      display: grid;
      gap: 6px;
      padding: 16px;
      border-radius: 16px;
      text-decoration: none;
      color: inherit;
      background: var(--mat-sys-surface-container-low);
      border: 1px solid var(--mat-sys-outline-variant);
      animation: rise-in var(--motion-medium) var(--ease-out) both;
      animation-delay: calc(var(--i) * 60ms);
    }
    .kpi-icon {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--brand-gradient);
      color: #fff;
    }
    .kpi-label {
      font-size: 0.85rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .kpi-value {
      font-size: 1.7rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 16px;
    }
    .wide {
      grid-column: 1 / -1;
    }
    .panel mat-card-header {
      margin-bottom: 12px;
    }
    .see-all {
      margin-left: auto;
    }
    .sla {
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
    }
    .sla-meter {
      display: grid;
      place-content: center;
      text-align: center;
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background:
        radial-gradient(closest-side, var(--mat-sys-surface) 76%, transparent 78%),
        conic-gradient(var(--status-approved) calc(var(--share) * 360deg), var(--mat-sys-surface-container-high) 0);
      transition: --share var(--motion-slow);
    }
    .sla-meter strong {
      font-size: 1.6rem;
    }
    .sla-meter span {
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .aging {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 10px;
    }
    .aging li {
      display: grid;
      grid-template-columns: auto 1fr auto auto auto;
      align-items: center;
      gap: 10px;
    }
    .who {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .assignee {
      font-size: 0.8rem;
    }
    .unassigned {
      color: var(--status-assessment);
    }
    .activity {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 12px;
    }
    .activity li {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 12px;
      align-items: start;
    }
    .dot {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      color: #fff;
    }
    .dot mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .reason {
      margin: 2px 0 0;
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant);
    }
    time {
      font-size: 0.8rem;
      white-space: nowrap;
    }
    @media (max-width: 640px) {
      .aging li {
        grid-template-columns: auto 1fr auto;
      }
      .aging .assignee,
      .aging app-status-chip {
        display: none;
      }
    }
  `,
})
export class DashboardPage implements OnInit {
  private readonly api = inject(InsightsApi);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly data = signal<Dashboard | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly slaDays = SLA_DAYS;
  protected readonly statusColors = STATUS_COLORS;
  protected readonly statusIcons = STATUS_ICONS;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly plain = (value: number) => Math.round(value).toLocaleString('en-ZA');
  protected readonly percent = (value: number) => `${Math.round(value)}%`;
  protected readonly rand = (value: number) => RAND.format(value);

  protected readonly username = computed(() => this.auth.user()?.username ?? '');
  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  });

  protected readonly kpis = computed<Kpi[]>(() => {
    const d = this.data();
    if (!d) {
      return [];
    }
    const assessor = this.auth.hasRole('ASSESSOR');
    return [
      { label: 'Open claims', value: d.openClaims, icon: 'pending_actions', hint: 'Submitted or under assessment', link: '/claims' },
      {
        label: assessor ? 'Assigned to me' : 'In progress',
        value: assessor ? d.assignedToMe : d.claimsByStatus.UNDER_ASSESSMENT,
        icon: 'assignment_ind',
        hint: 'Open claims you are working',
        link: '/claims',
        queryParams: assessor ? { assignee: 'me' } : undefined,
      },
      {
        label: 'Unassigned',
        value: d.unassigned,
        icon: 'person_search',
        hint: 'Open claims nobody has picked up',
        link: '/claims',
        queryParams: { assignee: 'none' },
      },
      { label: 'Paid out', value: d.paidOut, icon: 'savings', format: this.rand, hint: 'Total cover paid to beneficiaries' },
      { label: 'Active members', value: d.activeMembers, icon: 'groups', hint: 'Members currently covered', link: '/members' },
      { label: 'Schemes', value: d.schemes, icon: 'domain', hint: 'Employers with group policies' },
    ];
  });

  protected readonly statusSlices = computed<DonutSlice[]>(() => {
    const d = this.data();
    return d
      ? CLAIM_STATUSES.map((status) => ({
          label: STATUS_LABELS[status],
          value: d.claimsByStatus[status] ?? 0,
          color: STATUS_COLORS[status],
        }))
      : [];
  });

  protected readonly monthly = computed<Bar[]>(() =>
    (this.data()?.submittedByMonth ?? []).map((m) => ({
      label: MONTH_FORMAT.format(new Date(`${m.month}-01T00:00:00`)),
      value: m.count,
    })),
  );

  protected readonly slaShare = computed(() => {
    const d = this.data();
    return d && d.decided > 0 ? d.decidedWithinSla / d.decided : 0;
  });

  protected readonly averageDecision = computed(() => {
    const hours = this.data()?.averageDecisionHours;
    if (hours === null || hours === undefined) {
      return 'No decisions yet';
    }
    return hours < 48 ? `${hours.toFixed(1)} hours` : `${(hours / 24).toFixed(1)} days`;
  });

  ngOnInit(): void {
    timer(0, REFRESH_MS)
      .pipe(
        switchMap(() => this.api.dashboard()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => {
          this.data.set(data);
          this.error.set(null);
        },
        error: (err: unknown) => this.error.set(problemMessage(err)),
      });
  }
}
