import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { Noticia, Categoria, PerfilDocente } from '../../models';

@Component({
  selector: 'app-panel',
  imports: [RouterLink, FormsModule, SlicePipe],
  templateUrl: './panel.html',
  styleUrl: './panel.scss',
})
export class Panel implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);

  cargando       = signal(true);
  guardando      = signal(false);
  error          = signal('');
  exito          = signal('');

  noticias:   Noticia[]   = [];
  categorias: Categoria[] = [];
  perfil:     Partial<PerfilDocente> = {};

  mostrarFormNoticia = false;
  nueva = {
    titulo:      '',
    contenido:   '',
    categoria_id: '',
    usar_ia:     true,
  };

  get perfilFotoUrl(): string | null { return (this.perfil as any)?.foto_url ?? (this.perfil as any)?.fotoUrl ?? null; }

  get publicadas()  { return this.noticias.filter(n => n.estado === 'publicada'); }
  get pendientes()  { return this.noticias.filter(n => n.estado === 'pendiente'); }
  get rechazadas()  { return this.noticias.filter(n => n.estado === 'rechazada'); }

  ngOnInit() {
    this.cargar();
    this.cargarCategorias();
    this.cargarPerfil();
  }

  private cargar() {
    this.cargando.set(true);
    this.api.get<any>('/panel/noticias').subscribe({
      next: r => {
        this.noticias = r.noticias ?? [];
        this.cargando.set(false);
      },
      error: e => {
        this.error.set(e.mensaje || 'No se pudo cargar el panel.');
        this.cargando.set(false);
      },
    });
  }

  private cargarCategorias() {
    this.api.get<any>('/categorias').subscribe({
      next: r => { this.categorias = r.data ?? []; },
      error: () => {},
    });
  }

  private cargarPerfil() {
    this.api.get<any>('/perfil/mio/datos').subscribe({
      next: r => { this.perfil = r.perfil ?? {}; },
      error: () => {},
    });
  }

  crearNoticia() {
    if (!this.nueva.titulo.trim() || !this.nueva.contenido.trim()) return;
    this.guardando.set(true);
    this.error.set('');

    const body: Record<string, unknown> = {
      titulo:      this.nueva.titulo,
      contenido:   this.nueva.contenido,
      usar_ia:     this.nueva.usar_ia,
    };
    if (this.nueva.categoria_id) body['categoria_id'] = this.nueva.categoria_id;

    this.api.post<any>('/noticias', body).subscribe({
      next: r => {
        const msg = this.nueva.usar_ia
          ? 'Noticia enviada. La IA la mejoró y está pendiente de revisión.'
          : 'Noticia enviada. Está pendiente de revisión por el administrador.';
        this.exito.set(msg);
        this.nueva = { titulo: '', contenido: '', categoria_id: '', usar_ia: true };
        this.mostrarFormNoticia = false;
        this.guardando.set(false);
        this.cargar();
        setTimeout(() => this.exito.set(''), 6000);
      },
      error: e => {
        this.error.set(e.mensaje || 'No se pudo crear la noticia.');
        this.guardando.set(false);
      },
    });
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  estadoLabel(estado: string): string {
    return { publicada: 'Publicada', pendiente: 'En revisión', rechazada: 'Rechazada' }[estado] ?? estado;
  }

  estadoClass(estado: string): string {
    return { publicada: 'pan-badge-verde', pendiente: 'pan-badge-ambar', rechazada: 'pan-badge-rojo' }[estado] ?? '';
  }

  imagen(n: Noticia): string | null {
    return (n.imagenes as any)?.[0]?.url ?? null;
  }

  motivoRechazoDe(n: Noticia): string | null {
    return (n as any).motivo_rechazo ?? (n as any).motivoRechazo ?? null;
  }

  categoriaColor(n: Noticia): string {
    return (n.categoria as any)?.color ?? '#7B1D2C';
  }

  categoriaNombre(n: Noticia): string {
    return (n.categoria as any)?.nombre ?? '';
  }
}
