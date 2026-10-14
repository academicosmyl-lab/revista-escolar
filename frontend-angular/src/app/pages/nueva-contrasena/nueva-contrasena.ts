import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-nueva-contrasena',
  imports: [RouterLink, FormsModule],
  templateUrl: './nueva-contrasena.html',
  styleUrl: './nueva-contrasena.scss',
})
export class NuevaContrasena implements OnInit {
  private api    = inject(ApiService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  token      = '';
  password   = '';
  confirmar  = '';
  cargando   = signal(false);
  guardado   = signal(false);
  error      = signal('');

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) this.error.set('Enlace inválido. Solicita uno nuevo desde la pantalla de inicio de sesión.');
  }

  guardar() {
    this.error.set('');
    if (!this.password || !this.confirmar) { this.error.set('Completa los dos campos.'); return; }
    if (this.password.length < 6) { this.error.set('La contraseña debe tener mínimo 6 caracteres.'); return; }
    if (this.password !== this.confirmar) { this.error.set('Las contraseñas no coinciden.'); return; }

    this.cargando.set(true);
    this.api.post<{ ok: boolean }>('/auth/reset-password', { token: this.token, password: this.password }).subscribe({
      next: () => { this.cargando.set(false); this.guardado.set(true); setTimeout(() => this.router.navigate(['/login']), 3000); },
      error: (e) => { this.cargando.set(false); this.error.set(e.mensaje || 'Error al guardar. El enlace puede haber expirado.'); },
    });
  }
}
