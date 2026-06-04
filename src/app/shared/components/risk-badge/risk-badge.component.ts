import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { RiskClassification } from '@core/models/assessment.model';

@Component({
  selector: 'app-risk-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './risk-badge.component.html',
  styleUrl: './risk-badge.component.scss',
})
export class RiskBadgeComponent {
  readonly risk = input.required<RiskClassification>();
}
