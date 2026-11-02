import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MembersApi } from '../../core/api';
import { MemberSummary } from '../../core/models';
import { problemMessage } from '../../core/problem';

@Component({
  selector: 'app-member-list-page',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTableModule,
  ],
  template: `
    <header class="page-header">
      <h1>Members</h1>
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="search">
        <mat-icon matPrefix>search</mat-icon>
        <mat-label>Search by name, employee number or email</mat-label>
        <input matInput [formControl]="search" data-cy="member-search" />
      </mat-form-field>
    </header>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }

    <div class="table-scroll">
      <table mat-table [dataSource]="members()" class="clickable-rows" data-cy="member-table">
        <ng-container matColumnDef="employeeNumber">
          <th mat-header-cell *matHeaderCellDef>Employee no.</th>
          <td mat-cell *matCellDef="let m">{{ m.employeeNumber }}</td>
        </ng-container>
        <ng-container matColumnDef="fullName">
          <th mat-header-cell *matHeaderCellDef>Name</th>
          <td mat-cell *matCellDef="let m">{{ m.fullName }}</td>
        </ng-container>
        <ng-container matColumnDef="scheme">
          <th mat-header-cell *matHeaderCellDef>Scheme</th>
          <td mat-cell *matCellDef="let m">{{ m.schemeName }} · {{ m.policyNumber }}</td>
        </ng-container>
        <ng-container matColumnDef="joinDate">
          <th mat-header-cell *matHeaderCellDef>Joined</th>
          <td mat-cell *matCellDef="let m">{{ m.joinDate | date: 'mediumDate' }}</td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let m">{{ m.status === 'ACTIVE' ? 'Active' : 'Exited' }}</td>
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
          <td class="mat-cell empty" [attr.colspan]="columns.length">No members match your search.</td>
        </tr>
      </table>
    </div>

    <mat-paginator
      [length]="total()"
      [pageIndex]="pageIndex()"
      [pageSize]="pageSize()"
      [pageSizeOptions]="[10, 20, 50]"
      (page)="onPage($event)"
    />
  `,
  styles: `
    .search {
      width: min(420px, 100%);
    }
  `,
})
export class MemberListPage implements OnInit {
  private readonly api = inject(MembersApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly columns = ['employeeNumber', 'fullName', 'scheme', 'joinDate', 'status'];
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly members = signal<MemberSummary[]>([]);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(20);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageIndex.set(0);
        this.load();
      });
    this.load();
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  protected open(member: MemberSummary): void {
    void this.router.navigate(['/members', member.id]);
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.search(this.search.value, this.pageIndex(), this.pageSize()).subscribe({
      next: (page) => {
        this.members.set(page.content);
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
