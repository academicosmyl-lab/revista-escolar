import { Component, inject, OnInit, AfterViewInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './navbar/navbar';
import { ApiService } from './services/api.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, AfterViewInit {
  private api = inject(ApiService);

  ngOnInit() {
    this.api.get('/health').subscribe({ error: () => {} });
  }

  ngAfterViewInit() {
    const dot  = document.getElementById('cursorDot')!;
    const ring = document.getElementById('cursorRing')!;
    let rx = 0, ry = 0;

    document.addEventListener('mousemove', (e) => {
      dot.style.transform  = `translate(${e.clientX}px, ${e.clientY}px)`;
      rx += (e.clientX - rx) * 0.12;
      ry += (e.clientY - ry) * 0.12;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
    });

    document.addEventListener('mouseenter', () => { dot.style.opacity = '1'; ring.style.opacity = '1'; });
    document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });

    /* Crece el ring sobre links y botones */
    document.addEventListener('mouseover', (e) => {
      if ((e.target as HTMLElement).closest('a, button, [role="button"], .video-preview-card')) {
        ring.classList.add('cursor-hover');
      }
    });
    document.addEventListener('mouseout', (e) => {
      if ((e.target as HTMLElement).closest('a, button, [role="button"], .video-preview-card')) {
        ring.classList.remove('cursor-hover');
      }
    });
  }
}
