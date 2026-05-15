import { Routes } from '@angular/router';
import { Home } from './pages/home/home';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'noticias', loadComponent: () => import('./pages/home/home').then(m => m.Home) },
  { path: '**', redirectTo: '' },
];
