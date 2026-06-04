import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'rm',
    loadChildren: () => import('./features/rm/rm.routes').then((m) => m.RM_ROUTES),
  },
  {
    path: 'compliance',
    loadChildren: () =>
      import('./features/compliance/compliance.routes').then((m) => m.COMPLIANCE_ROUTES),
  },
  {
    path: 'auditor',
    loadChildren: () => import('./features/auditor/auditor.routes').then((m) => m.AUDITOR_ROUTES),
  },
  {
    path: '',
    redirectTo: 'rm',
    pathMatch: 'full',
  },
];
