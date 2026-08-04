import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then(m => m.Home),
  },
  {
    path: 'noticias',
    loadComponent: () => import('./pages/noticias/noticias').then(m => m.Noticias),
  },
  {
    path: 'noticias/:id',
    loadComponent: () => import('./pages/noticia-detalle/noticia-detalle').then(m => m.NoticiaDetalle),
  },
  {
    path: 'galeria',
    loadComponent: () => import('./pages/galeria/galeria').then(m => m.Galeria),
  },
  {
    path: 'docentes',
    loadComponent: () => import('./pages/docentes/docentes').then(m => m.Docentes),
  },
  {
    path: 'docentes/registro',
    loadComponent: () => import('./pages/docentes-registro/docentes-registro').then(m => m.DocentesRegistro),
  },
  {
    path: 'sedes',
    loadComponent: () => import('./pages/sedes/sedes').then(m => m.Sedes),
  },
  {
    path: 'nosotros',
    loadComponent: () => import('./pages/nosotros/nosotros').then(m => m.Nosotros),
  },
  {
    path: 'indicadores',
    loadComponent: () => import('./pages/indicadores/indicadores').then(m => m.Indicadores),
  },
  {
    path: 'publicar',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/publicar/publicar').then(m => m.Publicar),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
  },
  {
    path: 'admin',
    canActivate: [roleGuard('ADMIN', 'RECTOR')],
    loadComponent: () => import('./pages/admin/admin').then(m => m.Admin),
  },
  {
    path: 'super-admin',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () => import('./pages/super-admin/super-admin').then(m => m.SuperAdmin),
  },
  {
    path: 'panel',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/panel/panel').then(m => m.Panel),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
