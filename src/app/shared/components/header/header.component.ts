import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';

import {
  UserContextService,
  Role,
  ROLE_LABELS,
  RM_NAMES,
} from '@core/services/user-context.service';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatToolbarModule, MatMenuModule, MatIconModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  protected readonly userContext = inject(UserContextService);
  private readonly router = inject(Router);

  protected readonly roles: { value: Role; label: string }[] = (
    Object.entries(ROLE_LABELS) as [Role, string][]
  ).map(([value, label]) => ({ value, label }));

  protected readonly rmNames = RM_NAMES;
  protected readonly activeRoleLabel = computed(() => ROLE_LABELS[this.userContext.activeRole()]);

  protected onRoleChange(role: Role): void {
    this.userContext.setRole(role);
    this.router.navigate([role]);
  }
}
