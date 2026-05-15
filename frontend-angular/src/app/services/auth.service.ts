import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { LoginRequest, LoginResponse, UsuarioAuth, Rol } from '../models';

const TOKEN_KEY = 'its_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api    = inject(ApiService);
  private router = inject(Router);

  private _usuario = signal<UsuarioAuth | null>(this.recuperarUsuario());

  readonly usuario    = this._usuario.asReadonly();
  readonly loggedIn   = computed(() => this._usuario() !== null);
  readonly rol        = computed(() => this._usuario()?.rol ?? null);
  readonly esAdmin    = computed(() => this._usuario()?.rol === 'ADMIN');
  readonly esRector   = computed(() => ['ADMIN','RECTOR'].includes(this._usuario()?.rol ?? ''));
  readonly esDocente  = computed(() => this._usuario() !== null);

  login(credenciales: LoginRequest): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('/auth/login', credenciales).pipe(
      tap(resp => {
        localStorage.setItem(TOKEN_KEY, resp.token);
        this._usuario.set(resp.usuario);
      })
    );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    this._usuario.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  hasRole(...roles: Rol[]): boolean {
    const r = this._usuario()?.rol;
    return r ? roles.includes(r) : false;
  }

  private recuperarUsuario(): UsuarioAuth | null {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem(TOKEN_KEY);
        return null;
      }
      return {
        id:      payload.id,
        nombre:  payload.nombre,
        email:   payload.email,
        rol:     payload.rol,
        sedeId:  payload.sedeId,
      };
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
  }
}
