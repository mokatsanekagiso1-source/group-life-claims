import { DatePipe } from '@angular/common';
import { Component, computed, effect, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClaimsApi } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { ClaimNote } from '../../core/models';
import { problemMessage } from '../../core/problem';

/**
 * Chat-style conversation on a claim. Your own messages sit on the right; assessors can add
 * internal notes, shown with a dashed border and never sent to the member.
 */
@Component({
  selector: 'app-claim-notes',
  imports: [DatePipe, FormsModule, MatButtonModule, MatIconModule, MatSlideToggleModule, MatTooltipModule],
  template: `
    <div class="thread" #thread data-cy="notes">
      @for (note of notes(); track note.id) {
        <div
          class="note"
          [class.mine]="note.author === me()"
          [class.internal]="note.internal"
          animate.enter="enter-pop"
        >
          <div class="meta">
            <strong>{{ note.author }}</strong>
            <span class="role">{{ note.authorRole.toLowerCase() }}</span>
            @if (note.internal) {
              <span class="badge" matTooltip="Only staff can see this"><mat-icon>lock</mat-icon> internal</span>
            }
            <time>{{ note.createdAt | date: 'MMM d, HH:mm' }}</time>
          </div>
          <p>{{ note.body }}</p>
        </div>
      } @empty {
        <p class="empty">No messages yet. Questions about this claim go here.</p>
      }
    </div>

    @if (canWrite()) {
      <form class="composer" (ngSubmit)="send()">
        <textarea
          [(ngModel)]="draft"
          name="draft"
          rows="2"
          maxlength="4000"
          [placeholder]="internal() ? 'Internal note for staff…' : 'Write a message…'"
          (keydown.control.enter)="send()"
          (keydown.meta.enter)="send()"
          aria-label="Message"
          data-cy="note-input"
        ></textarea>
        <div class="composer-actions">
          @if (isAssessor()) {
            <mat-slide-toggle [checked]="internal()" (change)="internal.set($event.checked)">Internal</mat-slide-toggle>
          }
          <span class="hint">Ctrl + Enter to send</span>
          <button mat-flat-button type="submit" [disabled]="!draft.trim() || sending()" data-cy="send-note">
            <mat-icon>send</mat-icon> Send
          </button>
        </div>
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
      </form>
    }
  `,
  styles: `
    .thread {
      display: grid;
      gap: 12px;
      max-height: 420px;
      overflow-y: auto;
      padding: 4px;
      scroll-behavior: smooth;
    }
    .note {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 16px 16px 16px 4px;
      background: var(--mat-sys-surface-container-high);
      justify-self: start;
    }
    .note.mine {
      justify-self: end;
      border-radius: 16px 16px 4px 16px;
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }
    .note.internal {
      background: color-mix(in srgb, var(--status-assessment) 12%, var(--mat-sys-surface));
      border: 1px dashed var(--status-assessment);
    }
    .meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.75rem;
      opacity: 0.85;
    }
    .role {
      text-transform: capitalize;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      color: var(--status-assessment);
    }
    .badge mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    time {
      margin-left: auto;
    }
    p {
      margin: 4px 0 0;
      white-space: pre-line;
    }
    .empty {
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
    }
    .composer {
      margin-top: 12px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 16px;
      padding: 8px 8px 8px 14px;
      transition: border-color var(--motion-fast), box-shadow var(--motion-fast);
    }
    .composer:focus-within {
      border-color: var(--mat-sys-primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--mat-sys-primary) 18%, transparent);
    }
    textarea {
      width: 100%;
      border: 0;
      outline: 0;
      resize: vertical;
      background: transparent;
      color: inherit;
      font: inherit;
    }
    .composer-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .hint {
      margin-left: auto;
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class ClaimNotes {
  private readonly api = inject(ClaimsApi);
  private readonly auth = inject(AuthService);

  readonly claimId = input.required<string>();

  private readonly thread = viewChild<ElementRef<HTMLElement>>('thread');

  protected readonly notes = signal<ClaimNote[]>([]);
  protected readonly internal = signal(false);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected draft = '';

  protected readonly me = computed(() => this.auth.user()?.username);
  protected readonly isAssessor = computed(() => this.auth.hasRole('ASSESSOR'));
  protected readonly canWrite = computed(() => this.auth.hasRole('ASSESSOR', 'MEMBER'));

  constructor() {
    effect(() => {
      this.api.notes(this.claimId()).subscribe({
        next: (notes) => {
          this.notes.set(notes);
          this.scrollToEnd();
        },
        error: (err: unknown) => this.error.set(problemMessage(err)),
      });
    });
  }

  protected send(): void {
    const body = this.draft.trim();
    if (!body || this.sending()) {
      return;
    }
    this.sending.set(true);
    this.error.set(null);
    this.api.addNote(this.claimId(), body, this.internal()).subscribe({
      next: (note) => {
        this.notes.update((notes) => [...notes, note]);
        this.draft = '';
        this.sending.set(false);
        this.scrollToEnd();
      },
      error: (err: unknown) => {
        this.error.set(problemMessage(err));
        this.sending.set(false);
      },
    });
  }

  private scrollToEnd(): void {
    setTimeout(() => {
      const el = this.thread()?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }
}
