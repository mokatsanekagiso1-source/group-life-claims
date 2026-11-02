import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';
import { MembersApi, SchemesApi } from '../../core/api';
import { CoverType, MemberDetail, Policy, Scheme } from '../../core/models';
import { problemMessage, toIsoDate } from '../../core/problem';
import { COVER_LABELS } from '../../shared/labels';

/** Shared submit handling: busy flag, error message, close with the created entity. */
abstract class CreateDialog<T> {
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly dialogRef = inject<MatDialogRef<unknown, T>>(MatDialogRef);

  protected send(request: Observable<T>): void {
    this.busy.set(true);
    this.error.set(null);
    request.subscribe({
      next: (created) => this.dialogRef.close(created),
      error: (err: unknown) => {
        this.error.set(problemMessage(err));
        this.busy.set(false);
      },
    });
  }
}

const DIALOG_STYLES = `
  form {
    display: grid;
    gap: 4px;
    min-width: min(460px, 80vw);
  }
  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .covers {
    display: flex;
    gap: 16px;
    margin: 0 0 12px;
  }
`;

@Component({
  selector: 'app-create-scheme-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>New scheme</h2>
    <mat-dialog-content>
      <form [formGroup]="form" id="scheme-form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>Employer name</mat-label>
          <input matInput formControlName="name" cdkFocusInitial />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Registration number</mat-label>
          <input matInput formControlName="registrationNumber" placeholder="SYN-2024-000123" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>HR contact email</mat-label>
          <input matInput type="email" formControlName="contactEmail" />
          <mat-error>Enter a valid email address.</mat-error>
        </mat-form-field>
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button type="submit" form="scheme-form" [disabled]="busy()">Create scheme</button>
    </mat-dialog-actions>
  `,
  styles: DIALOG_STYLES,
})
export class CreateSchemeDialog extends CreateDialog<Scheme> {
  private readonly api = inject(SchemesApi);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    registrationNumber: ['', [Validators.required, Validators.maxLength(50)]],
    contactEmail: ['', [Validators.required, Validators.email]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.send(this.api.create(this.form.getRawValue()));
  }
}

@Component({
  selector: 'app-create-policy-dialog',
  providers: [provideNativeDateAdapter()],
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>New policy for {{ scheme.name }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" id="policy-form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>Policy number</mat-label>
          <input matInput formControlName="policyNumber" placeholder="GL-3001" cdkFocusInitial />
        </mat-form-field>
        <div class="covers" role="group" aria-label="Cover types">
          @for (type of coverTypes; track type) {
            <mat-checkbox [checked]="covers().includes(type)" (change)="toggle(type, $event.checked)">
              {{ coverLabels[type] }}
            </mat-checkbox>
          }
        </div>
        <div class="pair">
          <mat-form-field appearance="outline">
            <mat-label>Cover multiple</mat-label>
            <input matInput type="number" step="0.5" min="0.5" max="10" formControlName="coverMultiple" />
            <span matTextSuffix>× salary</span>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Waiting period</mat-label>
            <input matInput type="number" min="0" max="24" formControlName="waitingPeriodMonths" />
            <span matTextSuffix>months</span>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Effective date</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="effectiveDate" />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker />
        </mat-form-field>
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button type="submit" form="policy-form" [disabled]="busy() || covers().length === 0">
        Create policy
      </button>
    </mat-dialog-actions>
  `,
  styles: DIALOG_STYLES,
})
export class CreatePolicyDialog extends CreateDialog<Policy> {
  private readonly api = inject(SchemesApi);
  protected readonly scheme = inject<Scheme>(MAT_DIALOG_DATA);
  protected readonly coverTypes: CoverType[] = ['DEATH', 'DISABILITY', 'FUNERAL'];
  protected readonly coverLabels = COVER_LABELS;
  protected readonly covers = signal<CoverType[]>(['DEATH', 'FUNERAL']);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    policyNumber: ['', [Validators.required, Validators.maxLength(50)]],
    coverMultiple: [3, [Validators.required, Validators.min(0.5), Validators.max(10)]],
    waitingPeriodMonths: [6, [Validators.required, Validators.min(0), Validators.max(24)]],
    effectiveDate: [new Date(), Validators.required],
  });

  protected toggle(type: CoverType, checked: boolean): void {
    this.covers.update((covers) => (checked ? [...covers, type] : covers.filter((c) => c !== type)));
  }

  protected submit(): void {
    if (this.form.invalid || this.covers().length === 0) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.send(
      this.api.createPolicy(this.scheme.id, {
        policyNumber: value.policyNumber.trim(),
        coverTypes: this.covers(),
        coverMultiple: Number(value.coverMultiple),
        waitingPeriodMonths: Number(value.waitingPeriodMonths),
        effectiveDate: toIsoDate(value.effectiveDate),
      }),
    );
  }
}

@Component({
  selector: 'app-add-member-dialog',
  providers: [provideNativeDateAdapter()],
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Add a member to {{ policy.policyNumber }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" id="member-form" (ngSubmit)="submit()">
        <div class="pair">
          <mat-form-field appearance="outline">
            <mat-label>First name</mat-label>
            <input matInput formControlName="firstName" cdkFocusInitial />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Last name</mat-label>
            <input matInput formControlName="lastName" />
          </mat-form-field>
        </div>
        <div class="pair">
          <mat-form-field appearance="outline">
            <mat-label>Employee number</mat-label>
            <input matInput formControlName="employeeNumber" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" />
          </mat-form-field>
        </div>
        <div class="pair">
          <mat-form-field appearance="outline">
            <mat-label>Date of birth</mat-label>
            <input matInput [matDatepicker]="dob" formControlName="dateOfBirth" />
            <mat-datepicker-toggle matIconSuffix [for]="dob" />
            <mat-datepicker #dob startView="multi-year" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Join date</mat-label>
            <input matInput [matDatepicker]="joined" formControlName="joinDate" />
            <mat-datepicker-toggle matIconSuffix [for]="joined" />
            <mat-datepicker #joined />
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Annual salary</mat-label>
          <span matTextPrefix>R&nbsp;</span>
          <input matInput type="number" min="1" step="1000" formControlName="annualSalary" />
          <mat-hint>Cover will be {{ policy.coverMultiple }}× this amount.</mat-hint>
        </mat-form-field>
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button type="submit" form="member-form" [disabled]="busy()">Add member</button>
    </mat-dialog-actions>
  `,
  styles: DIALOG_STYLES,
})
export class AddMemberDialog extends CreateDialog<MemberDetail> {
  private readonly api = inject(MembersApi);
  protected readonly policy = inject<Policy>(MAT_DIALOG_DATA);
  protected readonly form = inject(FormBuilder).group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    employeeNumber: ['', [Validators.required, Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    dateOfBirth: [null as Date | null, Validators.required],
    joinDate: [new Date() as Date | null, Validators.required],
    annualSalary: [null as number | null, [Validators.required, Validators.min(1)]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.send(
      this.api.create(this.policy.id, {
        firstName: v.firstName!.trim(),
        lastName: v.lastName!.trim(),
        employeeNumber: v.employeeNumber!.trim(),
        email: v.email!.trim(),
        dateOfBirth: toIsoDate(v.dateOfBirth!),
        joinDate: toIsoDate(v.joinDate!),
        annualSalary: Number(v.annualSalary),
      }),
    );
  }
}
