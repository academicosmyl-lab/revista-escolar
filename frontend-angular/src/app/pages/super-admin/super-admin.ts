import {
  Component, OnInit, signal, computed,
  inject, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { ApiService } from '../../services/api.service';

type Tab = 'dashboard' | 'cola' | 'docentes' | 'historial' | 'publicaciones' | 'galeria';
type ModalTipo = 'aprobar' | 'rechazar' | 'crear' | 'editar' | 'aprobar-pub' | 'rechazar-pub' | 'editar-pub' | 'nuevo-album' | 'nuevo-capitulo' | null;

interface Solicitud {
  id: string;
  rol?: string;
  nombre: string;
  titulo?: string;
  area?: string;
  sede?: string;
  experiencia?: number | null;
  email?: string;
  bioCorta?: string;
  bioCompleta?: string;
  especialidades?: string;
  publicaciones?: string;
  fotoUrl?: string;
  web?: string;
  linkedin?: string;
  orcid?: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  motivoAdmin?: string;
  revisadoEn?: string;
  createdAt: string;
}

interface Docente {
  id: string; nombre: string; email: string; activo: boolean; rol: string;
  passwordPlain?: string | null;
  perfil?: { tituloProfesional?: string; cargo?: string; fotoUrl?: string; bio?: string; perfil_publico?: boolean; id?: string; };
}

interface AccionAdmin {
  id: string; tipo: string; descripcion: string; createdAt: string;
  admin?: { nombre: string; };
}

interface Publicacion {
  id: string;
  titulo: string;
  resumen?: string;
  contenido?: string;
  estado: 'pendiente' | 'publicada' | 'rechazada';
  destacada: boolean;
  createdAt: string;
  autor?: { nombre: string; rol: string; };
  categoria?: { id: string; nombre: string; };
  imagenes?: { id: string; url: string; es_portada: boolean; }[];
}

interface Categoria {
  id: string;
  nombre: string;
  color?: string;
}

interface GaleriaAlbum {
  id: string; nombre: string; categoria: string; subtitulo?: string;
  descripcion?: string; anio?: number; orden: number;
  portada_url?: string; activo: boolean; destacado: boolean; eliminado: boolean;
  total_fotos?: number; total_capitulos?: number;
  capitulos?: GaleriaCapitulo[];
}
interface GaleriaCapitulo {
  id: string; album_id: string; titulo: string; descripcion?: string;
  icono: string; orden: number; activo: boolean;
  fotos?: GaleriaFoto[];
}
interface GaleriaFoto {
  id: string; url: string; public_id: string; descripcion?: string;
  orden: number; eliminada: boolean;
}

interface Stats {
  solicitudes: { pendientes: number; aprobados: number; rechazados: number; };
  docentes:    { total: number; activos: number; };
  publicacionesPendientes: number;
  ultimasAcciones: AccionAdmin[];
  porArea: { cargo: string; total: number; }[];
}

@Component({
  selector: 'app-super-admin',
  imports: [RouterLink, FormsModule, TitleCasePipe],
  templateUrl: './super-admin.html',
  styleUrl:    './super-admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdmin implements OnInit {

  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  /* ── Navegación ─────────────────────────────────────────── */
  tabActiva = signal<Tab>('dashboard');

  /* ── Estado general ─────────────────────────────────────── */
  cargando = signal(false);
  error    = signal('');
  exito    = signal('');

  /* ── Dashboard ──────────────────────────────────────────── */
  stats: Stats | null = null;

  /* ── Cola de solicitudes ────────────────────────────────── */
  solicitudes: Solicitud[] = [];
  totalSolicitudes = 0;
  filtroEstado = signal<string>('pendiente');
  busquedaCola = signal('');
  pagCola      = signal(1);

  /* ── Docentes ───────────────────────────────────────────── */
  docentes: Docente[] = [];
  totalDocentes = 0;
  busquedaDocentes = signal('');
  filtroActivo     = signal<string>('');
  pagDocentes      = signal(1);

  /* ── Historial ──────────────────────────────────────────── */
  historial: AccionAdmin[] = [];
  totalHistorial = 0;
  pagHistorial   = signal(1);

  /* ── Modal ──────────────────────────────────────────────── */
  modal     = signal<ModalTipo>(null);
  modalItem = signal<Solicitud | Docente | null>(null);
  motivo    = signal('');
  motivoErr = signal('');

  /* ── Credenciales tras aprobación ───────────────────────── */
  credenciales = signal<{ nombre: string; email: string; pass: string; emailEnviado: boolean } | null>(null);

  /* Formulario "Crear usuario" */
  nuevoNombre      = signal('');
  nuevoEmail       = signal('');
  nuevoArea        = signal('');
  nuevoRol         = signal('DOCENTE');
  nuevoPassword    = signal('');
  nuevoCreandoErr  = signal('');

  /* Formulario "Editar docente" */
  editNombre  = signal('');
  editTitulo  = signal('');
  editArea    = signal('');
  editBio     = signal('');
  editErr     = signal('');

  /* ── Publicaciones ──────────────────────────────────────── */
  publicaciones: Publicacion[] = [];
  totalPublicaciones = 0;
  filtroEstadoPub  = signal<string>('pendiente');
  pagPublicaciones = signal(1);
  modalPublicacion = signal<Publicacion | null>(null);
  motivoPub        = signal('');
  motivoPubErr     = signal('');

  /* ── Categorías ─────────────────────────────────────── */
  categorias: Categoria[] = [];

  /* ── Edición completa de publicación ────────────────── */
  editPubTitulo    = signal('');
  editPubContenido = signal('');
  editPubCatId     = signal('');
  editPubDestacada = signal(false);
  editPubUsarIa    = signal(false);
  editPubErr       = signal('');
  editPubGuardando = signal(false);

  /* ── Gestión de imágenes de una publicación ─────────── */
  modalImagenes    = signal<Publicacion | null>(null);
  cargandoImg      = signal(false);
  errorImg         = signal('');
  subiendoImg      = signal(false);
  exitoImg         = signal('');
  nuevasFotosPreview: { file: File; preview: string }[] = [];

  /* ── Galería institucional ───────────────────────────── */
  albums              : GaleriaAlbum[]    = [];
  albumSeleccionado   = signal<GaleriaAlbum | null>(null);
  capituloSeleccionado= signal<GaleriaCapitulo | null>(null);
  filtroCategoria     = signal<string>('todos');
  categoriasDisponibles: string[] = [];
  cargandoGal         = signal(false);
  errorGal            = signal('');
  exitoGal            = signal('');
  subiendoFotos       = signal(false);
  dragOver            = signal(false);
  fotosSubidas        = signal(0);
  fotosTotales        = signal(0);

  // Formulario nuevo álbum
  galNombre    = signal('');
  galCategoria     = signal<string>('Por Cursos');
  galCategoriaOtra = signal<string>('');
  galSubtitulo = signal('');
  galDesc      = signal('');
  galAnio       = signal(new Date().getFullYear());
  galDestacado  = signal(false);
  galPortada   : File | null = null;
  galPortadaPreview = signal<string>('');
  galFormErr   = signal('');

  // Formulario nuevo capítulo
  capTitulo = signal('');
  capIcono  = signal('📷');
  capDesc   = signal('');
  capErr    = signal('');

  readonly LIMIT = 12;

  /* Iconos de tipo acción */
  readonly etiquetaRol: Record<string, string> = {
    RECTOR:       'Rector',
    COORDINADOR:  'Coordinador/a',
    ORIENTADORA:  'Orientador/a',
    DOCENTE:      'Docente',
    PERSONAL:     'Equipo de apoyo',
  };

  readonly iconoAccion: Record<string, string> = {
    aprobar_perfil:        '✅',
    rechazar_perfil:       '❌',
    crear_docente:         '➕',
    editar_docente:        '✏️',
    desactivar_docente:    '🚫',
    reactivar_docente:     '🔄',
    eliminar_docente:      '🗑️',
    login_admin:           '🔐',
    crear_usuario:         '👤',
    aprobar_publicacion:   '📰',
    rechazar_publicacion:  '🚫',
  };

  ngOnInit() {
    this.cargarDashboard();
  }

  /* ── Carga dashboard ──────────────────────────────────────── */
  cargarDashboard() {
    this.cargando.set(true);
    this.api.get<Stats>('/super-admin/stats').subscribe({
      next:  r => { this.stats = r; this.cargando.set(false); this.cdr.markForCheck(); },
      error: e => { this.error.set(e.mensaje ?? 'Error al cargar stats'); this.cargando.set(false); this.cdr.markForCheck(); },
    });
  }

  /* ── Tabs ─────────────────────────────────────────────────── */
  irA(tab: Tab) {
    this.tabActiva.set(tab);
    this.limpiarMensajes();
    if (tab === 'dashboard' && !this.stats)         this.cargarDashboard();
    if (tab === 'cola')                              this.cargarCola();
    if (tab === 'docentes')                          this.cargarDocentes();
    if (tab === 'historial')                         this.cargarHistorial();
    if (tab === 'publicaciones')                     { this.cargarPublicaciones(); if (!this.categorias.length) this.cargarCategorias(); }
    if (tab === 'galeria')                           this.cargarAlbums();
  }

  /* ── Cola de solicitudes ──────────────────────────────────── */
  cargarCola() {
    this.cargando.set(true);
    const params: any = { estado: this.filtroEstado(), page: this.pagCola(), limit: this.LIMIT };
    if (this.busquedaCola()) params['q'] = this.busquedaCola();
    this.api.get<any>('/super-admin/solicitudes', params).subscribe({
      next:  r => { this.solicitudes = r.data; this.totalSolicitudes = r.total; this.cargando.set(false); this.cdr.markForCheck(); },
      error: e => { this.error.set(e.mensaje ?? 'Error'); this.cargando.set(false); this.cdr.markForCheck(); },
    });
  }

  cambiarFiltroEstado(e: string) {
    this.filtroEstado.set(e); this.pagCola.set(1); this.cargarCola();
  }

  /* ── Abrir modal de revisión ─────────────────────────────── */
  abrirRevision(sol: Solicitud, tipo: 'aprobar' | 'rechazar') {
    this.modalItem.set(sol);
    this.modal.set(tipo);
    this.motivo.set('');
    this.motivoErr.set('');
  }

  confirmarAccion() {
    if (!this.motivo().trim()) { this.motivoErr.set('El motivo es obligatorio'); return; }
    const sol = this.modalItem() as Solicitud;
    const tipo = this.modal() as 'aprobar' | 'rechazar';
    const url  = `/super-admin/solicitudes/${sol.id}/${tipo}`;

    this.cargando.set(true);
    this.api.put<any>(url, { motivo: this.motivo() }).subscribe({
      next:  r => {
        this.cerrarModal();
        this.cargarCola();
        this.stats = null;
        if (tipo === 'aprobar' && r.passTemp) {
          this.credenciales.set({
            nombre:       (this.modalItem() as Solicitud)?.nombre ?? '',
            email:        r.emailDocente ?? '',
            pass:         r.passTemp,
            emailEnviado: !!r.emailEnviado,
          });
        } else {
          this.exito.set(r.mensaje || 'Acción realizada');
        }
        this.cdr.markForCheck();
      },
      error: e => {
        this.motivoErr.set(e.mensaje ?? 'Error al procesar');
        this.cargando.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  /* ── Docentes ────────────────────────────────────────────── */
  cargarDocentes() {
    this.cargando.set(true);
    const params: any = { page: this.pagDocentes(), limit: this.LIMIT };
    if (this.busquedaDocentes()) params['q']      = this.busquedaDocentes();
    if (this.filtroActivo())     params['activo']  = this.filtroActivo();
    this.api.get<any>('/super-admin/docentes', params).subscribe({
      next:  r => { this.docentes = r.data; this.totalDocentes = r.total; this.cargando.set(false); this.cdr.markForCheck(); },
      error: e => { this.error.set(e.mensaje ?? 'Error'); this.cargando.set(false); this.cdr.markForCheck(); },
    });
  }

  toggleActivo(doc: Docente) {
    this.api.delete<any>(`/super-admin/docentes/${doc.id}`).subscribe({
      next:  r => { this.exito.set(r.mensaje || 'Actualizado'); this.cargarDocentes(); this.cdr.markForCheck(); },
      error: e => { this.error.set(e.mensaje ?? 'Error'); this.cdr.markForCheck(); },
    });
  }

  toggleVisible(doc: Docente) {
    this.api.patch<any>(`/super-admin/docentes/${doc.id}/visible`, {}).subscribe({
      next:  r => {
        this.exito.set(r.mensaje || 'Visibilidad actualizada');
        // Actualizar en memoria sin recargar toda la lista
        if (doc.perfil) {
          doc.perfil.perfil_publico = r.perfil_publico;
        } else {
          doc.perfil = { perfil_publico: r.perfil_publico };
        }
        this.cdr.markForCheck();
      },
      error: e => { this.error.set(e.mensaje ?? 'Error'); this.cdr.markForCheck(); },
    });
  }

  abrirCrear() {
    this.nuevoNombre.set(''); this.nuevoEmail.set('');
    this.nuevoArea.set('');   this.nuevoRol.set('DOCENTE');
    this.nuevoPassword.set('');
    this.nuevoCreandoErr.set('');
    this.modal.set('crear');
  }

  abrirEditar(doc: Docente) {
    this.modalItem.set(doc);
    this.editNombre.set(doc.nombre);
    this.editTitulo.set(doc.perfil?.tituloProfesional ?? '');
    this.editArea.set(doc.perfil?.cargo ?? '');
    this.editBio.set(doc.perfil?.bio ?? '');
    this.editErr.set('');
    this.modal.set('editar');
  }

  guardarEdicion() {
    const doc = this.asDocente(this.modalItem());
    if (!doc) return;
    if (!this.editNombre().trim()) { this.editErr.set('El nombre es obligatorio'); return; }
    this.cargando.set(true);
    this.api.put<any>(`/super-admin/docentes/${doc.id}`, {
      nombre: this.editNombre(),
      titulo: this.editTitulo(),
      area:   this.editArea(),
      bio:    this.editBio(),
    }).subscribe({
      next: r => {
        this.exito.set(r.mensaje || 'Docente actualizado');
        this.cerrarModal();
        this.cargarDocentes();
        this.cdr.markForCheck();
      },
      error: e => { this.editErr.set(e.mensaje ?? 'Error al guardar'); this.cargando.set(false); this.cdr.markForCheck(); },
    });
  }

  crearDocente() {
    if (!this.nuevoNombre().trim() || !this.nuevoEmail().trim()) {
      this.nuevoCreandoErr.set('Nombre y correo son obligatorios');
      return;
    }
    this.cargando.set(true);
    const fd = new FormData();
    fd.append('nombre', this.nuevoNombre());
    fd.append('email',  this.nuevoEmail());
    fd.append('rol',    this.nuevoRol());
    if (this.nuevoRol() === 'DOCENTE') fd.append('area', this.nuevoArea());
    if (this.nuevoPassword().trim()) fd.append('password', this.nuevoPassword().trim());

    this.api.postFormData<any>('/super-admin/docentes', fd).subscribe({
      next:  r => {
        this.exito.set(r.mensaje || 'Docente creado');
        this.cerrarModal();
        this.cargarDocentes();
        this.cdr.markForCheck();
      },
      error: e => {
        this.nuevoCreandoErr.set(e.mensaje ?? 'Error al crear');
        this.cargando.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  /* ── Historial ───────────────────────────────────────────── */
  cargarHistorial() {
    this.cargando.set(true);
    this.api.get<any>('/super-admin/historial', { page: this.pagHistorial(), limit: this.LIMIT }).subscribe({
      next:  r => { this.historial = r.data; this.totalHistorial = r.total; this.cargando.set(false); this.cdr.markForCheck(); },
      error: e => { this.error.set(e.mensaje ?? 'Error'); this.cargando.set(false); this.cdr.markForCheck(); },
    });
  }

  /* ── Categorías ────────────────────────────────────────── */
  cargarCategorias() {
    this.api.get<any>('/categorias').subscribe({
      next:  r => { this.categorias = r.data ?? []; this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  /* ── Publicaciones ────────────────────────────────────────── */
  cargarPublicaciones() {
    this.cargando.set(true);
    const params: any = { estado: this.filtroEstadoPub(), page: this.pagPublicaciones(), limit: this.LIMIT };
    this.api.get<any>('/super-admin/publicaciones', params).subscribe({
      next:  r => { this.publicaciones = r.data; this.totalPublicaciones = r.total; this.cargando.set(false); this.cdr.markForCheck(); },
      error: e => { this.error.set(e.mensaje ?? 'Error al cargar publicaciones'); this.cargando.set(false); this.cdr.markForCheck(); },
    });
  }

  cambiarFiltroEstadoPub(estado: string) {
    this.filtroEstadoPub.set(estado); this.pagPublicaciones.set(1); this.cargarPublicaciones();
  }

  abrirRevisionPub(pub: Publicacion, tipo: 'aprobar-pub' | 'rechazar-pub') {
    this.modalPublicacion.set(pub);
    this.modal.set(tipo);
    this.motivoPub.set('');
    this.motivoPubErr.set('');
  }

  confirmarAccionPub() {
    const pub = this.modalPublicacion();
    if (!pub) return;
    if (this.modal() === 'rechazar-pub' && !this.motivoPub().trim()) {
      this.motivoPubErr.set('El motivo es obligatorio');
      return;
    }
    const accion = this.modal() === 'aprobar-pub' ? 'aprobar' : 'rechazar';
    const body   = this.modal() === 'rechazar-pub' ? { motivo: this.motivoPub() } : {};
    this.cargando.set(true);
    this.api.put<any>(`/super-admin/publicaciones/${pub.id}/${accion}`, body).subscribe({
      next: r => {
        this.exito.set(r.mensaje || 'Acción realizada');
        this.cerrarModal();
        this.cargarPublicaciones();
        if (this.stats) this.stats = null;
        this.cdr.markForCheck();
      },
      error: e => {
        this.motivoPubErr.set(e.mensaje ?? 'Error al procesar');
        this.cargando.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  abrirEditarPub(pub: Publicacion) {
    this.editPubTitulo.set(pub.titulo);
    this.editPubContenido.set((pub as any).contenido ?? '');
    this.editPubCatId.set((pub as any).categoria?.id ?? '');
    this.editPubDestacada.set(pub.destacada);
    this.editPubUsarIa.set(false);
    this.editPubErr.set('');
    this.editPubGuardando.set(false);
    this.modalPublicacion.set(pub);
    this.modal.set('editar-pub');
    this.cdr.markForCheck();
  }

  guardarEdicionPub() {
    const pub = this.modalPublicacion();
    if (!pub) return;
    if (!this.editPubTitulo().trim()) { this.editPubErr.set('El título es obligatorio'); return; }
    if (!this.editPubContenido().trim() || this.editPubContenido().length < 50) {
      this.editPubErr.set('El contenido debe tener al menos 50 caracteres');
      return;
    }
    this.editPubGuardando.set(true);
    this.editPubErr.set('');
    const body: any = {
      titulo:    this.editPubTitulo(),
      contenido: this.editPubContenido(),
      destacada: this.editPubDestacada(),
      usar_ia:   this.editPubUsarIa(),
    };
    if (this.editPubCatId()) body['categoria_id'] = this.editPubCatId();

    this.api.put<any>(`/noticias/${pub.id}`, body).subscribe({
      next: r => {
        this.exito.set(r.mensaje || 'Publicación actualizada');
        this.cerrarModal();
        this.cargarPublicaciones();
        this.cdr.markForCheck();
      },
      error: e => {
        this.editPubErr.set(e.mensaje ?? 'Error al guardar');
        this.editPubGuardando.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  eliminarPublicacion(pub: Publicacion) {
    if (!confirm(`¿Eliminar permanentemente "${pub.titulo}"? Esta acción no se puede deshacer.`)) return;
    this.api.delete<any>(`/super-admin/publicaciones/${pub.id}`).subscribe({
      next:  r => { this.exito.set(r.mensaje || 'Eliminada'); this.cargarPublicaciones(); this.cdr.markForCheck(); },
      error: e => { this.error.set(e.mensaje ?? 'Error al eliminar'); this.cdr.markForCheck(); },
    });
  }

  passwordsVisibles = new Set<string>();

  togglePasswordVisible(id: string) {
    if (this.passwordsVisibles.has(id)) this.passwordsVisibles.delete(id);
    else this.passwordsVisibles.add(id);
    this.cdr.markForCheck();
  }

  resetPassword(doc: Docente) {
    if (!confirm(`¿Generar nueva contraseña para "${doc.nombre}"?\nLa anterior dejará de funcionar.`)) return;
    this.api.post<{ ok: boolean; passwordPlain: string }>(`/super-admin/docentes/${doc.id}/reset-password`, {}).subscribe({
      next: r => {
        doc.passwordPlain = r.passwordPlain;
        this.passwordsVisibles.add(doc.id);
        this.exito.set(`Nueva contraseña generada para "${doc.nombre}"`);
        this.cdr.markForCheck();
      },
      error: e => { this.error.set(e.mensaje ?? 'Error al resetear'); this.cdr.markForCheck(); },
    });
  }

  eliminarDefinitivo(doc: Docente) {
    if (!confirm(`¿ELIMINAR DEFINITIVAMENTE a "${doc.nombre}" (${doc.email})?\n\nEsto borra la cuenta y el perfil por completo. El email quedará libre para crear una cuenta nueva.\n\nEsta acción NO se puede deshacer.`)) return;
    this.api.delete<any>('/super-admin/usuarios/eliminar-definitivo', { email: doc.email }).subscribe({
      next:  r => { this.exito.set(r.mensaje || 'Eliminado'); this.cargarDocentes(); this.cdr.markForCheck(); },
      error: e => { this.error.set(e.mensaje ?? 'Error al eliminar'); this.cdr.markForCheck(); },
    });
  }

  get totalPagesPublicaciones() { return Math.ceil(this.totalPublicaciones / this.LIMIT); }
  prevPublicaciones() { if (this.pagPublicaciones() > 1) { this.pagPublicaciones.update(p => p - 1); this.cargarPublicaciones(); } }
  nextPublicaciones() { if (this.pagPublicaciones() < this.totalPagesPublicaciones) { this.pagPublicaciones.update(p => p + 1); this.cargarPublicaciones(); } }

  /* ── Galería ─────────────────────────────────────────────── */
  cargarAlbums() {
    this.cargandoGal.set(true);
    this.api.get<any>('/galeria/albums').subscribe({
      next: r => {
        this.albums = r.albums;
        // Derivar categorías únicas disponibles
        const cats = [...new Set(this.albums.map((a: GaleriaAlbum) => a.categoria).filter(Boolean))];
        this.categoriasDisponibles = cats as string[];
        this.cargandoGal.set(false);
        this.cdr.markForCheck();
      },
      error: e => { this.errorGal.set(e.mensaje ?? 'Error al cargar galería'); this.cargandoGal.set(false); this.cdr.markForCheck(); },
    });
  }

  albumsFiltrados(): GaleriaAlbum[] {
    if (this.filtroCategoria() === 'todos') return this.albums.filter(a => !a.eliminado);
    return this.albums.filter(a => a.categoria === this.filtroCategoria() && !a.eliminado);
  }

  readonly categoriasGal = [
    'Por Cursos', 'Por Sede', 'Embellecimiento', 'Graduandos 2026',
  ];

  abrirNuevoAlbum() {
    this.galNombre.set(''); this.galCategoria.set('Por Cursos');
    this.galCategoriaOtra.set('');
    this.galSubtitulo.set(''); this.galDesc.set('');
    this.galAnio.set(new Date().getFullYear());
    this.galDestacado.set(false);
    this.galPortada = null; this.galPortadaPreview.set('');
    this.galFormErr.set('');
    this.modal.set('nuevo-album');
  }

  onPortadaChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.galPortada = file;
    const reader = new FileReader();
    reader.onload = ev => { this.galPortadaPreview.set(ev.target?.result as string); this.cdr.markForCheck(); };
    reader.readAsDataURL(file);
  }

  crearAlbum() {
    if (!this.galNombre().trim()) { this.galFormErr.set('El nombre es obligatorio'); return; }
    const cat = this.galCategoria() === '__otra__'
      ? this.galCategoriaOtra().trim()
      : this.galCategoria();
    if (!cat) { this.galFormErr.set('Escribe el nombre de la nueva categoría'); return; }
    const fd = new FormData();
    fd.append('nombre',    this.galNombre());
    fd.append('categoria', cat);
    fd.append('subtitulo', this.galSubtitulo());
    fd.append('descripcion', this.galDesc());
    fd.append('año',       String(this.galAnio()));
    fd.append('destacado', String(this.galDestacado()));
    if (this.galPortada) fd.append('portada', this.galPortada);

    this.cargandoGal.set(true);
    this.api.postFormData<any>('/galeria/albums', fd).subscribe({
      next: r => {
        this.exitoGal.set('Álbum creado correctamente');
        this.cerrarModal();
        this.cargarAlbums();
        this.cdr.markForCheck();
      },
      error: e => { this.galFormErr.set(e.mensaje ?? 'Error al crear'); this.cargandoGal.set(false); this.cdr.markForCheck(); },
    });
  }

  seleccionarAlbum(album: GaleriaAlbum) {
    this.cargandoGal.set(true);
    this.capituloSeleccionado.set(null);
    this.exitoGal.set(''); this.errorGal.set('');
    this.api.get<any>(`/galeria/albums/${album.id}`).subscribe({
      next: r => {
        this.albumSeleccionado.set(r.album);
        this.cargandoGal.set(false);
        this.cdr.markForCheck();
      },
      error: e => { this.errorGal.set(e.mensaje ?? 'Error'); this.cargandoGal.set(false); this.cdr.markForCheck(); },
    });
  }

  volverAlbums() {
    this.albumSeleccionado.set(null);
    this.capituloSeleccionado.set(null);
  }

  abrirNuevoCapitulo() {
    this.capTitulo.set(''); this.capIcono.set('📷');
    this.capDesc.set('');   this.capErr.set('');
    this.modal.set('nuevo-capitulo');
  }

  crearCapitulo() {
    const album = this.albumSeleccionado();
    if (!album) return;
    if (!this.capTitulo().trim()) { this.capErr.set('El título es obligatorio'); return; }
    this.cargandoGal.set(true);
    this.api.post<any>(`/galeria/albums/${album.id}/capitulos`, {
      titulo:      this.capTitulo(),
      icono:       this.capIcono(),
      descripcion: this.capDesc(),
    }).subscribe({
      next: () => {
        this.exitoGal.set('Capítulo creado');
        this.cerrarModal();
        this.seleccionarAlbum(album);
        this.cdr.markForCheck();
      },
      error: e => { this.capErr.set(e.mensaje ?? 'Error'); this.cargandoGal.set(false); this.cdr.markForCheck(); },
    });
  }

  seleccionarCapitulo(cap: GaleriaCapitulo) {
    this.capituloSeleccionado.set(cap);
    this.exitoGal.set(''); this.errorGal.set('');
  }

  onDragOver(e: DragEvent) { e.preventDefault(); this.dragOver.set(true); }
  onDragLeave()             { this.dragOver.set(false); }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver.set(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length) this.subirFotos(files);
  }

  onFileInput(e: Event) {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    if (files.length) this.subirFotos(files);
    (e.target as HTMLInputElement).value = '';
  }

  subirFotos(files: File[]) {
    const cap = this.capituloSeleccionado();
    if (!cap) return;
    const imagenes = files.filter(f => f.type.startsWith('image/'));
    if (!imagenes.length) { this.errorGal.set('Solo se permiten imágenes'); return; }

    this.subiendoFotos.set(true);
    this.fotosTotales.set(imagenes.length);
    this.fotosSubidas.set(0);
    this.errorGal.set('');

    const fd = new FormData();
    imagenes.forEach(f => fd.append('fotos', f));

    this.api.postFormData<any>(`/galeria/capitulos/${cap.id}/fotos`, fd).subscribe({
      next: r => {
        this.exitoGal.set(`${r.guardadas} foto${r.guardadas !== 1 ? 's subidas' : ' subida'} correctamente`);
        this.subiendoFotos.set(false);
        const album = this.albumSeleccionado();
        if (album) this.seleccionarAlbum(album);
        this.cdr.markForCheck();
      },
      error: e => {
        this.errorGal.set(e.mensaje ?? 'Error al subir fotos');
        this.subiendoFotos.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  eliminarFoto(foto: GaleriaFoto) {
    if (!confirm('¿Eliminar esta foto de la galería? Se puede restaurar después.')) return;
    this.api.delete<any>(`/galeria/fotos/${foto.id}`).subscribe({
      next: () => {
        const album = this.albumSeleccionado();
        if (album) this.seleccionarAlbum(album);
        this.exitoGal.set('Foto eliminada (se puede restaurar)');
        this.cdr.markForCheck();
      },
      error: e => { this.errorGal.set(e.mensaje ?? 'Error'); this.cdr.markForCheck(); },
    });
  }

  toggleAlbumDestacado(album: GaleriaAlbum) {
    this.api.put<any>(`/galeria/albums/${album.id}`, { destacado: String(!album.destacado) }).subscribe({
      next: () => { this.cargarAlbums(); this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  toggleAlbumActivo(album: GaleriaAlbum) {
    this.api.put<any>(`/galeria/albums/${album.id}`, { activo: String(!album.activo) }).subscribe({
      next: () => { this.cargarAlbums(); this.cdr.markForCheck(); },
      error: e => { this.errorGal.set(e.mensaje ?? 'Error'); this.cdr.markForCheck(); },
    });
  }

  albumAnio(album: GaleriaAlbum): number { return (album as any)['año'] ?? 0; }

  readonly iconosCapitulo = ['📷','🏫','🎓','🏆','🎭','⚽','🔬','🎨','🌿','🎉','📚','💛','✨'];

  /* ── Helpers ──────────────────────────────────────────────── */
  cerrarModal() {
    this.modal.set(null);
    this.modalItem.set(null);
    this.modalPublicacion.set(null);
    this.cargando.set(false);
  }

  limpiarMensajes() { this.error.set(''); this.exito.set(''); }

  formatFecha(f?: string): string {
    if (!f) return '—';
    return new Date(f).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  }

  parseEspecialidades(raw?: string): string[] {
    try { return raw ? JSON.parse(raw) : []; } catch { return []; }
  }

  parsePublicaciones(raw?: string): any[] {
    try { return raw ? JSON.parse(raw) : []; } catch { return []; }
  }

  get totalPagesCola()     { return Math.ceil(this.totalSolicitudes / this.LIMIT); }
  get totalPagesDocentes() { return Math.ceil(this.totalDocentes    / this.LIMIT); }
  get totalPagesHistorial(){ return Math.ceil(this.totalHistorial   / this.LIMIT); }

  prevCola()       { if (this.pagCola()     > 1) { this.pagCola.update(p => p - 1);     this.cargarCola();     } }
  nextCola()       { if (this.pagCola()     < this.totalPagesCola)     { this.pagCola.update(p => p + 1);     this.cargarCola();     } }
  prevDocentes()   { if (this.pagDocentes() > 1) { this.pagDocentes.update(p => p - 1); this.cargarDocentes(); } }
  nextDocentes()   { if (this.pagDocentes() < this.totalPagesDocentes) { this.pagDocentes.update(p => p + 1); this.cargarDocentes(); } }
  prevHistorial()  { if (this.pagHistorial()> 1) { this.pagHistorial.update(p => p - 1);this.cargarHistorial();} }
  nextHistorial()  { if (this.pagHistorial()< this.totalPagesHistorial){ this.pagHistorial.update(p => p + 1);this.cargarHistorial();} }

  asSolicitud(item: Solicitud | Docente | null): Solicitud | null { return item as Solicitud; }
  asDocente(item: Solicitud | Docente | null): Docente   | null   { return item as Docente;   }

  /* ── Gestión imágenes publicación ───────────────────── */
  abrirGestionImagenes(pub: Publicacion) {
    this.errorImg.set('');
    this.exitoImg.set('');
    this.nuevasFotosPreview = [];
    this.modalImagenes.set(pub);
  }

  cerrarImagenes() {
    this.modalImagenes.set(null);
    this.nuevasFotosPreview = [];
    this.errorImg.set('');
    this.exitoImg.set('');
  }

  onNuevasFotosInput(e: Event) {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    (e.target as HTMLInputElement).value = '';
    if (!files.length) return;
    const pub = this.modalImagenes();
    const existentes = pub?.imagenes?.length ?? 0;
    const espacio = Math.max(0, 2 - existentes - this.nuevasFotosPreview.length);
    if (espacio <= 0) { this.errorImg.set('Ya se alcanzó el máximo de 2 fotos por publicación.'); return; }
    const seleccionadas = files.filter(f => f.type.startsWith('image/')).slice(0, espacio);
    seleccionadas.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        this.nuevasFotosPreview.push({ file, preview: ev.target?.result as string });
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    });
  }

  quitarNuevaFoto(i: number) {
    this.nuevasFotosPreview.splice(i, 1);
    this.cdr.markForCheck();
  }

  subirNuevasFotos() {
    const pub = this.modalImagenes();
    if (!pub || !this.nuevasFotosPreview.length) return;
    this.subiendoImg.set(true);
    this.errorImg.set('');
    this.exitoImg.set('');
    const fd = new FormData();
    this.nuevasFotosPreview.forEach(f => fd.append('fotos', f.file));
    this.api.postFormData<any>(`/noticias/${pub.id}/fotos`, fd).subscribe({
      next: r => {
        const nuevas = r.imagenes ?? [];
        const pubActual = this.modalImagenes();
        if (pubActual) {
          const actualizada = { ...pubActual, imagenes: [...(pubActual.imagenes ?? []), ...nuevas] };
          this.modalImagenes.set(actualizada);
          // Actualizar también en la lista
          const idx = this.publicaciones.findIndex(p => p.id === pub.id);
          if (idx !== -1) this.publicaciones[idx] = { ...this.publicaciones[idx], imagenes: actualizada.imagenes };
        }
        this.nuevasFotosPreview = [];
        this.subiendoImg.set(false);
        this.exitoImg.set(`${nuevas.length} foto${nuevas.length > 1 ? 's subidas' : ' subida'} correctamente.`);
        this.cdr.markForCheck();
      },
      error: e => {
        this.errorImg.set(e.mensaje ?? 'Error al subir las fotos');
        this.subiendoImg.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  eliminarImagenPub(pub: Publicacion, imagenId: string) {
    if (!confirm('¿Eliminar esta imagen? La acción no se puede deshacer.')) return;
    this.cargandoImg.set(true);
    this.errorImg.set('');
    this.api.delete<any>(`/noticias/${pub.id}/fotos/${imagenId}`).subscribe({
      next: () => {
        if (pub.imagenes) pub.imagenes = pub.imagenes.filter(i => i.id !== imagenId);
        this.modalImagenes.set({ ...pub });
        this.cargandoImg.set(false);
        this.cdr.markForCheck();
      },
      error: e => { this.errorImg.set(e.mensaje ?? 'Error al eliminar'); this.cargandoImg.set(false); this.cdr.markForCheck(); },
    });
  }

  reemplazarImagenPub(pub: Publicacion, imagenId: string, event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.cargandoImg.set(true);
    this.errorImg.set('');
    const fd = new FormData();
    fd.append('foto', file);
    this.api.putFormData<any>(`/noticias/${pub.id}/fotos/${imagenId}`, fd).subscribe({
      next: r => {
        if (pub.imagenes) {
          const idx = pub.imagenes.findIndex(i => i.id === imagenId);
          if (idx !== -1) pub.imagenes[idx] = { ...pub.imagenes[idx], url: r.imagen.url };
        }
        this.modalImagenes.set({ ...pub });
        this.cargandoImg.set(false);
        this.cdr.markForCheck();
      },
      error: e => { this.errorImg.set(e.mensaje ?? 'Error al reemplazar'); this.cargandoImg.set(false); this.cdr.markForCheck(); },
    });
  }
}
