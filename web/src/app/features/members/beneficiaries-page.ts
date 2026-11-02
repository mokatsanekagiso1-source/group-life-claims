import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { map, startWith } from 'rxjs';
import { MembersApi } from '../../core/api';
import { BeneficiaryInput, MemberDetail } from '../../core/models';
import { problemMessage } from '../../core/problem';
import { AllocationRing } from '../../shared/allocation-ring';

const RELATIONSHIPS = ['Spouse', 'Partner', 'Child', 'Parent', 'Sibling', 'Other family', 'Estate'];
const MAX_BENEFICIARIES = 10;
const RAND = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 });

type BeneficiaryForm = FormGroup<{
  fullName: FormControl<string>;
  relationship: FormControl<string>;
  allocationPercent: FormControl<number>;
}>;

/**
 * Edit who receives the payout. The ring fills as allocations are entered and the save button only
 * unlocks at exactly 100%, mirroring the API rule.
 */
@Component({
  selector: 'app-beneficiaries-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    AllocationRing,
  ],
  template: `
    @if (member(); as m) {
      <header class="page-header">
        <div>
          <h1>Beneficiaries</h1>
          <p class="subtitle">
            Who receives {{ m.firstName }} {{ m.lastName }}'s cover of {{ rand(m.coverAmount) }} if a claim is paid.
          </p>
        </div>
        <a mat-button [routerLink]="['/members', m.id]"><mat-icon>arrow_back</mat-icon> Back to member</a>
      </header>

      <div class="layout">
        <form [formGroup]="form" (ngSubmit)="save(m)" class="rows" data-cy="beneficiary-form">
          <div formArrayName="beneficiaries">
            @for (row of rows.controls; track row; let i = $index) {
              <div class="row" [formGroupName]="i" animate.enter="enter-rise" animate.leave="leave-collapse">
                <span class="avatar" [style.--hue]="hue(row.controls.fullName.value)">{{ initials(row.controls.fullName.value) }}</span>
                <mat-form-field appearance="outline" subscriptSizing="dynamic" class="name">
                  <mat-label>Full name</mat-label>
                  <input matInput formControlName="fullName" [attr.data-cy]="'beneficiary-name-' + i" />
                </mat-form-field>
                <mat-form-field appearance="outline" subscriptSizing="dynamic" class="relationship">
                  <mat-label>Relationship</mat-label>
                  <mat-select formControlName="relationship">
                    @for (r of relationships; track r) {
                      <mat-option [value]="r">{{ r }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" subscriptSizing="dynamic" class="percent">
                  <mat-label>Share</mat-label>
                  <input
                    matInput
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    formControlName="allocationPercent"
                    [attr.data-cy]="'beneficiary-share-' + i"
                  />
                  <span matTextSuffix>%</span>
                </mat-form-field>
                <span class="amount">{{ rand((m.coverAmount * (row.controls.allocationPercent.value || 0)) / 100) }}</span>
                <button
                  mat-icon-button
                  type="button"
                  (click)="remove(i)"
                  [disabled]="rows.length === 1"
                  matTooltip="Remove"
                  aria-label="Remove beneficiary"
                >
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </div>
            }
          </div>

          <div class="toolbar">
            <button mat-stroked-button type="button" (click)="add()" [disabled]="rows.length >= max">
              <mat-icon>person_add</mat-icon> Add beneficiary
            </button>
            <button mat-button type="button" (click)="splitEvenly()" matTooltip="Share 100% equally">
              <mat-icon>balance</mat-icon> Split evenly
            </button>
          </div>

          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }

          <div class="actions">
            <a mat-button [routerLink]="['/members', m.id]">Cancel</a>
            <button mat-flat-button type="submit" [disabled]="!canSave()" data-cy="save-beneficiaries">
              Save beneficiaries
            </button>
          </div>
        </form>

        <aside class="summary">
          <app-allocation-ring [total]="total()" />
          <p class="muted">Allocations must add up to exactly 100% before a claim can be approved.</p>
        </aside>
      </div>
    } @else if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
  `,
  styles: `
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 220px;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 860px) {
      .layout {
        grid-template-columns: 1fr;
      }
      .summary {
        order: -1;
      }
    }
    .row {
      display: grid;
      grid-template-columns: 40px minmax(140px, 2fr) minmax(120px, 1fr) 110px 90px 40px;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    @media (max-width: 720px) {
      .row {
        grid-template-columns: 40px 1fr 40px;
      }
      .relationship,
      .percent,
      .amount {
        grid-column: 2;
      }
    }
    .avatar {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      font-weight: 600;
      color: #fff;
      background: hsl(var(--hue) 55% 48%);
      transition: background var(--motion-medium);
    }
    .amount {
      font-variant-numeric: tabular-nums;
      color: var(--mat-sys-on-surface-variant);
      text-align: right;
    }
    .toolbar,
    .actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }
    .actions {
      justify-content: flex-end;
    }
    .summary {
      position: sticky;
      top: 96px;
      display: grid;
      justify-items: center;
      gap: 12px;
      text-align: center;
    }
  `,
})
export class BeneficiariesPage {
  private readonly api = inject(MembersApi);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  /** Bound from the :id route parameter. */
  readonly id = input.required<string>();

  protected readonly relationships = RELATIONSHIPS;
  protected readonly max = MAX_BENEFICIARIES;
  protected readonly member = signal<MemberDetail | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly rand = (value: number) => RAND.format(value);

  protected readonly form = this.fb.group({ beneficiaries: this.fb.array<BeneficiaryForm>([]) });
  protected get rows(): FormArray<BeneficiaryForm> {
    return this.form.controls.beneficiaries;
  }

  private readonly values = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.rows.getRawValue()),
    ),
    { initialValue: [] as BeneficiaryInput[] },
  );
  private readonly valid = toSignal(this.form.statusChanges.pipe(map((s) => s === 'VALID')), { initialValue: false });

  protected readonly total = computed(() =>
    this.values().reduce((sum, b) => sum + (Number(b.allocationPercent) || 0), 0),
  );
  protected readonly canSave = computed(
    () => this.valid() && Math.round(this.total() * 100) === 10_000 && !this.saving(),
  );

  constructor() {
    effect(() => {
      this.api.get(this.id()).subscribe({
        next: (member) => {
          this.member.set(member);
          this.rows.clear();
          const existing = member.beneficiaries.length
            ? member.beneficiaries
            : [{ fullName: '', relationship: 'Spouse', allocationPercent: 100 }];
          existing.forEach((b) => this.rows.push(this.row(b)));
          this.form.updateValueAndValidity();
        },
        error: (err: unknown) => this.error.set(problemMessage(err)),
      });
    });
  }

  protected add(): void {
    const remaining = Math.max(0, Math.round((100 - this.total()) * 100) / 100);
    this.rows.push(this.row({ fullName: '', relationship: 'Child', allocationPercent: remaining || 0 }));
  }

  protected remove(index: number): void {
    this.rows.removeAt(index);
  }

  /** Equal shares in whole cents of a percent; any remainder goes to the first person. */
  protected splitEvenly(): void {
    const count = this.rows.length;
    const share = Math.floor((100 / count) * 100) / 100;
    const first = Math.round((100 - share * (count - 1)) * 100) / 100;
    this.rows.controls.forEach((row, i) => row.controls.allocationPercent.setValue(i === 0 ? first : share));
  }

  protected save(member: MemberDetail): void {
    if (!this.canSave()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const beneficiaries = this.rows.getRawValue().map((b) => ({
      fullName: b.fullName.trim(),
      relationship: b.relationship,
      allocationPercent: Number(b.allocationPercent),
    }));
    this.api.replaceBeneficiaries(member.id, beneficiaries).subscribe({
      next: () => {
        this.snackBar.open('Beneficiaries saved', 'OK', { duration: 3000 });
        void this.router.navigate(['/members', member.id]);
      },
      error: (err: unknown) => {
        this.error.set(problemMessage(err));
        this.saving.set(false);
      },
    });
  }

  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.length ? (parts[0][0] + (parts.length > 1 ? parts.at(-1)![0] : '')).toUpperCase() : '?';
  }

  /** A stable colour per name. */
  protected hue(name: string): number {
    let hash = 0;
    for (const char of name) {
      hash = (hash * 31 + char.charCodeAt(0)) % 360;
    }
    return hash;
  }

  private row(b: BeneficiaryInput): BeneficiaryForm {
    return this.fb.group({
      fullName: [b.fullName, [Validators.required, Validators.maxLength(200), Validators.pattern(/\S/)]],
      relationship: [b.relationship, Validators.required],
      allocationPercent: [b.allocationPercent, [Validators.required, Validators.min(0.01), Validators.max(100)]],
    });
  }
}
