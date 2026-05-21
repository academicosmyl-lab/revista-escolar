import {
  Component, ChangeDetectionStrategy,
  signal, computed, NgZone, inject, AfterViewInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

export interface Publicacion { titulo: string; anio: string; link: string; }

@Component({
  selector: 'app-docentes-registro',
  imports: [RouterLink, FormsModule],
  templateUrl: './docentes-registro.html',
  styleUrl:    './docentes-registro.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocentesRegistro implements AfterViewInit {

  private api  = inject(ApiService);
  private zone = inject(NgZone);

  /* ── Estado del proceso ─────────────────────────────── */
  enviando   = signal(false);
  enviado    = signal(false);
  errorEnvio = signal('');

  /* ── Foto ───────────────────────────────────────────── */
  fotoPreview  = signal<string | null>(null);
  fotoNombre   = signal('');
  fotoArchivo: File | null = null;

  /* ── Campos principales ─────────────────────────────── */
  nombre      = signal('');
  titulo      = signal('');
  area        = signal('');
  sede        = signal('');
  experiencia = signal('');
  email       = signal('');
  bioCorta    = signal('');
  bioCompleta = signal('');

  /* ── Especialidades (tags) ──────────────────────────── */
  especialidades    = signal<string[]>([]);
  nuevaEspecialidad = signal('');

  /* ── Publicaciones (dinámica) ───────────────────────── */
  publicaciones = signal<Publicacion[]>([]);

  /* ── Presencia digital ──────────────────────────────── */
  web      = signal('');
  linkedin = signal('');
  orcid    = signal('');

  /* ── Contadores ─────────────────────────────────────── */
  bioShortLeft = computed(() => 140 - this.bioCorta().length);
  bioFullLeft  = computed(() => 600 - this.bioCompleta().length);

  /* ── Catálogos ──────────────────────────────────────── */
  readonly areas = [
    'Electrónica',
    'Corte y Confección',
    'Diseño Digital',
    'Medios Audiovisuales',
    'Inglés Comunicativo',
    'Matemáticas',
    'Español y Literatura',
    'Ciencias Naturales',
    'Ciencias Sociales',
    'Educación Física',
    'Tecnología e Informática',
    'Ética y Valores',
    'Artística',
    'Orientación Escolar',
    'Otra',
  ];

  readonly sedes = [
    'Sede Bachillerato',
    'Sede Básica Primaria',
    'Sede Los Sauces',
  ];

  /* ── Animaciones de entrada ─────────────────────────── */
  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      import('motion').then(({ animate, inView }) => {
        // Header: elementos entran secuencialmente
        animate('#regEyebrow',   { opacity:[0,1], y:['20px','0px'] }, { duration:0.6, delay:0.1  });
        animate('#regTitulo',    { opacity:[0,1], y:['28px','0px'] }, { duration:0.7, delay:0.25 });
        animate('#regSubtitulo', { opacity:[0,1], y:['20px','0px'] }, { duration:0.6, delay:0.45 });
        animate('#regFirma',     { opacity:[0,1], y:['16px','0px'] }, { duration:0.5, delay:0.65 });

        // Secciones del form: scroll reveal
        inView('.reg-seccion', (el) => {
          animate(el, { opacity:[0,1], y:['24px','0px'] },
            { duration:0.6, ease:[0.4,0,0.2,1] });
        }, { amount: 0.15 });
      }).catch(() => {});
    });
  }

  /* ── Foto: change ───────────────────────────────────── */
  onFotoChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.procesarFoto(file);
  }

  /* ── Foto: drag & drop ──────────────────────────────── */
  onDragOver(e: DragEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add('dragover');
  }
  onDragLeave(e: DragEvent) {
    (e.currentTarget as HTMLElement).classList.remove('dragover');
  }
  onDrop(e: DragEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file?.type.startsWith('image/')) this.procesarFoto(file);
  }

  private procesarFoto(file?: File) {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      this.errorEnvio.set('La foto no debe superar 4 MB.');
      return;
    }
    this.errorEnvio.set('');
    this.fotoArchivo = file;
    this.fotoNombre.set(file.name);
    const reader = new FileReader();
    reader.onload = e => this.fotoPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  /* ── Especialidades ─────────────────────────────────── */
  agregarEspecialidad() {
    const tag = this.nuevaEspecialidad().trim();
    if (!tag || this.especialidades().length >= 5) return;
    if (this.especialidades().includes(tag)) return;
    this.especialidades.update(a => [...a, tag]);
    this.nuevaEspecialidad.set('');
  }
  quitarEspecialidad(tag: string) {
    this.especialidades.update(a => a.filter(e => e !== tag));
  }
  onTagKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); this.agregarEspecialidad(); }
  }

  /* ── Publicaciones ──────────────────────────────────── */
  agregarPublicacion() {
    this.publicaciones.update(a => [...a, { titulo:'', anio:'', link:'' }]);
  }
  quitarPublicacion(i: number) {
    this.publicaciones.update(a => a.filter((_, j) => j !== i));
  }
  updatePub(i: number, key: keyof Publicacion, val: string) {
    this.publicaciones.update(a => a.map((p, j) => j === i ? { ...p, [key]: val } : p));
  }

  /* ── Validación ─────────────────────────────────────── */
  get formValido(): boolean {
    return (
      this.nombre().trim().length > 2     &&
      this.titulo().trim().length > 2     &&
      this.area() !== ''                  &&
      this.sede() !== ''                  &&
      this.bioCorta().trim().length >= 20 &&
      this.bioShortLeft() >= 0            &&
      this.bioFullLeft()  >= 0
    );
  }

  /* ── Envío ──────────────────────────────────────────── */
  enviar() {
    if (!this.formValido || this.enviando()) return;
    this.errorEnvio.set('');
    this.enviando.set(true);

    const fd = new FormData();
    fd.append('nombre',        this.nombre());
    fd.append('titulo',        this.titulo());
    fd.append('area',          this.area());
    fd.append('sede',          this.sede());
    fd.append('experiencia',   this.experiencia());
    fd.append('email',         this.email());
    fd.append('bioCorta',      this.bioCorta());
    fd.append('bioCompleta',   this.bioCompleta());
    fd.append('especialidades', JSON.stringify(this.especialidades()));
    fd.append('publicaciones',  JSON.stringify(this.publicaciones()));
    fd.append('web',      this.web());
    fd.append('linkedin', this.linkedin());
    fd.append('orcid',    this.orcid());
    if (this.fotoArchivo) fd.append('foto', this.fotoArchivo);

    this.api.postFormData<any>('/perfil/registro-publico', fd).subscribe({
      next:  () => { this.enviado.set(true);  this.enviando.set(false); },
      error: e  => {
        this.errorEnvio.set(
          e.mensaje ?? 'No se pudo enviar. Intenta de nuevo en unos minutos.'
        );
        this.enviando.set(false);
      },
    });
  }
}
