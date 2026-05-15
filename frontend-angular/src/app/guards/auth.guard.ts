import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Rol } from '../models';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.loggedIn()) return true;
  return router.createUrlTree(['/login']);
};

export const roleGuard = (...roles: Rol[]): CanActivateFn => () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.loggedIn() && auth.hasRole(...roles)) return true;
  if (!auth.loggedIn()) return router.createUrlTree(['/login']);
  return router.createUrlTree(['/']);
};
