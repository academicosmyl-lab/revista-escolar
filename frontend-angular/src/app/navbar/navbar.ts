// CAMBIO ARCH-UI: HostListener + signal para efecto vidrio en scroll
import { Component, HostListener, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
  menuAbierto = false;

  // signal: Angular OnPush detecta el cambio cuando scrolled() cambia
  // (true = usuario bajó más de 60px → activa glass morphism)
  scrolled = signal(false);

  toggleMenu() { this.menuAbierto = !this.menuAbierto; }
  cerrarMenu() { this.menuAbierto = false; }

  // HostListener: escucha el evento scroll de window dentro de este componente
  @HostListener('window:scroll')
  onScroll() {
    this.scrolled.set(window.scrollY > 60);
  }
}
