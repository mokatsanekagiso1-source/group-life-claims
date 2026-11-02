import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { SchemesApi } from '../../core/api';
import { Scheme } from '../../core/models';
import { problemMessage } from '../../core/problem';
import { EmptyState } from '../../shared/empty-state';
import { CreateSchemeDialog } from './admin-dialogs';

/** Employers with group policies, as cards. */
@Component({
  selector: 'app-schemes-page',
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule, EmptyState],
  template: `
    <header class="page-header">
      <div>
        <h1>Schemes</h1>
        <p class="subtitle">Employers holding group life policies.</p>
      </div>
      <button mat-flat-button (click)="create()" data-cy="new-scheme"><mat-icon>add_business</mat-icon> New scheme</button>
    </header>

    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }

    <div class="cards">
      @for (scheme of schemes(); track scheme.id) {
        <a class="card lift" [routerLink]="['/schemes', scheme.id]" [style.--i]="$index" animate.enter="enter-rise">
          <span class="logo" [style.--hue]="hue(scheme.name)">{{ scheme.name[0] }}</span>
          <div class="body">
            <strong>{{ scheme.name }}</strong>
            <span class="muted">{{ scheme.registrationNumber }}</span>
            <span class="muted">{{ scheme.contactEmail }}</span>
          </div>
          <div class="stats">
            <span><strong>{{ scheme.policyCount }}</strong> {{ scheme.policyCount === 1 ? 'policy' : 'policies' }}</span>
            <span class="muted">since {{ scheme.createdAt | date: 'MMM y' }}</span>
          </div>
          <mat-icon class="chevron">chevron_right</mat-icon>
        </a>
      } @empty {
        @if (!loading()) {
          <app-empty-state icon="domain" title="No schemes yet" hint="Create the first employer scheme." />
        }
      }
      @if (loading()) {
        @for (i of [0, 1, 2]; track i) {
          <div class="card skeleton" style="height: 96px"></div>
        }
      }
    </div>
  `,
  styles: `
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }
    .card {
      display: grid;
      grid-template-columns: auto 1fr auto auto;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border-radius: 16px;
      text-decoration: none;
      color: inherit;
      background: var(--mat-sys-surface-container-low);
      border: 1px solid var(--mat-sys-outline-variant);
    }
    .logo {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border-radius: 14px;
      font-size: 1.4rem;
      font-weight: 700;
      color: #fff;
      background: linear-gradient(135deg, hsl(var(--hue) 70% 50%), hsl(calc(var(--hue) + 40) 70% 45%));
    }
    .body,
    .stats {
      display: grid;
      gap: 2px;
    }
    .stats {
      text-align: right;
      font-size: 0.875rem;
    }
    .chevron {
      color: var(--mat-sys-on-surface-variant);
      transition: transform var(--motion-fast);
    }
    .card:hover .chevron {
      transform: translateX(4px);
    }
  `,
})
export class SchemesPage implements OnInit {
  private readonly api = inject(SchemesApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly schemes = signal<Scheme[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.list().subscribe({
      next: (schemes) => {
        this.schemes.set(schemes);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(problemMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected create(): void {
    this.dialog
      .open<CreateSchemeDialog, void, Scheme>(CreateSchemeDialog)
      .afterClosed()
      .subscribe((scheme) => {
        if (scheme) {
          this.schemes.update((list) => [...list, scheme].sort((a, b) => a.name.localeCompare(b.name)));
          this.snackBar.open(`${scheme.name} created`, 'OK', { duration: 3000 });
        }
      });
  }

  protected hue(name: string): number {
    let hash = 7;
    for (const char of name) {
      hash = (hash * 31 + char.charCodeAt(0)) % 360;
    }
    return hash;
  }
}
