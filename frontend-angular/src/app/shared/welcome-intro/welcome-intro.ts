import {
  AfterViewInit, ChangeDetectionStrategy, Component,
  DestroyRef, ElementRef, NgZone, OnDestroy, PLATFORM_ID,
  ViewChild, inject, signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface Particle {
  x: number; y: number;
  ox: number; oy: number;
  tx: number; ty: number;
  ex: number; ey: number;
  size: number; alpha: number;
  hue: number; twinkle: number; speed: number;
  outline: boolean;  // true = borde del escudo (más brillante)
}

@Component({
  selector: 'app-welcome-intro',
  standalone: true,
  templateUrl: './welcome-intro.html',
  styleUrl: './welcome-intro.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WelcomeIntro implements AfterViewInit, OnDestroy {
  @ViewChild('particleCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly visible     = signal(true);
  readonly showText90  = signal(false);
  readonly showDivider = signal(false);
  readonly showTitle   = signal(false);
  readonly showSub     = signal(false);
  readonly showSkip    = signal(false);
  readonly fadingOut   = signal(false);

  private zone       = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private fillPts:    { x: number; y: number }[] = [];
  private outlinePts: { x: number; y: number }[] = [];
  private W = 0; private H = 0; private dpr = 1;
  private rafId = 0;
  private startTime = 0;
  private timers: number[] = [];

  static shouldShow(): boolean {
    try { return !localStorage.getItem('itis_90_intro'); }
    catch { return false; }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.canvas = this.canvasRef.nativeElement;
    this.ctx    = this.canvas.getContext('2d')!;

    const resizeFn = () => this.onResize();
    const keyFn    = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.zone.run(() => this.dismiss());
    };

    this.onResize();
    this.buildParticles();

    window.addEventListener('resize', resizeFn);
    document.addEventListener('keydown', keyFn);

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', resizeFn);
      document.removeEventListener('keydown', keyFn);
      cancelAnimationFrame(this.rafId);
      this.timers.forEach(clearTimeout);
    });

    this.startTime = performance.now();
    this.zone.runOutsideAngular(() => {
      this.rafId = requestAnimationFrame(() => this.tick());
    });

    this.sched(1200,  () => this.showSkip.set(true));
    this.sched(6800,  () => this.showText90.set(true));
    this.sched(7800,  () => this.showDivider.set(true));
    this.sched(8300,  () => this.showTitle.set(true));
    this.sched(9200,  () => this.showSub.set(true));
    this.sched(13000, () => this.dismiss());
  }

  skip(): void { this.dismiss(); }

  private dismiss(): void {
    if (this.fadingOut()) return;
    this.fadingOut.set(true);
    cancelAnimationFrame(this.rafId);
    this.timers.forEach(clearTimeout);
    try { localStorage.setItem('itis_90_intro', '1'); } catch {}
    this.timers.push(window.setTimeout(() => this.visible.set(false), 900));
  }

  private sched(ms: number, fn: () => void): void {
    this.timers.push(window.setTimeout(() => this.zone.run(fn), ms));
  }

  // ── Canvas setup ──────────────────────────────────────────────────────────

  private onResize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W   = window.innerWidth;
    this.H   = window.innerHeight;
    this.canvas.width  = this.W * this.dpr;
    this.canvas.height = this.H * this.dpr;
    this.canvas.style.width  = `${this.W}px`;
    this.canvas.style.height = `${this.H}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.buildShieldPoints();
  }

  // ── Shield geometry ───────────────────────────────────────────────────────

  private get mobile() { return this.W < 600; }
  private get cx() { return this.W / 2; }
  private get cy() { return this.mobile ? this.H * 0.42 : this.H * 0.45; }
  private get sw() { return this.mobile ? this.W * 0.92 : Math.min(this.W * 0.62, 380); }
  private get sh() { return this.mobile ? this.H * 0.78 : this.sw * 1.25; }

  private buildShieldPoints(): void {
    const { cx, cy, sw, sh } = this;
    this.buildFillPoints(cx, cy, sw, sh);
    this.buildOutlinePoints(cx, cy, sw, sh);
  }

  // Partículas de relleno interior (OffscreenCanvas + isPointInPath)
  private buildFillPoints(cx: number, cy: number, sw: number, sh: number): void {
    const step = this.W < 600 ? 12 : 8;   // paso más fino → más densidad
    const pad  = 4;
    const pts: { x: number; y: number }[] = [];
    const jitter = (v: number) => v + (Math.random() - 0.5) * step * 0.35;

    const makePath = (): Path2D => {
      const p = new Path2D();
      p.moveTo(pad + sw * 0.08, pad);
      p.lineTo(pad + sw * 0.92, pad);
      p.lineTo(pad + sw * 0.92, pad + sh * 0.62);
      p.bezierCurveTo(
        pad + sw * 0.92, pad + sh * 0.84,
        pad + sw * 0.64, pad + sh * 0.96,
        pad + sw * 0.50, pad + sh
      );
      p.bezierCurveTo(
        pad + sw * 0.36, pad + sh * 0.96,
        pad + sw * 0.08, pad + sh * 0.84,
        pad + sw * 0.08, pad + sh * 0.62
      );
      p.closePath();
      return p;
    };

    try {
      const off  = new OffscreenCanvas(Math.ceil(sw) + pad * 2, Math.ceil(sh) + pad * 2);
      const octx = off.getContext('2d')!;
      const path = makePath();
      for (let ly = 0; ly <= sh; ly += step) {
        for (let lx = 0; lx <= sw; lx += step) {
          if (octx.isPointInPath(path, pad + lx, pad + ly)) {
            pts.push({ x: jitter(cx - sw / 2 + lx), y: jitter(cy - sh / 2 + ly) });
          }
        }
      }
    } catch {
      for (let ly = 0; ly <= sh; ly += step) {
        for (let lx = 0; lx <= sw; lx += step) {
          const nx = lx / sw, ny = ly / sh;
          const inside = ny <= 0.62
            ? nx >= 0.08 && nx <= 0.92
            : Math.abs(nx - 0.5) <= 0.42 * (1 - Math.pow((ny - 0.62) / 0.38, 2));
          if (inside) pts.push({ x: jitter(cx - sw / 2 + lx), y: jitter(cy - sh / 2 + ly) });
        }
      }
    }

    this.fillPts = pts;
  }

  // Partículas de contorno — muestreo sobre las curvas bezier del borde
  private buildOutlinePoints(cx: number, cy: number, sw: number, sh: number): void {
    const pts: { x: number; y: number }[] = [];
    const J = 1.5; // jitter muy pequeño para mantener la línea definida
    const j = () => (Math.random() - 0.5) * J;

    const toC = (lx: number, ly: number) => ({
      x: cx - sw / 2 + lx + j(),
      y: cy - sh / 2 + ly + j()
    });

    // Muestrea una línea recta con N pasos
    const line = (x0: number, y0: number, x1: number, y1: number, n: number) => {
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        pts.push(toC(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t));
      }
    };

    // Muestrea una curva bezier cúbica con N pasos
    const bezier = (
      x0: number, y0: number,
      cx1: number, cy1: number,
      cx2: number, cy2: number,
      x1: number, y1: number,
      n: number
    ) => {
      for (let i = 0; i <= n; i++) {
        const t = i / n, u = 1 - t;
        pts.push(toC(
          u*u*u*x0 + 3*u*u*t*cx1 + 3*u*t*t*cx2 + t*t*t*x1,
          u*u*u*y0 + 3*u*u*t*cy1 + 3*u*t*t*cy2 + t*t*t*y1
        ));
      }
    };

    // Borde superior
    line(sw*0.08, 0,       sw*0.92, 0,       Math.ceil(sw * 0.84 / 5));
    // Borde derecho
    line(sw*0.92, 0,       sw*0.92, sh*0.62, Math.ceil(sh * 0.62 / 5));
    // Arco inferior derecho
    bezier(sw*0.92, sh*0.62,  sw*0.92, sh*0.84,  sw*0.64, sh*0.96,  sw*0.50, sh, 48);
    // Arco inferior izquierdo
    bezier(sw*0.50, sh,       sw*0.36, sh*0.96,  sw*0.08, sh*0.84,  sw*0.08, sh*0.62, 48);
    // Borde izquierdo
    line(sw*0.08, sh*0.62,  sw*0.08, 0,       Math.ceil(sh * 0.62 / 5));

    this.outlinePts = pts;
  }

  // ── Particle factory ──────────────────────────────────────────────────────

  private buildParticles(): void {
    const makeP = (sp: { x: number; y: number }, outline: boolean): Particle => {
      const ang  = Math.random() * Math.PI * 2;
      const dist = 150 + Math.random() * Math.max(this.W, this.H) * 0.45;
      const eAng = ang + Math.PI + (Math.random() - 0.5) * 0.9;
      return {
        x: sp.x + Math.cos(ang) * dist, ox: sp.x + Math.cos(ang) * dist,
        y: sp.y + Math.sin(ang) * dist, oy: sp.y + Math.sin(ang) * dist,
        tx: sp.x, ty: sp.y,
        ex: sp.x + Math.cos(eAng) * (200 + Math.random() * 380),
        ey: sp.y + Math.sin(eAng) * (200 + Math.random() * 380),
        // Outline: más grandes, más brillantes, tono más amarillo-blanco
        size:    outline ? 1.2 + Math.random() * 1.6  : 0.6 + Math.random() * 1.8,
        alpha:   outline ? 0.75 + Math.random() * 0.25 : 0.35 + Math.random() * 0.50,
        hue:     outline ? Math.random() * 18 - 5      : Math.random() * 40 - 12,
        twinkle: Math.random() * Math.PI * 2,
        speed:   outline ? 0.65 + Math.random() * 0.6  : 0.45 + Math.random() * 0.8,
        outline
      };
    };

    this.particles = [
      ...this.fillPts.map(sp    => makeP(sp, false)),
      ...this.outlinePts.map(sp => makeP(sp, true))
    ];
  }

  // ── Render loop ───────────────────────────────────────────────────────────

  private tick(): void {
    const now = performance.now();
    const t   = now - this.startTime;
    const ctx = this.ctx;

    const bg = ctx.createRadialGradient(
      this.W / 2, this.H / 2, 0,
      this.W / 2, this.H / 2, Math.max(this.W, this.H) * 0.7
    );
    bg.addColorStop(0,   '#0d0e1a');
    bg.addColorStop(0.6, '#05060a');
    bg.addColorStop(1,   '#020305');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.W, this.H);

    const T0 = 800;   // scatter → converge
    const T1 = 4500;  // converge → formed
    const T2 = 6200;  // formed → explode  (ampliado para que se vea más)
    const T3 = 7900;  // explode end

    // Dibuja fill primero, luego outline (encima) para que brille
    for (const p of this.particles) {
      if (!p.outline) this.drawOne(ctx, p, t, now, T0, T1, T2, T3);
    }
    for (const p of this.particles) {
      if (p.outline)  this.drawOne(ctx, p, t, now, T0, T1, T2, T3);
    }

    // Glow central durante fase formada
    if (t > T1 - 500 && t < T2 + 500) {
      const fade = Math.min((t - (T1 - 500)) / 700, (T2 + 500 - t) / 700, 1);
      this.drawGlow(ctx, this.cx, this.cy, Math.min(this.W * 0.28, 200), fade * 0.20);
    }

    if (t < T3 + 200) {
      this.rafId = requestAnimationFrame(() => this.tick());
    }
  }

  private drawOne(
    ctx: CanvasRenderingContext2D, p: Particle,
    t: number, now: number,
    T0: number, T1: number, T2: number, T3: number
  ): void {
    let px: number, py: number, a: number;

    if (t < T0) {
      px = p.ox; py = p.oy;
      a  = this.easeOut(t / 500) * p.alpha * 0.4;
    } else if (t < T1) {
      const f  = Math.min((t - T0) / (T1 - T0) * p.speed, 1);
      const fc = this.easeInOut(f);
      px = p.ox + (p.tx - p.ox) * fc;
      py = p.oy + (p.ty - p.oy) * fc;
      a  = (0.18 + fc * 0.82) * p.alpha;
    } else if (t < T2) {
      px = p.tx; py = p.ty;
      a  = p.alpha * (Math.sin(now * 0.0026 + p.twinkle) * 0.15 + 0.85);
    } else if (t < T3) {
      const f = this.easeOut((t - T2) / (T3 - T2));
      px = p.tx + (p.ex - p.tx) * f;
      py = p.ty + (p.ey - p.ty) * f;
      a  = p.alpha * (1 - f);
    } else {
      return;
    }

    this.drawParticle(ctx, px, py, p.size, a, p.hue, now, p.twinkle, p.outline);
  }

  private drawParticle(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, size: number, alpha: number,
    hue: number, now: number, twinkle: number, outline: boolean
  ): void {
    const shimmer = Math.sin(now * 0.005 + twinkle) * 0.12 + 0.88;
    const a = Math.max(0, alpha * shimmer);
    if (a < 0.012) return;

    if (outline) {
      // Halo exterior suave (doble halo para outline)
      const haloR = size * 8;
      const halo  = ctx.createRadialGradient(x, y, 0, x, y, haloR);
      halo.addColorStop(0,   `hsla(${50 + hue}, 100%, 95%, ${a * 0.55})`);
      halo.addColorStop(0.4, `hsla(${46 + hue},  98%, 72%, ${a * 0.28})`);
      halo.addColorStop(1,   'transparent');
      ctx.beginPath();
      ctx.arc(x, y, haloR, 0, Math.PI * 2);
      ctx.fillStyle = halo;
      ctx.fill();
    }

    // Glow principal
    const r = size * (outline ? 4.5 : 3.5);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0,    `hsla(${45 + hue}, 100%, 93%, ${a})`);
    g.addColorStop(0.35, `hsla(${42 + hue},  96%, 65%, ${a * 0.55})`);
    g.addColorStop(1,    'transparent');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    // Núcleo brillante
    const coreR = size * (outline ? 0.65 : 0.4);
    ctx.beginPath();
    ctx.arc(x, y, coreR, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${outline ? 58 : 56}, 100%, 98%, ${a})`;
    ctx.fill();
  }

  private drawGlow(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, r: number, alpha: number
  ): void {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0,   `hsla(45, 100%, 72%, ${alpha})`);
    g.addColorStop(0.4, `hsla(40,  90%, 50%, ${alpha * 0.25})`);
    g.addColorStop(1,   'transparent');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
  private easeOut(t: number): number {
    return 1 - Math.pow(1 - Math.min(t, 1), 3);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.timers.forEach(clearTimeout);
  }
}
