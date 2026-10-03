import {
  Component, OnInit, signal, inject,
  ChangeDetectionStrategy, ChangeDetectorRef, HostListener,
} from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { ApiService } from '../../services/api.service';

type Vista = 'albums' | 'toc' | 'fotos' | 'libro';

interface Album {
  id: string; nombre: string; categoria: string;
  subtitulo?: string; descripcion?: string;
  portada_url?: string; activo: boolean; destacado: boolean;
  total_fotos?: number; total_capitulos?: number;
  capitulos?: Capitulo[];
}
interface Capitulo {
  id: string; titulo: string; icono: string; orden: number;
  fotos?: Foto[];
}
interface Foto {
  id: string; url: string; descripcion?: string;
  orden: number; eliminada: boolean;
}

@Component({
  selector: 'app-galeria',
  imports: [UpperCasePipe],
  templateUrl: './galeria.html',
  styleUrl:    './galeria.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Galeria implements OnInit {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  vista            = signal<Vista>('albums');
  categoriaActiva  = signal<string>('todos');
  cargando         = signal(false);
  error            = signal('');

  albums: Album[]         = [];
  albumDestacado: Album | null = null;
  albumActivo      = signal<Album | null>(null);
  capituloActivo   = signal<Capitulo | null>(null);

  lightboxVisible  = false;
  lightboxIndex    = 0;
  flipClass        = '';

  paginaLibro   = signal(0);
  bookEntrando   = false;
  pagFlipping    = false;
  pagDerClass    = '';
  pagIzqClass    = '';

  heroAbriendo  = false;

  categorias: string[] = [];

  ngOnInit() { this.cargarTodo(); }

  cargarTodo() {
    this.cargando.set(true);
    this.error.set('');
    this.api.get<any>('/galeria/albums').subscribe({
      next: r => {
        const todos = (r.albums ?? []).filter((a: Album) => a.activo);
        this.albumDestacado = todos.find((a: Album) => a.destacado) ?? null;
        this.albums = todos.filter((a: Album) => !a.destacado);
        // Categorías únicas en orden de aparición
        const seen = new Set<string>();
        this.categorias = [];
        for (const a of this.albums) {
          if (a.categoria && !seen.has(a.categoria)) {
            seen.add(a.categoria);
            this.categorias.push(a.categoria);
          }
        }
        this.cargando.set(false);
        this.cdr.markForCheck();
      },
      error: e => {
        this.error.set(e.mensaje ?? 'Error al cargar la galería');
        this.cargando.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  albumsFiltrados(): Album[] {
    if (this.categoriaActiva() === 'todos') return this.albums;
    return this.albums.filter(a => a.categoria === this.categoriaActiva());
  }

  seleccionarCategoria(cat: string) {
    this.categoriaActiva.set(cat);
    this.cdr.markForCheck();
  }

  abrirAlbumHero() {
    if (this.heroAbriendo || !this.albumDestacado) return;
    this.heroAbriendo = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.heroAbriendo = false;
      this.abrirAlbum(this.albumDestacado!);
    }, 650);
  }

  abrirAlbum(album: Album) {
    this.cargando.set(true);
    this.api.get<any>(`/galeria/albums/${album.id}`).subscribe({
      next: r => {
        this.albumActivo.set(r.album);
        this.vista.set('toc');
        this.cargando.set(false);
        this.cdr.markForCheck();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: e => {
        this.error.set(e.mensaje ?? 'Error');
        this.cargando.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  abrirCapitulo(cap: Capitulo) {
    this.capituloActivo.set(cap);
    this.paginaLibro.set(0);
    this.pagFlipping  = false;
    this.pagDerClass  = '';
    this.pagIzqClass  = '';
    this.bookEntrando = true;
    this.vista.set('libro');
    document.body.style.overflow = 'hidden';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => { this.bookEntrando = false; this.cdr.markForCheck(); }, 950);
  }

  volverAlbums() {
    this.vista.set('albums');
    this.albumActivo.set(null);
    this.capituloActivo.set(null);
    document.body.style.overflow = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  volverToc() {
    this.vista.set('toc');
    this.capituloActivo.set(null);
    document.body.style.overflow = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── Libro helpers ───────────────────────────────── */

  spreadsTotal(): number {
    return Math.max(1, Math.ceil(this.fotosVisibles().length / 2));
  }

  spreadsArray(): number[] {
    return Array.from({ length: this.spreadsTotal() }, (_, i) => i);
  }

  fotoIzq(): Foto | null {
    return this.fotosVisibles()[this.paginaLibro() * 2] ?? null;
  }

  fotoDer(): Foto | null {
    return this.fotosVisibles()[this.paginaLibro() * 2 + 1] ?? null;
  }

  fotoRot(idx: number): number {
    return (((idx * 13 + 5) % 11) - 5) * 0.55;
  }

  private playFlipSound(): void {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const sr = ctx.sampleRate;
      const buf = ctx.createBuffer(1, Math.floor(sr * 0.13), sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i / d.length;
        d[i] = (Math.random() * 2 - 1) * Math.pow(Math.sin(t * Math.PI), 0.5) * (1 - t * 0.4);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = 'bandpass'; filt.frequency.value = 3800; filt.Q.value = 0.7;
      const gain = ctx.createGain(); gain.gain.value = 0.22;
      src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
      src.start();
      setTimeout(() => { try { ctx.close(); } catch (_) {} }, 600);
    } catch (_) {}
  }

  paginaAnterior() {
    const p = this.paginaLibro();
    if (p <= 0 || this.pagFlipping) return;
    this.playFlipSound();
    this.pagFlipping = true;
    // Página izquierda gira desde su bisagra derecha (lomo)
    this.pagIzqClass = 'pag-out-prev';
    this.pagDerClass = 'pag-xfade-out';
    this.cdr.markForCheck();
    setTimeout(() => {
      this.paginaLibro.set(p - 1);
      this.pagIzqClass = 'pag-in-prev';
      this.pagDerClass = 'pag-xfade-in';
      this.cdr.markForCheck();
      setTimeout(() => {
        this.pagIzqClass = '';
        this.pagDerClass = '';
        this.pagFlipping = false;
        this.cdr.markForCheck();
      }, 360);
    }, 360);
  }

  paginaSiguiente() {
    const p = this.paginaLibro();
    if (p >= this.spreadsTotal() - 1 || this.pagFlipping) return;
    this.playFlipSound();
    this.pagFlipping = true;
    // Página derecha gira desde su bisagra izquierda (lomo)
    this.pagDerClass = 'pag-out-next';
    this.pagIzqClass = 'pag-xfade-out';
    this.cdr.markForCheck();
    setTimeout(() => {
      this.paginaLibro.set(p + 1);
      this.pagDerClass = 'pag-in-next';
      this.pagIzqClass = 'pag-xfade-in';
      this.cdr.markForCheck();
      setTimeout(() => {
        this.pagDerClass = '';
        this.pagIzqClass = '';
        this.pagFlipping = false;
        this.cdr.markForCheck();
      }, 360);
    }, 360);
  }

  fotosVisibles(): Foto[] {
    return (this.capituloActivo()?.fotos ?? []).filter(f => !f.eliminada);
  }

  capFotosCount(cap: Capitulo): number {
    return (cap.fotos ?? []).filter(f => !f.eliminada).length;
  }

  albumAnio(album: Album): number {
    return (album as any)['año'] ?? 0;
  }

  abrirLightbox(index: number) {
    this.lightboxIndex = index;
    this.flipClass     = '';
    this.lightboxVisible = true;
    document.body.style.overflow = 'hidden';
    this.cdr.markForCheck();
  }

  cerrarLightbox() {
    this.lightboxVisible = false;
    this.flipClass = '';
    document.body.style.overflow = '';
    this.cdr.markForCheck();
  }

  anteriorFoto() {
    if (this.lightboxIndex <= 0 || this.flipClass) return;
    this.flipClass = 'flip-out-prev';
    this.cdr.markForCheck();
    setTimeout(() => {
      this.lightboxIndex--;
      this.flipClass = 'flip-in-prev';
      this.cdr.markForCheck();
      setTimeout(() => { this.flipClass = ''; this.cdr.markForCheck(); }, 300);
    }, 300);
  }

  siguienteFoto() {
    const fotos = this.fotosVisibles();
    if (this.lightboxIndex >= fotos.length - 1 || this.flipClass) return;
    this.flipClass = 'flip-out-next';
    this.cdr.markForCheck();
    setTimeout(() => {
      this.lightboxIndex++;
      this.flipClass = 'flip-in-next';
      this.cdr.markForCheck();
      setTimeout(() => { this.flipClass = ''; this.cdr.markForCheck(); }, 300);
    }, 300);
  }

  fotoLightbox(): Foto | null {
    return this.fotosVisibles()[this.lightboxIndex] ?? null;
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if (this.lightboxVisible) {
      if (e.key === 'Escape')     this.cerrarLightbox();
      if (e.key === 'ArrowLeft')  this.anteriorFoto();
      if (e.key === 'ArrowRight') this.siguienteFoto();
      return;
    }
    if (this.vista() === 'libro') {
      if (e.key === 'ArrowLeft')  this.paginaAnterior();
      if (e.key === 'ArrowRight') this.paginaSiguiente();
      if (e.key === 'Escape')     this.volverToc();
    }
  }
}
