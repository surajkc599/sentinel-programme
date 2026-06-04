import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { KycStatus, SyncStatus } from '@core/models/assessment.model';

export type DisplayStatus = KycStatus | 'DRAFT';

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
})
export class StatusBadgeComponent {
  readonly kyc = input.required<KycStatus>();
  readonly sync = input<SyncStatus>('synced');

  get displayStatus(): DisplayStatus {
    return this.sync() === 'draft' ? 'DRAFT' : this.kyc();
  }

  get label(): string {
    const map: Record<DisplayStatus, string> = {
      DRAFT: 'Draft (Offline)',
      PENDING: 'Pending',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      ENHANCED_DUE_DILIGENCE: 'EDD',
    };
    return map[this.displayStatus];
  }
}
