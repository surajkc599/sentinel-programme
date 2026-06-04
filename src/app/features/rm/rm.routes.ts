import { Routes } from '@angular/router';

export const RM_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./rm.component').then((m) => m.RmComponent),
  },
];
