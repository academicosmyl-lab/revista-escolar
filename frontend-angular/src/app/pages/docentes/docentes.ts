import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { PerfilDocente, Sede } from '../../models';

@Component({
  selector: 'app-docentes',
  imports: [FormsModule],
  templateUrl: './docentes.html',
  styleUrl: './docentes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Docentes implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  cargando  = true;
  error     = '';
  skeletons = Array(8);

  docentes: PerfilDocente[] = [];
  sedes:    Sede[]          = [];

  busqueda    = '';
  sedeActiva: string | null = null;

  // ── Panel lateral ────────────────────────────────────────
  panelDocente: PerfilDocente | null = null;
  panelNoticias: any[] = [];
  cargandoPanel = false;

  ngOnInit() {
    this.cargarSedes();
    this.cargarDocentes();
  }

  ngOnDestroy() {
    if (this.panelDocente) document.body.style.overflow = '';
  }

  private cargarSedes() {
    this.api.get<any>('/sedes').subscribe({
      next:  r => { this.sedes = r.data ?? (Array.isArray(r) ? r : []); this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  cargarDocentes() {
    this.cargando = true;
    this.error    = '';

    const params: Record<string, string | number> = {};
    if (this.sedeActiva) params['sedeId'] = this.sedeActiva;

    this.api.get<any>('/perfil/docentes', params).subscribe({
      next: r => {
        const data = r.data ?? r;
        this.docentes = Array.isArray(data) ? data : (data.rows ?? data.docentes ?? []);
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: e => {
        this.error    = e.mensaje || 'No se pudo cargar el directorio de docentes.';
        this.cargando = false;
        this.cdr.markForCheck();
      },
    });
  }

  filtrarSede(id: string | null) {
    this.sedeActiva = id;
    this.cargarDocentes();
  }

  get docentesFiltrados(): PerfilDocente[] {
    const q = this.busqueda.trim().toLowerCase();
    if (!q) return this.docentes;
    return this.docentes.filter(d =>
      d.usuario.nombre.toLowerCase().includes(q) ||
      d.cargo?.toLowerCase().includes(q) ||
      d.areas?.some(a => a.toLowerCase().includes(q))
    );
  }

  // ── Acciones del panel ────────────────────────────────────
  abrirPanel(d: PerfilDocente) {
    this.panelDocente  = d;
    this.panelNoticias = [];
    this.cargandoPanel = true;
    document.body.style.overflow = 'hidden';
    this.cdr.markForCheck();

    this.api.get<any>(`/perfil/${d.id}`).subscribe({
      next: r => {
        const det = r.docente ?? r;
        this.panelNoticias = det.noticias ?? [];
        this.cargandoPanel = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargandoPanel = false;
        this.cdr.markForCheck();
      },
    });
  }

  cerrarPanel() {
    this.panelDocente  = null;
    this.panelNoticias = [];
    this.cargandoPanel = false;
    document.body.style.overflow = '';
    this.cdr.markForCheck();
  }

  cerrarSiOverlay(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('doc-panel-overlay')) {
      this.cerrarPanel();
    }
  }

  // ── Helpers ───────────────────────────────────────────────
  inicial(nombre: string): string { return nombre.charAt(0).toUpperCase(); }

  onFotoLoad(event: Event) {
    (event.target as HTMLImageElement).classList.add('visible');
  }

  onFotoError(event: Event) {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  sedeNombres(d: PerfilDocente): string {
    return d.sedes?.map(s => s.nombre).join(' · ') ?? '';
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
