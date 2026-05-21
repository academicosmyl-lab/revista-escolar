import { Component, OnInit, AfterViewInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../services/api.service';
import { Noticia } from '../../models';
import { HorizonteSection } from './sections/horizonte-section'; // CAMBIO ARCH-UI (Lote C)

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule, HorizonteSection],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit, AfterViewInit {

  // CAMBIO ARCH-UI: ApiService inyectado para cargar noticias reales del backend
  private api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);

  /* ── Noticias del API real ──────────────────────────── */
  // CAMBIO ARCH-UI: reemplaza noticiasEjemplo (picsum.photos hardcodeado)
  // Signal: un contenedor reactivo — cuando cambia, Angular actualiza la vista automáticamente
  cargandoNoticias = signal(true);
  noticiasHome     = signal<Noticia[]>([]);

  // computed: se recalcula solo cuando noticiasHome() cambia
  noticiaDestacada   = computed(() => this.noticiasHome()[0] ?? null);
  noticiasSecundarias = computed(() => this.noticiasHome().slice(1));

  // Skeletons: array de 4 elementos para mostrar mientras carga
  skeletons = Array(4);

  /* ── Videos institucionales ─────────────────────────── */
  videos: { url: string; safeUrl: SafeResourceUrl | null; titulo: string; colorA: string; colorB: string; playing: boolean; }[] = [
    {
      url: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Freel%2F1194470712637926&show_text=false',
      safeUrl: null, titulo: 'Salida pedagógica Tierra Alta',
      colorA: '#7B1D2C', colorB: '#2a0a10', playing: false,
    },
    {
      url: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Freel%2F909732821901936&show_text=false',
      safeUrl: null, titulo: 'Conmemoración del Día del Síndrome de Down',
      colorA: '#1A5C3A', colorB: '#0a1f14', playing: false,
    },
  ];

  /* ── Partículas doradas hero ────────────────────────── */
  particulas = Array.from({ length: 22 }, (_, i) => ({
    left:  (i * 4.6 + [3,8,1,9,2,7,4,6,0,5,2,8,3,7,1,9,4,6,0,5,3,8][i]) % 97,
    delay: -((i * 0.55) % 9),
    dur:   7 + (i % 5) * 0.7,
    size:  2 + (i % 3),
    op:    0.18 + (i % 5) * 0.07,
  }));

  /* ── Franja docentes B&W ────────────────────────────── */
  docentesSlugs = [
    'luis-sanchez','patricia-diaz','roberto-suarez','elena-pacheco','diana-solano',
    'luz-rios','maria-gomez','carlos-rodriguez','andres-torres','liliana-mosquera',
    'jorge-perez','sandra-rivas','hernando-castillo','rosa-vargas','felipe-mantilla',
  ];

  /* ── Sedes institucionales ───────────────────────────── */
  sedes = [
    { nombre: 'Sede Bachillerato',    tipo: 'Bachillerato Técnico', img: '/inicio/sede-bachillerato.jpg' },
    { nombre: 'Sede Básica Primaria', tipo: 'Básica Primaria',      img: '/inicio/sede-primaria.jpg'     },
    { nombre: 'Sede Los Sauces',      tipo: 'Rural',                img: '/inicio/sede-rural.jpg'        },
  ];

  /* ── Modal Certificado ──────────────────────────────── */
  modalCertificado = signal(false);
  // CAMBIO ARCH-UI (Lote B): certDocumento y certTipo ahora son signals
  // Antes eran variables planas — con OnPush eso puede dejar la vista sin actualizar
  certDocumento = signal('');
  certTipo      = signal('matricula');
  certCargando  = signal(false);
  certError     = signal('');
  certExito     = signal('');

  readonly fbSrc: SafeResourceUrl;

  constructor() {
    // CAMBIO ARCH-UI: fbSrc permanece aquí porque pertenece a la sección Facebook del home
    // mapaSrc se movió a FooterComponent donde corresponde
    this.fbSrc = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Fitifusagasugaoficial&tabs=timeline&width=500&height=680&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false'
    );
    this.videos.forEach(v => {
      v.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(v.url + '&autoplay=1');
    });
  }

  /* ── Ciclo de vida ──────────────────────────────────── */
  ngOnInit() {
    this.cargarNoticiasHome();
  }

  // CAMBIO ARCH-UI: carga las últimas 5 noticias publicadas del backend real
  // SOLO modifica home.ts — NO toca noticias.ts ni la ruta /noticias
  private cargarNoticiasHome() {
    this.cargandoNoticias.set(true);
    this.api.get<any>('/noticias', { estado: 'publicada', limit: 5 }).subscribe({
      next: r => {
        // El backend puede devolver la data en distintos formatos — manejamos ambos
        const raw = r.data ?? r;
        const lista: Noticia[] = Array.isArray(raw)
          ? raw
          : (raw.rows ?? raw.noticias ?? []);
        this.noticiasHome.set(lista);
        this.cargandoNoticias.set(false);
      },
      error: () => {
        // Si el backend no responde, simplemente no mostramos noticias (sin romper la página)
        this.cargandoNoticias.set(false);
      },
    });
  }

  toggleVideo(v: typeof this.videos[0], e: MouseEvent) {
    e.stopPropagation();
    this.videos.forEach(other => { if (other !== v) other.playing = false; });
    v.playing = !v.playing;
  }

  abrirCertificado() {
    this.certDocumento.set('');
    this.certError.set('');
    this.certExito.set('');
    this.certCargando.set(false);
    this.modalCertificado.set(true);
  }

  cerrarCertificado(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.modalCertificado.set(false);
    }
  }

  buscarCertificado() {
    this.certError.set('');
    this.certExito.set('');
    const doc = this.certDocumento().trim();
    if (!doc || doc.length < 6) {
      this.certError.set('Ingresa un número de documento válido (mínimo 6 dígitos).');
      return;
    }
    this.certCargando.set(true);
    setTimeout(() => {
      this.certCargando.set(false);
      this.certError.set('Servicio en implementación. Comunícate con secretaría para tu certificado.');
    }, 1200);
  }

  /* ── Helpers para noticias ──────────────────────────── */
  imagenNoticia(n: Noticia): string | null {
    return n.imagenes?.[0]?.url ?? null;
  }

  altNoticia(n: Noticia): string {
    return n.imagenes?.[0]?.altText ?? n.titulo;
  }

  formatFecha(fecha: string | undefined): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  colorCategoria(n: Noticia): string {
    return (n.categoria as any)?.color ?? '#A94455';
  }

  /* ── Animaciones scroll reveal ───────────────────────── */
  ngAfterViewInit() {
    this.initScrollReveal();
  }

  private initScrollReveal() {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
      }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }
}
