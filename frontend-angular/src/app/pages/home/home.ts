import { Component, OnInit, AfterViewInit, ElementRef, ViewChildren, QueryList, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements AfterViewInit {
  @ViewChildren('statNum') statNums!: QueryList<ElementRef>;
  @ViewChildren('revealEl') revealEls!: QueryList<ElementRef>;

  contadores = [
    { label: 'Sedes', valor: 3, sufijo: '', actual: 0 },
    { label: 'Docentes', valor: 50, sufijo: '+', actual: 0 },
    { label: 'Áreas académicas', valor: 14, sufijo: '', actual: 0 },
    { label: 'Estudiantes', valor: 1000, sufijo: '+', actual: 0 },
  ];

  noticiasEjemplo = [
    { id: 1, imgKey: 'NOTICIA_02', categoria: 'Deportes', titulo: 'Campeones departamentales de atletismo 2026', fecha: '12 de mayo, 2026' },
    { id: 2, imgKey: 'NOTICIA_03', categoria: 'Ciencia', titulo: 'Estudiantes ganan olimpiada de matemáticas', fecha: '8 de mayo, 2026' },
    { id: 3, imgKey: 'NOTICIA_04', categoria: 'Cultura', titulo: 'Festival artístico intercolegial sede Bachillerato', fecha: '5 de mayo, 2026' },
    { id: 4, imgKey: 'NOTICIA_05', categoria: 'Tecnología', titulo: 'Feria de ciencias e innovación técnica 2026', fecha: '2 de mayo, 2026' },
  ];

  sedes = [
    { nombre: 'Sede Bachillerato', tipo: 'Bachillerato Técnico', imgKey: 'SEDE_BACHILLERATO' },
    { nombre: 'Sede Básica Primaria', tipo: 'Básica Primaria', imgKey: 'SEDE_PRIMARIA' },
    { nombre: 'Sede Los Sauces', tipo: 'Rural', imgKey: 'SEDE_LOS_SAUCES' },
  ];

  linksFooter = [
    { label: 'Inicio', path: '/' },
    { label: 'Revista', path: '/noticias' },
    { label: 'Galería', path: '/galeria' },
    { label: 'Docentes', path: '/docentes' },
    { label: 'Sedes', path: '/sedes' },
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    this.initScrollReveal();
    this.initContadores();
  }

  private initScrollReveal() {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } }),
      { threshold: 0.15 }
    );
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  private initContadores() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.animarContadores();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );
    const banda = document.querySelector('.estadisticas-banda');
    if (banda) observer.observe(banda);
  }

  private animarContadores() {
    this.contadores.forEach((c, i) => {
      const duracion = 1800;
      const pasos = 60;
      const incremento = c.valor / pasos;
      let actual = 0;
      let paso = 0;
      const intervalo = setInterval(() => {
        paso++;
        actual = Math.min(Math.round(incremento * paso), c.valor);
        this.contadores[i].actual = actual;
        this.cdr.detectChanges();
        if (actual >= c.valor) clearInterval(intervalo);
      }, duracion / pasos);
    });
  }
}
