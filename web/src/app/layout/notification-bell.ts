import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { catchError, EMPTY, switchMap, timer } from 'rxjs';
import { NotificationsApi } from '../core/api';
import { AppNotification, NotificationType } from '../core/models';

const POLL_MS = 30_000;

const ICONS: Record<NotificationType, string> = {
  CLAIM_SUBMITTED: 'fiber_new',
  CLAIM_STATUS_CHANGED: 'published_with_changes',
  CLAIM_WITHDRAWN: 'undo',
  NOTE_ADDED: 'chat',
  DOCUMENT_ADDED: 'attach_file',
};

/** Toolbar bell: polls the unread count, wiggles when it rises, opens the latest notifications. */
@Component({
  selector: 'app-notification-bell',
  imports: [DatePipe, MatBadgeModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule],
  template: `
    <button
      mat-icon-button
      [matMenuTriggerFor]="menu"
      (menuOpened)="load()"
      aria-label="Notifications"
      matTooltip="Notifications"
      data-cy="notifications"
    >
      <mat-icon
        [class.wiggle]="wiggle()"
        [matBadge]="unread() || null"
        matBadgeColor="warn"
        matBadgeSize="small"
        aria-hidden="false"
        (animationend)="wiggle.set(false)"
      >
        {{ unread() ? 'notifications_active' : 'notifications' }}
      </mat-icon>
    </button>

    <mat-menu #menu="matMenu" class="notification-menu" xPosition="before">
      <div class="header" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
        <strong>Notifications</strong>
        @if (unread()) {
          <button mat-button (click)="markAllRead()">Mark all read</button>
        }
      </div>
      @for (item of items(); track item.id) {
        <button mat-menu-item class="item" [class.unread]="!item.read" (click)="open(item)" [style.--i]="$index" animate.enter="enter-slide">
          <mat-icon>{{ icons[item.type] }}</mat-icon>
          <span class="text">
            <span class="title">{{ item.title }}</span>
            <span class="body">{{ item.body }}</span>
            <span class="time">{{ item.createdAt | date: 'MMM d, HH:mm' }}</span>
          </span>
        </button>
      } @empty {
        <p class="empty">{{ loading() ? 'Loading…' : "You're all caught up." }}</p>
      }
    </mat-menu>
  `,
  styles: `
    .wiggle {
      animation: wiggle 700ms ease-in-out;
      transform-origin: top center;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 4px 8px 8px 16px;
      min-width: 320px;
    }
    .item {
      height: auto;
      min-height: 64px;
      padding-top: 8px;
      padding-bottom: 8px;
      white-space: normal;
    }
    .item.unread {
      background: color-mix(in srgb, var(--mat-sys-primary) 8%, transparent);
    }
    .item.unread .title::after {
      content: '';
      display: inline-block;
      width: 8px;
      height: 8px;
      margin-left: 6px;
      border-radius: 50%;
      background: var(--mat-sys-primary);
      vertical-align: middle;
    }
    .text {
      display: grid;
      gap: 2px;
      max-width: 320px;
    }
    .title {
      font-weight: 500;
    }
    .body {
      font-size: 0.85rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .time {
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .empty {
      margin: 0;
      padding: 16px;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class NotificationBell implements OnInit {
  private readonly api = inject(NotificationsApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly icons = ICONS;
  protected readonly unread = signal(0);
  protected readonly items = signal<AppNotification[]>([]);
  protected readonly loading = signal(false);
  protected readonly wiggle = signal(false);

  ngOnInit(): void {
    timer(0, POLL_MS)
      .pipe(
        switchMap(() => this.api.unreadCount().pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ unread }) => this.setUnread(unread));
  }

  protected load(): void {
    this.loading.set(true);
    this.api.feed().subscribe({
      next: (feed) => {
        this.items.set(feed.items);
        this.setUnread(feed.unread);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected open(item: AppNotification): void {
    if (!item.read) {
      this.api.markRead(item.id).subscribe();
      this.items.update((items) => items.map((i) => (i.id === item.id ? { ...i, read: true } : i)));
      this.unread.update((n) => Math.max(0, n - 1));
    }
    if (item.link) {
      void this.router.navigateByUrl(item.link);
    }
  }

  protected markAllRead(): void {
    this.api.markAllRead().subscribe(() => {
      this.items.update((items) => items.map((i) => ({ ...i, read: true })));
      this.unread.set(0);
    });
  }

  private setUnread(count: number): void {
    if (count > this.unread()) {
      this.wiggle.set(true);
    }
    this.unread.set(count);
  }
}
