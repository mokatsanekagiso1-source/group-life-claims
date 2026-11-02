import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'grouplife.theme';
const ORDER: ThemePreference[] = ['system', 'light', 'dark'];

/** Light, dark or follow-the-OS colour scheme, remembered per browser. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  readonly preference = signal<ThemePreference>(this.read());

  constructor() {
    effect(() => {
      const preference = this.preference();
      const root = this.document.documentElement;
      root.style.colorScheme = preference === 'system' ? 'light dark' : preference;
      root.dataset['theme'] = preference;
      try {
        localStorage.setItem(STORAGE_KEY, preference);
      } catch {
        // Storage unavailable: the choice lasts for this page load only.
      }
    });
  }

  /** Cycles system → light → dark, with a cross-fade where the browser supports it. */
  cycle(): void {
    const next = ORDER[(ORDER.indexOf(this.preference()) + 1) % ORDER.length];
    const doc = this.document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !prefersReducedMotion()) {
      doc.startViewTransition(() => this.preference.set(next));
    } else {
      this.preference.set(next);
    }
  }

  private read(): ThemePreference {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
      return 'system';
    }
  }
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
