import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  noticiasEjemplo = [
    { id: 1, imgKey: 'NOTICIA_02', categoria: 'Deportes', titulo: 'Campeones departamentales de atletismo 2026', fecha: '12 de mayo, 2026' },
    { id: 2, imgKey: 'NOTICIA_03', categoria: 'Ciencia', titulo: 'Estudiantes ganan olimpiada de matemáticas', fecha: '8 de mayo, 2026' },
    { id: 3, imgKey: 'NOTICIA_04', categoria: 'Cultura', titulo: 'Festival artístico intercolegial sede Bachillerato', fecha: '5 de mayo, 2026' },
    { id: 4, imgKey: 'NOTICIA_05', categoria: 'Tecnología', titulo: 'Feria de ciencias e innovación técnica 2026', fecha: '2 de mayo, 2026' },
  ];

  linksFooter = [
    { label: 'Inicio', path: '/' },
    { label: 'Revista', path: '/noticias' },
    { label: 'Galería', path: '/galeria' },
    { label: 'Docentes', path: '/docentes' },
    { label: 'Sedes', path: '/sedes' },
  ];
}
