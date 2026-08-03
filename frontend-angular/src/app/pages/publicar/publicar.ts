import {
  Component, signal, computed, inject, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Sede { id: string; nombre: string; slug: string; }

type Paso = 1 | 2 | 3;
type TipoContenido = 'imagenes' | 'video' | 'texto';
type RolForm = 'DOCENTE' | 'RECTOR' | 'COORDINADOR' | 'PERSONAL' | 'OTRO';

@Component({
  selector: 'app-publicar',
  imports: [CommonModule, FormsModule],
  templateUrl: './publicar.html',
  styleUrl: './publicar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Publicar {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ── Navegación entre pasos ───────────────────────────────
  paso = signal<Paso>(1);

  // ── Paso 1: Quién eres ──────────────────────────────────
  nombre      = signal('');
  rol         = signal<RolForm>('DOCENTE');
  area        = signal('');
  otroRol     = signal('');

  readonly roles: { valor: RolForm; etiqueta: string }[] = [
    { valor: 'DOCENTE',      etiqueta: 'Docente' },
    { valor: 'RECTOR',       etiqueta: 'Rector/a' },
    { valor: 'COORDINADOR',  etiqueta: 'Coordinador/a' },
    { valor: 'PERSONAL',     etiqueta: 'Personal administrativo' },
    { valor: 'OTRO',         etiqueta: 'Otro' },
  ];

  readonly areas = [
    'Artística','Ciencias Naturales','Ciencias Sociales','Corte y Confección',
    'Diseño Digital','Educación Física','Electricidad','Electrónica',
    'Electrónica Industrial','Emprendimiento','Español y Literatura',
    'Ética y Valores','Filosofía','Física','Historia y Geografía',
    'Inglés Comunicativo','Matemáticas','Mecánica Industrial',
    'Medios Audiovisuales','Orientación Escolar','Química','Religión',
    'Sistemas','Técnica Industrial','Tecnología e Informática',
  ];

  esDocente = computed(() => this.rol() === 'DOCENTE');
  esRector  = computed(() => this.rol() === 'RECTOR');

  // ── Paso 2: El contenido ────────────────────────────────
  titulo      = signal('');
  descripcion = signal('');
  tipo        = signal<TipoContenido>('texto');
  urlYoutube  = signal('');
  imagenes: File[] = [];
  previewUrls = signal<string[]>([]);

  // ── Paso 3: Sede y portada ──────────────────────────────
  sedes         = signal<Sede[]>([]);
  sedeSeleccionada = signal('');
  paraPortada   = signal(false);
  cargandoSedes = signal(false);

  // ── Estado del envío ────────────────────────────────────
  enviando  = signal(false);
  enviado   = signal(false);
  errorMsg  = signal('');

  // ── Validaciones ────────────────────────────────────────
  paso1Valido = computed(() =>
    this.nombre().trim().length >= 3 &&
    this.rol().length > 0
  );

  paso2Valido = computed(() => {
    if (!this.titulo().trim() || !this.descripcion().trim()) return false;
    if (this.tipo() === 'video') return this.urlYoutube().trim().length > 5;
    if (this.tipo() === 'imagenes') return this.imagenes.length > 0;
    return true;
  });

  // ── Métodos ─────────────────────────────────────────────
  irPaso(p: Paso) {
    if (p === 2 && !this.paso1Valido()) return;
    if (p === 3 && !this.paso2Valido()) {
      if (this.sedes().length === 0) this.cargarSedes();
      return;
    }
    if (p === 3 && this.sedes().length === 0) this.cargarSedes();
    this.errorMsg.set('');
    this.paso.set(p);
  }

  seleccionarRol(r: RolForm) {
    this.rol.set(r);
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

  enviar() {
    if (this.enviando()) return;
    this.enviando.set(true);
    this.errorMsg.set('');

    const fd = new FormData();
    fd.append('nombre_enviado', this.nombre().trim());
    fd.append('rol_enviado',    this.rol() === 'OTRO' ? this.otroRol().trim() : this.rol());
    if (this.area()) fd.append('area_enviada', this.area());
    fd.append('titulo',         this.titulo().trim());
    fd.append('descripcion',    this.descripcion().trim());
    fd.append('tipo_contenido', this.tipo());
    if (this.tipo() === 'video')    fd.append('url_youtube',  this.urlYoutube().trim());
    if (this.sedeSeleccionada())     fd.append('sede_nombre',  this.sedeSeleccionada());
    fd.append('para_portada',       String(this.paraPortada()));
    if (this.tipo() === 'imagenes') {
      this.imagenes.forEach(f => fd.append('imagenes', f));
    }

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
    this.nombre.set('');
    this.rol.set('DOCENTE');
    this.area.set('');
    this.titulo.set('');
    this.descripcion.set('');
    this.tipo.set('texto');
    this.urlYoutube.set('');
    this.imagenes = [];
    this.previewUrls.set([]);
    this.sedeSeleccionada.set('');
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
