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
  outline: boolean;
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

    this.sched(1000,  () => this.showSkip.set(true));
    this.sched(5200,  () => this.showText90.set(true));
    this.sched(6100,  () => this.showDivider.set(true));
    this.sched(6600,  () => this.showTitle.set(true));
    this.sched(7500,  () => this.showSub.set(true));
    this.sched(12000, () => this.dismiss());
  }

  skip(): void { this.dismiss(); }

  private dismiss(): void {
    if (this.fadingOut()) return;
    this.fadingOut.set(true);
    cancelAnimationFrame(this.rafId);
    this.timers.forEach(clearTimeout);
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

  private get mobile() { return this.W < 600; }
  private get cx()     { return this.W / 2; }
  private get cy()     { return this.mobile ? this.H * 0.42 : this.H * 0.45; }
  private get sw()     { return this.mobile ? this.W * 0.88 : Math.min(this.W * 0.62, 380); }
  private get sh()     { return this.mobile ? this.H * 0.74 : this.sw * 1.25; }

  // ── Shield points ─────────────────────────────────────────────────────────

  private buildShieldPoints(): void {
    const { cx, cy, sw, sh } = this;
    this.buildFillPoints(cx, cy, sw, sh);
    this.buildOutlinePoints(cx, cy, sw, sh);
  }

  private buildFillPoints(cx: number, cy: number, sw: number, _sh: number): void {
    const r    = sw / 2;
    const step = this.mobile ? 22 : 10;
    const pts: { x: number; y: number }[] = [];
    const j = (v: number) => v + (Math.random() - 0.5) * step * 0.4;

    for (let dy = -r; dy <= r; dy += step) {
      for (let dx = -r; dx <= r; dx += step) {
        if (dx * dx + dy * dy <= r * r) {
          pts.push({ x: j(cx + dx), y: j(cy + dy) });
        }
      }
    }
    this.fillPts = pts;
  }

  private buildOutlinePoints(cx: number, cy: number, sw: number, _sh: number): void {
    const r      = sw / 2;
    const numPts = this.mobile ? 120 : 220;
    const J      = 1.5;
    const j      = () => (Math.random() - 0.5) * J;
    const pts: { x: number; y: number }[] = [];

    for (let i = 0; i <= numPts; i++) {
      const angle = (i / numPts) * Math.PI * 2;
      pts.push({
        x: cx + Math.cos(angle) * r + j(),
        y: cy + Math.sin(angle) * r + j()
      });
    }
    this.outlinePts = pts;
  }

  // ── Particles ─────────────────────────────────────────────────────────────

  private buildParticles(): void {
    const makeP = (sp: { x: number; y: number }, outline: boolean): Particle => {
      const ang  = Math.random() * Math.PI * 2;
      const dist = 140 + Math.random() * Math.max(this.W, this.H) * 0.44;
      const eAng = ang + Math.PI + (Math.random() - 0.5) * 0.9;
      return {
        x: sp.x + Math.cos(ang) * dist, ox: sp.x + Math.cos(ang) * dist,
        y: sp.y + Math.sin(ang) * dist, oy: sp.y + Math.sin(ang) * dist,
        tx: sp.x, ty: sp.y,
        ex: sp.x + Math.cos(eAng) * (180 + Math.random() * 360),
        ey: sp.y + Math.sin(eAng) * (180 + Math.random() * 360),
        size:    outline ? 1.6 + Math.random() * 1.8  : 1.0 + Math.random() * 2.0,
        alpha:   outline ? 0.90 + Math.random() * 0.10 : 0.60 + Math.random() * 0.40,
        hue:     outline ? Math.random() * 16 - 4      : Math.random() * 35 - 10,
        twinkle: Math.random() * Math.PI * 2,
        speed:   outline ? 0.7 + Math.random() * 0.5   : 0.5 + Math.random() * 0.8,
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

    const bg = ctx.createRadialGradient(this.W/2, this.H/2, 0, this.W/2, this.H/2, Math.max(this.W, this.H) * 0.7);
    bg.addColorStop(0,   '#0d0e1a');
    bg.addColorStop(0.6, '#05060a');
    bg.addColorStop(1,   '#020305');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.W, this.H);

    const T0 = 400;
    const T1 = 2800;
    const T2 = 5800;
    const T3 = 7200;

    // Fill → luego outline encima
    for (const p of this.particles) {
      if (!p.outline) this.drawOne(ctx, p, t, now, T0, T1, T2, T3);
    }
    for (const p of this.particles) {
      if (p.outline)  this.drawOne(ctx, p, t, now, T0, T1, T2, T3);
    }

    // Trazo canvas del contorno: garantiza visibilidad en cualquier dispositivo
    if (t > T1 - 200 && t < T2 + 300) {
      const fade = Math.min((t - (T1 - 200)) / 500, (T2 + 300 - t) / 500, 1);
      this.drawShieldStroke(ctx, fade);
    }

    // Glow central
    if (t > T1 - 400 && t < T2 + 400) {
      const fade = Math.min((t - (T1 - 400)) / 600, (T2 + 400 - t) / 600, 1);
      this.drawGlow(ctx, this.cx, this.cy, Math.min(this.W * 0.28, 200), fade * 0.18);
    }

    if (t < T3 + 200) {
      this.rafId = requestAnimationFrame(() => this.tick());
    }
  }

  // Trazo real del escudo — siempre visible, independiente del rendimiento
  private drawShieldStroke(ctx: CanvasRenderingContext2D, alpha: number): void {
    const { cx, cy, sw } = this;
    const r     = sw / 2;
    const pulse = Math.sin(performance.now() * 0.003) * 0.12 + 0.88;
    const a     = alpha * pulse;

    ctx.save();
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(212, 148, 20, ${a * 0.35})`;
    ctx.lineWidth   = 18;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(230, 175, 50, ${a * 0.75})`;
    ctx.lineWidth   = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 235, 140, ${a})`;
    ctx.lineWidth   = 2;
    ctx.stroke();

    ctx.restore();
  }

  private drawOne(
    ctx: CanvasRenderingContext2D, p: Particle,
    t: number, now: number,
    T0: number, T1: number, T2: number, T3: number
  ): void {
    let px: number, py: number, a: number;

    if (t < T0) {
      px = p.ox; py = p.oy;
      a  = this.easeOut(t / 400) * p.alpha * 0.5;
    } else if (t < T1) {
      const f  = Math.min((t - T0) / (T1 - T0) * p.speed, 1);
      const fc = this.easeInOut(f);
      px = p.ox + (p.tx - p.ox) * fc;
      py = p.oy + (p.ty - p.oy) * fc;
      a  = (0.2 + fc * 0.8) * p.alpha;
    } else if (t < T2) {
      px = p.tx; py = p.ty;
      a  = p.alpha * (Math.sin(now * 0.003 + p.twinkle) * 0.15 + 0.85);
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
    const sh   = Math.sin(now * 0.005 + twinkle) * 0.1 + 0.9;
    const a    = Math.max(0, alpha * sh);
    if (a < 0.015) return;

    // En móvil: skip halo para ahorrar rendimiento
    if (outline && !this.mobile) {
      const hr = size * 8;
      const hg = ctx.createRadialGradient(x, y, 0, x, y, hr);
      hg.addColorStop(0,   `hsla(${50 + hue}, 100%, 96%, ${a * 0.5})`);
      hg.addColorStop(0.4, `hsla(${46 + hue},  98%, 74%, ${a * 0.25})`);
      hg.addColorStop(1,   'transparent');
      ctx.beginPath();
      ctx.arc(x, y, hr, 0, Math.PI * 2);
      ctx.fillStyle = hg;
      ctx.fill();
    }

    const r = size * (outline ? 4.5 : 3);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0,    `hsla(${45 + hue}, 100%, 94%, ${a})`);
    g.addColorStop(0.4,  `hsla(${42 + hue},  96%, 66%, ${a * 0.5})`);
    g.addColorStop(1,    'transparent');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, size * (outline ? 0.7 : 0.5), 0, Math.PI * 2);
    ctx.fillStyle = `hsla(56, 100%, 98%, ${a})`;
    ctx.fill();
  }

  private drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number): void {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0,   `hsla(45, 100%, 72%, ${alpha})`);
    g.addColorStop(0.4, `hsla(40,  90%, 50%, ${alpha * 0.2})`);
    g.addColorStop(1,   'transparent');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  private easeInOut(t: number): number { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
  private easeOut(t: number):   number { return 1 - Math.pow(1 - Math.min(t, 1), 3); }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.timers.forEach(clearTimeout);
  }
}
