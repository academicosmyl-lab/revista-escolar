import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Noticia, Categoria, Sede } from '../../models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-noticias',
  imports: [RouterLink, FormsModule],
  templateUrl: './noticias.html',
  styleUrl: './noticias.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Noticias implements OnInit, OnDestroy {
  private api = inject(ApiService);
  cargando   = signal(true);
  error      = signal('');
  nuevaNoticia = signal(false);

  noticias:   Noticia[]   = [];
  categorias: Categoria[] = [];
  sedes:      Sede[]      = [];
  skeletons = Array(3);

  busqueda        = '';
  categoriaActiva: number | null = null;
  sedeActiva:      string | null = null;
  paginaActual  = 1;
  totalPaginas  = 1;
  total         = 0;
  readonly limit = 9;

  private sse: EventSource | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  get destacado()   { return this.noticias[0] ?? null; }
  get lateral()     { return this.noticias.slice(1, 3); }
  get secundarias() { return this.noticias.slice(3); }
  get paginas()     { return Array.from({ length: this.totalPaginas }, (_, i) => i + 1); }

  ngOnInit() {
    this.cargarCategorias();
    this.cargarSedes();
    this.cargarNoticias();
    this.iniciarSSE();
  }

  ngOnDestroy() {
    this.sse?.close();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  private cargarCategorias() {
    this.api.get<{ data: Categoria[] }>('/categorias').subscribe({
      next:  r => { this.categorias = r.data ?? []; },
      error: () => {},
    });
  }

  private cargarSedes() {
    this.api.get<{ data: Sede[] }>('/sedes').subscribe({
      next:  r => { this.sedes = r.data ?? []; },
      error: () => {},
    });
  }

  cargarNoticias(pagina = 1) {
    this.cargando.set(true);
    this.error.set('');
    this.paginaActual = pagina;

    const params: Record<string, string | number> = { page: pagina, limit: this.limit, estado: 'publicada' };
    if (this.categoriaActiva) params['categoriaId'] = this.categoriaActiva;
    if (this.sedeActiva)      params['sedeId']      = this.sedeActiva;
    if (this.busqueda.trim()) params['busqueda']     = this.busqueda.trim();

    this.api.get<any>('/noticias', params).subscribe({
      next: r => {
        const data = r.data ?? r;
        this.noticias     = Array.isArray(data) ? data : (data.rows ?? data.noticias ?? []);
        this.total        = r.total ?? r.count ?? this.noticias.length;
        this.totalPaginas = r.totalPages ?? (Math.ceil(this.total / this.limit) || 1);
        this.cargando.set(false);
        this.nuevaNoticia.set(false);
      },
      error: e => {
        this.error.set(e.mensaje || 'No se pudieron cargar las noticias.');
        this.cargando.set(false);
      },
    });
  }

  filtrarCategoria(id: number | null) {
    this.categoriaActiva = id;
    this.cargarNoticias(1);
  }

  filtrarSede(id: string | null) {
    this.sedeActiva = id;
    this.cargarNoticias(1);
  }

  onBusqueda() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.cargarNoticias(1), 350);
  }

  irAPagina(p: number) {
    if (p < 1 || p > this.totalPaginas) return;
    this.cargarNoticias(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  recargarConNueva() {
    this.cargarNoticias(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private iniciarSSE() {
    try {
      this.sse = new EventSource(`${environment.apiUrl}/sse/noticias`);
      this.sse.addEventListener('noticia_publicada', () => {
        this.nuevaNoticia.set(true);
      });
      this.sse.onerror = () => this.sse?.close();
    } catch { /* SSE no soportado */ }
  }

  imagen(n: Noticia): string | null {
    return n.imagenes?.[0]?.url ?? null;
  }

  altText(n: Noticia): string {
    return n.imagenes?.[0]?.altText ?? n.titulo;
  }

  formatFecha(fecha: string | undefined): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  colorCategoria(n: Noticia): string {
    return (n.categoria as any)?.color ?? '#7B1D2C';
  }
}
