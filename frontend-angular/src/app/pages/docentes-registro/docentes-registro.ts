import {
  Component, OnInit, OnDestroy, AfterViewInit,
  signal, computed, inject,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { BackNavigationUtil } from '../../utils/back-navigation.util';

type ModoInicio = '' | 'nuevo' | 'buscando' | 'editando';

interface Publicacion { titulo: string; anio: number | null; link: string; }
interface TextosMejorados { titulo: string; bioCorta: string; bioCompleta: string; observaciones?: string | null; }

@Component({
  selector: 'app-docentes-registro',
  imports: [RouterLink, FormsModule],
  templateUrl: './docentes-registro.html',
  styleUrl:    './docentes-registro.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocentesRegistro implements OnInit, AfterViewInit, OnDestroy {

  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  // ── Opciones ────────────────────────────────────────────
  // Cada cargo tiene su propio value único.
  // Los valores del grupo "apoyo" comienzan con "P_" — se normalizan a 'PERSONAL' al enviar.
  readonly roles = [
    // ── Equipo académico y directivo ──
    { value: 'RECTOR',        label: 'Rector',                           grupo: 'directivo' },
    { value: 'COORDINADOR',   label: 'Coordinador / Coordinadora',      grupo: 'directivo' },
    { value: 'ORIENTADORA',   label: 'Orientador / Orientadora',        grupo: 'directivo' },
    { value: 'DOCENTE',       label: 'Docente',                         grupo: 'academico' },
    // ── Equipo de apoyo institucional ──
    { value: 'P_SECRETARIA',  label: 'Secretaría / Administración',     grupo: 'apoyo' },
    { value: 'P_TECNOLOGIA',  label: 'Tecnología e Informática',        grupo: 'apoyo' },
    { value: 'P_CAFETERIA',   label: 'Cafetería y Restaurante Escolar', grupo: 'apoyo' },
    { value: 'P_ASEO',        label: 'Aseo y Mantenimiento',            grupo: 'apoyo' },
    { value: 'P_VIGILANCIA',  label: 'Vigilancia y Portería',           grupo: 'apoyo' },
    { value: 'P_OTROS',       label: 'Otros servicios institucionales', grupo: 'apoyo' },
  ];

  // Los values del grupo apoyo comienzan con 'P_'
  private readonly ROLES_APOYO = new Set([
    'P_SECRETARIA','P_TECNOLOGIA','P_CAFETERIA','P_ASEO','P_VIGILANCIA','P_OTROS',
  ]);

  readonly sedes = ['Sede Bachillerato', 'Sede Primaria', 'Sede Los Suaces'];

  // Cargadas desde la API en ngOnInit — se actualiza cuando alguien agrega "Otra"
  areas = signal<string[]>([]);

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

  // ── Área — "Otra" ────────────────────────────────────────
  otraArea = signal('');

  // ── Especialidades ──────────────────────────────────────
  especialidades    = signal<string[]>([]);
  nuevaEspecialidad = signal('');

  // ── Publicaciones ───────────────────────────────────────
  publicaciones    = signal<Publicacion[]>([]);
  sinPublicaciones = signal(false);

  // ── Redes ───────────────────────────────────────────────
  web      = signal('');
  linkedin = signal('');
  orcid    = signal('');

  // ── Estado formulario ───────────────────────────────────
  enviando   = signal(false);
  enviado    = signal(false);
  errorEnvio = signal('');

  // ── Flujo nuevo / ya registrado ─────────────────────────
  modoInicio     = signal<ModoInicio>('');
  emailBusqueda  = signal('');
  solicitudId    = signal<number | null>(null);
  buscandoPerfil = signal(false);
  errorBusqueda  = signal('');

  // Manejo del botón Atrás del browser (ver utils/back-navigation.util.ts)
  private backNav!: BackNavigationUtil<ModoInicio>;

  // ── IA — mejora de texto ────────────────────────────────
  mejorandoTexto       = signal(false);
  mostrandoComparacion = signal(false);
  textosMejorados      = signal<TextosMejorados | null>(null);
  iaError              = signal('');

  // ── Visibilidad condicional por rol ─────────────────────
  esPersonal            = computed(() => this.ROLES_APOYO.has(this.rol()));
  rolSeleccionado       = computed(() => !!this.rol());
  // Normaliza el rol para el backend: P_SECRETARIA → PERSONAL, etc.
  rolBackend            = computed(() => this.esPersonal() ? 'PERSONAL' : this.rol());
  // Etiqueta legible del cargo de apoyo (para guardarlo como "título" en el perfil)
  cargoApoyo            = computed(() => this.roles.find(r => r.value === this.rol())?.label ?? '');

  mostrarArea           = computed(() => this.rol() === 'DOCENTE');
  mostrarOtraArea       = computed(() => this.area() === 'Otra');
  // Publicaciones: solo roles académicos con producción intelectual
  mostrarPublicaciones  = computed(() => ['RECTOR','COORDINADOR','DOCENTE'].includes(this.rol()));
  // Especialidades/habilidades y redes: TODOS los roles (personal también tiene destrezas y puede tener LinkedIn)
  mostrarEspecialidades = computed(() => !!this.rol());
  mostrarRedes          = computed(() => !!this.rol());

  // Roles del equipo directivo/académico (muestran bio académica, titulo, área)
  esAcademico           = computed(() => !this.esPersonal());

  // ── Contadores ──────────────────────────────────────────
  bioShortLeft = computed(() => 140 - this.bioCorta().length);


  // ── Validación por rol ──────────────────────────────────
  get formValido(): boolean {
    if (!this.rol())                         return false;
    if (this.nombre().trim().length < 3)     return false;
    if (!this.sede())                        return false;
    if (this.esPersonal()) {
      // Personal de apoyo: bioCorta es opcional — no bloqueamos envío
    } else {
      // Roles académicos: título + bio obligatorios
      if (this.titulo().trim().length < 3)   return false;
      if (this.bioCorta().trim().length < 20) return false;
    }
    if (this.rol() === 'DOCENTE') {
      if (!this.area()) return false;
      if (this.area() === 'Otra' && !this.otraArea().trim()) return false;
    }
    return true;
  }

  ngOnInit() {
    // ── Back navigation ──────────────────────────────────────
    // Cada transición de paso hace pushState — el botón Atrás del browser
    // desanda esos pasos antes de salir de la página.
    this.backNav = new BackNavigationUtil<ModoInicio>(
      '',
      (modo) => {
        this.modoInicio.set(modo);
        this.errorBusqueda.set('');
        this.cdr.markForCheck();
      },
    );

    // ── Cargar áreas ─────────────────────────────────────────
    this.api.get<string[]>('/areas').subscribe({
      next:  lista => this.areas.set([...lista, 'Otra']),
      error: ()    => this.areas.set([
        'Artística','Ciencias Naturales','Ciencias Sociales','Corte y Confección',
        'Diseño Digital','Educación Física','Electricidad','Electrónica',
        'Emprendimiento','Español y Literatura','Ética y Valores','Filosofía',
        'Inglés Comunicativo','Matemáticas','Mecánica Industrial','Medios Audiovisuales',
        'Orientación Escolar','Química','Religión','Sistemas','Tecnología e Informática','Otra',
      ]),
    });
  }

  ngOnDestroy() {
    this.backNav.destroy();
  }

  ngAfterViewInit() {
    try {
      const { animate, inView } = (window as any).Motion ?? {};
      if (!animate || !inView) return;
      animate('#regEyebrow',   { opacity: [0,1], y: [20,0] }, { duration: 0.6, delay: 0.1 });
      animate('#regTitulo',    { opacity: [0,1], y: [30,0] }, { duration: 0.7, delay: 0.25 });
      animate('#regSubtitulo', { opacity: [0,1], y: [20,0] }, { duration: 0.6, delay: 0.4 });
      animate('#regFirma',     { opacity: [0,1], y: [15,0] }, { duration: 0.5, delay: 0.55 });
      // Solo observa secciones existentes — las dinámicas (@if) aparecen directo
      inView('.reg-seccion', (el: Element) => {
        animate(el, { opacity: [0,1], y: [28,0] }, { duration: 0.55 });
      }, { margin: '0px 0px -60px 0px' });
    } catch (e) { /* motion no disponible — secciones visibles por CSS */ }
  }

  // ══════════════════════════════════════════════════════
  //  FLUJO NUEVO / YA REGISTRADO
  // ══════════════════════════════════════════════════════

  irANuevo() {
    this.modoInicio.set('nuevo');
    this.solicitudId.set(null);
    this.backNav.push('nuevo');        // ← registrar en historial del browser
  }

  irABuscando() {
    this.modoInicio.set('buscando');
    this.errorBusqueda.set('');
    this.emailBusqueda.set('');
    this.backNav.push('buscando');     // ← registrar en historial del browser
  }

  irAEleccion() {
    // Usa history.back() — respeta el stack y desanda exactamente un paso
    this.backNav.goBack();
  }

  buscarPerfil() {
    const em = this.emailBusqueda().trim().toLowerCase();
    if (!em) { this.errorBusqueda.set('Escribe tu email para continuar.'); return; }
    this.buscandoPerfil.set(true);
    this.errorBusqueda.set('');

    this.api.get<any>('/perfil/registro-publico/buscar', { email: em }).subscribe({
      next: data => {
        this.cargarDatos(data.solicitud);
        this.modoInicio.set('editando');
        this.backNav.push('editando');   // ← registrar en historial del browser
        this.buscandoPerfil.set(false);
        this.cdr.markForCheck();
      },
      error: e => {
        this.errorBusqueda.set(
          e.status === 404
            ? 'No encontramos ningún registro con ese email. ¿Quieres crear un perfil nuevo?'
            : 'Error al buscar. Intenta de nuevo.'
        );
        this.buscandoPerfil.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  private cargarDatos(s: any) {
    this.solicitudId.set(s.id);
    this.nombre.set(s.nombre ?? '');
    this.email.set(s.email ?? '');
    this.sede.set(s.sede ?? '');
    this.experiencia.set(s.experiencia ?? null);
    this.bioCorta.set(s.bio_corta ?? '');
    this.bioCompleta.set(s.bio_completa ?? '');
    this.web.set(s.web ?? '');
    this.linkedin.set(s.linkedin ?? '');
    this.orcid.set(s.orcid ?? '');
    this.especialidades.set(Array.isArray(s.especialidades) ? s.especialidades : []);
    this.publicaciones.set(Array.isArray(s.publicaciones) ? s.publicaciones : []);
    if (s.foto_url) this.fotoPreview.set(s.foto_url);

    // Restaurar rol: PERSONAL + label del cargo → P_ value del select
    if (s.rol === 'PERSONAL') {
      const match = this.roles.find(r => r.grupo === 'apoyo' && r.label === s.titulo);
      this.rol.set(match?.value ?? 'P_SECRETARIA');
      this.titulo.set('');
    } else {
      this.rol.set(s.rol ?? '');
      this.titulo.set(s.titulo ?? '');
      this.area.set(s.area ?? '');
    }
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
  onBlurOtraArea()    { this.otraArea.set(this.tituloCase(this.otraArea())); }
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

    // Área final: si eligió "Otra", usamos otraArea
    const areaFinal = this.mostrarOtraArea() ? this.otraArea().trim() : this.area();

    // Título final: personal de apoyo usa su cargo como título profesional
    const tituloFinal = this.esPersonal() ? this.cargoApoyo() : this.titulo();

    const fd = new FormData();
    fd.append('rol',         this.rolBackend());
    fd.append('nombre',      this.nombre());
    fd.append('titulo',      tituloFinal);
    fd.append('email',       this.email());
    fd.append('area',        areaFinal);
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

    const id = this.solicitudId();
    const obs = id
      ? this.api.putFormData<any>(`/perfil/registro-publico/${id}`, fd)
      : this.api.postFormData<any>('/perfil/registro-publico', fd);

    obs.subscribe({
      next:  () => { this.enviado.set(true);  this.enviando.set(false); this.cdr.markForCheck(); },
      error: e  => { this.errorEnvio.set(e.mensaje ?? 'Error al enviar. Intenta de nuevo.'); this.enviando.set(false); this.cdr.markForCheck(); },
    });
  }
}
