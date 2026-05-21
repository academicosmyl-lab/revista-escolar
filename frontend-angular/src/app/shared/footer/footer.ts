// CAMBIO ARCH-UI: Footer extraído de home.html a componente compartido
// Antes: el footer existía solo en home.html. Las otras 8 páginas no tenían footer.
// Ahora: se registra en app.html → aparece en todas las rutas automáticamente.
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  // Datos estáticos — no cambian, no necesitan signal
  readonly linksFooter = [
    { label: 'Inicio',   path: '/'         },
    { label: 'Revista',  path: '/noticias' },
    { label: 'Galería',  path: '/galeria'  },
    { label: 'Docentes', path: '/docentes' },
    { label: 'Sedes',    path: '/sedes'    },
  ];

  // SafeResourceUrl: Angular exige marcar URLs de iframes como "confiables"
  // bypassSecurityTrustResourceUrl le dice a Angular: "yo revisé esta URL, es segura"
  readonly mapaSrc: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer) {
    this.mapaSrc = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://www.openstreetmap.org/export/embed.html?bbox=-74.3637479%2C4.3449812%2C-74.3597479%2C4.3489812&layer=mapnik&marker=4.3469812%2C-74.3617479'
    );
  }
}
