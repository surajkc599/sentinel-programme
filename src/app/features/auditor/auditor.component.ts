import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { AssessmentService } from '@core/services/assessment.service';
import { Assessment, RiskClassification } from '@core/models/assessment.model';
import { UserContextService } from '@core/services/user-context.service';

@Component({
  selector: 'app-auditor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatSidenavModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './auditor.component.html',
  styleUrl: './auditor.component.scss',
})
export class AuditorComponent {
  protected readonly assessmentService = inject(AssessmentService);
  protected readonly userContext = inject(UserContextService);

  protected readonly selectedAssessment = signal<Assessment | null>(null);
  protected readonly filterBranch = signal<string>('');
  protected readonly filterRm = signal<string>('');

  protected readonly branches = computed(() => {
    const all = this.assessmentService.assessments().map((a) => a.branch);
    return Array.from(new Set(all)).sort();
  });

  protected readonly rmNames = computed(() => {
    const all = this.assessmentService
      .assessments()
      .map((a) => a.relationship_manager)
      .filter((name): name is string => name !== null);
    return Array.from(new Set(all)).sort();
  });

  protected readonly totalCount = computed(() => this.filteredAssessments().length);

  protected readonly highRiskCount = computed(
    () => this.filteredAssessments().filter((a) => a.computedRiskClassification === 'HIGH').length,
  );

  protected readonly integrityMismatchCount = computed(
    () => this.filteredAssessments().filter((a) => a.integrityMismatch).length,
  );

  protected readonly incompleteCount = computed(() => {
    return this.filteredAssessments().filter((a) => a.missingFields.length > 0).length;
  });

  protected readonly filteredAssessments = computed(() => {
    const all = this.assessmentService.assessments();
    const branch = this.filterBranch();
    const rm = this.filterRm();

    return all.filter((a) => {
      if (branch && a.branch !== branch) return false;
      if (rm && a.relationship_manager !== rm) return false;
      return true;
    });
  });

  protected readonly displayColumns = [
    'client_id',
    'client_name',
    'stored_risk',
    'computed_risk',
    'flags',
    'submitted_date',
  ];

  protected onSelectAssessment(a: Assessment): void {
    this.selectedAssessment.set(a);
  }

  protected getFlagLabel(a: Assessment): string {
    const flags = [];
    if (a.integrityMismatch) flags.push('Mismatch');
    if (a.missingFields.length > 0) flags.push('Incomplete');
    return flags.length > 0 ? flags.join(' / ') : 'Clean';
  }

  protected getFlagIcon(a: Assessment): string {
    if (a.integrityMismatch || a.missingFields.length > 0) return 'warning';
    return 'check_circle';
  }

  protected getMismatchReason(a: Assessment): string {
    if (a.risk_classification === a.computedRiskClassification) return '';

    const storedRisk = a.risk_classification;
    const computedRisk = a.computedRiskClassification;
    const reasons = [];

    if (
      a.pep_status ||
      a.sanctions_screening_match ||
      a.adverse_media_flag ||
      ['Russia', 'Belarus', 'Venezuela'].includes(a.country_of_tax_residence)
    ) {
      reasons.push(
        'HIGH risk flags present (PEP, sanctions, adverse media, or restricted country)',
      );
    }

    if (
      a.client_type === 'ENTITY' ||
      ['Brazil', 'Turkey', 'South Africa', 'Mexico', 'UAE', 'China'].includes(
        a.country_of_tax_residence,
      )
    ) {
      reasons.push('MEDIUM risk: ENTITY client type or medium-risk country');
    }

    if (a.annual_income > 500_000 && ['Inheritance', 'Gift', 'Other'].includes(a.source_of_funds)) {
      reasons.push('MEDIUM risk: high income (>£500k) with high-risk source of funds');
    }

    return reasons.join(' → ');
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  }

  protected formatDateTime(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  }

  protected trackByClientId(_: number, a: Assessment): string {
    return a.client_id;
  }
}
