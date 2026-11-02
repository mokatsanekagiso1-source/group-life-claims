import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { Role, Session } from './models';

const STORAGE_KEY = 'grouplife.session';

function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

/** Holds the signed-in user and their bearer token. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = signal<Session | null>(readStoredSession());

  readonly user = this.session.asReadonly();
  readonly isSignedIn = computed(() => this.session() !== null);

  login(username: string, password: string): Observable<Session> {
    return this.http
      .post<Session>('/api/auth/login', { username, password })
      .pipe(tap((session) => this.store(session)));
  }

  logout(): void {
    this.store(null);
    void this.router.navigate(['/login']);
  }

  /** The bearer token, or null when signed out or expired. */
  token(): string | null {
    const session = this.session();
    if (!session) {
      return null;
    }
    if (Date.parse(session.expiresAt) <= Date.now()) {
      this.store(null);
      return null;
    }
    return session.accessToken;
  }

  hasRole(...roles: Role[]): boolean {
    const role = this.session()?.role;
    return role !== undefined && roles.includes(role);
  }

  /** Where each role lands after signing in. */
  homeRoute(): string[] {
    const session = this.session();
    switch (session?.role) {
      case 'MEMBER':
        return ['/members', session.memberId ?? ''];
      case 'ASSESSOR':
      case 'ADMIN':
        return ['/dashboard'];
      default:
        return ['/login'];
    }
  }

  private store(session: Session | null): void {
    this.session.set(session);
    try {
      if (session) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Storage can be unavailable (private mode); the in-memory session still works.
    }
  }
}
