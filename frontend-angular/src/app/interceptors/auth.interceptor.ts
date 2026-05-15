import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

const RUTAS_PUBLICAS = ['/auth/login', '/noticias', '/sedes', '/categorias', '/health', '/perfil/docentes', '/noticias-externas'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth  = inject(AuthService);
  const token = auth.getToken();

  const esPublica = RUTAS_PUBLICAS.some(r => req.url.includes(r));
  if (!token || esPublica) return next(req);

  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  }));
};
