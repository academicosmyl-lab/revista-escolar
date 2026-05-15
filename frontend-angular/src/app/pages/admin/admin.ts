import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { Noticia, Estadisticas } from '../../models';

type NoticiaAdmin = Noticia & {
  autor?: { id: number; nombre: string; email: string; rol: 'ADMIN' | 'RECTOR' | 'COORDINADOR' | 'ORIENTADORA' | 'DOCENTE' | 'PERSONAL' };
  motivoRechazo?: string;
  motivo_rechazo?: string;
};

@Component({
  selector: 'app-admin',
  imports: [RouterLink, FormsModule, SlicePipe],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);

  cargando       = signal(true);
  guardando      = signal(false);
  error          = signal('');
  exito          = signal('');

  pendientes:  NoticiaAdmin[] = [];
  publicadas:  NoticiaAdmin[] = [];
  estadisticas: Partial<Estadisticas> = {};

  // Rechazar modal
  noticiaRechazar: NoticiaAdmin | null = null;
  motivoRechazo = '';

  // Crear usuario
  mostrarFormUsuario = false;
  nuevoUsuario = { nombre: '', email: '', password: '', rol: 'DOCENTE' };

  ngOnInit() {
    this.cargar();
  }

  private cargar() {
    this.cargando.set(true);
    this.api.get<any>('/admin/noticias', { estado: 'pendiente', limite: 50 }).subscribe({
      next: r => {
        this.pendientes = r.noticias ?? [];
        this.cargarPublicadas();
      },
      error: e => {
        this.error.set(e.mensaje || 'No se pudo cargar el panel.');
        this.cargando.set(false);
      },
    });
  }

  private cargarPublicadas() {
    this.api.get<any>('/admin/noticias', { estado: 'publicada', limite: 10 }).subscribe({
      next: r => {
        this.publicadas = r.noticias ?? [];
        this.cargarEstadisticas();
      },
      error: () => this.cargando.set(false),
    });
  }

  private cargarEstadisticas() {
    this.api.get<any>('/admin/estadisticas').subscribe({
      next: r => {
        this.estadisticas = r.estadisticas ?? {};
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  aprobar(n: NoticiaAdmin) {
    this.guardando.set(true);
    this.api.put<any>(`/admin/noticias/${n.id}/aprobar`, {}).subscribe({
      next: () => {
        this.exito.set(`"${n.titulo}" publicada correctamente.`);
        this.guardando.set(false);
        setTimeout(() => this.exito.set(''), 4000);
        this.cargar();
      },
      error: e => {
        this.error.set(e.mensaje || 'No se pudo aprobar la noticia.');
        this.guardando.set(false);
      },
    });
  }

  abrirRechazar(n: NoticiaAdmin) {
    this.noticiaRechazar = n;
    this.motivoRechazo = '';
  }

  confirmarRechazo() {
    if (!this.noticiaRechazar || !this.motivoRechazo.trim()) return;
    this.guardando.set(true);
    this.api.put<any>(`/admin/noticias/${this.noticiaRechazar.id}/rechazar`, { motivo: this.motivoRechazo }).subscribe({
      next: () => {
        this.exito.set(`Noticia rechazada. El docente será notificado.`);
        this.noticiaRechazar = null;
        this.motivoRechazo = '';
        this.guardando.set(false);
        setTimeout(() => this.exito.set(''), 4000);
        this.cargar();
      },
      error: e => {
        this.error.set(e.mensaje || 'No se pudo rechazar.');
        this.guardando.set(false);
      },
    });
  }

  crearUsuario() {
    const u = this.nuevoUsuario;
    if (!u.nombre || !u.email || !u.password) return;
    this.guardando.set(true);
    this.api.post<any>('/admin/usuarios', u).subscribe({
      next: () => {
        this.exito.set(`Usuario ${u.nombre} creado. Se enviará correo de bienvenida.`);
        this.nuevoUsuario = { nombre: '', email: '', password: '', rol: 'DOCENTE' };
        this.mostrarFormUsuario = false;
        this.guardando.set(false);
        setTimeout(() => this.exito.set(''), 5000);
      },
      error: e => {
        this.error.set(e.mensaje || 'No se pudo crear el usuario.');
        this.guardando.set(false);
      },
    });
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    const ahora = Date.now();
    const diff = Math.floor((ahora - d.getTime()) / 60000);
    if (diff < 60) return `hace ${diff} min`;
    if (diff < 1440) return `hace ${Math.floor(diff / 60)} h`;
    return `hace ${Math.floor(diff / 1440)} días`;
  }

  badgeEstado(estado: string) {
    return estado === 'publicada' ? 'adm-badge-verde' :
           estado === 'pendiente' ? 'adm-badge-ambar' : 'adm-badge-rojo';
  }
}
