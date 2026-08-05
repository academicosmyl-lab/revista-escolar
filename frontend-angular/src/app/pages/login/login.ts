import { Component, inject, signal } from '@angular/core';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private auth   = inject(AuthService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  email    = '';
  password = '';
  cargando = signal(false);
  error    = signal('');

  ngOnInit() {
    if (this.auth.loggedIn()) this.redirigirPorRol();
  }

  ingresar() {
    this.error.set('');
    if (!this.email || !this.password) {
      this.error.set('Ingresa tu correo y contraseña.');
      return;
    }
    this.cargando.set(true);
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => this.redirigirPorRol(),
      error: (e) => {
        this.cargando.set(false);
        this.error.set(e.mensaje || 'Credenciales incorrectas.');
      },
    });
  }

  private redirigirPorRol() {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
      return;
    }
    const rol = this.auth.rol();
    if (rol === 'ADMIN' || rol === 'RECTOR') {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/panel']);
    }
  }
}
