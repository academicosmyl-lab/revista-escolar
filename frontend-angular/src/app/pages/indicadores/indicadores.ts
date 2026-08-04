import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule }     from '@angular/common';
import { FormsModule }      from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexChart,
  ApexNonAxisChartSeries,
  ApexAxisChartSeries,
  ApexXAxis,
  ApexYAxis,
  ApexTitleSubtitle,
  ApexDataLabels,
  ApexStroke,
  ApexFill,
  ApexTooltip,
  ApexLegend,
  ApexPlotOptions,
  ApexGrid,
} from 'ng-apexcharts';
import { ApiService } from '../../services/api.service';

// ── Tipos inline ──────────────────────────────────────────────────────────────
type Modo = 'panorama' | 'comparacion' | 'individual';
type TipoComparacion = 'grado' | 'area' | 'grupo';

interface Resumen {
  totalEstudiantes: number;
  promedioGeneral: number | null;
  pctRiesgo: number | null;
  areaCritica: string | null;
  promedioAreaCritica: number | null;
}

interface AreaPromedio {
  area: string;
  promedio: number;
}

interface EvolucionItem {
  area: string;
  p1: number | null;
  p2: number | null;
  p3: number | null;
  ac: number | null;
}

interface HeatmapData {
  areas: string[];
  grados: string[];
  matriz: { grado: string; valores: (number | null)[] }[];
}

interface Comparacion {
  etiquetaA: string;
  etiquetaB: string;
  areas?: string[];
  periodos?: string[];
  promediosA: (number | null)[];
  promediosB: (number | null)[];
}

interface RankingEst {
  nombre: string;
  sede: string;
  grado: string;
  grupo: string;
  acum: number;
}

interface Ranking {
  top10: RankingEst[];
  bottom10: RankingEst[];
}

interface BuscadorResult {
  nombre: string;
  sede: string;
  jornada: string;
  grado: string;
  grupo: string;
}

interface PerfilEstudiante {
  nombre: string;
  sede: string;
  jornada: string;
  grado: string;
  grupo: string;
  acumFinal: number | null;
  puesto: number | null;
  radar: { area: string; p1: number|null; p2: number|null; p3: number|null; ac: number|null }[];
}

interface Metadata {
  anios: string[];
  sedes: string[];
  jornadas: string[];
  grados: string[];
  grupos: string[];
  areas: string[];
  listo: boolean;
}

// ── Paleta institucional ──────────────────────────────────────────────────────
const C_AZUL    = '#1E40AF';
const C_AMBAR   = '#F59E0B';
const C_ROJO    = '#DC2626';
const C_VERDE   = '#16A34A';
const C_FONDO   = '#0F172A';
const C_CARD    = '#1E293B';
const C_TEXTO   = '#E2E8F0';
const C_SUBTEXT = '#94A3B8';

const APEX_THEME = {
  background: C_CARD,
  foreColor:  C_TEXTO,
};

@Component({
  selector: 'app-indicadores',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule],
  templateUrl: './indicadores.html',
  styleUrl: './indicadores.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Indicadores implements OnInit {
  private api = inject(ApiService);

  // ── Modo activo ─────────────────────────────────────────────────────────────
  modo = signal<Modo>('panorama');

  // ── Filtros ─────────────────────────────────────────────────────────────────
  filtroAnio    = signal<string>('');
  filtroSede    = signal<string>('');
  filtroJornada = signal<string>('');
  filtroGrado   = signal<string>('');
  filtroGrupo   = signal<string>('');
  filtroPeriodo = signal<string>('ac');

  // Comparacion
  tipoComparacion = signal<TipoComparacion>('grado');
  comparA = signal<string>('');
  comparB = signal<string>('');

  // Buscador
  queryBusqueda   = signal<string>('');
  resultadosBusca = signal<BuscadorResult[]>([]);
  buscandoEstudiante = signal(false);
  estudianteSeleccionado = signal<BuscadorResult | null>(null);

  // ── Metadata ────────────────────────────────────────────────────────────────
  metadata = signal<Metadata>({
    anios: [], sedes: [], jornadas: [], grados: [], grupos: [], areas: [], listo: false,
  });

  // ── Datos ───────────────────────────────────────────────────────────────────
  resumen       = signal<Resumen | null>(null);
  areasProm     = signal<AreaPromedio[]>([]);
  evolucion     = signal<EvolucionItem[]>([]);
  heatmap       = signal<HeatmapData | null>(null);
  comparacion   = signal<Comparacion | null>(null);
  ranking       = signal<Ranking | null>(null);
  perfil        = signal<PerfilEstudiante | null>(null);

  // ── Loading / error ─────────────────────────────────────────────────────────
  cargando = signal(false);
  error    = signal<string | null>(null);

  // ── Computed: color del promedio ─────────────────────────────────────────────
  colorPromedio = computed(() => {
    const v = this.resumen()?.promedioGeneral;
    if (v === null || v === undefined) return C_SUBTEXT;
    if (v < 3.0) return C_ROJO;
    if (v < 4.0) return C_AMBAR;
    return C_VERDE;
  });

  // ── Computed: opciones para selects de comparacion ──────────────────────────
  opcionesComparA = computed(() => {
    const tipo = this.tipoComparacion();
    if (tipo === 'grado')  return this.metadata().grados;
    if (tipo === 'grupo')  return this.metadata().grupos;
    if (tipo === 'area')   return this.metadata().areas;
    return [];
  });

  opcionesComparB = computed(() => this.opcionesComparA());

  // ── Gráfica: barras por área ─────────────────────────────────────────────────
  chartBarrasOptions = computed(() => {
    const datos = this.areasProm();
    return {
      series: [{ name: 'Promedio', data: datos.map(d => d.promedio ?? 0) }] as ApexAxisChartSeries,
      chart: {
        type: 'bar' as const, height: 340, background: C_CARD,
        toolbar: { show: false },
        animations: { enabled: true, speed: 600 },
      } as ApexChart,
      theme: APEX_THEME,
      colors: datos.map(d => (d.promedio ?? 5) < 3.0 ? C_ROJO : C_AZUL),
      xaxis: {
        categories: datos.map(d => d.area),
        labels: { style: { colors: C_SUBTEXT, fontSize: '10px' }, rotate: -35 },
      } as ApexXAxis,
      yaxis: {
        min: 0, max: 5,
        labels: { style: { colors: C_SUBTEXT } },
      } as ApexYAxis,
      dataLabels: {
        enabled: true,
        formatter: (v: number) => v.toFixed(1),
        style: { fontSize: '11px', colors: [C_TEXTO] },
      } as ApexDataLabels,
      plotOptions: {
        bar: { borderRadius: 4, distributed: true },
      } as ApexPlotOptions,
      legend: { show: false } as ApexLegend,
      grid: { borderColor: '#1E3A5F' } as ApexGrid,
      tooltip: { theme: 'dark' } as ApexTooltip,
    };
  });

  // ── Gráfica: evolución P1→P2→P3 (líneas) ────────────────────────────────────
  chartLineaOptions = computed(() => {
    const datos = this.evolucion().slice(0, 6); // máx 6 series para legibilidad
    const colores = [C_AZUL, C_AMBAR, C_VERDE, C_ROJO, '#8B5CF6', '#06B6D4'];
    return {
      series: datos.map((d, i) => ({
        name: d.area,
        data: [d.p1 ?? 0, d.p2 ?? 0, d.p3 ?? 0],
        color: colores[i % colores.length],
      })) as ApexAxisChartSeries,
      chart: {
        type: 'line' as const, height: 300, background: C_CARD,
        toolbar: { show: false },
        animations: { enabled: true, speed: 800 },
      } as ApexChart,
      theme: APEX_THEME,
      xaxis: {
        categories: ['Período 1', 'Período 2', 'Período 3'],
        labels: { style: { colors: C_SUBTEXT } },
      } as ApexXAxis,
      yaxis: {
        min: 1, max: 5,
        labels: { style: { colors: C_SUBTEXT } },
      } as ApexYAxis,
      stroke: { curve: 'smooth' as const, width: 3 } as ApexStroke,
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 0.3, opacityFrom: 0.8, opacityTo: 0.3 },
      } as ApexFill,
      markers: { size: 5 },
      legend: {
        labels: { colors: C_TEXTO },
        position: 'bottom' as const,
      } as ApexLegend,
      grid: { borderColor: '#1E3A5F' } as ApexGrid,
      tooltip: { theme: 'dark' } as ApexTooltip,
    };
  });

  // ── Gráfica: heatmap ─────────────────────────────────────────────────────────
  chartHeatmapOptions = computed(() => {
    const data = this.heatmap();
    if (!data) return null;
    return {
      series: data.matriz.map(fila => ({
        name: fila.grado,
        data: fila.valores.map((v, i) => ({
          x: data.areas[i] ?? '',
          y: v ?? 0,
        })),
      })) as ApexAxisChartSeries,
      chart: {
        type: 'heatmap' as const, height: Math.max(200, data.grados.length * 36),
        background: C_CARD, toolbar: { show: false },
      } as ApexChart,
      theme: APEX_THEME,
      plotOptions: {
        heatmap: {
          shadeIntensity: 0.7,
          colorScale: {
            ranges: [
              { from: 0,   to: 2.9, name: 'Bajo',  color: C_ROJO  },
              { from: 3.0, to: 3.9, name: 'Medio', color: C_AMBAR },
              { from: 4.0, to: 5.0, name: 'Alto',  color: C_VERDE },
            ],
          },
        },
      } as ApexPlotOptions,
      dataLabels: { enabled: false } as ApexDataLabels,
      xaxis: {
        labels: { style: { colors: C_SUBTEXT, fontSize: '10px' }, rotate: -30 },
      } as ApexXAxis,
      yaxis: { labels: { style: { colors: C_SUBTEXT } } } as ApexYAxis,
      legend: { labels: { colors: C_TEXTO } } as ApexLegend,
      tooltip: { theme: 'dark' } as ApexTooltip,
    };
  });

  // ── Gráfica: comparación ─────────────────────────────────────────────────────
  chartComparOptions = computed(() => {
    const comp = this.comparacion();
    if (!comp) return null;
    const categorias = comp.areas ?? comp.periodos ?? [];
    return {
      series: [
        { name: comp.etiquetaA, data: comp.promediosA.map(v => v ?? 0) },
        { name: comp.etiquetaB, data: comp.promediosB.map(v => v ?? 0) },
      ] as ApexAxisChartSeries,
      chart: {
        type: 'bar' as const, height: 320, background: C_CARD,
        toolbar: { show: false },
        animations: { enabled: true },
      } as ApexChart,
      theme: APEX_THEME,
      colors: [C_AZUL, C_AMBAR],
      plotOptions: { bar: { borderRadius: 4, groupPadding: 0.2 } } as ApexPlotOptions,
      xaxis: {
        categories: categorias,
        labels: { style: { colors: C_SUBTEXT, fontSize: '10px' }, rotate: -30 },
      } as ApexXAxis,
      yaxis: {
        min: 0, max: 5,
        labels: { style: { colors: C_SUBTEXT } },
      } as ApexYAxis,
      legend: {
        labels: { colors: C_TEXTO },
        position: 'top' as const,
      } as ApexLegend,
      dataLabels: {
        enabled: true,
        formatter: (v: number) => v.toFixed(1),
        style: { fontSize: '10px', colors: [C_TEXTO] },
      } as ApexDataLabels,
      grid: { borderColor: '#1E3A5F' } as ApexGrid,
      tooltip: { theme: 'dark' } as ApexTooltip,
    };
  });

  // ── Gráfica: ranking (barras horizontales) ───────────────────────────────────
  chartRankingOptions = computed(() => {
    const data = this.ranking();
    if (!data) return null;
    const top = data.top10;
    return {
      series: [{ name: 'Acum. Final', data: top.map(e => e.acum) }] as ApexAxisChartSeries,
      chart: {
        type: 'bar' as const, height: 320, background: C_CARD,
        toolbar: { show: false },
        animations: { enabled: true },
      } as ApexChart,
      theme: APEX_THEME,
      colors: [C_VERDE],
      plotOptions: {
        bar: { horizontal: true, borderRadius: 4, distributed: false },
      } as ApexPlotOptions,
      xaxis: {
        min: 0, max: 5,
        labels: { style: { colors: C_SUBTEXT } },
      } as ApexXAxis,
      yaxis: {
        labels: {
          style: { colors: C_SUBTEXT, fontSize: '11px' },
          formatter: (_: unknown, i: number) =>
            top[i]?.nombre?.split(' ').slice(0, 2).join(' ') ?? '',
        },
      } as ApexYAxis,
      dataLabels: {
        enabled: true,
        formatter: (v: number) => v.toFixed(2),
        style: { fontSize: '10px', colors: [C_TEXTO] },
      } as ApexDataLabels,
      grid: { borderColor: '#1E3A5F' } as ApexGrid,
      tooltip: { theme: 'dark' } as ApexTooltip,
      legend: { show: false } as ApexLegend,
    };
  });

  // ── Gráfica: radar / perfil estudiante ───────────────────────────────────────
  chartRadarOptions = computed(() => {
    const p = this.perfil();
    if (!p) return null;
    return {
      series: [
        { name: 'P1', data: p.radar.map(r => r.p1 ?? 0) },
        { name: 'P2', data: p.radar.map(r => r.p2 ?? 0) },
        { name: 'P3', data: p.radar.map(r => r.p3 ?? 0) },
        { name: 'Acum', data: p.radar.map(r => r.ac ?? 0) },
      ] as ApexAxisChartSeries,
      chart: {
        type: 'radar' as const, height: 380, background: C_CARD,
        toolbar: { show: false },
        dropShadow: { enabled: true, blur: 1, left: 1, top: 1 },
      } as ApexChart,
      theme: APEX_THEME,
      colors: [C_AZUL, C_AMBAR, C_VERDE, '#8B5CF6'],
      stroke: { width: 2 } as ApexStroke,
      fill: { opacity: 0.15 } as ApexFill,
      markers: { size: 4 },
      xaxis: {
        categories: p.radar.map(r => r.area),
        labels: { style: { colors: C_TEXTO, fontSize: '10px' } },
      } as ApexXAxis,
      yaxis: { show: false } as ApexYAxis,
      legend: {
        labels: { colors: C_TEXTO },
        position: 'bottom' as const,
      } as ApexLegend,
      tooltip: { theme: 'dark' } as ApexTooltip,
    };
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit() {
    this.cargarMetadata();
  }

  // ── Carga datos ──────────────────────────────────────────────────────────────
  cargarMetadata() {
    this.cargando.set(true);
    this.error.set(null);
    this.api.get<{ ok: boolean; data: Metadata }>(
      '/indicadores/metadata',
      this.buildParams()
    ).subscribe({
      next: ({ data }) => {
        this.metadata.set(data);
        if (this.modo() === 'panorama') this.cargarPanorama();
        else this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('No se pudo conectar con el backend. Verifica que esté corriendo.');
      },
    });
  }

  cargarPanorama() {
    this.cargando.set(true);
    this.error.set(null);
    const params = this.buildParams();

    this.api.get<{ ok: boolean; data: Resumen }>('/indicadores/resumen', params)
      .subscribe({ next: ({ data }) => this.resumen.set(data) });

    this.api.get<{ ok: boolean; data: AreaPromedio[] }>('/indicadores/areas', params)
      .subscribe({ next: ({ data }) => this.areasProm.set(data) });

    this.api.get<{ ok: boolean; data: EvolucionItem[] }>('/indicadores/evolucion', params)
      .subscribe({ next: ({ data }) => this.evolucion.set(data) });

    this.api.get<{ ok: boolean; data: HeatmapData }>('/indicadores/heatmap', params)
      .subscribe({
        next: ({ data }) => { this.heatmap.set(data); this.cargando.set(false); },
        error: () => this.cargando.set(false),
      });

    this.api.get<{ ok: boolean; data: Ranking }>('/indicadores/ranking', params)
      .subscribe({ next: ({ data }) => this.ranking.set(data) });
  }

  cargarComparacion() {
    if (!this.comparA() || !this.comparB()) return;
    this.cargando.set(true);
    this.error.set(null);
    const params: Record<string, string> = {
      tipo: this.tipoComparacion(),
      a:    this.comparA(),
      b:    this.comparB(),
    };
    if (this.filtroSede())    params['sede']    = this.filtroSede();
    if (this.filtroJornada()) params['jornada'] = this.filtroJornada();
    if (this.filtroGrado())   params['grado']   = this.filtroGrado();

    this.api.get<{ ok: boolean; data: Comparacion }>('/indicadores/comparacion', params)
      .subscribe({
        next: ({ data }) => { this.comparacion.set(data); this.cargando.set(false); },
        error: (e) => { this.error.set(e.mensaje || 'Error en comparación'); this.cargando.set(false); },
      });
  }

  buscarEstudiante() {
    const q = this.queryBusqueda().trim();
    if (q.length < 2) { this.resultadosBusca.set([]); return; }
    this.buscandoEstudiante.set(true);
    this.api.get<{ ok: boolean; data: BuscadorResult[] }>('/indicadores/buscar', { q })
      .subscribe({
        next: ({ data }) => { this.resultadosBusca.set(data); this.buscandoEstudiante.set(false); },
        error: () => this.buscandoEstudiante.set(false),
      });
  }

  seleccionarEstudiante(est: BuscadorResult) {
    this.estudianteSeleccionado.set(est);
    this.resultadosBusca.set([]);
    this.queryBusqueda.set(est.nombre);
    this.cargarPerfil(est);
  }

  cargarPerfil(est: BuscadorResult) {
    this.cargando.set(true);
    this.api.get<{ ok: boolean; data: PerfilEstudiante }>('/indicadores/estudiante', {
      nombre:  est.nombre,
      sede:    est.sede,
      jornada: est.jornada,
      grado:   est.grado,
      grupo:   est.grupo,
    }).subscribe({
      next: ({ data }) => { this.perfil.set(data); this.cargando.set(false); },
      error: () => { this.error.set('Perfil no encontrado'); this.cargando.set(false); },
    });
  }

  // ── Eventos de filtros ───────────────────────────────────────────────────────
  onAnioChange(v: string) {
    this.filtroAnio.set(v);
    this.filtroSede.set('');
    this.filtroJornada.set('');
    this.filtroGrado.set('');
    this.filtroGrupo.set('');
    this.recargarMetadataYDatos();
  }

  onSedeChange(v: string) {
    this.filtroSede.set(v);
    this.filtroJornada.set('');
    this.filtroGrado.set('');
    this.filtroGrupo.set('');
    this.recargarMetadataYDatos();
  }

  onJornadaChange(v: string) {
    this.filtroJornada.set(v);
    this.filtroGrado.set('');
    this.filtroGrupo.set('');
    this.recargarMetadataYDatos();
  }

  onGradoChange(v: string) {
    this.filtroGrado.set(v);
    this.filtroGrupo.set('');
    this.recargarMetadataYDatos();
  }

  onGrupoChange(v: string) {
    this.filtroGrupo.set(v);
    this.recargarMetadataYDatos();
  }

  onPeriodoChange(v: string) {
    this.filtroPeriodo.set(v);
    if (this.modo() === 'panorama') this.cargarPanorama();
  }

  recargarMetadataYDatos() {
    this.api.get<{ ok: boolean; data: Metadata }>(
      '/indicadores/metadata',
      this.buildParams()
    ).subscribe({
      next: ({ data }) => {
        this.metadata.set(data);
        if (this.modo() === 'panorama') this.cargarPanorama();
      },
    });
  }

  cambiarModo(m: Modo) {
    this.modo.set(m);
    if (m === 'panorama') this.cargarPanorama();
    if (m === 'comparacion') {
      this.comparA.set('');
      this.comparB.set('');
      this.comparacion.set(null);
    }
    if (m === 'individual') {
      this.perfil.set(null);
      this.estudianteSeleccionado.set(null);
      this.queryBusqueda.set('');
    }
  }

  onTipoComparChange(v: TipoComparacion) {
    this.tipoComparacion.set(v);
    this.comparA.set('');
    this.comparB.set('');
    this.comparacion.set(null);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  buildParams(): Record<string, string> {
    const p: Record<string, string> = {};
    if (this.filtroAnio())    p['anio']    = this.filtroAnio();
    if (this.filtroSede())    p['sede']    = this.filtroSede();
    if (this.filtroJornada()) p['jornada'] = this.filtroJornada();
    if (this.filtroGrado())   p['grado']   = this.filtroGrado();
    if (this.filtroGrupo())   p['grupo']   = this.filtroGrupo();
    if (this.filtroPeriodo()) p['periodo'] = this.filtroPeriodo();
    return p;
  }

  colorProm(v: number | null | undefined): string {
    if (v === null || v === undefined) return C_SUBTEXT;
    if (v < 3.0) return C_ROJO;
    if (v < 4.0) return C_AMBAR;
    return C_VERDE;
  }

  etiquetaProm(v: number | null | undefined): string {
    if (v === null || v === undefined) return '—';
    if (v < 3.0) return 'En riesgo';
    if (v < 4.0) return 'Básico';
    return 'Alto';
  }
}
