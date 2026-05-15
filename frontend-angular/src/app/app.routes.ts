import { Routes } from '@angular/router';

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
    path: 'galeria',
    loadComponent: () => import('./pages/galeria/galeria').then(m => m.Galeria),
  },
  {
    path: 'docentes',
    loadComponent: () => import('./pages/docentes/docentes').then(m => m.Docentes),
  },
  {
    path: 'sedes',
    loadComponent: () => import('./pages/sedes/sedes').then(m => m.Sedes),
  },
  {
    path: 'indicadores',
    loadComponent: () => import('./pages/indicadores/indicadores').then(m => m.Indicadores),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
