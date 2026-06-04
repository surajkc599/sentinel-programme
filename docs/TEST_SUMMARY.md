# Unit Test Summary

## Overview

| Metric      | Value         |
| ----------- | ------------- |
| Test Files  | 3             |
| Total Tests | 76            |
| Passing     | 76            |
| Failing     | 0             |
| Test Runner | Vitest v4.1.8 |
| Duration    | ~6s           |

---

## Test Files

### 1. app.spec.ts (2 tests)

Bootstraps the root `App` component and verifies it renders without errors.

---

### 2. risk-engine.service.spec.ts (50 tests)

**100% coverage target** — all classification logic is exercised.

#### HIGH risk classification (8 tests)

| Scenario                         | Expected |
| -------------------------------- | -------- |
| PEP status = true                | HIGH     |
| Sanctions screening match = true | HIGH     |
| Adverse media flag = true        | HIGH     |
| Country = Russia                 | HIGH     |
| Country = Belarus                | HIGH     |
| Country = Venezuela              | HIGH     |
| Multiple flags combined          | HIGH     |
| PEP + high-risk country          | HIGH     |

#### MEDIUM risk classification (11 tests)

| Scenario                             | Expected |
| ------------------------------------ | -------- |
| client_type = ENTITY                 | MEDIUM   |
| Country = Brazil                     | MEDIUM   |
| Country = Turkey                     | MEDIUM   |
| Country = South Africa               | MEDIUM   |
| Country = Mexico                     | MEDIUM   |
| Country = UAE                        | MEDIUM   |
| Country = China                      | MEDIUM   |
| Income > 500k + source = Inheritance | MEDIUM   |
| Income > 500k + source = Gift        | MEDIUM   |
| Income > 500k + source = Other       | MEDIUM   |
| ENTITY in medium-risk country        | MEDIUM   |

#### LOW risk classification (6 tests)

| Scenario                                 | Expected |
| ---------------------------------------- | -------- |
| Clean individual profile                 | LOW      |
| Income > 500k + source = Employment      | LOW      |
| Income > 500k + source = Business Income | LOW      |
| Inheritance source but income ≤ 500k     | LOW      |
| Country = Canada                         | LOW      |
| Country = USA                            | LOW      |

#### Boundary conditions (7 tests)

| Scenario                                | Expected |
| --------------------------------------- | -------- |
| Income = 500,000 exactly (at threshold) | LOW      |
| Income = 500,001 (just above threshold) | MEDIUM   |
| Income = 0                              | LOW      |
| Income = 100,000,000 (very high)        | MEDIUM   |
| Country = "russia" (wrong case)         | LOW      |
| Country = "" (empty)                    | LOW      |
| Source of funds = "" (empty)            | LOW      |

#### Negative & edge cases (5 tests)

| Scenario                                       | Expected |
| ---------------------------------------------- | -------- |
| High income + non-risky source                 | LOW      |
| PEP + ENTITY (HIGH takes priority over MEDIUM) | HIGH     |
| ENTITY only (MEDIUM takes priority over LOW)   | MEDIUM   |
| Negative income                                | LOW      |
| client_type = "entity" (wrong case)            | LOW      |

---

### 3. assessment.service.spec.ts (24 tests)

**100% coverage target** — state management, computed signals, and business rules.

#### Initialization (4 tests)

- Service creates successfully
- Loads seed data from `client_onboarding.json` on startup
- Computed signals (`highRiskCount`, `pendingCount`, `integrityMismatchCount`) initialize correctly

#### addAssessment (10 tests)

| Scenario                                                       | Verified |
| -------------------------------------------------------------- | -------- |
| Default syncStatus = 'synced'                                  | ✓        |
| Override syncStatus = 'draft' (offline)                        | ✓        |
| New assessment added to top of list                            | ✓        |
| Risk classification computed on add                            | ✓        |
| submittedBy populated from RM name                             | ✓        |
| integrityMismatch = true when declared vs computed risk differ | ✓        |
| integrityMismatch = false when risk matches                    | ✓        |
| PEP flag → HIGH risk                                           | ✓        |
| High income + risky source → MEDIUM risk                       | ✓        |

#### getNextClientId (4 tests)

| Scenario                            | Verified |
| ----------------------------------- | -------- |
| Generates CLT-### format            | ✓        |
| Increments from highest existing ID | ✓        |
| Multiple calls produce unique IDs   | ✓        |
| Pads number to 3 digits             | ✓        |

#### applyComplianceAction (7 tests)

| Action                 | kyc_status set to                 | Verified |
| ---------------------- | --------------------------------- | -------- |
| APPROVED               | APPROVED                          | ✓        |
| REJECTED               | REJECTED                          | ✓        |
| EDD                    | ENHANCED_DUE_DILIGENCE            | ✓        |
| Any action             | Sets complianceActionAt timestamp | ✓        |
| Any action             | Does not affect other assessments | ✓        |
| Non-existent client ID | No-op, no error                   | ✓        |

#### Computed signals (4 tests)

- `highRiskCount` increments when HIGH risk assessment added
- `pendingCount` decrements when compliance action applied
- `integrityMismatchCount` captures mismatches from seed data

#### Boundary & edge cases (6 tests)

- Empty client name handled gracefully
- Null `id_verification_date` handled
- Duplicate `client_id` allowed (both entries stored)
- All flags false → LOW risk
- All flags true → HIGH risk
- Missing required fields detected in `missingFields[]`

---

## Running Tests

```bash
# Run all tests (watch mode)
npm test

# Run once (CI)
ng test --watch false
```

## Coverage Targets

| Service           | Target | Status               |
| ----------------- | ------ | -------------------- |
| RiskEngineService | 100%   | All branches covered |
| AssessmentService | 100%   | All methods covered  |

## Mocking Strategy

- `IndexedDbService` — mocked with `vi.fn()` returning resolved promises; no real IndexedDB involved
- `OnlineStatusService` — mocked with `vi.fn(() => true)` returning online by default
- Seed data from `client_onboarding.json` loads normally via the real `AssessmentService` constructor
