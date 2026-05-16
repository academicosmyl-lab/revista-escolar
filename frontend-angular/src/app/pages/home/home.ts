import { Component, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements AfterViewInit {

  /* ── Videos institucionales ─────────────────────────── */
  videos: { url: string; safeUrl: SafeResourceUrl | null; titulo: string; colorA: string; colorB: string; hovered: boolean; }[] = [
    {
      url: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Freel%2F909732821901936&show_text=false',
      safeUrl: null, titulo: 'Salida pedagógica Tierra Alta',
      colorA: '#7B1D2C', colorB: '#2a0a10', hovered: false,
    },
    {
      url: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Freel%2F909732821901936&show_text=false',
      safeUrl: null, titulo: 'Conmemoración del Día del Síndrome de Down',
      colorA: '#1A5C3A', colorB: '#0a1f14', hovered: false,
    },
  ];

  modalVideoActivo = false;
  videoModalUrl: SafeResourceUrl | null = null;

  /* ── Franja docentes B&W ────────────────────────────── */
  docentesSlugs = [
    'luis-sanchez','patricia-diaz','roberto-suarez','elena-pacheco','diana-solano',
    'luz-rios','maria-gomez','carlos-rodriguez','andres-torres','liliana-mosquera',
    'jorge-perez','sandra-rivas','hernando-castillo','rosa-vargas','felipe-mantilla',
  ];

  /* ── Datos de ejemplo ───────────────────────────────── */
  noticiasEjemplo = [
    { id: 1, img: 'https://picsum.photos/seed/its-dep/800/450',  categoria: 'Deportes',   titulo: 'Campeones departamentales de atletismo 2026',       fecha: '12 de mayo, 2026' },
    { id: 2, img: 'https://picsum.photos/seed/its-mat/800/450',  categoria: 'Ciencia',    titulo: 'Estudiantes ganan olimpiada de matemáticas',         fecha: '8 de mayo, 2026'  },
    { id: 3, img: 'https://picsum.photos/seed/its-art/800/450',  categoria: 'Cultura',    titulo: 'Festival artístico intercolegial sede Bachillerato', fecha: '5 de mayo, 2026'  },
    { id: 4, img: 'https://picsum.photos/seed/its-tec/800/450',  categoria: 'Tecnología', titulo: 'Feria de ciencias e innovación técnica 2026',        fecha: '2 de mayo, 2026'  },
  ];

  sedes = [
    { nombre: 'Sede Bachillerato',    tipo: 'Bachillerato Técnico', img: 'https://picsum.photos/seed/its-sede1/800/500' },
    { nombre: 'Sede Básica Primaria', tipo: 'Básica Primaria',      img: 'https://picsum.photos/seed/its-sede2/800/500' },
    { nombre: 'Sede Los Sauces',      tipo: 'Rural',                img: 'https://picsum.photos/seed/its-sede3/800/500' },
  ];

  linksFooter = [
    { label: 'Inicio',   path: '/'          },
    { label: 'Revista',  path: '/noticias'  },
    { label: 'Galería',  path: '/galeria'   },
    { label: 'Docentes', path: '/docentes'  },
    { label: 'Sedes',    path: '/sedes'     },
  ];

  /* ── Modal Certificado ──────────────────────────────── */
  modalCertificado = false;
  certDocumento    = '';
  certTipo         = 'matricula';
  certCargando     = false;
  certError        = '';
  certExito        = '';

  constructor(private cdr: ChangeDetectorRef, private sanitizer: DomSanitizer) {
    this.videos.forEach(v => {
      v.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(v.url + '&autoplay=1');
    });
  }

  abrirVideo(url: string) {
    this.videoModalUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.modalVideoActivo = true;
  }

  cerrarModalVideo(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('video-modal-overlay')) {
      this.modalVideoActivo = false;
      this.videoModalUrl = null;
    }
  }

  abrirCertificado() {
    this.certDocumento = '';
    this.certError     = '';
    this.certExito     = '';
    this.certCargando  = false;
    this.modalCertificado = true;
  }

  cerrarCertificado(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.modalCertificado = false;
    }
  }

  buscarCertificado() {
    this.certError = '';
    this.certExito = '';
    if (!this.certDocumento.trim() || this.certDocumento.trim().length < 6) {
      this.certError = 'Ingresa un número de documento válido (mínimo 6 dígitos).';
      return;
    }
    this.certCargando = true;
    /* Aquí irá la llamada al backend en FASE 1 */
    setTimeout(() => {
      this.certCargando = false;
      this.certError = 'Servicio en implementación. Comunícate con secretaría para tu certificado.';
      this.cdr.detectChanges();
    }, 1200);
  }

  /* ── Animaciones ────────────────────────────────────── */
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
