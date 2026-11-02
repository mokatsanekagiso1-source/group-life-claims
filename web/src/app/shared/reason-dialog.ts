import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface ReasonDialogData {
  title: string;
  action: string;
  reasonRequired: boolean;
}

/** Confirms a claim action and collects the reason recorded in the audit trail. */
@Component({
  selector: 'app-reason-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ data.reasonRequired ? 'Reason' : 'Note (optional)' }}</mat-label>
        <textarea matInput [formControl]="reason" rows="3" maxlength="1000" cdkFocusInitial></textarea>
        @if (reason.hasError('required')) {
          <mat-error>A reason is required for this action.</mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Back</button>
      <button mat-flat-button (click)="confirm()">{{ data.action }}</button>
    </mat-dialog-actions>
  `,
  styles: `
    .full-width {
      width: 100%;
      min-width: min(420px, 70vw);
    }
  `,
})
export class ReasonDialog {
  protected readonly data = inject<ReasonDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ReasonDialog, string | null>>(MatDialogRef);

  protected readonly reason = new FormControl('', {
    nonNullable: true,
    validators: this.data.reasonRequired ? [Validators.required, Validators.pattern(/\S/)] : [],
  });

  protected confirm(): void {
    if (this.reason.invalid) {
      this.reason.markAsTouched();
      return;
    }
    const text = this.reason.value.trim();
    this.dialogRef.close(text || null);
  }
}
