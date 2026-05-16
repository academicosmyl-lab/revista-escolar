import { Component, OnInit, inject, HostListener, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Imagen, VideoYoutube } from '../../models';

type Tab = 'todas' | 'fotos' | 'videos';
type ImagenConTipo = Imagen & { tipo?: string };

@Component({
  selector: 'app-galeria',
  imports: [],
  templateUrl: './galeria.html',
  styleUrl: './galeria.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Galeria implements OnInit {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  cargando  = true;
  error     = '';
  skeletons = Array(6);

  imagenes: ImagenConTipo[] = [];
  videos:   VideoYoutube[]  = [];

  lightboxVisible = false;
  lightboxIndex   = 0;
  tabActiva: Tab  = 'todas';

  ngOnInit() { this.cargar(); }

  private cargar() {
    this.cargando = true;
    this.error    = '';

    this.api.get<any>('/galeria').subscribe({
      next: r => {
        const data = r.galeria ?? r.data ?? r;
        if (Array.isArray(data)) {
          this.imagenes = data;
        } else {
          const mapItem = (item: any, tipo: string): ImagenConTipo => ({
            id:      item.imagen?.id    ?? item.id,
            url:     item.imagen?.url   ?? item.url   ?? '',
            altText: item.imagen?.alt_text ?? item.imagen?.altText ?? item.altText,
            score:   item.imagen?.score_visual ?? item.score,
            tipo,
          });
          this.imagenes = [
            ...(data.portada    ?? []).map((i: any) => mapItem(i, 'portada')),
            ...(data.destacados ?? []).map((i: any) => mapItem(i, 'destacados')),
            ...(data.recientes  ?? []).map((i: any) => mapItem(i, 'recientes')),
          ];
          this.videos = data.videos ?? [];
        }
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: e => {
        this.error    = e.mensaje || 'No se pudo cargar la galería.';
        this.cargando = false;
        this.cdr.markForCheck();
      },
    });
  }

  get imagenHero(): Imagen | null {
    return this.imagenes.find(i => i.tipo === 'portada') ?? this.imagenes[0] ?? null;
  }

  get imagenesVisibles(): ImagenConTipo[] {
    return this.tabActiva === 'videos' ? [] : this.imagenes;
  }

  get videosVisibles(): VideoYoutube[] {
    return this.tabActiva === 'fotos' ? [] : this.videos;
  }

  esPortada(img: ImagenConTipo): boolean { return img.tipo === 'portada'; }

  cambiarTab(tab: Tab) { this.tabActiva = tab; }

  abrirLightbox(index: number) {
    this.lightboxIndex   = index;
    this.lightboxVisible = true;
    document.body.style.overflow = 'hidden';
  }

  cerrarLightbox() {
    this.lightboxVisible = false;
    document.body.style.overflow = '';
  }

  anterior() { if (this.lightboxIndex > 0) this.lightboxIndex--; }

  siguiente() {
    if (this.lightboxIndex < this.imagenes.length - 1) this.lightboxIndex++;
  }

  get imagenLightbox(): ImagenConTipo | null {
    return this.imagenes[this.lightboxIndex] ?? null;
  }

  onLightboxClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('gal-lightbox')) {
      this.cerrarLightbox();
    }
  }

  thumbnailYoutube(videoId: string): string {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  urlYoutube(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (!this.lightboxVisible) return;
    if (event.key === 'Escape')     this.cerrarLightbox();
    if (event.key === 'ArrowLeft')  this.anterior();
    if (event.key === 'ArrowRight') this.siguiente();
  }
}
