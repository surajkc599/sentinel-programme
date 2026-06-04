import { Routes } from '@angular/router';

export const AUDITOR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./auditor.component').then((m) => m.AuditorComponent),
  },
];
