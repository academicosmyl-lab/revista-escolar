import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-recuperar-contrasena',
  imports: [RouterLink, FormsModule],
  templateUrl: './recuperar-contrasena.html',
  styleUrl: './recuperar-contrasena.scss',
})
export class RecuperarContrasena {
  private api = inject(ApiService);

  email    = '';
  cargando = signal(false);
  enviado  = signal(false);
  error    = signal('');

  enviar() {
    this.error.set('');
    if (!this.email) { this.error.set('Ingresa tu correo institucional.'); return; }
    this.cargando.set(true);
    this.api.post<{ ok: boolean }>('/auth/forgot-password', { email: this.email }).subscribe({
      next: () => { this.cargando.set(false); this.enviado.set(true); },
      error: (e) => { this.cargando.set(false); this.error.set(e.mensaje || 'Error al enviar. Intenta de nuevo.'); },
    });
  }
}
