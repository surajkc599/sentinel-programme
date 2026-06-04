import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { RiskEngineService, RiskInput } from './risk-engine.service';

describe('RiskEngineService', () => {
  let service: RiskEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RiskEngineService],
    });
    service = TestBed.inject(RiskEngineService);
  });

  describe('classify', () => {
    const lowRiskBase: RiskInput = {
      pep_status: false,
      sanctions_screening_match: false,
      adverse_media_flag: false,
      country_of_tax_residence: 'United Kingdom',
      client_type: 'INDIVIDUAL',
      annual_income: 100_000,
      source_of_funds: 'Employment',
    };

    // ────────────────────────────────────────────────────────────────────────
    // HIGH RISK CASES
    // ────────────────────────────────────────────────────────────────────────

    describe('HIGH risk classification', () => {
      it('should classify as HIGH when PEP status is true', () => {
        const input: RiskInput = { ...lowRiskBase, pep_status: true };
        expect(service.classify(input)).toBe('HIGH');
      });

      it('should classify as HIGH when sanctions screening match is true', () => {
        const input: RiskInput = { ...lowRiskBase, sanctions_screening_match: true };
        expect(service.classify(input)).toBe('HIGH');
      });

      it('should classify as HIGH when adverse media flag is true', () => {
        const input: RiskInput = { ...lowRiskBase, adverse_media_flag: true };
        expect(service.classify(input)).toBe('HIGH');
      });

      it('should classify as HIGH for Russia', () => {
        const input: RiskInput = { ...lowRiskBase, country_of_tax_residence: 'Russia' };
        expect(service.classify(input)).toBe('HIGH');
      });

      it('should classify as HIGH for Belarus', () => {
        const input: RiskInput = { ...lowRiskBase, country_of_tax_residence: 'Belarus' };
        expect(service.classify(input)).toBe('HIGH');
      });

      it('should classify as HIGH for Venezuela', () => {
        const input: RiskInput = { ...lowRiskBase, country_of_tax_residence: 'Venezuela' };
        expect(service.classify(input)).toBe('HIGH');
      });

      it('should classify as HIGH when multiple high-risk flags are set', () => {
        const input: RiskInput = {
          ...lowRiskBase,
          pep_status: true,
          sanctions_screening_match: true,
          adverse_media_flag: true,
        };
        expect(service.classify(input)).toBe('HIGH');
      });

      it('should classify as HIGH when both PEP and high-risk country', () => {
        const input: RiskInput = {
          ...lowRiskBase,
          pep_status: true,
          country_of_tax_residence: 'Russia',
        };
        expect(service.classify(input)).toBe('HIGH');
      });
    });

    // ────────────────────────────────────────────────────────────────────────
    // MEDIUM RISK CASES
    // ────────────────────────────────────────────────────────────────────────

    describe('MEDIUM risk classification', () => {
      it('should classify as MEDIUM when client type is ENTITY', () => {
        const input: RiskInput = { ...lowRiskBase, client_type: 'ENTITY' };
        expect(service.classify(input)).toBe('MEDIUM');
      });

      it('should classify as MEDIUM for Brazil', () => {
        const input: RiskInput = { ...lowRiskBase, country_of_tax_residence: 'Brazil' };
        expect(service.classify(input)).toBe('MEDIUM');
      });

      it('should classify as MEDIUM for Turkey', () => {
        const input: RiskInput = { ...lowRiskBase, country_of_tax_residence: 'Turkey' };
        expect(service.classify(input)).toBe('MEDIUM');
      });

      it('should classify as MEDIUM for South Africa', () => {
        const input: RiskInput = { ...lowRiskBase, country_of_tax_residence: 'South Africa' };
        expect(service.classify(input)).toBe('MEDIUM');
      });

      it('should classify as MEDIUM for Mexico', () => {
        const input: RiskInput = { ...lowRiskBase, country_of_tax_residence: 'Mexico' };
        expect(service.classify(input)).toBe('MEDIUM');
      });

      it('should classify as MEDIUM for UAE', () => {
        const input: RiskInput = { ...lowRiskBase, country_of_tax_residence: 'UAE' };
        expect(service.classify(input)).toBe('MEDIUM');
      });

      it('should classify as MEDIUM for China', () => {
        const input: RiskInput = { ...lowRiskBase, country_of_tax_residence: 'China' };
        expect(service.classify(input)).toBe('MEDIUM');
      });

      it('should classify as MEDIUM when income > 500k and source is Inheritance', () => {
        const input: RiskInput = {
          ...lowRiskBase,
          annual_income: 600_000,
          source_of_funds: 'Inheritance',
        };
        expect(service.classify(input)).toBe('MEDIUM');
      });

      it('should classify as MEDIUM when income > 500k and source is Gift', () => {
        const input: RiskInput = {
          ...lowRiskBase,
          annual_income: 750_000,
          source_of_funds: 'Gift',
        };
        expect(service.classify(input)).toBe('MEDIUM');
      });

      it('should classify as MEDIUM when income > 500k and source is Other', () => {
        const input: RiskInput = {
          ...lowRiskBase,
          annual_income: 1_000_000,
          source_of_funds: 'Other',
        };
        expect(service.classify(input)).toBe('MEDIUM');
      });

      it('should classify as MEDIUM for ENTITY in medium-risk country', () => {
        const input: RiskInput = {
          ...lowRiskBase,
          client_type: 'ENTITY',
          country_of_tax_residence: 'Brazil',
        };
        expect(service.classify(input)).toBe('MEDIUM');
      });
    });

    // ────────────────────────────────────────────────────────────────────────
    // LOW RISK CASES
    // ────────────────────────────────────────────────────────────────────────

    describe('LOW risk classification', () => {
      it('should classify as LOW for clean profile with INDIVIDUAL client', () => {
        expect(service.classify(lowRiskBase)).toBe('LOW');
      });

      it('should classify as LOW when income > 500k but source is Employment', () => {
        const input: RiskInput = {
          ...lowRiskBase,
          annual_income: 600_000,
          source_of_funds: 'Employment',
        };
        expect(service.classify(input)).toBe('LOW');
      });

      it('should classify as LOW when income > 500k but source is Business Income', () => {
        const input: RiskInput = {
          ...lowRiskBase,
          annual_income: 1_000_000,
          source_of_funds: 'Business Income',
        };
        expect(service.classify(input)).toBe('LOW');
      });

      it('should classify as LOW when source is Inheritance but income <= 500k', () => {
        const input: RiskInput = {
          ...lowRiskBase,
          annual_income: 250_000,
          source_of_funds: 'Inheritance',
        };
        expect(service.classify(input)).toBe('LOW');
      });

      it('should classify as LOW for low-income countries like Canada', () => {
        const input: RiskInput = { ...lowRiskBase, country_of_tax_residence: 'Canada' };
        expect(service.classify(input)).toBe('LOW');
      });

      it('should classify as LOW for USA', () => {
        const input: RiskInput = { ...lowRiskBase, country_of_tax_residence: 'USA' };
        expect(service.classify(input)).toBe('LOW');
      });
    });

    // ────────────────────────────────────────────────────────────────────────
    // BOUNDARY CONDITIONS
    // ────────────────────────────────────────────────────────────────────────

    describe('boundary conditions', () => {
      it('should classify as LOW when income equals 500k (boundary)', () => {
        const input: RiskInput = {
          ...lowRiskBase,
          annual_income: 500_000,
          source_of_funds: 'Inheritance',
        };
        expect(service.classify(input)).toBe('LOW');
      });

      it('should classify as MEDIUM when income > 500k (just above boundary)', () => {
        const input: RiskInput = {
          ...lowRiskBase,
          annual_income: 500_001,
          source_of_funds: 'Inheritance',
        };
        expect(service.classify(input)).toBe('MEDIUM');
      });

      it('should handle zero income', () => {
        const input: RiskInput = { ...lowRiskBase, annual_income: 0 };
        expect(service.classify(input)).toBe('LOW');
      });

      it('should handle very high income', () => {
        const input: RiskInput = {
          ...lowRiskBase,
          annual_income: 100_000_000,
          source_of_funds: 'Inheritance',
        };
        expect(service.classify(input)).toBe('MEDIUM');
      });

      it('should be case-sensitive for country names (Russia vs russia)', () => {
        const input: RiskInput = { ...lowRiskBase, country_of_tax_residence: 'russia' };
        expect(service.classify(input)).toBe('LOW');
      });

      it('should handle empty country string', () => {
        const input: RiskInput = { ...lowRiskBase, country_of_tax_residence: '' };
        expect(service.classify(input)).toBe('LOW');
      });

      it('should handle empty source_of_funds string', () => {
        const input: RiskInput = { ...lowRiskBase, source_of_funds: '' };
        expect(service.classify(input)).toBe('LOW');
      });
    });

    // ────────────────────────────────────────────────────────────────────────
    // NEGATIVE CASES (EDGE CASES)
    // ────────────────────────────────────────────────────────────────────────

    describe('negative and edge cases', () => {
      it('should not trigger MEDIUM when high income but not high-risk source', () => {
        const input: RiskInput = {
          ...lowRiskBase,
          annual_income: 1_000_000,
          source_of_funds: 'Salary',
        };
        expect(service.classify(input)).toBe('LOW');
      });

      it('should prioritize HIGH over MEDIUM when both conditions met', () => {
        const input: RiskInput = {
          ...lowRiskBase,
          pep_status: true,
          client_type: 'ENTITY',
        };
        expect(service.classify(input)).toBe('HIGH');
      });

      it('should prioritize MEDIUM over LOW when both could apply', () => {
        const input: RiskInput = { ...lowRiskBase, client_type: 'ENTITY' };
        expect(service.classify(input)).toBe('MEDIUM');
      });

      it('should handle negative income gracefully', () => {
        const input: RiskInput = { ...lowRiskBase, annual_income: -100_000 };
        expect(service.classify(input)).toBe('LOW');
      });

      it('should be case-sensitive for ENTITY vs entity', () => {
        const input: RiskInput = {
          ...lowRiskBase,
          client_type: 'entity',
        } as any;
        expect(service.classify(input)).toBe('LOW');
      });
    });
  });
});
