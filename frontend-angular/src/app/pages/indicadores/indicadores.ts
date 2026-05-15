import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-indicadores',
  imports: [RouterLink],
  templateUrl: './indicadores.html',
  styleUrl: './indicadores.scss',
})
export class Indicadores {
  dashboards = [
    {
      titulo: 'Noticias Publicadas',
      descripcion: 'Volumen de publicaciones por mes, sede y categoría',
      icono: '📰',
      embedUrl: '',
    },
    {
      titulo: 'Participación Docente',
      descripcion: 'Actividad por docente: noticias, fotos y seguimiento semanal',
      icono: '👩‍🏫',
      embedUrl: '',
    },
    {
      titulo: 'Galería e Imágenes',
      descripcion: 'Imágenes subidas, scores de IA y distribución por sección',
      icono: '🖼️',
      embedUrl: '',
    },
    {
      titulo: 'Visitas a la Revista',
      descripcion: 'Visitas por noticia, sede y período de tiempo',
      icono: '👁️',
      embedUrl: '',
    },
  ];

  tarjetas = [
    { label: 'Noticias publicadas', valor: '—', icono: '📰', color: 'vinotinto' },
    { label: 'Docentes activos',    valor: '—', icono: '👩‍🏫', color: 'verde'    },
    { label: 'Fotos en galería',    valor: '—', icono: '🖼️', color: 'dorado'   },
    { label: 'Visitas este mes',    valor: '—', icono: '👁️', color: 'vinotinto' },
  ];
}
