import {
  Component, OnInit, signal, inject,
  ChangeDetectionStrategy, ChangeDetectorRef, HostListener,
} from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { ApiService } from '../../services/api.service';

type Vista = 'albums' | 'toc' | 'fotos';

interface Album {
  id: string; nombre: string; categoria: string;
  subtitulo?: string; descripcion?: string;
  portada_url?: string; activo: boolean;
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

  albums: Album[]  = [];
  albumActivo      = signal<Album | null>(null);
  capituloActivo   = signal<Capitulo | null>(null);

  lightboxVisible  = false;
  lightboxIndex    = 0;

  categorias: string[] = [];

  ngOnInit() { this.cargarTodo(); }

  cargarTodo() {
    this.cargando.set(true);
    this.error.set('');
    this.api.get<any>('/galeria/albums').subscribe({
      next: r => {
        this.albums = (r.albums ?? []).filter((a: Album) => a.activo);
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
    this.vista.set('fotos');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  volverAlbums() {
    this.vista.set('albums');
    this.albumActivo.set(null);
    this.capituloActivo.set(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  volverToc() {
    this.vista.set('toc');
    this.capituloActivo.set(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    this.lightboxVisible = true;
    document.body.style.overflow = 'hidden';
    this.cdr.markForCheck();
  }

  cerrarLightbox() {
    this.lightboxVisible = false;
    document.body.style.overflow = '';
    this.cdr.markForCheck();
  }

  anteriorFoto() {
    if (this.lightboxIndex > 0) { this.lightboxIndex--; this.cdr.markForCheck(); }
  }

  siguienteFoto() {
    const fotos = this.fotosVisibles();
    if (this.lightboxIndex < fotos.length - 1) { this.lightboxIndex++; this.cdr.markForCheck(); }
  }

  fotoLightbox(): Foto | null {
    return this.fotosVisibles()[this.lightboxIndex] ?? null;
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if (!this.lightboxVisible) return;
    if (e.key === 'Escape')     this.cerrarLightbox();
    if (e.key === 'ArrowLeft')  this.anteriorFoto();
    if (e.key === 'ArrowRight') this.siguienteFoto();
  }
}
