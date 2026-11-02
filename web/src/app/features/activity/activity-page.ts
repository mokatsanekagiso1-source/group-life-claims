import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { InsightsApi } from '../../core/api';
import { ActivityItem } from '../../core/models';
import { problemMessage } from '../../core/problem';
import { EmptyState } from '../../shared/empty-state';
import { STATUS_COLORS, STATUS_ICONS, STATUS_LABELS } from '../../shared/labels';

interface DayGroup {
  day: string;
  items: ActivityItem[];
}

const DAY_FORMAT = new Intl.DateTimeFormat('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** Every claim status change across the book, grouped by day, with infinite "load more". */
@Component({
  selector: 'app-activity-page',
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, EmptyState],
  template: `
    <header class="page-header">
      <div>
        <h1>Activity</h1>
        <p class="subtitle">Every claim status change, newest first. The audit trail, across all claims.</p>
      </div>
    </header>

    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }

    @for (group of groups(); track group.day) {
      <section class="day">
        <h2>{{ group.day }}</h2>
        <ol class="feed">
          @for (item of group.items; track $index) {
            <li class="enter-rise" [style.--i]="$index % 10">
              <span class="node" [style.--color]="colors[item.toStatus]">
                <mat-icon>{{ icons[item.toStatus] }}</mat-icon>
              </span>
              <div class="card lift">
                <div class="line">
                  <a [routerLink]="['/claims', item.claimId]">{{ item.claimNumber }}</a>
                  <span class="muted">{{ item.memberName }}</span>
                  <time class="muted">{{ item.occurredAt | date: 'HH:mm' }}</time>
                </div>
                <div class="change">
                  @if (item.fromStatus) {
                    <span class="from">{{ labels[item.fromStatus] }}</span>
                    <mat-icon class="arrow">arrow_forward</mat-icon>
                  }
                  <strong [style.color]="colors[item.toStatus]">{{ labels[item.toStatus] }}</strong>
                  <span class="muted">by {{ item.actor }}</span>
                </div>
                @if (item.reason) {
                  <p class="reason">“{{ item.reason }}”</p>
                }
              </div>
            </li>
          }
        </ol>
      </section>
    } @empty {
      @if (!loading()) {
        <app-empty-state icon="timeline" title="No activity yet" hint="Claim changes will appear here." />
      }
    }

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    } @else if (hasMore()) {
      <div class="more"><button mat-stroked-button (click)="loadMore()">Load more</button></div>
    }
  `,
  styles: `
    .day h2 {
      position: sticky;
      top: 64px;
      z-index: 1;
      padding: 8px 0;
      margin: 24px 0 8px;
      font: var(--mat-sys-title-small);
      color: var(--mat-sys-on-surface-variant);
      background: var(--mat-sys-surface);
    }
    .feed {
      list-style: none;
      margin: 0;
      padding: 0 0 0 18px;
      border-left: 2px solid var(--mat-sys-outline-variant);
    }
    .feed li {
      position: relative;
      padding: 0 0 14px 24px;
    }
    .node {
      position: absolute;
      left: -19px;
      top: 6px;
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      margin-left: -17px;
      border-radius: 50%;
      color: #fff;
      background: var(--color);
      box-shadow: 0 0 0 4px var(--mat-sys-surface);
    }
    .node mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .card {
      padding: 12px 16px;
      border-radius: 12px;
      background: var(--mat-sys-surface-container-low);
      border: 1px solid var(--mat-sys-outline-variant);
    }
    .line,
    .change {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .line time {
      margin-left: auto;
    }
    .change {
      margin-top: 4px;
    }
    .from {
      color: var(--mat-sys-on-surface-variant);
    }
    .arrow {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .reason {
      margin: 6px 0 0;
      color: var(--mat-sys-on-surface-variant);
    }
    .more {
      display: flex;
      justify-content: center;
      margin: 16px 0;
    }
  `,
})
export class ActivityPage implements OnInit {
  private readonly api = inject(InsightsApi);

  protected readonly labels = STATUS_LABELS;
  protected readonly icons = STATUS_ICONS;
  protected readonly colors = STATUS_COLORS;

  private readonly items = signal<ActivityItem[]>([]);
  private page = 0;
  protected readonly hasMore = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly groups = computed<DayGroup[]>(() => {
    const groups: DayGroup[] = [];
    for (const item of this.items()) {
      const day = DAY_FORMAT.format(new Date(item.occurredAt));
      const last = groups.at(-1);
      if (last?.day === day) {
        last.items.push(item);
      } else {
        groups.push({ day, items: [item] });
      }
    }
    return groups;
  });

  ngOnInit(): void {
    this.loadMore();
  }

  protected loadMore(): void {
    this.loading.set(true);
    this.api.activity(this.page).subscribe({
      next: (page) => {
        this.items.update((items) => [...items, ...page.content]);
        this.hasMore.set(page.page + 1 < page.totalPages);
        this.page++;
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(problemMessage(err));
        this.loading.set(false);
      },
    });
  }
}
