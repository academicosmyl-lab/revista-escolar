import {
  Component, OnInit, signal, computed,
  inject, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { ApiService } from '../../services/api.service';

type Tab = 'dashboard' | 'cola' | 'docentes' | 'historial';
type ModalTipo = 'aprobar' | 'rechazar' | 'crear' | 'editar' | null;

interface Solicitud {
  id: string; nombre: string; titulo?: string; area?: string; sede?: string;
  email?: string; bioCorta?: string; bioCompleta?: string;
  especialidades?: string; publicaciones?: string;
  fotoUrl?: string; web?: string; linkedin?: string; orcid?: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  motivoAdmin?: string; revisadoEn?: string; createdAt: string;
}

interface Docente {
  id: string; nombre: string; email: string; activo: boolean; rol: string;
  perfil?: { tituloProfesional?: string; cargo?: string; fotoUrl?: string; bio?: string; perfil_publico?: boolean; id?: string; };
}

interface AccionAdmin {
  id: string; tipo: string; descripcion: string; createdAt: string;
  admin?: { nombre: string; };
}

interface Stats {
  solicitudes: { pendientes: number; aprobados: number; rechazados: number; };
  docentes:    { total: number; activos: number; };
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

  /* Formulario "Crear docente" */
  nuevoNombre      = signal('');
  nuevoEmail       = signal('');
  nuevoTitulo      = signal('');
  nuevoArea        = signal('');
  nuevoBio         = signal('');
  nuevoSede        = signal('');
  nuevoCreandoErr  = signal('');

  readonly LIMIT = 12;

  /* Iconos de tipo acción */
  readonly iconoAccion: Record<string, string> = {
    aprobar_perfil:      '✅',
    rechazar_perfil:     '❌',
    crear_docente:       '➕',
    editar_docente:      '✏️',
    desactivar_docente:  '🚫',
    reactivar_docente:   '🔄',
    eliminar_docente:    '🗑️',
    login_admin:         '🔐',
    crear_usuario:       '👤',
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
        this.exito.set(r.mensaje || 'Acción realizada');
        this.cerrarModal();
        this.cargarCola();
        this.stats = null; // fuerza refresco del dashboard
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
    this.nuevoNombre.set(''); this.nuevoEmail.set(''); this.nuevoTitulo.set('');
    this.nuevoArea.set('');   this.nuevoBio.set('');   this.nuevoSede.set('');
    this.nuevoCreandoErr.set('');
    this.modal.set('crear');
  }

  crearDocente() {
    if (!this.nuevoNombre().trim() || !this.nuevoEmail().trim()) {
      this.nuevoCreandoErr.set('Nombre y email son obligatorios');
      return;
    }
    this.cargando.set(true);
    const fd = new FormData();
    fd.append('nombre', this.nuevoNombre());
    fd.append('email',  this.nuevoEmail());
    fd.append('titulo', this.nuevoTitulo());
    fd.append('area',   this.nuevoArea());
    fd.append('bio',    this.nuevoBio());
    fd.append('sede',   this.nuevoSede());

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

  /* ── Helpers ──────────────────────────────────────────────── */
  cerrarModal() {
    this.modal.set(null);
    this.modalItem.set(null);
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
}
