import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** A friendly placeholder for lists with nothing in them. */
@Component({
  selector: 'app-empty-state',
  imports: [MatIconModule],
  template: `
    <div class="empty enter-fade">
      <span class="icon"><mat-icon>{{ icon() }}</mat-icon></span>
      <p class="title">{{ title() }}</p>
      @if (hint()) {
        <p class="hint">{{ hint() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: `
    .empty {
      display: grid;
      justify-items: center;
      gap: 4px;
      padding: 32px 16px;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
    }
    .icon {
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      margin-bottom: 8px;
      background: var(--mat-sys-surface-container-high);
      animation: float 6s ease-in-out infinite;
    }
    .title {
      margin: 0;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }
    .hint {
      margin: 0;
      font-size: 0.875rem;
    }
  `,
})
export class EmptyState {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly hint = input<string>();
}
