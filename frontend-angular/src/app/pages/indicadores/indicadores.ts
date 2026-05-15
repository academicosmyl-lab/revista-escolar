import { Component } from '@angular/core';

@Component({
  selector: 'app-indicadores',
  imports: [],
  templateUrl: './indicadores.html',
  styleUrl: './indicadores.scss',
})
export class Indicadores {
  dashboards = [
    {
      titulo: 'Noticias Publicadas',
      descripcion: 'Volumen de publicaciones por mes, sede y categoría',
      embedUrl: '',
    },
    {
      titulo: 'Participación Docente',
      descripcion: 'Actividad por docente: noticias, fotos y seguimiento semanal',
      embedUrl: '',
    },
    {
      titulo: 'Galería e Imágenes',
      descripcion: 'Imágenes subidas, scores de IA y distribución por sección',
      embedUrl: '',
    },
    {
      titulo: 'Visitas a la Revista',
      descripcion: 'Visitas por noticia, sede y período de tiempo',
      embedUrl: '',
    },
  ];

  tarjetas = [
    { label: 'Noticias publicadas', valor: '—', color: 'vinotinto' },
    { label: 'Docentes activos',    valor: '—', color: 'verde'     },
    { label: 'Fotos en galería',    valor: '—', color: 'dorado'    },
    { label: 'Visitas este mes',    valor: '—', color: 'vinotinto'  },
  ];

  exportar = [
    { label: 'Noticias',             tipo: 'noticias'     },
    { label: 'Docentes',             tipo: 'docentes'     },
    { label: 'Galería',              tipo: 'galeria'      },
    { label: 'Estadísticas completas', tipo: 'estadisticas' },
  ];
}
