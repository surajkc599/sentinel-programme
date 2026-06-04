import { Injectable } from '@angular/core';

import { RiskClassification } from '@core/models/assessment.model';

export interface RiskInput {
  pep_status: boolean;
  sanctions_screening_match: boolean;
  adverse_media_flag: boolean;
  country_of_tax_residence: string;
  client_type: string;
  annual_income: number;
  source_of_funds: string;
}

const HIGH_RISK_COUNTRIES = ['Russia', 'Belarus', 'Venezuela'];
const MEDIUM_RISK_COUNTRIES = ['Brazil', 'Turkey', 'South Africa', 'Mexico', 'UAE', 'China'];
const HIGH_INCOME_SOURCES = ['Inheritance', 'Gift', 'Other'];
const HIGH_INCOME_THRESHOLD = 500_000;

@Injectable({ providedIn: 'root' })
export class RiskEngineService {
  classify(a: RiskInput): RiskClassification {
    if (
      a.pep_status ||
      a.sanctions_screening_match ||
      a.adverse_media_flag ||
      HIGH_RISK_COUNTRIES.includes(a.country_of_tax_residence)
    ) {
      return 'HIGH';
    }

    if (
      a.client_type === 'ENTITY' ||
      MEDIUM_RISK_COUNTRIES.includes(a.country_of_tax_residence) ||
      (a.annual_income > HIGH_INCOME_THRESHOLD && HIGH_INCOME_SOURCES.includes(a.source_of_funds))
    ) {
      return 'MEDIUM';
    }

    return 'LOW';
  }
}
