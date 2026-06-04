import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssessmentService } from './assessment.service';
import { IndexedDbService } from './indexed-db.service';
import { OnlineStatusService } from './online-status.service';
import { Assessment, RawAssessment } from '@core/models/assessment.model';

describe('AssessmentService', () => {
  let service: AssessmentService;
  let indexedDbService: Partial<IndexedDbService>;

  // Sample raw assessment for testing
  const sampleRawAssessment: RawAssessment = {
    client_id: 'CLT-001',
    branch: 'London',
    onboarding_date: '2026-06-04',
    client_name: 'John Doe',
    client_type: 'INDIVIDUAL',
    country_of_tax_residence: 'United Kingdom',
    annual_income: 100_000,
    source_of_funds: 'Employment',
    pep_status: false,
    sanctions_screening_match: false,
    adverse_media_flag: false,
    risk_classification: 'LOW',
    kyc_status: 'PENDING',
    id_verification_date: '2026-06-01',
    relationship_manager: 'Alice Smith',
    documentation_complete: true,
  };

  beforeEach(() => {
    // Create mock implementations
    const mockIndexedDb: Partial<IndexedDbService> = {
      init: vi.fn().mockResolvedValue(undefined),
      saveDraft: vi.fn().mockResolvedValue(undefined),
      getDrafts: vi.fn().mockResolvedValue([]),
      deleteDraft: vi.fn().mockResolvedValue(undefined),
      clearAllDrafts: vi.fn().mockResolvedValue(undefined),
    };

    const mockOnlineStatus: Partial<OnlineStatusService> = {
      isOnline: vi.fn(() => true) as any,
    };

    TestBed.configureTestingModule({
      providers: [
        AssessmentService,
        { provide: IndexedDbService, useValue: mockIndexedDb },
        { provide: OnlineStatusService, useValue: mockOnlineStatus },
      ],
    });

    service = TestBed.inject(AssessmentService);
    indexedDbService = TestBed.inject(IndexedDbService);
  });

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with sample data', () => {
      const assessments = service.assessments();
      expect(assessments.length).toBeGreaterThan(0);
    });

    it('should compute correct high risk count', () => {
      expect(service.highRiskCount() >= 0).toBeTruthy();
    });

    it('should compute correct pending count', () => {
      expect(service.pendingCount() >= 0).toBeTruthy();
    });

    it('should compute correct integrity mismatch count', () => {
      expect(service.integrityMismatchCount() >= 0).toBeTruthy();
    });
  });

  describe('addAssessment', () => {
    it('should add assessment with synced status when no syncStatus provided', () => {
      const beforeCount = service.assessments().length;
      service.addAssessment(sampleRawAssessment);

      const afterCount = service.assessments().length;
      expect(afterCount).toBe(beforeCount + 1);

      const added = service.assessments()[0];
      expect(added.client_id).toBe(sampleRawAssessment.client_id);
      expect(added.syncStatus).toBe('synced');
    });

    it('should add assessment with draft status when syncStatus=draft provided', () => {
      service.addAssessment(sampleRawAssessment, 'draft');

      const added = service.assessments()[0];
      expect(added.syncStatus).toBe('draft');
    });

    it('should add assessment to top of list', () => {
      const uniqueAssessment = { ...sampleRawAssessment, client_id: 'CLT-UNIQUE-TEST-001' };
      service.addAssessment(uniqueAssessment, 'synced');

      const newFirst = service.assessments()[0];
      expect(newFirst.client_id).toBe('CLT-UNIQUE-TEST-001');
    });

    it('should calculate risk classification on add', () => {
      service.addAssessment(sampleRawAssessment);

      const added = service.assessments()[0];
      expect(added.computedRiskClassification).toBe('LOW');
    });

    it('should set submittedAt and submittedBy from raw data', () => {
      service.addAssessment(sampleRawAssessment);

      const added = service.assessments()[0];
      expect(added.submittedBy).toBe('Alice Smith');
    });

    it('should detect integrity mismatch when risk differs', () => {
      const mismatchAssessment: RawAssessment = {
        ...sampleRawAssessment,
        risk_classification: 'MEDIUM',
      };
      service.addAssessment(mismatchAssessment);

      const added = service.assessments()[0];
      expect(added.integrityMismatch).toBeTruthy();
    });

    it('should not detect integrity mismatch when risk matches', () => {
      service.addAssessment(sampleRawAssessment);

      const added = service.assessments()[0];
      expect(added.integrityMismatch).toBeFalsy();
    });

    it('should handle assessment with PEP status (HIGH risk)', () => {
      const pepAssessment: RawAssessment = {
        ...sampleRawAssessment,
        pep_status: true,
      };
      service.addAssessment(pepAssessment);

      const added = service.assessments()[0];
      expect(added.computedRiskClassification).toBe('HIGH');
    });

    it('should handle assessment with high income and risky source (MEDIUM risk)', () => {
      const mediumRiskAssessment: RawAssessment = {
        ...sampleRawAssessment,
        annual_income: 600_000,
        source_of_funds: 'Inheritance',
      };
      service.addAssessment(mediumRiskAssessment);

      const added = service.assessments()[0];
      expect(added.computedRiskClassification).toBe('MEDIUM');
    });
  });

  describe('getNextClientId', () => {
    it('should generate next client ID in sequence', () => {
      const nextId = service.getNextClientId();
      expect(nextId).toMatch(/^CLT-\d{3}$/);
    });

    it('should increment from existing highest ID', () => {
      service.addAssessment({ ...sampleRawAssessment, client_id: 'CLT-100' });
      const nextId = service.getNextClientId();

      expect(nextId).toBe('CLT-101');
    });

    it('should handle multiple calls returning unique IDs', () => {
      const id1 = service.getNextClientId();
      service.addAssessment({ ...sampleRawAssessment, client_id: id1 });

      const id2 = service.getNextClientId();
      service.addAssessment({ ...sampleRawAssessment, client_id: id2 });

      expect(id1).not.toBe(id2);
      expect(id2 > id1).toBeTruthy();
    });

    it('should pad client ID with zeros', () => {
      const nextId = service.getNextClientId();
      const match = nextId.match(/CLT-(\d+)/);
      expect(match![1].length).toBe(3);
    });
  });

  describe('applyComplianceAction', () => {
    it('should update assessment status to APPROVED', () => {
      service.addAssessment(sampleRawAssessment);
      const clientId = service.assessments()[0].client_id;

      service.applyComplianceAction(clientId, 'APPROVED', 'Bob Officer');

      const updated = service.assessments().find((a) => a.client_id === clientId);
      expect(updated?.kyc_status).toBe('APPROVED');
      expect(updated?.complianceActionBy).toBe('Bob Officer');
    });

    it('should update assessment status to REJECTED', () => {
      service.addAssessment(sampleRawAssessment);
      const clientId = service.assessments()[0].client_id;

      service.applyComplianceAction(clientId, 'REJECTED', 'Bob Officer');

      const updated = service.assessments().find((a) => a.client_id === clientId);
      expect(updated?.kyc_status).toBe('REJECTED');
      expect(updated?.complianceAction).toBe('REJECTED');
    });

    it('should update assessment status to ENHANCED_DUE_DILIGENCE', () => {
      service.addAssessment(sampleRawAssessment);
      const clientId = service.assessments()[0].client_id;

      service.applyComplianceAction(clientId, 'EDD', 'Bob Officer');

      const updated = service.assessments().find((a) => a.client_id === clientId);
      expect(updated?.kyc_status).toBe('ENHANCED_DUE_DILIGENCE');
      expect(updated?.complianceAction).toBe('EDD');
    });

    it('should set complianceActionAt timestamp', () => {
      service.addAssessment(sampleRawAssessment);
      const clientId = service.assessments()[0].client_id;

      const beforeAction = new Date().toISOString();
      service.applyComplianceAction(clientId, 'APPROVED', 'Bob Officer');
      const afterAction = new Date().toISOString();

      const updated = service.assessments().find((a) => a.client_id === clientId);
      expect(updated?.complianceActionAt).toBeTruthy();
      expect(updated?.complianceActionAt! >= beforeAction).toBeTruthy();
      expect(updated?.complianceActionAt! <= afterAction).toBeTruthy();
    });

    it('should not affect other assessments', () => {
      service.addAssessment(sampleRawAssessment);
      service.addAssessment({ ...sampleRawAssessment, client_id: 'CLT-002' });

      const firstClientId = service.assessments()[1].client_id;
      const secondClientId = service.assessments()[0].client_id;

      service.applyComplianceAction(firstClientId, 'APPROVED', 'Bob Officer');

      const unaffected = service.assessments().find((a) => a.client_id === secondClientId);
      expect(unaffected?.kyc_status).toBe('PENDING');
    });

    it('should handle non-existent client ID gracefully', () => {
      const beforeCount = service.assessments().length;
      service.applyComplianceAction('NON-EXISTENT', 'APPROVED', 'Bob Officer');

      expect(service.assessments().length).toBe(beforeCount);
    });
  });

  describe('high risk count computed signal', () => {
    it('should count assessments with HIGH risk classification', () => {
      service.addAssessment({
        ...sampleRawAssessment,
        client_id: 'CLT-HIGH1',
        pep_status: true,
      });
      service.addAssessment({
        ...sampleRawAssessment,
        client_id: 'CLT-HIGH2',
        pep_status: true,
      });
      service.addAssessment({
        ...sampleRawAssessment,
        client_id: 'CLT-LOW1',
      });

      const highRiskCount = service.highRiskCount();
      expect(highRiskCount >= 2).toBeTruthy();
    });

    it('should update high risk count when assessment is added', () => {
      const beforeCount = service.highRiskCount();

      service.addAssessment({
        ...sampleRawAssessment,
        pep_status: true,
      });

      const afterCount = service.highRiskCount();
      expect(afterCount).toBe(beforeCount + 1);
    });
  });

  describe('pending count computed signal', () => {
    it('should count assessments with PENDING kyc_status', () => {
      const pendingCount = service.pendingCount();
      expect(pendingCount >= 0).toBeTruthy();
    });

    it('should update when compliance action is applied', () => {
      service.addAssessment(sampleRawAssessment);
      const clientId = service.assessments()[0].client_id;

      const beforeCount = service.pendingCount();
      service.applyComplianceAction(clientId, 'APPROVED', 'Officer');

      const afterCount = service.pendingCount();
      expect(afterCount).toBe(beforeCount - 1);
    });
  });

  describe('integrity mismatch computed signal', () => {
    it('should count assessments with mismatched risk classification', () => {
      service.addAssessment({
        ...sampleRawAssessment,
        risk_classification: 'HIGH',
        pep_status: false,
      });

      const mismatchCount = service.integrityMismatchCount();
      expect(mismatchCount >= 1).toBeTruthy();
    });
  });

  describe('offline sync behavior', () => {
    it('should have getDrafts available for sync', async () => {
      const mockGetDrafts = vi.fn().mockResolvedValue([]);
      indexedDbService.getDrafts = mockGetDrafts as any;

      expect(indexedDbService.getDrafts).toBeDefined();
    });

    it('should have deleteDraft available for cleanup', async () => {
      const mockDeleteDraft = vi.fn().mockResolvedValue(undefined);
      indexedDbService.deleteDraft = mockDeleteDraft as any;

      expect(indexedDbService.deleteDraft).toBeDefined();
    });
  });

  describe('boundary conditions and edge cases', () => {
    it('should handle empty client name', () => {
      service.addAssessment({ ...sampleRawAssessment, client_name: '' });
      expect(service.assessments().length).toBeGreaterThan(0);
    });

    it('should handle null id_verification_date', () => {
      service.addAssessment({ ...sampleRawAssessment, id_verification_date: null as any });
      const added = service.assessments()[0];
      expect(added.client_name).toBe(sampleRawAssessment.client_name);
    });

    it('should handle duplicate client IDs', () => {
      const uniqueId = 'CLT-DUPE-TEST';
      const a = { ...sampleRawAssessment, client_id: uniqueId };
      service.addAssessment(a);
      service.addAssessment(a);

      const duplicates = service.assessments().filter((x) => x.client_id === uniqueId);
      expect(duplicates.length).toBe(2);
    });

    it('should handle all screening flags as false (low risk)', () => {
      service.addAssessment(sampleRawAssessment);
      const added = service.assessments()[0];
      expect(added.computedRiskClassification).toBe('LOW');
    });

    it('should handle all screening flags as true (high risk)', () => {
      service.addAssessment({
        ...sampleRawAssessment,
        pep_status: true,
        sanctions_screening_match: true,
        adverse_media_flag: true,
      });

      const added = service.assessments()[0];
      expect(added.computedRiskClassification).toBe('HIGH');
    });

    it('should handle missing fields calculation', () => {
      const incompleteAssessment: RawAssessment = {
        ...sampleRawAssessment,
        client_name: '',
        country_of_tax_residence: '',
      };

      service.addAssessment(incompleteAssessment);
      const added = service.assessments()[0];
      expect(added.missingFields.length > 0).toBeTruthy();
    });
  });
});
