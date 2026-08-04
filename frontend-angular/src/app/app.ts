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
    const aura = document.getElementById('cursorRing')!;
    let rx = 0, ry = 0;
    let rafId = 0;

    const onMove = (e: MouseEvent) => {
      aura.style.opacity = '1';
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rx += (e.clientX - rx) * 0.12;
        ry += (e.clientY - ry) * 0.12;
        aura.style.left = rx + 'px';
        aura.style.top  = ry + 'px';
      });
    };
    const onLeave = () => { aura.style.opacity = '0'; };
    const onOver  = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('a, button, [role="button"], .video-preview-card'))
        aura.classList.add('cursor-hover');
    };
    const onOut   = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('a, button, [role="button"], .video-preview-card'))
        aura.classList.remove('cursor-hover');
    };

    document.addEventListener('mousemove',  onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseover',  onOver);
    document.addEventListener('mouseout',   onOut);

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove',  onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseover',  onOver);
      document.removeEventListener('mouseout',   onOut);
    });
  }
}
