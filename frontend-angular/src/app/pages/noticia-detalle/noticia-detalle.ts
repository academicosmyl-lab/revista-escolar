import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Noticia } from '../../models';

@Component({
  selector: 'app-noticia-detalle',
  imports: [RouterLink],
  templateUrl: './noticia-detalle.html',
  styleUrl: './noticia-detalle.scss',
})
export class NoticiaDetalle implements OnInit {
  private api   = inject(ApiService);
  private route = inject(ActivatedRoute);

  cargando   = true;
  error      = '';
  noticia:   Noticia | null = null;
  relacionadas: Noticia[]   = [];
  skeletons = Array(5);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.cargar(id);
    });
  }

  private cargar(id: string) {
    this.cargando = true;
    this.error    = '';
    this.noticia  = null;

    this.api.get<any>(`/noticias/${id}`).subscribe({
      next: r => {
        this.noticia  = r.data ?? r;
        this.cargando = false;
        this.cargarRelacionadas();
      },
      error: e => {
        this.error    = e.mensaje || 'No se pudo cargar el artículo.';
        this.cargando = false;
      },
    });
  }

  private cargarRelacionadas() {
    if (!this.noticia) return;
    const params: Record<string, string | number> = { limit: 3, estado: 'publicada' };
    if ((this.noticia.categoria as any)?.id) params['categoriaId'] = (this.noticia.categoria as any).id;

    this.api.get<any>('/noticias', params).subscribe({
      next: r => {
        const data = r.data ?? r;
        const lista: Noticia[] = Array.isArray(data) ? data : (data.rows ?? data.noticias ?? []);
        this.relacionadas = lista.filter(n => n.id !== this.noticia!.id).slice(0, 3);
      },
      error: () => {},
    });
  }

  get imagenPrincipal(): string | null {
    return this.noticia?.imagenes?.[0]?.url ?? null;
  }
  get imagenesExtra() {
    return this.noticia?.imagenes?.slice(1) ?? [];
  }

  formatFecha(fecha: string | undefined): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  colorCategoria(n: Noticia): string {
    return (n.categoria as any)?.color ?? '#7B1D2C';
  }

  compartir(via: 'copiar' | 'whatsapp') {
    const url   = window.location.href;
    const texto = this.noticia?.titulo ?? '';
    if (via === 'copiar') {
      navigator.clipboard.writeText(url).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(texto + ' ' + url)}`, '_blank');
    }
  }
}
