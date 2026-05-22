import {
  Component, signal, OnInit, OnDestroy,
  ChangeDetectionStrategy, PLATFORM_ID, inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const KEY = 'iti_cookies_consent';

@Component({
  selector:        'app-cookie-consent',
  templateUrl:     './cookie-consent.html',
  styleUrl:        './cookie-consent.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookieConsent implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);

  visible    = signal(false);
  detallando = signal(false);

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    const guardado = localStorage.getItem(KEY);
    if (!guardado) {
      this.visible.set(true);
      document.body.style.overflow = 'hidden'; // bloquea scroll
    }
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
  }

  // Acepta todas las cookies
  aceptarTodo() {
    localStorage.setItem(KEY, JSON.stringify({ analiticas: true, ts: Date.now() }));
    this._cerrar();
  }

  // Solo las esenciales (la revista funciona igual, sin analíticas)
  soloEsenciales() {
    localStorage.setItem(KEY, JSON.stringify({ analiticas: false, ts: Date.now() }));
    this._cerrar();
  }

  private _cerrar() {
    this.visible.set(false);
    document.body.style.overflow = '';
  }
}
