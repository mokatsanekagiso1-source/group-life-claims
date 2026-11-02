import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { prefersReducedMotion } from '../core/theme.service';

const COLORS = ['#3b6cf6', '#7c4dff', '#00b8d9', '#36b37e', '#ffab00', '#ff5630'];

/** A short burst of confetti, for moments worth celebrating (a claim paid). Pure DOM and CSS. */
@Injectable({ providedIn: 'root' })
export class Confetti {
  private readonly document = inject(DOCUMENT);

  burst(pieces = 120): void {
    if (prefersReducedMotion()) {
      return;
    }
    const layer = this.document.createElement('div');
    layer.setAttribute('aria-hidden', 'true');
    Object.assign(layer.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      overflow: 'hidden',
      zIndex: '2000',
    });

    for (let i = 0; i < pieces; i++) {
      const piece = this.document.createElement('span');
      const size = 6 + Math.random() * 6;
      Object.assign(piece.style, {
        position: 'absolute',
        top: `${-5 - Math.random() * 15}vh`,
        left: `${Math.random() * 100}vw`,
        width: `${size}px`,
        height: `${size * (Math.random() < 0.5 ? 0.4 : 1)}px`,
        background: COLORS[i % COLORS.length],
        borderRadius: Math.random() < 0.3 ? '50%' : '2px',
        animation: `confetti-fall ${1.8 + Math.random() * 1.6}s cubic-bezier(0.25, 0.6, 0.4, 1) ${Math.random() * 0.4}s forwards`,
      });
      piece.style.setProperty('--drift', `${(Math.random() - 0.5) * 300}px`);
      piece.style.setProperty('--spin', `${(Math.random() - 0.5) * 1440}deg`);
      layer.appendChild(piece);
    }

    this.document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 4000);
  }
}
