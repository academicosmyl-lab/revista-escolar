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

  // Flujo de subida de fotos
  mostrarSubidaFotos  = false;
  destinoFoto: DestinoFoto = '';
  noticiaSeleccionadaId   = '';
  sedeSeleccionadaId      = '';
  contextoFoto            = '';
  fotosSeleccionadas: { file: File; preview: string }[] = [];

  // Para agregar fotos rápido desde la tarjeta de una noticia
  noticiaConFotos: string | null = null;

  nueva = { titulo: '', contenido: '', categoria_id: '', usar_ia: true };

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

  private cargarSedes() {
    this.api.get<any>('/sedes').subscribe({
      next: r => { this.sedes = r.sedes ?? []; },
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
}
