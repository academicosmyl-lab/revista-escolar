import { Component, inject, OnInit, AfterViewInit, DestroyRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './navbar/navbar';
import { Footer } from './shared/footer/footer'; // CAMBIO ARCH-UI: FooterComponent compartido
import { CookieConsent } from './shared/cookie-consent/cookie-consent';
import { ApiService } from './services/api.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer, CookieConsent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, AfterViewInit {
  private api       = inject(ApiService);
  private destroyRef = inject(DestroyRef); // CAMBIO ARCH-UI: evita memory leak al destruir el componente

  ngOnInit() {
    this.api.get('/health').subscribe({ error: () => {} });
  }

  ngAfterViewInit() {
    const dot  = document.getElementById('cursorDot')!;
    const ring = document.getElementById('cursorRing')!;
    let rx = 0, ry = 0;
    let rafId = 0;

    const onMove = (e: MouseEvent) => {
      dot.style.opacity = '1';
      ring.style.opacity = '1';
      dot.style.left = (e.clientX - 4) + 'px';
      dot.style.top  = (e.clientY - 4) + 'px';
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rx += (e.clientX - rx) * 0.12;
        ry += (e.clientY - ry) * 0.12;
        ring.style.left = (rx - 19) + 'px';
        ring.style.top  = (ry - 19) + 'px';
      });
    };
    const onEnter = () => { dot.style.opacity = '1'; ring.style.opacity = '1'; };
    const onLeave = () => { dot.style.opacity = '0'; ring.style.opacity = '0'; };
    const onOver  = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('a, button, [role="button"], .video-preview-card'))
        ring.classList.add('cursor-hover');
    };
    const onOut   = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('a, button, [role="button"], .video-preview-card'))
        ring.classList.remove('cursor-hover');
    };

    document.addEventListener('mousemove',  onMove);
    document.addEventListener('mouseenter', onEnter);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseover',  onOver);
    document.addEventListener('mouseout',   onOut);

    // CAMBIO ARCH-UI: DestroyRef limpia los listeners cuando Angular destruye el componente
    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove',  onMove);
      document.removeEventListener('mouseenter', onEnter);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseover',  onOver);
      document.removeEventListener('mouseout',   onOut);
    });
  }
}
