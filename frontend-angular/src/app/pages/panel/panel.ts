import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SlicePipe, NgTemplateOutlet } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { Noticia, Categoria, PerfilDocente } from '../../models';

type DestinoFoto = '' | 'noticia' | 'galeria';

@Component({
  selector: 'app-panel',
  imports: [RouterLink, FormsModule, SlicePipe, NgTemplateOutlet],
  templateUrl: './panel.html',
  styleUrl: './panel.scss',
})
export class Panel implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);

  readonly etiquetaRol: Record<string, string> = {
    RECTOR:      'Rector/a',
    COORDINADOR: 'Coordinador/a',
    ORIENTADORA: 'Orientador/a',
    DOCENTE:     'Docente',
    PERSONAL:    'Equipo de apoyo',
    ADMIN:       'Administrador/a',
  };

  cargando      = signal(true);
  guardando     = signal(false);
  subiendoFotos = signal(false);
  error         = signal('');
  exito         = signal('');
  errorFotos    = signal('');
  exitoFotos    = signal('');

  noticias:   Noticia[]   = [];
  categorias: Categoria[] = [];
  sedes:      any[]       = [];
  perfil:     Partial<PerfilDocente> = {};

  mostrarFormNoticia = false;

  // ── Modal Editar Perfil ─────────────────────────────────
  epModal      = false;
  epGuardando  = false;
  epEditando   = new Set<string>();
  epDragging   = false;
  epFotoFile:    File | null = null;
  epFotoPreview: string | null = null;
  epTagNueva   = '';
  epValues = {
    titulo_profesional: '',
    cargo:              '',
    bio:                '',
    especialidades:     [] as string[],
    url_linkedin:       '',
    url_blog:           '',
    url_orcid:          '',
  };
  private epOriginal: any = null;

  // Gestión de imágenes existentes
  cargandoImg = signal(false);
  errorImg    = signal('');

  // Flujo de subida de fotos
  mostrarSubidaFotos  = false;
  destinoFoto: DestinoFoto = '';
  noticiaSeleccionadaId   = '';
  sedeSeleccionadaId      = '';
  contextoFoto            = '';
  fotosSeleccionadas: { file: File; preview: string }[] = [];
  noticiaConFotos: string | null = null;

  nueva = { titulo: '', contenido: '', categoria_id: '', usar_ia: true };

  // ── Modal editar noticia ────────────────────────────────
  editNoticia: { id: string; titulo: string; contenido: string; categoria_id: string; usar_ia: boolean } | null = null;
  editNoticiaGuardando = signal(false);
  editNoticiaError     = signal('');

  get perfilFotoUrl(): string | null { return (this.perfil as any)?.foto_url ?? (this.perfil as any)?.fotoUrl ?? null; }
  get publicadas()  { return this.noticias.filter(n => n.estado === 'publicada'); }
  get pendientes()  { return this.noticias.filter(n => n.estado === 'pendiente'); }
  get rechazadas()  { return this.noticias.filter(n => n.estado === 'rechazada'); }
  get maxFotos()    { return this.destinoFoto === 'galeria' ? 5 : 2; }

  get fotosPorSubir(): number {
    if (this.destinoFoto === 'noticia' && this.noticiaSeleccionadaId) {
      const n = this.noticias.find(x => x.id === this.noticiaSeleccionadaId);
      return 2 - ((n as any)?.imagenes?.length ?? 0);
    }
    return this.maxFotos;
  }

  ngOnInit() {
    this.cargar();
    this.cargarCategorias();
    this.cargarPerfil();
    this.cargarSedes();
  }

  private cargar() {
    this.cargando.set(true);
    this.api.get<any>('/panel/noticias').subscribe({
      next: r => { this.noticias = r.noticias ?? []; this.cargando.set(false); },
      error: e => { this.error.set(e.mensaje || 'No se pudo cargar el panel.'); this.cargando.set(false); },
    });
  }

  private cargarCategorias() {
    this.api.get<any>('/categorias').subscribe({
      next: r => { this.categorias = r.data ?? []; },
      error: () => {},
    });
  }

  private cargarPerfil() {
    this.api.get<any>('/perfil/mio/datos').subscribe({
      next: r => { this.perfil = r.perfil ?? {}; },
      error: () => {},
    });
  }

  // ── Modal editar perfil ────────────────────────────────

  abrirEditPerfil() {
    const p = this.perfil as any;
    this.epValues = {
      titulo_profesional: p.titulo_profesional ?? '',
      cargo:              p.cargo              ?? '',
      bio:                p.bio                ?? '',
      especialidades:     [...(p.cualidades_intelectuales ?? [])],
      url_linkedin:       p.url_linkedin       ?? '',
      url_blog:           p.url_blog           ?? '',
      url_orcid:          p.url_orcid          ?? '',
    };
    this.epOriginal = { ...this.epValues, especialidades: [...this.epValues.especialidades] };
    this.epEditando.clear();
    this.epFotoFile    = null;
    this.epFotoPreview = null;
    this.epTagNueva    = '';
    this.epDragging    = false;
    this.epModal       = true;
    this.mostrarFormNoticia = false;
    this.mostrarSubidaFotos = false;
  }

  cerrarEditPerfil() { this.epModal = false; }

  epEditar(campo: string)  { this.epEditando.add(campo); }

  epCancelar(campo: string) {
    this.epEditando.delete(campo);
    if (campo === 'especialidades') {
      this.epValues.especialidades = [...(this.epOriginal?.especialidades ?? [])];
      this.epTagNueva = '';
    } else {
      (this.epValues as any)[campo] = this.epOriginal?.[campo] ?? '';
    }
  }

  epEnEditando(campo: string): boolean { return this.epEditando.has(campo); }

  // Foto: misma lógica que formulario de registro (drag & drop + preview con overlay)
  epFotoChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    this.epFotoFile = file;
    const reader = new FileReader();
    reader.onload = e => { this.epFotoPreview = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  epOnDragOver(e: DragEvent) { e.preventDefault(); this.epDragging = true; }
  epOnDragLeave()            { this.epDragging = false; }
  epOnDrop(e: DragEvent) {
    e.preventDefault();
    this.epDragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    this.epFotoFile = file;
    const reader = new FileReader();
    reader.onload = ev => { this.epFotoPreview = ev.target?.result as string; };
    reader.readAsDataURL(file);
  }

  // Tags / especialidades
  epAgregarTag() {
    const t = this.epTagNueva.trim();
    if (!t || this.epValues.especialidades.includes(t)) return;
    this.epValues.especialidades = [...this.epValues.especialidades, t];
    this.epTagNueva = '';
  }

  epQuitarTag(tag: string) {
    this.epValues.especialidades = this.epValues.especialidades.filter(t => t !== tag);
  }

  epTagKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); this.epAgregarTag(); }
  }

  guardarPerfil() {
    this.epGuardando = true;
    this.error.set('');
    const payload = {
      titulo_profesional:       this.epValues.titulo_profesional,
      cargo:                    this.epValues.cargo,
      bio:                      this.epValues.bio,
      cualidades_intelectuales: this.epValues.especialidades,
      url_linkedin:             this.epValues.url_linkedin,
      url_blog:                 this.epValues.url_blog,
      url_orcid:                this.epValues.url_orcid,
    };
    this.api.put<any>('/perfil/mio/datos', payload).subscribe({
      next: () => {
        if (this.epFotoFile) {
          const fd = new FormData();
          fd.append('foto', this.epFotoFile);
          this.api.postFormData<any>('/perfil/mio/foto', fd).subscribe({
            next: r => {
              (this.perfil as any).foto_url = r.foto_url;
              this.epFotoFile    = null;
              this.epFotoPreview = null;
              this._finGuardar('Perfil actualizado correctamente.');
            },
            error: () => this._finGuardar('Datos guardados. La foto no se pudo subir.'),
          });
        } else {
          this.cargarPerfil();
          this._finGuardar('Perfil actualizado correctamente.');
        }
      },
      error: e => { this.error.set(e.mensaje || 'No se pudo guardar el perfil.'); this.epGuardando = false; },
    });
  }

  private _finGuardar(msg: string) {
    this.epGuardando = false;
    this.epModal     = false;
    this.exito.set(msg);
    setTimeout(() => this.exito.set(''), 4000);
  }

  private cargarSedes() {
    this.api.get<any>('/sedes').subscribe({
      next: r => { this.sedes = r.data ?? r.sedes ?? []; },
      error: () => {},
    });
  }

  // ── Noticia ────────────────────────────────────────────

  crearNoticia() {
    if (!this.nueva.titulo.trim() || !this.nueva.contenido.trim()) return;
    this.guardando.set(true);
    this.error.set('');

    const body: Record<string, unknown> = {
      titulo: this.nueva.titulo, contenido: this.nueva.contenido, usar_ia: this.nueva.usar_ia,
    };
    if (this.nueva.categoria_id) body['categoria_id'] = this.nueva.categoria_id;

    this.api.post<any>('/noticias', body).subscribe({
      next: r => {
        this.guardando.set(false);
        this.mostrarFormNoticia = false;
        this.nueva = { titulo: '', contenido: '', categoria_id: '', usar_ia: true };
        this.cargar();

        const noticiaId = r.noticia?.id;
        if (noticiaId) {
          setTimeout(() => {
            this.abrirSubidaParaNoticia(noticiaId);
            this.exito.set('Noticia creada. Ahora puedes agregarle fotos si quieres.');
          }, 500);
        } else {
          this.exito.set('Noticia enviada. Pendiente de revisión.');
          setTimeout(() => this.exito.set(''), 5000);
        }
      },
      error: e => { this.error.set(e.mensaje || 'No se pudo crear la noticia.'); this.guardando.set(false); },
    });
  }

  // ── Panel de subida de fotos ───────────────────────────

  abrirSubidaFotos() {
    this.mostrarSubidaFotos = true;
    this.destinoFoto = '';
    this.noticiaSeleccionadaId = '';
    this.sedeSeleccionadaId = '';
    this.contextoFoto = '';
    this.fotosSeleccionadas = [];
    this.errorFotos.set('');
    this.exitoFotos.set('');
    this.noticiaConFotos = null;
  }

  abrirSubidaParaNoticia(noticiaId: string) {
    this.mostrarSubidaFotos = true;
    this.destinoFoto = 'noticia';
    this.noticiaSeleccionadaId = noticiaId;
    this.sedeSeleccionadaId = '';
    this.contextoFoto = '';
    this.fotosSeleccionadas = [];
    this.errorFotos.set('');
    this.exitoFotos.set('');
    this.noticiaConFotos = null;
    setTimeout(() => document.getElementById('zona-fotos')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  cerrarSubidaFotos() {
    this.mostrarSubidaFotos = false;
    this.destinoFoto = '';
    this.fotosSeleccionadas = [];
    this.errorFotos.set('');
    this.exitoFotos.set('');
  }

  elegirDestino(d: DestinoFoto) {
    this.destinoFoto = d;
    this.fotosSeleccionadas = [];
    this.errorFotos.set('');
  }

  onSeleccionarFotos(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    this.errorFotos.set('');

    const max = this.fotosPorSubir;
    if (max <= 0) { this.errorFotos.set('Ya se alcanzó el máximo de fotos permitidas.'); input.value = ''; return; }

    const nuevas = Array.from(input.files).slice(0, max - this.fotosSeleccionadas.length);
    nuevas.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => this.fotosSeleccionadas.push({ file, preview: e.target?.result as string });
      reader.readAsDataURL(file);
    });
    input.value = '';
  }

  onDragOver(e: DragEvent) { e.preventDefault(); (e.currentTarget as HTMLElement).classList.add('pan-zona--drag'); }
  onDragLeave(e: DragEvent) { (e.currentTarget as HTMLElement).classList.remove('pan-zona--drag'); }
  onDrop(e: DragEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('pan-zona--drag');
    if (!e.dataTransfer?.files?.length) return;
    this.onSeleccionarFotos({ target: { files: e.dataTransfer.files } } as any);
  }

  removerFoto(i: number) { this.fotosSeleccionadas.splice(i, 1); }

  get puedeSubir(): boolean {
    if (!this.fotosSeleccionadas.length) return false;
    if (this.destinoFoto === 'noticia') return !!this.noticiaSeleccionadaId;
    if (this.destinoFoto === 'galeria') return !!this.sedeSeleccionadaId;
    return false;
  }

  subirFotos() {
    if (!this.puedeSubir) return;
    this.subiendoFotos.set(true);
    this.errorFotos.set('');

    const fd = new FormData();
    this.fotosSeleccionadas.forEach(f => fd.append('fotos', f.file));

    if (this.destinoFoto === 'noticia') {
      this.api.postFormData<any>(`/noticias/${this.noticiaSeleccionadaId}/fotos`, fd).subscribe({
        next: r => this._onExitoSubida(`Foto${r.imagenes?.length > 1 ? 's agregadas' : ' agregada'} a la noticia.`),
        error: e => { this.errorFotos.set(e.mensaje || 'Error al subir.'); this.subiendoFotos.set(false); },
      });
    } else {
      fd.append('sede_id', this.sedeSeleccionadaId);
      if (this.contextoFoto.trim()) fd.append('contexto', this.contextoFoto.trim());
      this.api.postFormData<any>('/galeria/fotos', fd).subscribe({
        next: r => this._onExitoSubida(r.mensaje || 'Fotos subidas a la galería.'),
        error: e => { this.errorFotos.set(e.mensaje || 'Error al subir.'); this.subiendoFotos.set(false); },
      });
    }
  }

  private _onExitoSubida(msg: string) {
    this.exitoFotos.set(msg);
    this.fotosSeleccionadas = [];
    this.subiendoFotos.set(false);
    this.cargar();
    setTimeout(() => { this.exitoFotos.set(''); this.cerrarSubidaFotos(); }, 3500);
  }

  // ── Helpers ────────────────────────────────────────────

  get noticiaSeleccionada(): Noticia | undefined {
    return this.noticias.find(n => n.id === this.noticiaSeleccionadaId);
  }

  fotosDe(n: Noticia | undefined): any[] { if (!n) return []; return (n as any).imagenes ?? []; }
  fotosPendientesEn(n: Noticia | undefined): number { return 2 - this.fotosDe(n).length; }

  formatFecha(f: string): string {
    if (!f) return '';
    return new Date(f).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  estadoLabel(e: string): string {
    return { publicada: 'Publicada', pendiente: 'En revisión', rechazada: 'Rechazada' }[e] ?? e;
  }

  estadoClass(e: string): string {
    return { publicada: 'pan-badge-verde', pendiente: 'pan-badge-ambar', rechazada: 'pan-badge-rojo' }[e] ?? '';
  }

  imagen(n: Noticia): string | null { return (n.imagenes as any)?.[0]?.url ?? null; }

  motivoRechazoDe(n: Noticia): string | null {
    return (n as any).motivo_rechazo ?? (n as any).motivoRechazo ?? null;
  }

  categoriaColor(n: Noticia): string { return (n.categoria as any)?.color ?? '#7B1D2C'; }
  categoriaNombre(n: Noticia): string { return (n.categoria as any)?.nombre ?? ''; }
  tituloNoticia(id: string): string { return this.noticias.find(n => n.id === id)?.titulo ?? ''; }

  abrirEditarNoticia(n: Noticia) {
    this.editNoticia = {
      id:           n.id,
      titulo:       n.titulo,
      contenido:    n.contenido,
      categoria_id: (n.categoria as any)?.id ?? '',
      usar_ia:      false,
    };
    this.editNoticiaError.set('');
    this.mostrarFormNoticia  = false;
    this.mostrarSubidaFotos  = false;
    this.epModal             = false;
    setTimeout(() => document.getElementById('edit-noticia-modal')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  }

  cerrarEditarNoticia() {
    this.editNoticia = null;
    this.editNoticiaError.set('');
  }

  guardarEdicionNoticia() {
    if (!this.editNoticia) return;
    if (!this.editNoticia.titulo.trim() || !this.editNoticia.contenido.trim()) {
      this.editNoticiaError.set('El título y el contenido son obligatorios.');
      return;
    }
    this.editNoticiaGuardando.set(true);
    this.editNoticiaError.set('');
    const body: any = {
      titulo:    this.editNoticia.titulo,
      contenido: this.editNoticia.contenido,
      usar_ia:   this.editNoticia.usar_ia,
    };
    if (this.editNoticia.categoria_id) body['categoria_id'] = this.editNoticia.categoria_id;

    this.api.put<any>(`/noticias/${this.editNoticia.id}`, body).subscribe({
      next: r => {
        this.editNoticiaGuardando.set(false);
        this.editNoticia = null;
        this.cargar();
        const msg = r.noticia?.estado === 'pendiente' && r.noticia?.motivo_rechazo === null
          ? 'Noticia actualizada y enviada a revisión nuevamente.'
          : 'Noticia actualizada correctamente.';
        this.exito.set(msg);
        setTimeout(() => this.exito.set(''), 5000);
      },
      error: e => {
        this.editNoticiaError.set(e.mensaje || 'No se pudo guardar la edición.');
        this.editNoticiaGuardando.set(false);
      },
    });
  }

  eliminarFoto(n: Noticia, imgId: string) {
    if (!confirm('¿Eliminar esta foto de la noticia?')) return;
    this.cargandoImg.set(true);
    this.errorImg.set('');
    this.api.delete<any>(`/noticias/${n.id}/fotos/${imgId}`).subscribe({
      next: () => {
        (n as any).imagenes = (n as any).imagenes?.filter((i: any) => i.id !== imgId);
        this.cargandoImg.set(false);
      },
      error: e => { this.errorImg.set(e.mensaje ?? 'Error al eliminar la foto'); this.cargandoImg.set(false); },
    });
  }

  reemplazarFoto(n: Noticia, imgId: string, event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.cargandoImg.set(true);
    this.errorImg.set('');
    const fd = new FormData();
    fd.append('foto', file);
    this.api.putFormData<any>(`/noticias/${n.id}/fotos/${imgId}`, fd).subscribe({
      next: r => {
        const imgs = (n as any).imagenes as any[];
        const idx = imgs.findIndex((i: any) => i.id === imgId);
        if (idx !== -1) imgs[idx] = { ...imgs[idx], url: r.imagen.url };
        this.cargandoImg.set(false);
      },
      error: e => { this.errorImg.set(e.mensaje ?? 'Error al reemplazar la foto'); this.cargandoImg.set(false); },
    });
  }
}
