import { Directive, effect, ElementRef, inject, input, OnDestroy } from '@angular/core';
import { prefersReducedMotion } from '../core/theme.service';

/**
 * Animates a number from its previous value to the new one, easing out over {@code duration} ms.
 * Usage: {@code <span [appCountUp]="total" [format]="currency"></span>}
 */
@Directive({ selector: '[appCountUp]' })
export class CountUp implements OnDestroy {
  readonly appCountUp = input.required<number>();
  readonly duration = input(900);
  readonly format = input<(value: number) => string>((value) => Math.round(value).toLocaleString('en-ZA'));

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private current = 0;
  private frame = 0;

  constructor() {
    effect(() => this.animateTo(this.appCountUp(), this.duration(), this.format()));
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
  }

  private animateTo(target: number, duration: number, format: (value: number) => string): void {
    cancelAnimationFrame(this.frame);
    const from = this.current;
    if (prefersReducedMotion() || typeof requestAnimationFrame !== 'function' || from === target) {
      this.render(target, format);
      return;
    }
    const start = performance.now();
    const step = () => {
      // The frame timestamp passed by rAF can precede the start time; clamp so progress never goes negative.
      const progress = Math.min(1, Math.max(0, (performance.now() - start) / duration));
      const eased = 1 - Math.pow(1 - progress, 3);
      this.render(from + (target - from) * eased, format);
      if (progress < 1) {
        this.frame = requestAnimationFrame(step);
      }
    };
    this.frame = requestAnimationFrame(step);
  }

  private render(value: number, format: (value: number) => string): void {
    this.current = value;
    this.element.nativeElement.textContent = format(value);
  }
}
