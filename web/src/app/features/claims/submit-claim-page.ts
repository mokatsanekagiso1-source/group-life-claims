import { CurrencyPipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { ClaimsApi, MembersApi } from '../../core/api';
import { CoverType, MemberDetail } from '../../core/models';
import { problemMessage, toIsoDate } from '../../core/problem';
import { COVER_LABELS } from '../../shared/labels';

@Component({
  selector: 'app-submit-claim-page',
  providers: [provideNativeDateAdapter()],
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    @if (member(); as m) {
      <mat-card appearance="outlined" class="form-card">
        <mat-card-header>
          <mat-card-title>Submit a claim</mat-card-title>
          <mat-card-subtitle>
            {{ m.firstName }} {{ m.lastName }} · cover {{ m.coverAmount | currency: 'ZAR' : 'symbol-narrow' }}
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit(m)">
            <mat-form-field appearance="outline">
              <mat-label>Cover type</mat-label>
              <mat-select formControlName="coverType" data-cy="cover-type">
                @for (type of m.coverTypes; track type) {
                  <mat-option [value]="type">{{ coverLabels[type] }}</mat-option>
                }
              </mat-select>
              <mat-error>Choose the type of cover you are claiming under.</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Date of the event</mat-label>
              <input matInput [matDatepicker]="picker" formControlName="eventDate" [max]="today" data-cy="event-date" />
              <mat-hint>DD/MM/YYYY or pick a date</mat-hint>
              <mat-datepicker-toggle matIconSuffix [for]="picker" />
              <mat-datepicker #picker />
              <mat-error>Enter a date that is not in the future.</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>What happened?</mat-label>
              <textarea matInput formControlName="description" rows="4" maxlength="2000" data-cy="description"></textarea>
              <mat-error>Describe the event.</mat-error>
            </mat-form-field>

            @if (error()) {
              <p class="error" role="alert" data-cy="submit-error">{{ error() }}</p>
            }

            <div class="actions">
              <a mat-button [routerLink]="['/members', m.id]">Back</a>
              <button mat-flat-button type="submit" [disabled]="busy()" data-cy="submit-claim">Submit claim</button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    } @else if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
  `,
  styles: `
    .form-card {
      max-width: 560px;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 16px;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `,
})
export class SubmitClaimPage {
  private readonly membersApi = inject(MembersApi);
  private readonly claimsApi = inject(ClaimsApi);
  private readonly router = inject(Router);

  /** Bound from the :id route parameter. */
  readonly id = input.required<string>();

  protected readonly coverLabels = COVER_LABELS;
  protected readonly today = new Date();
  protected readonly member = signal<MemberDetail | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).group({
    coverType: [null as CoverType | null, Validators.required],
    eventDate: [null as Date | null, Validators.required],
    description: ['', [Validators.required, Validators.pattern(/\S/)]],
  });

  constructor() {
    effect(() => {
      this.membersApi.get(this.id()).subscribe({
        next: (member) => this.member.set(member),
        error: (err: unknown) => this.error.set(problemMessage(err)),
      });
    });
  }

  protected submit(member: MemberDetail): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { coverType, eventDate, description } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    this.claimsApi
      .submit({
        memberId: member.id,
        coverType: coverType!,
        eventDate: toIsoDate(eventDate!),
        description: description!.trim(),
      })
      .subscribe({
        next: (claim) => void this.router.navigate(['/claims', claim.id]),
        error: (err: unknown) => {
          this.error.set(problemMessage(err));
          this.busy.set(false);
        },
      });
  }
}
