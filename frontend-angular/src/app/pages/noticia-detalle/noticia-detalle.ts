import { Component, OnInit, OnDestroy, HostListener, inject, signal, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Noticia } from '../../models';

@Component({
  selector: 'app-noticia-detalle',
  imports: [RouterLink],
  templateUrl: './noticia-detalle.html',
  styleUrl: './noticia-detalle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoticiaDetalle implements OnInit, OnDestroy {
  private api   = inject(ApiService);
  private route = inject(ActivatedRoute);
  private cdr   = inject(ChangeDetectorRef);

  cargando      = signal(true);
  error         = signal('');
  noticia       = signal<Noticia | null>(null);
  relacionadas  = signal<Noticia[]>([]);
  servidorLento = signal(false);
  skeletons = Array(5);

  private lentoBanner: any = null;

  /* ── Lightbox ───────────────────────────────────────── */
  lbAbierto = signal(false);
  lbIndice  = signal(0);

  get lbImagenes() { return this.noticia()?.imagenes?.slice(1) ?? []; }
  get lbActual()   { return this.lbImagenes[this.lbIndice()] ?? null; }

  abrirLb(idx: number) { this.lbIndice.set(idx); this.lbAbierto.set(true); document.body.style.overflow = 'hidden'; }
  cerrarLb()           { this.lbAbierto.set(false); document.body.style.overflow = ''; }
  lbAnterior()         { this.lbIndice.update(i => (i - 1 + this.lbImagenes.length) % this.lbImagenes.length); }
  lbSiguiente()        { this.lbIndice.update(i => (i + 1) % this.lbImagenes.length); }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (!this.lbAbierto()) return;
    if (e.key === 'Escape')    this.cerrarLb();
    if (e.key === 'ArrowLeft') this.lbAnterior();
    if (e.key === 'ArrowRight') this.lbSiguiente();
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.cargar(id);
    });
  }

  ngOnDestroy() {
    if (this.lentoBanner) clearTimeout(this.lentoBanner);
    document.body.style.overflow = '';
  }

  private cargar(id: string) {
    this.cargando.set(true);
    this.error.set('');
    this.noticia.set(null);
    this.servidorLento.set(false);

    this.lentoBanner = setTimeout(() => this.servidorLento.set(true), 4000);

    this.api.get<any>(`/noticias/${id}`).subscribe({
      next: r => {
        clearTimeout(this.lentoBanner);
        this.servidorLento.set(false);
        this.noticia.set(r.noticia ?? r.data ?? r);
        this.cargando.set(false);
        this.cdr.markForCheck();
        this.cargarRelacionadas();
      },
      error: e => {
        clearTimeout(this.lentoBanner);
        this.servidorLento.set(false);
        this.error.set(e.mensaje || 'No se pudo cargar el artículo.');
        this.cargando.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  private cargarRelacionadas() {
    const n = this.noticia();
    if (!n) return;
    const params: Record<string, string | number> = { limit: 4, estado: 'publicada' };
    if ((n.categoria as any)?.id) params['categoriaId'] = (n.categoria as any).id;

    this.api.get<any>('/noticias', params).subscribe({
      next: r => {
        const data = r.data ?? r;
        const lista: Noticia[] = Array.isArray(data) ? data : (data.rows ?? data.noticias ?? []);
        this.relacionadas.set(lista.filter(x => x.id !== n.id).slice(0, 3));
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  get autorFotoUrl(): string | null {
    return (this.noticia()?.autor as any)?.perfil?.foto_url ?? null;
  }
  get autorCargo(): string | null {
    const p = (this.noticia()?.autor as any)?.perfil;
    return p?.cargo ?? p?.titulo_profesional ?? null;
  }

  get imagenPrincipal(): string | null {
    return this.noticia()?.imagenes?.[0]?.url ?? null;
  }
  get imagenesExtra() {
    return this.noticia()?.imagenes?.slice(1) ?? [];
  }

  formatFecha(fecha: string | undefined): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  colorCategoria(n: Noticia): string {
    return (n.categoria as any)?.color ?? '#7B1D2C';
  }

  private static readonly LIKES_KEY = 'iti_likes_v1';
  private likedSet(): Set<string> {
    try { return new Set(JSON.parse(localStorage.getItem(NoticiaDetalle.LIKES_KEY) || '[]')); }
    catch { return new Set(); }
  }
  private saveLiked(s: Set<string>) {
    localStorage.setItem(NoticiaDetalle.LIKES_KEY, JSON.stringify([...s]));
  }

  get isLiked(): boolean {
    const n = this.noticia();
    return n ? this.likedSet().has(n.id) : false;
  }

  toggleLike() {
    const n = this.noticia();
    if (!n) return;
    this.api.post<{ likes: number; liked: boolean }>(`/noticias/${n.id}/like`, {}).subscribe({
      next: r => {
        const data = (r as any).data ?? r as any;
        this.noticia.update(prev => prev ? { ...prev, likes: data.likes ?? data.data?.likes ?? prev.likes } : prev);
        const set = this.likedSet();
        if (data.liked ?? data.data?.liked) { set.add(n.id); } else { set.delete(n.id); }
        this.saveLiked(set);
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  compartir(via: 'copiar' | 'whatsapp') {
    const url   = window.location.href;
    const texto = this.noticia()?.titulo ?? '';
    if (via === 'copiar') {
      navigator.clipboard.writeText(url).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(texto + ' ' + url)}`, '_blank');
    }
  }
}
