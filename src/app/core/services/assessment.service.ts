import { Injectable, computed, effect, inject, signal } from '@angular/core';

import {
  Assessment,
  ComplianceAction,
  REQUIRED_ASSESSMENT_FIELDS,
  RawAssessment,
} from '@core/models/assessment.model';
import { RiskEngineService } from '@core/services/risk-engine.service';
import { IndexedDbService } from '@core/services/indexed-db.service';
import { OnlineStatusService } from '@core/services/online-status.service';
import ASSESSMENTS_DATA from '../../../assets/data/client_onboarding.json';

@Injectable({ providedIn: 'root' })
export class AssessmentService {
  private readonly riskEngine = new RiskEngineService();
  private readonly indexedDb = inject(IndexedDbService);
  private readonly onlineStatus = inject(OnlineStatusService);

  private readonly _assessments = signal<Assessment[]>([]);
  readonly assessments = this._assessments.asReadonly();

  readonly highRiskCount = computed(
    () => this._assessments().filter((a) => a.computedRiskClassification === 'HIGH').length,
  );
  readonly pendingCount = computed(
    () => this._assessments().filter((a) => a.kyc_status === 'PENDING').length,
  );
  readonly integrityMismatchCount = computed(
    () => this._assessments().filter((a) => a.integrityMismatch).length,
  );

  constructor() {
    const raw = ASSESSMENTS_DATA as RawAssessment[];
    this._assessments.set(raw.map((r) => this.hydrate(r)));

    // Sync drafts when app comes online
    effect(() => {
      if (this.onlineStatus.isOnline()) {
        this.syncPendingDrafts();
      }
    });
  }

  private async syncPendingDrafts(): Promise<void> {
    try {
      const drafts = await this.indexedDb.getDrafts();
      drafts.forEach((draft) => {
        // Update existing draft in store, or add if not present
        this._assessments.update((list) => {
          const existing = list.findIndex((a) => a.client_id === draft.client_id);
          const syncedDraft = { ...draft, syncStatus: 'synced' as const };
          if (existing >= 0) {
            // Update existing entry
            list[existing] = syncedDraft;
            return [...list];
          } else {
            // Add new entry to top
            return [syncedDraft, ...list];
          }
        });
        this.indexedDb.deleteDraft(draft.client_id);
      });
    } catch (err) {
      console.error('Failed to sync drafts:', err);
    }
  }

  addAssessment(raw: RawAssessment, syncStatus?: 'draft' | 'synced'): void {
    const assessment = this.hydrate(raw);
    if (syncStatus) {
      assessment.syncStatus = syncStatus;
    }
    this._assessments.update((list) => [assessment, ...list]);
  }

  getNextClientId(): string {
    const all = this._assessments();
    const numbers = all
      .map((a) => {
        const match = a.client_id.match(/CLT-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .sort((a, b) => b - a);

    const nextNum = (numbers[0] || 46) + 1;
    return `CLT-${String(nextNum).padStart(3, '0')}`;
  }

  applyComplianceAction(clientId: string, action: ComplianceAction, officerName: string): void {
    const kyc =
      action === 'APPROVED'
        ? 'APPROVED'
        : action === 'REJECTED'
          ? 'REJECTED'
          : 'ENHANCED_DUE_DILIGENCE';

    this._assessments.update((list) =>
      list.map((a) =>
        a.client_id === clientId
          ? {
              ...a,
              kyc_status: kyc,
              complianceAction: action,
              complianceActionAt: new Date().toISOString(),
              complianceActionBy: officerName,
            }
          : a,
      ),
    );
  }

  private hydrate(raw: RawAssessment): Assessment {
    const computed = this.riskEngine.classify(raw);
    const complianceAction = this.deriveComplianceAction(raw.kyc_status);

    return {
      ...raw,
      computedRiskClassification: computed,
      submittedAt: raw.onboarding_date + 'T10:00:00.000Z',
      submittedBy: raw.relationship_manager,
      syncStatus: 'synced',
      complianceAction,
      complianceActionAt: null,
      complianceActionBy: null,
      integrityMismatch: raw.risk_classification !== computed,
      missingFields: REQUIRED_ASSESSMENT_FIELDS.filter(
        (f) => raw[f] === null || raw[f] === undefined || raw[f] === '',
      ),
    };
  }

  private deriveComplianceAction(kyc: string): ComplianceAction | null {
    if (kyc === 'APPROVED') return 'APPROVED';
    if (kyc === 'REJECTED') return 'REJECTED';
    if (kyc === 'ENHANCED_DUE_DILIGENCE') return 'EDD';
    return null;
  }
}
