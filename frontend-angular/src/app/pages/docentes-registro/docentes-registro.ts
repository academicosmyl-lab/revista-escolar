import {
  Component, OnInit, AfterViewInit,
  signal, computed, inject,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface Publicacion { titulo: string; anio: number | null; link: string; }
interface TextosMejorados { titulo: string; bioCorta: string; bioCompleta: string; observaciones?: string | null; }

@Component({
  selector: 'app-docentes-registro',
  imports: [RouterLink, FormsModule],
  templateUrl: './docentes-registro.html',
  styleUrl:    './docentes-registro.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocentesRegistro implements OnInit, AfterViewInit {

  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  // ── Opciones ────────────────────────────────────────────
  readonly roles = [
    { value: 'RECTOR',      label: 'Rector / Rectora' },
    { value: 'COORDINADOR', label: 'Coordinador / Coordinadora' },
    { value: 'ORIENTADORA', label: 'Orientador / Orientadora' },
    { value: 'DOCENTE',     label: 'Docente' },
    { value: 'PERSONAL',    label: 'Personal / Servicios Generales' },
  ];

  readonly sedes = ['Sede Principal', 'Ciudadela', 'Divino Niño'];

  readonly areas = [
    'Matemáticas', 'Ciencias Naturales', 'Física', 'Química',
    'Lengua Castellana', 'Inglés', 'Ciencias Sociales', 'Historia y Geografía',
    'Educación Artística', 'Educación Física', 'Tecnología e Informática',
    'Electrónica Industrial', 'Electricidad', 'Mecánica Industrial',
    'Sistemas', 'Diseño', 'Emprendimiento', 'Filosofía', 'Ética',
    'Religión', 'Orientación Escolar', 'Educación Especial',
  ];

  // ── Campos principales ───────────────────────────────────
  rol         = signal('');
  fotoFile    = signal<File | null>(null);
  fotoPreview = signal<string | null>(null);
  nombre      = signal('');
  titulo      = signal('');
  email       = signal('');
  area        = signal('');
  sede        = signal('');
  experiencia = signal<number | null>(null);

  // ── Historia ────────────────────────────────────────────
  bioCorta    = signal('');
  bioCompleta = signal('');

  // ── Especialidades ──────────────────────────────────────
  especialidades    = signal<string[]>([]);
  nuevaEspecialidad = signal('');

  // ── Publicaciones ───────────────────────────────────────
  publicaciones = signal<Publicacion[]>([]);

  // ── Redes ───────────────────────────────────────────────
  web      = signal('');
  linkedin = signal('');
  orcid    = signal('');

  // ── Estado formulario ───────────────────────────────────
  enviando   = signal(false);
  enviado    = signal(false);
  errorEnvio = signal('');

  // ── IA — mejora de texto ────────────────────────────────
  mejorandoTexto       = signal(false);
  mostrandoComparacion = signal(false);
  textosMejorados      = signal<TextosMejorados | null>(null);
  iaError              = signal('');

  // ── Visibilidad condicional por rol ─────────────────────
  mostrarArea           = computed(() => this.rol() === 'DOCENTE');
  mostrarEspecialidades = computed(() => ['RECTOR','COORDINADOR','ORIENTADORA','DOCENTE'].includes(this.rol()));
  mostrarPublicaciones  = computed(() => ['RECTOR','COORDINADOR','DOCENTE'].includes(this.rol()));
  mostrarRedes          = computed(() => ['RECTOR','COORDINADOR','ORIENTADORA','DOCENTE'].includes(this.rol()));
  esPersonal            = computed(() => this.rol() === 'PERSONAL');
  rolSeleccionado       = computed(() => !!this.rol());

  // ── Contadores ──────────────────────────────────────────
  bioShortLeft = computed(() => 140 - this.bioCorta().length);
  bioFullLeft  = computed(() => 600 - this.bioCompleta().length);

  // ── Validación por rol ──────────────────────────────────
  get formValido(): boolean {
    if (!this.rol())                         return false;
    if (this.nombre().trim().length < 3)     return false;
    if (!this.sede())                        return false;
    if (this.rol() !== 'PERSONAL') {
      if (this.titulo().trim().length < 3)   return false;
      if (this.bioCorta().trim().length < 20) return false;
    }
    if (this.rol() === 'DOCENTE' && !this.area()) return false;
    return true;
  }

  ngOnInit() {}

  ngAfterViewInit() {
    try {
      const { animate, inView } = (window as any).Motion ?? {};
      if (!animate || !inView) return;
      animate('#regEyebrow',   { opacity: [0,1], y: [20,0] }, { duration: 0.6, delay: 0.1 });
      animate('#regTitulo',    { opacity: [0,1], y: [30,0] }, { duration: 0.7, delay: 0.25 });
      animate('#regSubtitulo', { opacity: [0,1], y: [20,0] }, { duration: 0.6, delay: 0.4 });
      animate('#regFirma',     { opacity: [0,1], y: [15,0] }, { duration: 0.5, delay: 0.55 });
      inView('.reg-seccion', (el: Element) => {
        animate(el, { opacity: [0,1], y: [28,0] }, { duration: 0.55 });
      }, { margin: '0px 0px -60px 0px' });
    } catch { /* motion no disponible */ }
  }

  // ══════════════════════════════════════════════════════
  //  NORMALIZACIÓN (Capa 1 — sin IA)
  // ══════════════════════════════════════════════════════

  private tituloCase(valor: string): string {
    const min = new Set(['de','del','la','las','los','y','e','o','a','en','con','sin','por']);
    return valor.trim().replace(/\s+/g, ' ')
      .split(' ')
      .map((p, i) => {
        const l = p.toLowerCase();
        return (i === 0 || !min.has(l)) ? l.charAt(0).toUpperCase() + l.slice(1) : l;
      }).join(' ');
  }

  private capitalizarOraciones(valor: string): string {
    return valor.trim().replace(/\s+/g, ' ')
      .replace(/(^|[.!?]\s+)([a-záéíóúüñ])/gi, (_: string, sep: string, c: string) => sep + c.toUpperCase())
      .replace(/^([a-záéíóúüñ])/i, (c: string) => c.toUpperCase());
  }

  onBlurNombre()      { this.nombre.set(this.tituloCase(this.nombre())); }
  onBlurTitulo()      { this.titulo.set(this.tituloCase(this.titulo())); }
  onBlurBioCorta()    { this.bioCorta.set(this.capitalizarOraciones(this.bioCorta())); }
  onBlurBioCompleta() { this.bioCompleta.set(this.capitalizarOraciones(this.bioCompleta())); }
  onBlurEmail()       { this.email.set(this.email().trim().toLowerCase()); }
  onBlurOrcid() {
    const d = this.orcid().replace(/[^0-9Xx]/g, '').toUpperCase();
    if (d.length === 16) this.orcid.set([0,4,8,12].map(i => d.slice(i, i+4)).join('-'));
  }

  // ══════════════════════════════════════════════════════
  //  IA — MEJORA DE TEXTO (Capa 2)
  // ══════════════════════════════════════════════════════

  revisarConIA() {
    this.iaError.set('');
    this.onBlurNombre(); this.onBlurTitulo();
    this.onBlurBioCorta(); this.onBlurBioCompleta();
    this.mejorandoTexto.set(true);

    this.api.post<TextosMejorados>('/formulario/mejorar-texto', {
      nombre:      this.nombre(),
      titulo:      this.titulo(),
      bioCorta:    this.bioCorta(),
      bioCompleta: this.bioCompleta(),
      rol:         this.rol(),
    }).subscribe({
      next: r => {
        this.textosMejorados.set(r);
        this.mostrandoComparacion.set(true);
        this.mejorandoTexto.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.iaError.set('La revisión automática no está disponible ahora. Puedes enviar tu perfil de todas formas.');
        this.mejorandoTexto.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  aceptarMejora() {
    const m = this.textosMejorados();
    if (!m) return;
    if (m.titulo)       this.titulo.set(m.titulo);
    if (m.bioCorta)     this.bioCorta.set(m.bioCorta);
    if (m.bioCompleta)  this.bioCompleta.set(m.bioCompleta);
    this.mostrandoComparacion.set(false);
    this.textosMejorados.set(null);
    this.cdr.markForCheck();
  }

  rechazarMejora() {
    this.mostrandoComparacion.set(false);
    this.textosMejorados.set(null);
  }

  // ══════════════════════════════════════════════════════
  //  FOTO
  // ══════════════════════════════════════════════════════
  onFotoChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.procesarFoto(file);
  }

  procesarFoto(file: File) {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { this.errorEnvio.set('La foto no puede superar 5 MB'); return; }
    this.fotoFile.set(file);
    const reader = new FileReader();
    reader.onload = e => { this.fotoPreview.set(e.target?.result as string); this.cdr.markForCheck(); };
    reader.readAsDataURL(file);
  }

  onDragOver(e: DragEvent)  { e.preventDefault(); (e.currentTarget as HTMLElement).classList.add('dragover'); }
  onDragLeave(e: DragEvent) { (e.currentTarget as HTMLElement).classList.remove('dragover'); }
  onDrop(e: DragEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('dragover');
    const file = e.dataTransfer?.files[0];
    if (file) this.procesarFoto(file);
  }

  // ══════════════════════════════════════════════════════
  //  ESPECIALIDADES
  // ══════════════════════════════════════════════════════
  agregarEspecialidad() {
    const v = this.nuevaEspecialidad().trim();
    if (!v || this.especialidades().includes(v) || this.especialidades().length >= 5) return;
    this.especialidades.update(arr => [...arr, v]);
    this.nuevaEspecialidad.set('');
  }
  quitarEspecialidad(tag: string) { this.especialidades.update(arr => arr.filter(t => t !== tag)); }
  onTagKey(e: KeyboardEvent) { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); this.agregarEspecialidad(); } }

  // ══════════════════════════════════════════════════════
  //  PUBLICACIONES
  // ══════════════════════════════════════════════════════
  agregarPublicacion() { this.publicaciones.update(arr => [...arr, { titulo: '', anio: null, link: '' }]); }
  quitarPublicacion(i: number) { this.publicaciones.update(arr => arr.filter((_, idx) => idx !== i)); }
  updatePub(i: number, campo: keyof Publicacion, valor: string | number) {
    this.publicaciones.update(arr => arr.map((p, idx) => idx === i ? { ...p, [campo]: valor } : p));
  }

  // ══════════════════════════════════════════════════════
  //  ENVIAR
  // ══════════════════════════════════════════════════════
  enviar() {
    this.errorEnvio.set('');
    if (!this.formValido) { this.errorEnvio.set('Completa los campos obligatorios antes de continuar.'); return; }
    this.enviando.set(true);

    const fd = new FormData();
    fd.append('rol',         this.rol());
    fd.append('nombre',      this.nombre());
    fd.append('titulo',      this.titulo());
    fd.append('email',       this.email());
    fd.append('area',        this.area());
    fd.append('sede',        this.sede());
    fd.append('bioCorta',    this.bioCorta());
    fd.append('bioCompleta', this.bioCompleta());
    fd.append('web',         this.web());
    fd.append('linkedin',    this.linkedin());
    fd.append('orcid',       this.orcid());
    if (this.experiencia() !== null) fd.append('experiencia', String(this.experiencia()));
    if (this.especialidades().length) fd.append('especialidades', JSON.stringify(this.especialidades()));
    if (this.publicaciones().length)  fd.append('publicaciones',  JSON.stringify(this.publicaciones()));
    if (this.fotoFile()) fd.append('foto', this.fotoFile()!);

    this.api.postFormData<any>('/perfil/registro-publico', fd).subscribe({
      next:  () => { this.enviado.set(true);  this.enviando.set(false); this.cdr.markForCheck(); },
      error: e  => { this.errorEnvio.set(e.mensaje ?? 'Error al enviar. Intenta de nuevo.'); this.enviando.set(false); this.cdr.markForCheck(); },
    });
  }
}
