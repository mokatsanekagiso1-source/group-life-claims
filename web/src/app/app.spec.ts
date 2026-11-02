import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { Session } from './core/models';

const SESSION_KEY = 'grouplife.session';

function session(overrides: Partial<Session> = {}): Session {
  return {
    accessToken: 'token',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    username: 'assessor',
    role: 'ASSESSOR',
    memberId: null,
    ...overrides,
  };
}

async function render() {
  await TestBed.configureTestingModule({
    imports: [App],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();
  const fixture = TestBed.createComponent(App);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('App shell', () => {
  afterEach(() => localStorage.clear());

  it('hides the toolbar when signed out', async () => {
    const el = await render();

    expect(el.querySelector('mat-toolbar')).toBeNull();
  });

  it('shows staff navigation to assessors', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session()));

    const el = await render();

    expect(el.querySelector('[data-cy=account]')?.textContent).toContain('A');
    expect(el.querySelector('[data-cy=nav-dashboard]')).not.toBeNull();
    expect(el.querySelector('[data-cy=nav-claims]')).not.toBeNull();
    expect(el.querySelector('[data-cy=nav-schemes]')).toBeNull();
    expect(el.querySelector('[data-cy=nav-my-cover]')).toBeNull();
  });

  it('shows members only their own cover', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session({ username: 'member', role: 'MEMBER', memberId: 'm-1' })));

    const el = await render();

    expect(el.querySelector('[data-cy=nav-my-cover]')).not.toBeNull();
    expect(el.querySelector('[data-cy=nav-calculator]')).not.toBeNull();
    expect(el.querySelector('[data-cy=nav-members]')).toBeNull();
    expect(el.querySelector('[data-cy=nav-claims]')).toBeNull();
    expect(el.querySelector('[data-cy=nav-dashboard]')).toBeNull();
  });

  it('gives admins the schemes page', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session({ username: 'admin', role: 'ADMIN' })));

    const el = await render();

    expect(el.querySelector('[data-cy=nav-schemes]')).not.toBeNull();
  });
});
