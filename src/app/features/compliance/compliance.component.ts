import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';

import { AssessmentService } from '@core/services/assessment.service';
import { Assessment } from '@core/models/assessment.model';
import { RiskBadgeComponent } from '@shared/components/risk-badge/risk-badge.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-compliance',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatSidenavModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatCheckboxModule,
    MatIconModule,
    RiskBadgeComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './compliance.component.html',
  styleUrl: './compliance.component.scss',
})
export class ComplianceComponent {
  protected readonly assessmentService = inject(AssessmentService);

  protected readonly selectedAssessment = signal<Assessment | null>(null);
  protected readonly filterBranch = signal<string>('');
  protected readonly filterRisk = signal<string>('');
  protected readonly filterKycStatus = signal<string>('PENDING');
  protected readonly eddConfirmed = signal(false);

  protected readonly branches = computed(() => {
    const all = this.assessmentService.assessments().map((a) => a.branch);
    return Array.from(new Set(all)).sort();
  });

  protected readonly filteredAssessments = computed(() => {
    const all = this.assessmentService.assessments();
    const branch = this.filterBranch();
    const risk = this.filterRisk();
    const kyc = this.filterKycStatus();

    return all.filter(
      (a) =>
        (!branch || a.branch === branch) &&
        (!risk || a.computedRiskClassification === risk) &&
        (!kyc || a.kyc_status === kyc),
    );
  });

  protected readonly displayColumns = ['client_name', 'branch', 'risk', 'kyc_status', 'rm'];

  protected onSelectAssessment(a: Assessment): void {
    this.selectedAssessment.set(a);
    this.eddConfirmed.set(false);
  }

  protected onApprove(): void {
    const a = this.selectedAssessment();
    if (!a) return;
    this.assessmentService.applyComplianceAction(a.client_id, 'APPROVED', 'Compliance Team');
    this.selectedAssessment.set(null);
  }

  protected onReject(): void {
    const a = this.selectedAssessment();
    if (!a) return;
    this.assessmentService.applyComplianceAction(a.client_id, 'REJECTED', 'Compliance Team');
    this.selectedAssessment.set(null);
  }

  protected onEscalateEdd(): void {
    const a = this.selectedAssessment();
    if (!a) return;
    this.assessmentService.applyComplianceAction(a.client_id, 'EDD', 'Compliance Team');
    this.selectedAssessment.set(null);
  }

  protected onConfirmHighRiskApproval(): void {
    const a = this.selectedAssessment();
    if (!a || !this.eddConfirmed()) return;
    this.assessmentService.applyComplianceAction(a.client_id, 'APPROVED', 'Compliance Team');
    this.selectedAssessment.set(null);
  }

  protected isHighRisk(a: Assessment | null): boolean {
    return a ? a.computedRiskClassification === 'HIGH' : false;
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

  protected trackByClientId(_: number, a: Assessment): string {
    return a.client_id;
  }
}
