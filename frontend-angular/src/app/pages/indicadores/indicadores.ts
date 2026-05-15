import { Component, inject, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Estadisticas } from '../../models';

@Component({
  selector: 'app-indicadores',
  imports: [],
  templateUrl: './indicadores.html',
  styleUrl: './indicadores.scss',
})
export class Indicadores implements OnInit {
  private api = inject(ApiService);

  dashboards = [
    { titulo: 'Noticias Publicadas',  descripcion: 'Volumen de publicaciones por mes, sede y categoría', embedUrl: '' },
    { titulo: 'Participación Docente',descripcion: 'Actividad por docente: noticias, fotos y seguimiento semanal', embedUrl: '' },
    { titulo: 'Galería e Imágenes',   descripcion: 'Imágenes subidas, scores de IA y distribución por sección', embedUrl: '' },
    { titulo: 'Visitas a la Revista', descripcion: 'Visitas por noticia, sede y período de tiempo', embedUrl: '' },
  ];

  tarjetas = [
    { label: 'Noticias publicadas', valor: '—', color: 'vinotinto' },
    { label: 'Docentes activos',    valor: '—', color: 'verde'     },
    { label: 'Fotos en galería',    valor: '—', color: 'dorado'    },
    { label: 'Visitas este mes',    valor: '—', color: 'vinotinto'  },
  ];

  exportar = [
    { label: 'Noticias',               tipo: 'noticias'     },
    { label: 'Docentes',               tipo: 'docentes'     },
    { label: 'Galería',                tipo: 'galeria'      },
    { label: 'Estadísticas completas', tipo: 'estadisticas' },
  ];

  ngOnInit() {
    this.api.get<{ data: Estadisticas }>('/admin/estadisticas').subscribe({
      next: ({ data }) => {
        this.tarjetas[0].valor = String(data.noticiasPublicadas ?? '—');
        this.tarjetas[1].valor = String(data.totalDocentes ?? '—');
        this.tarjetas[2].valor = String(data.totalImagenes ?? '—');
        this.tarjetas[3].valor = String(data.visitasMes ?? data.visitasTotales ?? '—');
      },
      error: () => { /* tarjetas quedan en '—' si el endpoint requiere auth */ }
    });
  }
}
