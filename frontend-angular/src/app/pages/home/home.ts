// CAMBIO ARCH-UI: motion.js — animaciones revolucionarias con scroll/inView/stagger
import { Component, OnInit, AfterViewInit, signal, computed, inject, ChangeDetectionStrategy, ChangeDetectorRef, NgZone } from '@angular/core';
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
  private api       = inject(ApiService);
  private sanitizer = inject(DomSanitizer);
  private cdr       = inject(ChangeDetectorRef);
  private zone      = inject(NgZone);

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

  /* ── Sección equipo docente — dos filas marquee ────── */
  docentesFila1 = [
    { slug: 'luis-sanchez',      nombre: 'Luis Sánchez',       area: 'Electrónica'         },
    { slug: 'patricia-diaz',     nombre: 'Patricia Díaz',      area: 'Español y Literatura' },
    { slug: 'roberto-suarez',    nombre: 'Roberto Suárez',     area: 'Matemáticas'          },
    { slug: 'elena-pacheco',     nombre: 'Elena Pacheco',      area: 'Diseño Digital'       },
    { slug: 'diana-solano',      nombre: 'Diana Solano',       area: 'Inglés Comunicativo'  },
    { slug: 'luz-rios',          nombre: 'Luz Ríos',           area: 'Ciencias Naturales'   },
    { slug: 'maria-gomez',       nombre: 'María Gómez',        area: 'Corte y Confección'   },
    { slug: 'carlos-rodriguez',  nombre: 'Carlos Rodríguez',   area: 'Educación Física'     },
  ];

  docentesFila2 = [
    { slug: 'andres-torres',     nombre: 'Andrés Torres',      area: 'Medios Audiovisuales' },
    { slug: 'liliana-mosquera',  nombre: 'Liliana Mosquera',   area: 'Matemáticas'          },
    { slug: 'jorge-perez',       nombre: 'Jorge Pérez',        area: 'Tecnología e Inf.'    },
    { slug: 'sandra-rivas',      nombre: 'Sandra Rivas',       area: 'Ciencias Sociales'    },
    { slug: 'hernando-castillo', nombre: 'Hernando Castillo',  area: 'Electrónica'          },
    { slug: 'rosa-vargas',       nombre: 'Rosa Vargas',        area: 'Inglés Comunicativo'  },
    { slug: 'felipe-mantilla',   nombre: 'Felipe Mantilla',    area: 'Diseño Digital'       },
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
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargandoNoticias.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  toggleVideo(v: typeof this.videos[0], e: MouseEvent) {
    e.stopPropagation();
    this.videos.forEach(other => { if (other !== v) other.playing = false; });
    v.playing = !v.playing;
    this.cdr.markForCheck();
  }

  cerrarVideo(v: typeof this.videos[0], e: MouseEvent) {
    e.stopPropagation();
    v.playing = false;
    this.cdr.markForCheck();
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

  /* ── Animaciones revolucionarias con motion.js ────────── */
  // CAMBIO ARCH-UI: motion.js (framer-motion/dom) maneja todas las animaciones
  // Se carga de forma dinámica para reducir el bundle inicial
  ngAfterViewInit() {
    // Corre todo fuera de la zona de Angular → Angular no ejecuta
    // change detection en cada frame de animación (mucho más eficiente)
    this.zone.runOutsideAngular(() => {
      // importación dinámica: motion solo se descarga cuando el home carga
      // .catch(): si el import falla (red, error), todo sigue visible sin animaciones
      import('motion').then(({ animate, inView, scroll, stagger }) => {
        this.initScrollProgress(scroll);
        this.initScrollReveal();
        this.initHeroTitleReveal(animate, stagger);
        this.initMagneticButtons();
        this.initHeroParallax(scroll);
        this.initStatsCountUp(animate, inView);
        this.initBadgeRotativo();
      }).catch(() => {
        this.initScrollReveal();
        this.initBadgeRotativo();
      });
    });
  }

  // ── 1. Barra de progreso de scroll ─────────────────────
  // Escala la barra en X según qué tan abajo está el usuario (0% = arriba, 100% = abajo)
  private initScrollProgress(scroll: Function) {
    const bar = document.getElementById('scrollProgress');
    if (!bar) return;
    scroll((info: any) => {
      bar.style.transform = `scaleX(${info.y.progress})`;
    });
  }

  // ── 2. Scroll reveal con IntersectionObserver ──────────
  // Añade .visible a cualquier elemento con .reveal al entrar al viewport
  private initScrollReveal() {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
      }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  // ── 3. Hero: entrada letra por letra + scramble ────────
  // Nivel 2: cada CARÁCTER del título entra con rotación individual
  // El eyebrow hace "scramble": letras aleatorias → texto real (efecto hacker)
  private initHeroTitleReveal(animate: Function, stagger: Function) {
    const eyebrow = document.getElementById('heroEyebrow');
    const lema    = document.getElementById('heroLema');
    const btns    = document.getElementById('heroBtns');

    // EFECTO SCRAMBLE en el eyebrow: letras aleatorizadas que se resuelven al texto real
    if (eyebrow) this.textScramble(eyebrow, 0.15);

    // Línea 1 "Instituto Técnico": letra por letra con rotación (efecto dramático)
    // Línea 2 "Industrial": entra completa (necesario para que el shimmer CSS funcione)
    const inners = document.querySelectorAll<HTMLElement>('.ht-inner');
    inners.forEach((inner, lineIndex) => {
      const esAcento = inner.classList.contains('hero-titulo-acento');

      if (esAcento) {
        // "Industrial" — entra como bloque (preserva el gradiente CSS animado)
        animate(inner,
          { y: ['115%', '0%'], opacity: [0, 1] },
          { duration: 0.85, delay: 0.4 + lineIndex * 0.28, ease: [0.16, 1, 0.3, 1] }
        );
      } else {
        // Otras líneas: cada carácter entra individualmente con rotación
        const chars = this.splitChars(inner);
        if (!chars.length) return;
        animate(
          chars,
          { y: ['115%', '0%'], opacity: [0, 1], rotate: [-10, 0] },
          { delay: stagger(0.04, { startDelay: 0.4 + lineIndex * 0.28 }), duration: 0.6, ease: [0.16, 1, 0.3, 1] }
        );
      }
    });

    // Lema — entra con blur que se disipa (efecto "foco")
    if (lema) {
      animate(lema,
        { opacity: [0, 1], y: ['18px', '0px'], filter: ['blur(6px)', 'blur(0px)'] },
        { duration: 1.0, delay: 1.25, ease: [0.22, 1, 0.36, 1] }
      );
    }

    // Botones — escalan desde 90% con bounce
    if (btns) {
      animate(btns,
        { opacity: [0, 1], y: ['22px', '0px'], scale: [0.88, 1] },
        { duration: 0.75, delay: 1.55, ease: [0.34, 1.56, 0.64, 1] }
      );
    }
  }

  // ── Helper: descompone texto en <span> por carácter ────
  // Necesario para animar letra por letra con motion.js
  // Los espacios se preservan como   (no-break space visible)
  private splitChars(el: HTMLElement): HTMLElement[] {
    const text = el.textContent ?? '';
    el.innerHTML = '';
    const chars: HTMLElement[] = [];

    for (const char of text) {
      const span = document.createElement('span');
      span.style.display = 'inline-block';
      if (char === ' ') {
        // Espacio: visible, no animado
        span.textContent = ' ';
      } else {
        span.textContent = char;
        chars.push(span); // solo letras reales se animan
      }
      el.appendChild(span);
    }
    return chars;
  }

  // ── Helper: efecto scramble en un elemento de texto ────
  // Muestra letras aleatorias que se "resuelven" al texto real de izquierda a derecha
  private textScramble(el: HTMLElement, delaySeconds = 0) {
    const POOL  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ·—·';
    const final = el.textContent ?? '';
    let frame   = 0;
    const totalFrames = final.length * 3; // 3 frames aleatorios por carácter

    setTimeout(() => {
      const id = setInterval(() => {
        el.textContent = final
          .split('')
          .map((char, i) => {
            if (char === ' ') return ' ';
            // Una vez que el "cursor" llegó a esta posición, queda fijo
            if (i < Math.floor(frame / 3)) return final[i];
            return POOL[Math.floor(Math.random() * POOL.length)];
          })
          .join('');

        if (++frame > totalFrames) {
          el.textContent = final; // asegura el texto final exacto
          clearInterval(id);
        }
      }, 28); // ~35 fps para que el scramble sea veloz pero legible
    }, delaySeconds * 1000);
  }

  // ── 4. Botones magnéticos ──────────────────────────────
  // El botón "sigue" el cursor — efecto imán que lo hace sentir vivo
  private initMagneticButtons() {
    const FUERZA = 0.32; // qué tan fuerte sigue el cursor (0–1)

    document.querySelectorAll<HTMLElement>('.btn-magnetic').forEach(btn => {
      btn.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = btn.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width  / 2) * FUERZA;
        const y = (e.clientY - rect.top  - rect.height / 2) * FUERZA;
        btn.style.transform    = `translate(${x}px, ${y}px)`;
        btn.style.transition   = 'transform 0.08s ease';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform  = 'translate(0,0)';
        btn.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
      });
    });
  }

  // ── 5. Parallax en el fondo del hero ───────────────────
  // La imagen de fondo se mueve más lento que el scroll → da sensación de profundidad
  private initHeroParallax(scroll: Function) {
    const hero = document.querySelector<HTMLElement>('.hero-section');
    if (!hero) return;

    scroll((info: any) => {
      const yCurrent = info.y.current;
      // Solo aplica mientras el hero está visible (antes de llegar a la siguiente sección)
      if (yCurrent < window.innerHeight * 1.2) {
        hero.style.backgroundPositionY = `calc(35% + ${yCurrent * 0.22}px)`;
      }
    });
  }

  // ── 6. Contador animado en estadísticas ───────────────
  // Al hacer scroll hasta los stats, los números cuentan de 0 al valor real
  private initStatsCountUp(animate: Function, inView: Function) {
    const statEls = document.querySelectorAll<HTMLElement>('[data-count]');

    statEls.forEach(el => {
      const target = parseInt(el.dataset['count'] ?? '0', 10);
      const suffix = el.dataset['suffix'] ?? '';
      let animado  = false;

      // inView: observa el elemento — cuando entra al viewport, dispara el conteo
      inView(el, () => {
        if (animado) return;
        animado = true;

        // Formatea con separador de miles para números >= 1000
        const fmt = (v: number) =>
          v >= 1000 ? v.toLocaleString('es-CO') : String(v);

        animate(0, target, {
          duration: target > 500 ? 2.2 : 1.5,
          ease: [0.0, 0.9, 0.57, 1.0],  // ease-out agresivo
          onUpdate: (latest: number) => {
            el.textContent = fmt(Math.round(latest)) + suffix;
          },
          onComplete: () => {
            el.textContent = fmt(target) + suffix;
          },
        });
      }, { amount: 0.8 });
    });
  }

  // ── 7. Badge rotativo — texto circular girando ─────────
  // Animación CSS pura — pero la activa motion para sincronizar con scroll
  private initBadgeRotativo() {
    const badge = document.querySelector<HTMLElement>('.badge-rotativo');
    if (!badge) return;

    let angle  = 0;
    let rafId  = 0;
    let paused = false;

    const rotar = () => {
      if (!paused) {
        angle = (angle + 0.4) % 360;
        badge.style.transform = `rotate(${angle}deg)`;
      }
      rafId = requestAnimationFrame(rotar);
    };
    rafId = requestAnimationFrame(rotar);

    // Pausa al hover para permitir leer el texto
    badge.addEventListener('mouseenter', () => { paused = true; });
    badge.addEventListener('mouseleave', () => { paused = false; });
  }

}
