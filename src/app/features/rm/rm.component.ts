import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

import { AssessmentService } from '@core/services/assessment.service';
import { RiskEngineService } from '@core/services/risk-engine.service';
import { UserContextService } from '@core/services/user-context.service';
import { IndexedDbService } from '@core/services/indexed-db.service';
import { OnlineStatusService } from '@core/services/online-status.service';
import { Assessment, ClientType, SOURCE_OF_FUNDS_OPTIONS } from '@core/models/assessment.model';
import { RiskBadgeComponent } from '@shared/components/risk-badge/risk-badge.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-rm',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    RiskBadgeComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './rm.component.html',
  styleUrl: './rm.component.scss',
})
export class RmComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly assessmentService = inject(AssessmentService);
  private readonly riskEngine = inject(RiskEngineService);
  private readonly indexedDb = inject(IndexedDbService);
  protected readonly userContext = inject(UserContextService);
  protected readonly onlineStatus = inject(OnlineStatusService);

  protected readonly sourceOfFundsOptions = SOURCE_OF_FUNDS_OPTIONS;
  protected readonly clientTypeOptions: ClientType[] = ['INDIVIDUAL', 'ENTITY'];
  protected submitted = false;

  protected readonly form = this.fb.group({
    client_name: ['', [Validators.required, Validators.minLength(2)]],
    client_type: ['INDIVIDUAL' as ClientType, Validators.required],
    country_of_tax_residence: ['', Validators.required],
    annual_income: [null as unknown as number, [Validators.required, Validators.min(1)]],
    source_of_funds: ['', Validators.required],
    pep_status: [false],
    sanctions_screening_match: [false],
    adverse_media_flag: [false],
    id_verification_date: [null as string | null],
    documentation_complete: [false],
  });

  private readonly formValues = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly formHasRiskContext = computed(() => {
    const v = this.formValues();
    return !!(
      v.country_of_tax_residence &&
      v.annual_income !== null &&
      v.annual_income !== undefined &&
      v.annual_income > 0 &&
      v.source_of_funds
    );
  });

  protected readonly liveRisk = computed(() => {
    const v = this.formValues();
    return this.riskEngine.classify({
      pep_status: v.pep_status ?? false,
      sanctions_screening_match: v.sanctions_screening_match ?? false,
      adverse_media_flag: v.adverse_media_flag ?? false,
      country_of_tax_residence: v.country_of_tax_residence ?? '',
      client_type: v.client_type ?? 'INDIVIDUAL',
      annual_income: v.annual_income ?? 0,
      source_of_funds: v.source_of_funds ?? '',
    });
  });

  protected readonly mySubmissions = computed(() => {
    const rm = this.userContext.activeRm();
    return this.assessmentService.assessments().filter((a) => a.relationship_manager === rm);
  });

  protected onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    const rm = this.userContext.activeRm();
    const branch = this.userContext.activeBranch();
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const isOffline = !this.onlineStatus.isOnline();
    const syncStatus: 'draft' | 'synced' = isOffline ? 'draft' : 'synced';

    const rawAssessment = {
      client_id: this.assessmentService.getNextClientId(),
      branch,
      onboarding_date: today,
      client_name: v.client_name,
      client_type: v.client_type,
      country_of_tax_residence: v.country_of_tax_residence,
      annual_income: v.annual_income,
      source_of_funds: v.source_of_funds,
      pep_status: v.pep_status,
      sanctions_screening_match: v.sanctions_screening_match,
      adverse_media_flag: v.adverse_media_flag,
      risk_classification: this.liveRisk(),
      kyc_status: 'PENDING' as const,
      id_verification_date: v.id_verification_date,
      relationship_manager: rm,
      documentation_complete: v.documentation_complete,
    };

    // Add to UI with correct syncStatus
    this.assessmentService.addAssessment(rawAssessment, syncStatus);

    // If offline, also persist to IndexedDB for sync later
    if (isOffline) {
      const assessment: Assessment = {
        ...rawAssessment,
        computedRiskClassification: this.liveRisk(),
        submittedAt: now,
        submittedBy: rm,
        syncStatus,
        complianceAction: null,
        complianceActionAt: null,
        complianceActionBy: null,
        integrityMismatch: this.liveRisk() !== this.liveRisk(),
        missingFields: [],
      };
      this.indexedDb.saveDraft(assessment);
    }

    this.submitted = false;
    this.form.reset();
    this.form.markAsPristine();
    this.form.markAsUntouched();
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

  protected trackById(_: number, a: Assessment): string {
    return a.client_id;
  }
}
