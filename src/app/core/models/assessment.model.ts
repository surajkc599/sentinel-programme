export type RiskClassification = 'LOW' | 'MEDIUM' | 'HIGH';
export type KycStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ENHANCED_DUE_DILIGENCE';
export type ClientType = 'INDIVIDUAL' | 'ENTITY';
export type ComplianceAction = 'APPROVED' | 'REJECTED' | 'EDD';
export type SyncStatus = 'synced' | 'draft' | 'pending_sync';

export interface RawAssessment {
  client_id: string;
  branch: string;
  onboarding_date: string;
  client_name: string;
  client_type: ClientType;
  country_of_tax_residence: string;
  annual_income: number;
  source_of_funds: string;
  pep_status: boolean;
  sanctions_screening_match: boolean;
  adverse_media_flag: boolean;
  risk_classification: RiskClassification;
  kyc_status: KycStatus;
  id_verification_date: string | null;
  relationship_manager: string | null;
  documentation_complete: boolean;
}

export interface Assessment extends RawAssessment {
  computedRiskClassification: RiskClassification;
  submittedAt: string;
  submittedBy: string | null;
  syncStatus: SyncStatus;
  complianceAction: ComplianceAction | null;
  complianceActionAt: string | null;
  complianceActionBy: string | null;
  integrityMismatch: boolean;
  missingFields: string[];
}

export const SOURCE_OF_FUNDS_OPTIONS = [
  'Business Income',
  'Employment',
  'Gift',
  'Inheritance',
  'Investment Returns',
  'Other',
  'Pension',
  'Property Sale',
] as const;

export const REQUIRED_ASSESSMENT_FIELDS: (keyof RawAssessment)[] = [
  'client_name',
  'client_type',
  'country_of_tax_residence',
  'annual_income',
  'source_of_funds',
  'relationship_manager',
];
