import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Session } from '../core/models';
import { CommandPalette, CommandPaletteState } from './command-palette';
import { NotificationBell } from './notification-bell';

const session: Session = {
  accessToken: 'token',
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  username: 'assessor',
  role: 'ASSESSOR',
  memberId: null,
};

describe('Toolbar widgets', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem('grouplife.session', JSON.stringify(session));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => localStorage.clear());

  it('shows the unread count on the bell', async () => {
    const fixture = TestBed.createComponent(NotificationBell);
    fixture.detectChanges();
    // The first poll fires on the next macrotask.
    await new Promise((resolve) => setTimeout(resolve));

    httpMock.expectOne('/api/notifications/unread-count').flush({ unread: 3 });
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.mat-badge-content')?.textContent?.trim()).toBe('3');
  });

  it('opens the command palette with Ctrl+K and filters pages by name', async () => {
    const fixture = TestBed.createComponent(CommandPalette);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    fixture.detectChanges();
    expect(TestBed.inject(CommandPaletteState).open()).toBe(true);
    expect(el.querySelector('[data-cy=command-palette]')).not.toBeNull();

    const input = el.querySelector<HTMLInputElement>('[data-cy=palette-input]')!;
    input.value = 'queue';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const options = Array.from(el.querySelectorAll('[role=option]')).map((o) => o.textContent?.trim());
    expect(options).toHaveLength(1);
    expect(options[0]).toContain('Claims queue');
  });

  it('hides admin-only pages from assessors', () => {
    const fixture = TestBed.createComponent(CommandPalette);
    TestBed.inject(CommandPaletteState).open.set(true);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Dashboard');
    expect(text).not.toContain('Schemes and policies');
  });
});
