import { Injectable, signal, computed } from '@angular/core';

export type Role = 'rm' | 'compliance' | 'auditor';

export const ROLE_LABELS: Record<Role, string> = {
  rm: 'Relationship Manager',
  compliance: 'Compliance',
  auditor: 'Auditor',
};

export const RM_NAMES = [
  'A. Kovacs',
  'H. Lindqvist',
  'J. Morrison',
  'L. Okonkwo',
  'M. Ferrara',
  'R. Patel',
  'S. Beaumont',
  'T. Nakamura',
];

export const RM_BRANCHES: Record<string, string> = {
  'A. Kovacs': 'Mayfair',
  'H. Lindqvist': 'Edinburgh',
  'J. Morrison': 'Canary Wharf',
  'L. Okonkwo': 'Manchester',
  'M. Ferrara': 'Canary Wharf',
  'R. Patel': 'Mayfair',
  'S. Beaumont': 'Edinburgh',
  'T. Nakamura': 'Manchester',
};

@Injectable({ providedIn: 'root' })
export class UserContextService {
  readonly activeRole = signal<Role>('rm');
  readonly activeRm = signal<string>(RM_NAMES[0]);

  readonly isRmRole = computed(() => this.activeRole() === 'rm');
  readonly activeBranch = computed(() => RM_BRANCHES[this.activeRm()] ?? 'Mayfair');

  setRole(role: Role): void {
    this.activeRole.set(role);
  }

  setActiveRm(name: string): void {
    this.activeRm.set(name);
  }
}
