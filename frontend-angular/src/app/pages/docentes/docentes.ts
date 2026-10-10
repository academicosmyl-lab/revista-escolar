import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { PerfilDocente, Sede } from '../../models';

const ORDEN_ROL: Record<string, number> = {
  RECTOR:       1,
  COORDINADOR:  2,
  ORIENTADORA:  3,
  DOCENTE:      4,
  PERSONAL:     5,
  ADMIN:        6,
};

@Component({
  selector: 'app-docentes',
  imports: [FormsModule, RouterLink, TitleCasePipe],
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

  // ── Modal perfil centrado ─────────────────────────────────
  panelDocente: PerfilDocente | null = null;
  panelNoticias: any[] = [];
  cargandoPanel = false;
  tabModal: 'perfil' | 'pub' = 'perfil';
  fichaEsp:  string | null = null;
  fichaArea: string | null = null;

  // ── Modal publicar ────────────────────────────────────────
  modalPublicar = false;

  // Reemplazar '#' con el link real de Google Forms cuando esté creado
  readonly FORM_URLS: Record<string, string> = {
    noticia:  '#',
    historia: '#',
    fotos:    '#',
  };

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
    const lista = q
      ? this.docentes.filter(d =>
          d.usuario.nombre.toLowerCase().includes(q) ||
          d.cargo?.toLowerCase().includes(q) ||
          d.areas?.some(a => a.toLowerCase().includes(q))
        )
      : [...this.docentes];

    return lista.sort((a, b) => {
      const oa = ORDEN_ROL[a.usuario.rol] ?? 99;
      const ob = ORDEN_ROL[b.usuario.rol] ?? 99;
      if (oa !== ob) return oa - ob;
      return a.usuario.nombre.localeCompare(b.usuario.nombre, 'es');
    });
  }

  // ── Acciones del panel ────────────────────────────────────
  abrirPanel(d: PerfilDocente) {
    this.panelDocente  = d;
    this.panelNoticias = [];
    this.cargandoPanel = true;
    this.tabModal      = 'perfil';
    this.fichaEsp      = null;
    this.fichaArea     = null;
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
    this.fichaEsp      = null;
    this.fichaArea     = null;
    document.body.style.overflow = '';
    this.cdr.markForCheck();
  }

  cerrarSiOverlay(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('doc-panel-overlay')) {
      this.cerrarPanel();
    }
  }

  setTabModal(tab: 'perfil' | 'pub') {
    this.tabModal = tab;
    this.fichaEsp  = null;
    this.fichaArea = null;
    this.cdr.markForCheck();
  }

  toggleFichaEsp(esp: string) {
    this.fichaEsp  = this.fichaEsp === esp ? null : esp;
    this.fichaArea = null;
    this.cdr.markForCheck();
  }

  toggleFichaArea(area: string) {
    this.fichaArea = this.fichaArea === area ? null : area;
    this.fichaEsp  = null;
    this.cdr.markForCheck();
  }

  abrirModal() { this.modalPublicar = true; this.cdr.markForCheck(); }
  cerrarModal() { this.modalPublicar = false; this.cdr.markForCheck(); }

  cerrarSiModalOverlay(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('doc-modal-overlay')) this.cerrarModal();
  }

  irAFormulario(tipo: string) {
    const url = this.FORM_URLS[tipo];
    if (url && url !== '#') { window.open(url, 'blank', 'noopener,noreferrer'); }
    this.cerrarModal();
  }

  logroTexto(logro: any): string {
    if (!logro) return '';
    if (typeof logro === 'string') return logro;
    return logro.titulo ?? logro.texto ?? logro.nombre ?? JSON.stringify(logro);
  }
  logroAnio(logro: any): string | null {
    if (!logro || typeof logro !== 'object') return null;
    return logro.anio ? String(logro.anio) : null;
  }
  logroLink(logro: any): string | null {
    if (!logro || typeof logro !== 'object') return null;
    const l = logro.link ?? logro.url ?? '';
    return l && l.startsWith('http') ? l : null;
  }

  get gruposTimeline(): { mes: string; items: any[] }[] {
    const hace3meses = new Date();
    hace3meses.setMonth(hace3meses.getMonth() - 3);
    const recientes = this.panelNoticias.filter(n => {
      return new Date(n.fecha_publicacion ?? n.createdAt) >= hace3meses;
    });
    const mapa = new Map<string, any[]>();
    for (const n of recientes) {
      const key = new Date(n.fecha_publicacion ?? n.createdAt)
        .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key)!.push(n);
    }
    return Array.from(mapa.entries()).map(([mes, items]) => ({ mes, items }));
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
