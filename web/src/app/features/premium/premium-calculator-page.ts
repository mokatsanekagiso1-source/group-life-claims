import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MembersApi, InsightsApi } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { RateBand } from '../../core/models';
import { problemMessage } from '../../core/problem';
import { CountUp } from '../../shared/count-up';

const RAND = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 });
const RAND_CENTS = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

/**
 * "What would my cover cost?" Sliders for salary, age and salary multiple drive a live quote using
 * the same age-band table and rounding as the API (cover × monthly rate, to the cent).
 */
@Component({
  selector: 'app-premium-calculator-page',
  imports: [FormsModule, MatButtonToggleModule, MatCardModule, MatIconModule, MatSliderModule, CountUp],
  template: `
    <header class="page-header">
      <div>
        <h1>Premium calculator</h1>
        <p class="subtitle">See how salary, age and the cover multiple shape a monthly premium.</p>
      </div>
    </header>

    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }

    <div class="layout">
      <mat-card appearance="outlined" class="inputs enter-rise">
        <mat-card-content>
          <label class="field">
            <span>Annual salary <strong>{{ rand(salary()) }}</strong></span>
            <mat-slider min="60000" max="3000000" step="10000" discrete [displayWith]="short">
              <input matSliderThumb [ngModel]="salary()" (ngModelChange)="salary.set($event)" aria-label="Annual salary" />
            </mat-slider>
          </label>

          <label class="field">
            <span>Age <strong>{{ age() }}</strong></span>
            <mat-slider [min]="minAge()" [max]="maxAge()" step="1" discrete>
              <input matSliderThumb [ngModel]="age()" (ngModelChange)="age.set($event)" aria-label="Age" />
            </mat-slider>
          </label>

          <div class="field">
            <span>Cover multiple</span>
            <mat-button-toggle-group [ngModel]="multiple()" (ngModelChange)="multiple.set($event)" aria-label="Cover multiple">
              @for (m of multiples; track m) {
                <mat-button-toggle [value]="m">{{ m }}×</mat-button-toggle>
              }
            </mat-button-toggle-group>
          </div>
        </mat-card-content>
      </mat-card>

      <div class="quote enter-rise" style="--i: 1" data-cy="quote">
        <span class="quote-label">Monthly premium</span>
        <strong class="premium" [appCountUp]="premium()" [format]="randCents" [duration]="500"></strong>
        <div class="breakdown">
          <div><span>Cover</span><strong [appCountUp]="cover()" [format]="rand" [duration]="500"></strong></div>
          <div><span>Rate</span><strong>{{ ratePerThousand() }} per R1 000</strong></div>
          <div><span>Per year</span><strong [appCountUp]="premium() * 12" [format]="rand" [duration]="500"></strong></div>
        </div>
      </div>
    </div>

    <mat-card appearance="outlined" class="bands enter-rise" style="--i: 2">
      <mat-card-header>
        <mat-card-title>Age-band rates</mat-card-title>
        <mat-card-subtitle>Synthetic rates, for illustration only</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <div class="band-chart">
          @for (band of bands(); track band.minAge) {
            <button
              class="band"
              [class.active]="band === activeBand()"
              (click)="age.set(band.minAge)"
              [attr.aria-label]="'Ages ' + band.minAge + ' to ' + band.maxAge"
            >
              <span class="bar" [style.height.%]="(band.monthlyRate / maxRate()) * 100" [style.animation-delay.ms]="$index * 80"></span>
              <span class="range">{{ band.minAge }}–{{ band.maxAge }}</span>
              <span class="rate">{{ (band.monthlyRate * 1000).toFixed(2) }}</span>
            </button>
          }
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
      gap: 16px;
      margin-bottom: 16px;
    }
    @media (max-width: 800px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }
    .field {
      display: grid;
      gap: 4px;
      margin-bottom: 16px;
    }
    .field > span {
      display: flex;
      justify-content: space-between;
    }
    mat-slider {
      width: 100%;
    }
    .quote {
      display: grid;
      align-content: center;
      gap: 8px;
      padding: 28px;
      border-radius: 24px;
      color: #fff;
      background: var(--brand-gradient);
      background-size: 200% 200%;
      animation:
        rise-in var(--motion-medium) var(--ease-out) both,
        gradient-shift 12s ease infinite;
      box-shadow: 0 20px 40px -20px color-mix(in srgb, #3b6cf6 70%, transparent);
    }
    @keyframes gradient-shift {
      50% {
        background-position: 100% 100%;
      }
    }
    .quote-label {
      opacity: 0.85;
    }
    .premium {
      font-size: clamp(2.2rem, 6vw, 3.4rem);
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .breakdown {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 8px;
    }
    .breakdown div {
      display: grid;
      gap: 2px;
      padding: 10px;
      border-radius: 12px;
      background: rgb(255 255 255 / 0.14);
    }
    .breakdown span {
      font-size: 0.75rem;
      opacity: 0.85;
    }
    .band-chart {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: 1fr;
      gap: 12px;
      height: 200px;
    }
    .band {
      display: grid;
      grid-template-rows: 1fr auto auto;
      align-items: end;
      justify-items: center;
      gap: 4px;
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .bar {
      width: min(56px, 100%);
      border-radius: 10px 10px 4px 4px;
      background: var(--mat-sys-surface-container-highest);
      transform-origin: bottom;
      animation: grow-up 700ms var(--ease-spring) both;
      transition: background var(--motion-medium);
    }
    .band.active .bar {
      background: var(--brand-gradient);
    }
    .band:hover .bar {
      background: color-mix(in srgb, var(--mat-sys-primary) 50%, transparent);
    }
    .range {
      font-weight: 500;
    }
    .rate {
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class PremiumCalculatorPage implements OnInit {
  private readonly insights = inject(InsightsApi);
  private readonly members = inject(MembersApi);
  private readonly auth = inject(AuthService);

  protected readonly multiples = [1, 2, 3, 4, 5];
  protected readonly bands = signal<RateBand[]>([]);
  protected readonly salary = signal(420_000);
  protected readonly age = signal(35);
  protected readonly multiple = signal(3);
  protected readonly error = signal<string | null>(null);

  protected readonly rand = (value: number) => RAND.format(value);
  protected readonly randCents = (value: number) => RAND_CENTS.format(value);
  protected readonly short = (value: number) => `R${Math.round(value / 1000)}k`;

  protected readonly minAge = computed(() => Math.min(...this.bands().map((b) => b.minAge), 18));
  protected readonly maxAge = computed(() => Math.max(...this.bands().map((b) => b.maxAge), 65));
  protected readonly maxRate = computed(() => Math.max(...this.bands().map((b) => b.monthlyRate), 0.0001));
  protected readonly activeBand = computed(() =>
    this.bands().find((b) => this.age() >= b.minAge && this.age() <= b.maxAge),
  );
  protected readonly cover = computed(() => Math.round(this.salary() * this.multiple() * 100) / 100);
  /** Same rule as the API: cover × rate, rounded half-up to cents. */
  protected readonly premium = computed(() => {
    const rate = this.activeBand()?.monthlyRate ?? 0;
    return Math.round(this.cover() * rate * 100) / 100;
  });
  protected readonly ratePerThousand = computed(() =>
    RAND_CENTS.format((this.activeBand()?.monthlyRate ?? 0) * 1000),
  );

  constructor() {
    // Keep the age inside the table if the bands change.
    effect(() => {
      const bands = this.bands();
      if (bands.length && !this.activeBand()) {
        this.age.set(bands[0].minAge);
      }
    });
  }

  ngOnInit(): void {
    this.insights.rates().subscribe({
      next: (bands) => this.bands.set([...bands].sort((a, b) => a.minAge - b.minAge)),
      error: (err: unknown) => this.error.set(problemMessage(err)),
    });
    // Members start from their own salary and age.
    const memberId = this.auth.user()?.memberId;
    if (memberId) {
      this.members.premium(memberId).subscribe({
        next: (quote) => {
          this.age.set(quote.age);
          this.members.get(memberId).subscribe((member) => this.salary.set(member.annualSalary));
        },
        error: () => undefined,
      });
    }
  }
}
