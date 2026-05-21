// CAMBIO ARCH-UI: HostListener + signal para efecto vidrio en scroll
import { Component, HostListener, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
  auth = inject(AuthService);
  menuAbierto = false;
  scrolled = signal(false);

  toggleMenu() { this.menuAbierto = !this.menuAbierto; }
  cerrarMenu() { this.menuAbierto = false; }

  @HostListener('window:scroll')
  onScroll() { this.scrolled.set(window.scrollY > 60); }
}
