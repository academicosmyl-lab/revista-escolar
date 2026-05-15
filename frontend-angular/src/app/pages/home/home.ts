import { Component, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements AfterViewInit {

  /* ── Contadores ─────────────────────────────────────── */
  contadores = [
    { label: 'Sedes',           valor: 3,    sufijo: '',  actual: 0 },
    { label: 'Docentes',        valor: 50,   sufijo: '+', actual: 0 },
    { label: 'Áreas académicas',valor: 14,   sufijo: '',  actual: 0 },
    { label: 'Estudiantes',     valor: 1000, sufijo: '+', actual: 0 },
  ];

  /* ── Datos de ejemplo ───────────────────────────────── */
  noticiasEjemplo = [
    { id: 1, imgKey: 'NOTICIA_02', categoria: 'Deportes',   titulo: 'Campeones departamentales de atletismo 2026',       fecha: '12 de mayo, 2026' },
    { id: 2, imgKey: 'NOTICIA_03', categoria: 'Ciencia',    titulo: 'Estudiantes ganan olimpiada de matemáticas',         fecha: '8 de mayo, 2026'  },
    { id: 3, imgKey: 'NOTICIA_04', categoria: 'Cultura',    titulo: 'Festival artístico intercolegial sede Bachillerato', fecha: '5 de mayo, 2026'  },
    { id: 4, imgKey: 'NOTICIA_05', categoria: 'Tecnología', titulo: 'Feria de ciencias e innovación técnica 2026',        fecha: '2 de mayo, 2026'  },
  ];

  sedes = [
    { nombre: 'Sede Bachillerato',    tipo: 'Bachillerato Técnico', imgKey: 'SEDE_BACHILLERATO' },
    { nombre: 'Sede Básica Primaria', tipo: 'Básica Primaria',      imgKey: 'SEDE_PRIMARIA'     },
    { nombre: 'Sede Los Sauces',      tipo: 'Rural',                imgKey: 'SEDE_LOS_SAUCES'   },
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

  constructor(private cdr: ChangeDetectorRef) {}

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
    this.initContadores();
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

  private initContadores() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.animarContadores();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );
    const banda = document.querySelector('.estadisticas-banda');
    if (banda) observer.observe(banda);
  }

  private animarContadores() {
    const duracion = 1800;
    const pasos    = 60;
    this.contadores.forEach((c, i) => {
      const delay      = i * 80;
      const incremento = c.valor / pasos;
      let paso = 0;
      setTimeout(() => {
        const intervalo = setInterval(() => {
          paso++;
          const progreso = paso / pasos;
          const ease     = 1 - Math.pow(1 - progreso, 3);
          this.contadores[i].actual = Math.min(Math.round(c.valor * ease), c.valor);
          this.cdr.detectChanges();
          if (paso >= pasos) clearInterval(intervalo);
        }, duracion / pasos);
      }, delay);
    });
  }
}
