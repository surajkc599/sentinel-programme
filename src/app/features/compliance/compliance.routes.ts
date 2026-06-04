import { Routes } from '@angular/router';

export const COMPLIANCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./compliance.component').then((m) => m.ComplianceComponent),
  },
];
