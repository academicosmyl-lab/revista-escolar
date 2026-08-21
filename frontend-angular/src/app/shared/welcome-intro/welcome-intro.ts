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
  private shieldPts: { x: number; y: number }[] = [];
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

  private get cx() { return this.W / 2; }
  private get cy() { return this.H * 0.45; }
  private get sw() { return Math.min(this.W * 0.50, 260); }
  private get sh() { return this.sw * 1.25; }

  private buildShieldPoints(): void {
    const { cx, cy, sw, sh } = this;
    const step = this.W < 600 ? 14 : 10;
    const pad  = 4;
    const pts: { x: number; y: number }[] = [];

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

    const jitter = (v: number) => v + (Math.random() - 0.5) * step * 0.4;

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
      // Analytical fallback for older Safari
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

    this.shieldPts = pts;
  }

  // ── Particle factory ──────────────────────────────────────────────────────

  private buildParticles(): void {
    this.particles = this.shieldPts.map(sp => {
      const ang  = Math.random() * Math.PI * 2;
      const dist = 160 + Math.random() * Math.max(this.W, this.H) * 0.45;
      const eAng = ang + Math.PI + (Math.random() - 0.5) * 0.8;
      return {
        x: sp.x + Math.cos(ang) * dist, ox: sp.x + Math.cos(ang) * dist,
        y: sp.y + Math.sin(ang) * dist, oy: sp.y + Math.sin(ang) * dist,
        tx: sp.x, ty: sp.y,
        ex: sp.x + Math.cos(eAng) * (180 + Math.random() * 350),
        ey: sp.y + Math.sin(eAng) * (180 + Math.random() * 350),
        size:    0.8 + Math.random() * 2.2,
        alpha:   0.45 + Math.random() * 0.55,
        hue:     Math.random() * 40 - 12,
        twinkle: Math.random() * Math.PI * 2,
        speed:   0.5 + Math.random() * 0.8
      };
    });
  }

  // ── Render loop ───────────────────────────────────────────────────────────

  private tick(): void {
    const now = performance.now();
    const t   = now - this.startTime;
    const ctx = this.ctx;

    // Background
    const bg = ctx.createRadialGradient(
      this.W / 2, this.H / 2, 0,
      this.W / 2, this.H / 2, Math.max(this.W, this.H) * 0.7
    );
    bg.addColorStop(0,   '#0d0e1a');
    bg.addColorStop(0.6, '#05060a');
    bg.addColorStop(1,   '#020305');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.W, this.H);

    const T0 = 800;   // scatter → converge start
    const T1 = 4500;  // converge → formed
    const T2 = 6000;  // formed → explode
    const T3 = 7700;  // explode end

    for (const p of this.particles) {
      let px: number, py: number, a: number;

      if (t < T0) {
        px = p.ox; py = p.oy;
        a  = this.easeOut(t / 500) * p.alpha * 0.45;
      } else if (t < T1) {
        const f  = Math.min((t - T0) / (T1 - T0) * p.speed, 1);
        const fc = this.easeInOut(f);
        px = p.ox + (p.tx - p.ox) * fc;
        py = p.oy + (p.ty - p.oy) * fc;
        a  = (0.2 + fc * 0.8) * p.alpha;
      } else if (t < T2) {
        px = p.tx; py = p.ty;
        a  = p.alpha * (Math.sin(now * 0.0026 + p.twinkle) * 0.18 + 0.82);
      } else if (t < T3) {
        const f = this.easeOut((t - T2) / (T3 - T2));
        px = p.tx + (p.ex - p.tx) * f;
        py = p.ty + (p.ey - p.ty) * f;
        a  = p.alpha * (1 - f);
      } else {
        continue;
      }

      this.drawParticle(ctx, px, py, p.size, a, p.hue, now, p.twinkle);
    }

    // Center glow during formed phase
    if (t > T1 - 500 && t < T2 + 500) {
      const fade = Math.min((t - (T1 - 500)) / 700, (T2 + 500 - t) / 700, 1);
      this.drawGlow(ctx, this.cx, this.cy, Math.min(this.W * 0.28, 200), fade * 0.22);
    }

    if (t < T3 + 200) {
      this.rafId = requestAnimationFrame(() => this.tick());
    }
  }

  private drawParticle(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, size: number, alpha: number,
    hue: number, now: number, twinkle: number
  ): void {
    const shimmer = Math.sin(now * 0.005 + twinkle) * 0.12 + 0.88;
    const a = Math.max(0, alpha * shimmer);
    if (a < 0.015) return;

    const r = size * 3.5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0,    `hsla(${45 + hue}, 100%, 92%, ${a})`);
    g.addColorStop(0.35, `hsla(${42 + hue},  95%, 64%, ${a * 0.52})`);
    g.addColorStop(1,    'transparent');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    // Bright core
    ctx.beginPath();
    ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(56, 100%, 98%, ${a})`;
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
