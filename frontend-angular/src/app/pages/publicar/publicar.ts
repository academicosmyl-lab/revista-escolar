import {
  Component, OnInit, signal, computed, inject, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

interface Sede     { id: string; nombre: string; slug: string; }
interface Categoria { id: string; nombre: string; color?: string; }

type Paso = 1 | 2;
type TipoContenido = 'imagenes' | 'video' | 'texto';

@Component({
  selector: 'app-publicar',
  imports: [CommonModule, FormsModule],
  templateUrl: './publicar.html',
  styleUrl: './publicar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Publicar implements OnInit {
  private http = inject(HttpClient);
  private base = environment.apiUrl;
  readonly auth = inject(AuthService);

  paso = signal<Paso>(1);

  // ── Paso 1: El contenido ────────────────────────────────
  titulo      = signal('');
  descripcion = signal('');
  tipo        = signal<TipoContenido>('texto');
  urlYoutube  = signal('');
  imagenes: File[] = [];
  previewUrls = signal<string[]>([]);

  // ── Paso 1 extra: Sede y Categoría ─────────────────────
  sedes              = signal<Sede[]>([]);
  sedeSeleccionada   = signal('');
  cargandoSedes      = signal(false);
  categorias         = signal<Categoria[]>([]);
  categoriaId        = signal('');
  cargandoCategorias = signal(false);

  // ── Paso 2: Portada ────────────────────────────────────
  paraPortada = signal(false);

  // ── Estado del envío ────────────────────────────────────
  enviando  = signal(false);
  enviado   = signal(false);
  errorMsg  = signal('');

  paso1Valido = computed(() => {
    if (!this.titulo().trim() || !this.descripcion().trim()) return false;
    if (!this.sedeSeleccionada()) return false;
    if (!this.categoriaId()) return false;
    if (this.tipo() === 'video') return this.urlYoutube().trim().length > 5;
    if (this.tipo() === 'imagenes') return this.imagenes.length > 0;
    return true;
  });

  ngOnInit() {
    this.cargarSedes();
    this.cargarCategorias();
  }

  irPaso(p: Paso) {
    if (p === 2 && !this.paso1Valido()) return;
    this.errorMsg.set('');
    this.paso.set(p);
  }

  seleccionarTipo(t: TipoContenido) {
    this.tipo.set(t);
    this.imagenes = [];
    this.previewUrls.set([]);
    this.urlYoutube.set('');
  }

  onImagenes(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    const files = Array.from(input.files).slice(0, 5);
    this.imagenes = files;
    const urls = files.map(f => URL.createObjectURL(f));
    this.previewUrls.set(urls);
  }

  quitarImagen(i: number) {
    this.imagenes.splice(i, 1);
    const urls = [...this.previewUrls()];
    URL.revokeObjectURL(urls[i]);
    urls.splice(i, 1);
    this.previewUrls.set(urls);
  }

  cargarSedes() {
    this.cargandoSedes.set(true);
    this.http.get<{ ok: boolean; data: Sede[] }>(`${this.base}/publicar/sedes`).subscribe({
      next: r => {
        this.sedes.set(r.data ?? []);
        this.cargandoSedes.set(false);
      },
      error: () => {
        this.sedes.set([]);
        this.cargandoSedes.set(false);
      },
    });
  }

  cargarCategorias() {
    this.cargandoCategorias.set(true);
    this.http.get<{ ok?: boolean; data: Categoria[] }>(`${this.base}/categorias`).subscribe({
      next: r => {
        this.categorias.set(r.data ?? []);
        this.cargandoCategorias.set(false);
      },
      error: () => {
        this.categorias.set([]);
        this.cargandoCategorias.set(false);
      },
    });
  }

  enviar() {
    if (this.enviando()) return;
    this.enviando.set(true);
    this.errorMsg.set('');

    const fd = new FormData();
    fd.append('titulo',         this.titulo().trim());
    fd.append('descripcion',    this.descripcion().trim());
    fd.append('tipo_contenido', this.tipo());
    if (this.tipo() === 'video')     fd.append('url_youtube',  this.urlYoutube().trim());
    if (this.sedeSeleccionada())     fd.append('sede_nombre',  this.sedeSeleccionada());
    fd.append('para_portada',        String(this.paraPortada()));
    if (this.tipo() === 'imagenes') {
      this.imagenes.forEach(f => fd.append('imagenes', f));
    }
    if (this.categoriaId()) fd.append('categoria_id', this.categoriaId());

    this.http.post<{ ok: boolean; mensaje: string }>(`${this.base}/publicar`, fd).subscribe({
      next: () => {
        this.enviando.set(false);
        this.enviado.set(true);
      },
      error: (e) => {
        this.enviando.set(false);
        this.errorMsg.set(e?.error?.error || 'Error al enviar. Inténtalo de nuevo.');
      },
    });
  }

  reiniciar() {
    this.paso.set(1);
    this.titulo.set('');
    this.descripcion.set('');
    this.tipo.set('texto');
    this.urlYoutube.set('');
    this.imagenes = [];
    this.previewUrls.set([]);
    this.sedeSeleccionada.set('');
    this.categoriaId.set('');
    this.paraPortada.set(false);
    this.enviado.set(false);
    this.errorMsg.set('');
  }

  youtubePreviewId = computed(() => {
    const url = this.urlYoutube();
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return match ? match[1] : null;
  });
}
