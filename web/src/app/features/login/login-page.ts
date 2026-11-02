import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { problemMessage } from '../../core/problem';

const DEMO_PASSWORD = 'Password1!';

interface DemoAccount {
  username: string;
  role: string;
  icon: string;
  blurb: string;
}

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <div class="page">
      <section class="hero" aria-hidden="true">
        <span class="blob one"></span>
        <span class="blob two"></span>
        <span class="blob three"></span>
        <div class="hero-content">
          <span class="mark"><mat-icon>shield</mat-icon></span>
          <h1>Group Life Claims</h1>
          <p>Policy administration and claims for employer group life cover, from submission to payout.</p>
          <ul>
            @for (feature of features; track feature.text; let i = $index) {
              <li [style.--i]="i"><mat-icon>{{ feature.icon }}</mat-icon>{{ feature.text }}</li>
            }
          </ul>
        </div>
      </section>

      <section class="panel">
        <form [formGroup]="form" (ngSubmit)="submit()" class="form" [class.shake]="shake()" (animationend)="shake.set(false)">
          <h2>Sign in</h2>
          <p class="muted">Welcome back. Use a demo account below to explore.</p>
          <mat-form-field appearance="outline">
            <mat-label>Username</mat-label>
            <mat-icon matPrefix>person</mat-icon>
            <input matInput formControlName="username" autocomplete="username" data-cy="username" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <mat-icon matPrefix>lock</mat-icon>
            <input
              matInput
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="current-password"
              data-cy="password"
            />
            <button
              mat-icon-button
              matSuffix
              type="button"
              (click)="showPassword.set(!showPassword())"
              [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
            >
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>
          @if (error()) {
            <p class="error" role="alert" animate.enter="enter-fade">{{ error() }}</p>
          }
          <button mat-flat-button type="submit" class="submit" [disabled]="busy()" data-cy="sign-in">
            @if (busy()) {
              <span class="spinner" aria-hidden="true"></span> Signing in…
            } @else {
              Sign in
            }
          </button>
        </form>

        <div class="demo">
          <p class="demo-title">Demo accounts <span class="muted">· synthetic data · password {{ demoPassword }}</span></p>
          <div class="accounts">
            @for (account of accounts; track account.username; let i = $index) {
              <button type="button" class="account lift" [style.--i]="i" (click)="useAccount(account)" [attr.data-cy]="'demo-' + account.username">
                <mat-icon>{{ account.icon }}</mat-icon>
                <span>
                  <strong>{{ account.role }}</strong>
                  <small>{{ account.blurb }}</small>
                </span>
              </button>
            }
          </div>
        </div>
      </section>
    </div>
  `,
  styles: `
    :host {
      display: block;
      margin: -24px -16px -48px;
    }
    .page {
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      min-height: 100vh;
    }
    @media (max-width: 900px) {
      .page {
        grid-template-columns: 1fr;
      }
      .hero {
        min-height: 300px;
      }
    }
    .hero {
      position: relative;
      overflow: hidden;
      display: grid;
      place-items: center;
      padding: 48px;
      color: #fff;
      background: #0d1b3e;
    }
    .blob {
      position: absolute;
      width: 420px;
      height: 420px;
      border-radius: 50%;
      filter: blur(70px);
      opacity: 0.7;
      animation: float 16s ease-in-out infinite;
    }
    .blob.one {
      top: -120px;
      left: -80px;
      background: #3b6cf6;
    }
    .blob.two {
      bottom: -140px;
      right: -60px;
      background: #7c4dff;
      animation-delay: -5s;
    }
    .blob.three {
      top: 40%;
      left: 40%;
      width: 280px;
      height: 280px;
      background: #00b8d9;
      animation-delay: -10s;
    }
    .hero-content {
      position: relative;
      max-width: 440px;
    }
    .mark {
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: rgb(255 255 255 / 0.16);
      backdrop-filter: blur(8px);
      animation: pop-in 600ms var(--ease-spring);
    }
    .hero h1 {
      font-size: clamp(2rem, 4vw, 2.8rem);
      margin: 20px 0 12px;
      animation: rise-in 600ms var(--ease-out) 100ms both;
    }
    .hero p {
      opacity: 0.85;
      line-height: 1.6;
      animation: rise-in 600ms var(--ease-out) 200ms both;
    }
    .hero ul {
      list-style: none;
      padding: 0;
      margin: 24px 0 0;
      display: grid;
      gap: 12px;
    }
    .hero li {
      display: flex;
      align-items: center;
      gap: 12px;
      animation: slide-in-right 500ms var(--ease-out) both;
      animation-delay: calc(300ms + var(--i) * 90ms);
    }
    .panel {
      display: grid;
      align-content: center;
      gap: 32px;
      padding: 48px clamp(16px, 6vw, 72px);
    }
    .form {
      display: grid;
      gap: 4px;
      max-width: 400px;
      width: 100%;
      animation: rise-in 500ms var(--ease-out) both;
    }
    .form h2 {
      margin: 0;
      font: var(--mat-sys-headline-small);
    }
    .form > .muted {
      margin: 4px 0 20px;
    }
    .shake {
      animation: shake 420ms ease-in-out;
    }
    @keyframes shake {
      20%,
      60% {
        transform: translateX(-8px);
      }
      40%,
      80% {
        transform: translateX(8px);
      }
    }
    .error {
      margin: 0 0 12px;
    }
    .submit {
      height: 48px;
      font-size: 1rem;
    }
    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      margin-right: 8px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      vertical-align: -3px;
      animation: spin 700ms linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    .demo {
      max-width: 400px;
    }
    .demo-title {
      margin: 0 0 12px;
      font-weight: 500;
    }
    .accounts {
      display: grid;
      gap: 10px;
    }
    .account {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface-container-low);
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
      animation: rise-in 400ms var(--ease-out) both;
      animation-delay: calc(200ms + var(--i) * 80ms);
    }
    .account mat-icon {
      color: var(--mat-sys-primary);
    }
    .account span {
      display: grid;
    }
    .account small {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly demoPassword = DEMO_PASSWORD;
  protected readonly features = [
    { icon: 'bolt', text: 'Claims move through a strict, audited lifecycle' },
    { icon: 'groups', text: 'Members, beneficiaries and age-banded premiums' },
    { icon: 'insights', text: 'Live dashboard, SLA tracking and notifications' },
    { icon: 'lock', text: 'Role-based access for members, assessors and admins' },
  ];
  protected readonly accounts: DemoAccount[] = [
    { username: 'member', role: 'Member', icon: 'person', blurb: 'See your cover, claim, chat with the assessor' },
    { username: 'assessor', role: 'Assessor', icon: 'fact_check', blurb: 'Work the queue, decide and pay claims' },
    { username: 'admin', role: 'Admin', icon: 'admin_panel_settings', blurb: 'Manage schemes, policies and members' },
  ];

  protected readonly form = inject(FormBuilder).nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly shake = signal(false);
  protected readonly showPassword = signal(false);

  protected useAccount(account: DemoAccount): void {
    this.form.setValue({ username: account.username, password: DEMO_PASSWORD });
    this.submit();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.shake.set(true);
      return;
    }
    const { username, password } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    this.auth.login(username, password).subscribe({
      next: () => void this.router.navigate(this.auth.homeRoute()),
      error: (err: unknown) => {
        this.error.set(problemMessage(err));
        this.busy.set(false);
        this.shake.set(true);
      },
    });
  }
}
