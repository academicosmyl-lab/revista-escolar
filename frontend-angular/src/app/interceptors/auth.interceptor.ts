import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth  = inject(AuthService);
  const token = auth.getToken();

  // Sin token o es el login mismo: pasar sin header
  if (!token || req.url.includes('/auth/login')) return next(req);

  // Adjuntar token en todas las demás peticiones
  // (los endpoints públicos simplemente lo ignoran)
  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  }));
};
