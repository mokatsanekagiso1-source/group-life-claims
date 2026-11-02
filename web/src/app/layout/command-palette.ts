import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injectable,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, forkJoin, map, of, switchMap } from 'rxjs';
import { ClaimsApi, MembersApi } from '../core/api';
import { AuthService } from '../core/auth.service';
import { Role } from '../core/models';
import { ThemeService } from '../core/theme.service';
import { STATUS_LABELS } from '../shared/labels';

interface Command {
  id: string;
  group: 'Go to' | 'Members' | 'Claims' | 'Actions';
  label: string;
  hint?: string;
  icon: string;
  run: () => void;
}

/** Opens and closes the palette from anywhere (toolbar button or Ctrl+K). */
@Injectable({ providedIn: 'root' })
export class CommandPaletteState {
  readonly open = signal(false);

  toggle(): void {
    this.open.update((open) => !open);
  }
}

/** Ctrl+K / ⌘K: jump to any page, member or claim from the keyboard. */
@Component({
  selector: 'app-command-palette',
  imports: [MatIconModule],
  host: { '(document:keydown)': 'onGlobalKey($event)' },
  template: `
    @if (state.open()) {
      <div class="backdrop" animate.enter="enter-fade" animate.leave="leave-fade" (click)="close()"></div>
      <div
        class="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        animate.enter="enter-pop"
        animate.leave="leave-fade"
        data-cy="command-palette"
      >
        <div class="search">
          <mat-icon>search</mat-icon>
          <input
            #input
            [value]="query()"
            (input)="onInput($event)"
            (keydown)="onKey($event)"
            placeholder="Search members, claims, pages…"
            aria-label="Search"
            autocomplete="off"
            data-cy="palette-input"
          />
          <kbd>Esc</kbd>
        </div>
        <ul class="results" role="listbox">
          @for (command of results(); track command.id) {
            @if ($index === 0 || results()[$index - 1].group !== command.group) {
              <li class="group" role="presentation">{{ command.group }}</li>
            }
            <li
              role="option"
              [attr.aria-selected]="$index === selected()"
              [class.selected]="$index === selected()"
              (mouseenter)="selected.set($index)"
              (click)="run(command)"
            >
              <mat-icon>{{ command.icon }}</mat-icon>
              <span class="label">{{ command.label }}</span>
              @if (command.hint) {
                <span class="hint">{{ command.hint }}</span>
              }
            </li>
          } @empty {
            <li class="none">{{ searching() ? 'Searching…' : 'No matches' }}</li>
          }
        </ul>
        <footer><kbd>↑</kbd><kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Ctrl</kbd> <kbd>K</kbd> to toggle</footer>
      </div>
    }
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: color-mix(in srgb, #000 40%, transparent);
      backdrop-filter: blur(3px);
    }
    .palette {
      position: fixed;
      z-index: 1001;
      top: 12vh;
      left: 0;
      right: 0;
      margin: 0 auto;
      width: min(640px, calc(100vw - 32px));
      border-radius: 16px;
      overflow: hidden;
      background: var(--mat-sys-surface-container-low);
      box-shadow: 0 24px 64px -16px rgb(0 0 0 / 0.45);
      border: 1px solid var(--mat-sys-outline-variant);
    }
    .palette.enter-pop {
      animation: rise-in var(--motion-medium) var(--ease-out);
    }
    .search {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    input {
      flex: 1;
      border: 0;
      outline: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      font-size: 1.05rem;
    }
    .results {
      list-style: none;
      margin: 0;
      padding: 6px;
      max-height: min(420px, 55vh);
      overflow-y: auto;
    }
    .results li[role='option'] {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      cursor: pointer;
    }
    .results li.selected {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }
    .group {
      padding: 10px 12px 4px;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--mat-sys-on-surface-variant);
    }
    .label {
      flex: 1;
    }
    .hint {
      font-size: 0.8rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .none {
      padding: 24px;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
    }
    footer {
      padding: 8px 16px;
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    kbd {
      display: inline-block;
      min-width: 18px;
      padding: 1px 5px;
      border-radius: 4px;
      border: 1px solid var(--mat-sys-outline-variant);
      font: 0.75rem ui-monospace, monospace;
      text-align: center;
    }
  `,
})
export class CommandPalette {
  protected readonly state = inject(CommandPaletteState);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);
  private readonly members = inject(MembersApi);
  private readonly claims = inject(ClaimsApi);

  private readonly input = viewChild<ElementRef<HTMLInputElement>>('input');

  protected readonly query = signal('');
  protected readonly selected = signal(0);
  protected readonly searching = signal(false);
  private readonly found = signal<Command[]>([]);

  private readonly pages = computed<Command[]>(() => {
    const role = this.auth.user()?.role;
    const memberId = this.auth.user()?.memberId;
    const staff: Role[] = ['ADMIN', 'ASSESSOR'];
    const pages: (Command & { roles?: Role[] })[] = [
      { id: 'p-dash', group: 'Go to', label: 'Dashboard', icon: 'space_dashboard', roles: staff, run: () => this.go('/dashboard') },
      { id: 'p-queue', group: 'Go to', label: 'Claims queue', icon: 'inbox', roles: staff, run: () => this.go('/claims') },
      { id: 'p-members', group: 'Go to', label: 'Members', icon: 'groups', roles: staff, run: () => this.go('/members') },
      { id: 'p-activity', group: 'Go to', label: 'Activity feed', icon: 'timeline', roles: staff, run: () => this.go('/activity') },
      { id: 'p-schemes', group: 'Go to', label: 'Schemes and policies', icon: 'domain', roles: ['ADMIN'], run: () => this.go('/schemes') },
      { id: 'p-cover', group: 'Go to', label: 'My cover', icon: 'shield', roles: ['MEMBER'], run: () => this.go(`/members/${memberId}`) },
      {
        id: 'p-benef',
        group: 'Go to',
        label: 'My beneficiaries',
        icon: 'diversity_3',
        roles: ['MEMBER'],
        run: () => this.go(`/members/${memberId}/beneficiaries`),
      },
      { id: 'p-calc', group: 'Go to', label: 'Premium calculator', icon: 'calculate', run: () => this.go('/calculator') },
      { id: 'a-theme', group: 'Actions', label: 'Switch theme', icon: 'contrast', run: () => this.theme.cycle() },
      { id: 'a-out', group: 'Actions', label: 'Sign out', icon: 'logout', run: () => this.auth.logout() },
    ];
    return pages.filter((p) => !p.roles || (role !== undefined && p.roles.includes(role)));
  });

  protected readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    const pages = q ? this.pages().filter((p) => p.label.toLowerCase().includes(q)) : this.pages();
    return [...pages, ...this.found()];
  });

  constructor() {
    effect(() => {
      if (this.state.open()) {
        untracked(() => this.reset());
      }
    });

    toObservable(this.query)
      .pipe(
        map((q) => q.trim()),
        debounceTime(200),
        distinctUntilChanged(),
        switchMap((q) => {
          if (q.length < 2) {
            return of<Command[]>([]);
          }
          this.searching.set(true);
          const staff = this.auth.hasRole('ADMIN', 'ASSESSOR');
          return forkJoin({
            members: staff
              ? this.members.search(q, 0, 5).pipe(catchError(() => of(null)))
              : of(null),
            claims: this.claims.search({ text: q }, 0, 6, 'submittedAt,desc').pipe(catchError(() => of(null))),
          }).pipe(
            map(({ members, claims }) => [
              ...(members?.content ?? []).map<Command>((m) => ({
                id: 'm-' + m.id,
                group: 'Members',
                label: m.fullName,
                hint: `${m.employeeNumber} · ${m.schemeName}`,
                icon: 'person',
                run: () => this.go(`/members/${m.id}`),
              })),
              ...(claims?.content ?? []).map<Command>((c) => ({
                id: 'c-' + c.id,
                group: 'Claims',
                label: `${c.claimNumber} · ${c.memberName}`,
                hint: STATUS_LABELS[c.status],
                icon: 'description',
                run: () => this.go(`/claims/${c.id}`),
              })),
            ]),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((found) => {
        this.found.set(found);
        this.searching.set(false);
        this.selected.set(0);
      });
  }

  protected onGlobalKey(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && this.auth.isSignedIn()) {
      event.preventDefault();
      this.state.toggle();
    } else if (event.key === 'Escape' && this.state.open()) {
      this.close();
    }
  }

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.selected.set(0);
  }

  protected onKey(event: KeyboardEvent): void {
    const count = this.results().length;
    if (event.key === 'ArrowDown' && count) {
      event.preventDefault();
      this.selected.update((i) => (i + 1) % count);
    } else if (event.key === 'ArrowUp' && count) {
      event.preventDefault();
      this.selected.update((i) => (i - 1 + count) % count);
    } else if (event.key === 'Enter') {
      const command = this.results()[this.selected()];
      if (command) {
        this.run(command);
      }
    }
  }

  protected run(command: Command): void {
    this.close();
    command.run();
  }

  protected close(): void {
    this.state.open.set(false);
  }

  private reset(): void {
    this.query.set('');
    this.found.set([]);
    this.selected.set(0);
    setTimeout(() => this.input()?.nativeElement.focus());
  }

  private go(url: string): void {
    void this.router.navigateByUrl(url);
  }
}
