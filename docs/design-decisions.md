# SENTINEL Prototype — Design Decisions

Design agreed via pre-build grilling session on 2026-06-03.

---

## Views & Routing

- 3 lazy-loaded feature routes: `/rm`, `/compliance`, `/auditor`
- No login screen — role switcher in the app header (RM | Compliance | Auditor)
- RM name dropdown in the header (pre-populated from CSV RM names) sets user context for the RM role

---

## Data Layer

- CSV converted to JSON at dev time (no runtime CSV parsing)
- Loaded at application bootstrap into a singleton `AssessmentService`
- State held as `WritableSignal<Assessment[]>` — fully reactive
- New assessments added to the same signal store
- No localStorage — IndexedDB for offline drafts only (see Offline section)

### Assessment Data Model

16 CSV columns plus 8 prototype-added system fields:

| Field                        | Source                                                                |
| ---------------------------- | --------------------------------------------------------------------- |
| `client_id`                  | Auto-generated UUID on new assessments                                |
| `branch`                     | From RM profile (header selector)                                     |
| `onboarding_date`            | Today's date (auto-populated)                                         |
| `client_name`                | RM input                                                              |
| `client_type`                | RM input                                                              |
| `country_of_tax_residence`   | RM input                                                              |
| `annual_income`              | RM input                                                              |
| `source_of_funds`            | RM input                                                              |
| `pep_status`                 | RM input (toggle)                                                     |
| `sanctions_screening_match`  | RM input (toggle)                                                     |
| `adverse_media_flag`         | RM input (toggle)                                                     |
| `risk_classification`        | From CSV (existing records)                                           |
| `kyc_status`                 | From CSV (existing); `PENDING` on new submission                      |
| `id_verification_date`       | RM input                                                              |
| `relationship_manager`       | Auto-populated from header RM selector                                |
| `documentation_complete`     | RM input (toggle)                                                     |
| `computedRiskClassification` | System — risk engine output, always fresh                             |
| `submittedAt`                | ISO timestamp set on submission                                       |
| `submittedBy`                | RM name from header selector                                          |
| `syncStatus`                 | `'synced' \| 'draft' \| 'pending_sync'`                               |
| `complianceAction`           | `'APPROVED' \| 'REJECTED' \| 'EDD'` (set by compliance)               |
| `complianceActionAt`         | ISO timestamp of compliance action                                    |
| `complianceActionBy`         | Name of compliance officer who acted                                  |
| `integrityMismatch`          | `true` if stored `risk_classification` ≠ `computedRiskClassification` |
| `missingFields`              | `string[]` — list of required fields that are null/empty              |

---

## Risk Engine

- Pure stateless function: `classifyRisk(assessment): 'LOW' | 'MEDIUM' | 'HIGH'`
- Lives in a dedicated `RiskEngineService`
- Wired as a `computed()` signal inside the RM assessment form — classification updates live as the RM fills in fields
- Run on CSV load to populate `computedRiskClassification` for all existing records

### Classification Rules (from SENTINEL regulatory criteria)

**HIGH** (any of):

- `pep_status` = true
- `sanctions_screening_match` = true
- `adverse_media_flag` = true
- `country_of_tax_residence` in `[Russia, Belarus, Venezuela]`

**MEDIUM** (none of HIGH, plus any of):

- `client_type` = ENTITY
- `country_of_tax_residence` in `[Brazil, Turkey, South Africa, Mexico, UAE, China]`
- `annual_income` > 500,000 AND `source_of_funds` in `[Inheritance, Gift, Other]`

**LOW**: none of HIGH or MEDIUM conditions apply.

---

## RM View (`/rm`)

### New Assessment Form

- Single scrollable form — no wizard/stepper
- 4 field groups with clear visual separation:
  1. **Client Identity** — `client_name`, `client_type`, `country_of_tax_residence`
  2. **Financial Profile** — `annual_income`, `source_of_funds`
  3. **Screening Flags** — `pep_status`, `sanctions_screening_match`, `adverse_media_flag` (toggle switches)
  4. **Documentation** — `id_verification_date`, `documentation_complete`
- Live risk classification badge prominent at top, updates via `computed()` as form changes
- Basic reactive form validation on all required fields
- Single "Submit Assessment" button at bottom
- Auto-populated fields not shown as editable inputs: `client_id`, `branch`, `onboarding_date`, `relationship_manager`, `risk_classification`, `kyc_status`

### My Recent Submissions

- List below the form showing assessments submitted by the active RM
- Status badges: **Draft** | **Pending** | **Approved** | **Rejected** | **EDD**
- Status updates reactively when compliance acts on a record

---

## Offline Support

- Network status monitored via `online`/`offline` browser events
- When offline: assessment is saved to **IndexedDB** with `syncStatus: 'draft'`
- Shown in "My Recent Submissions" with a **Draft (Offline)** badge
- When network restores: drafts are synced from IndexedDB into the signal store (`syncStatus: 'pending_sync'` → `'synced'`)
- No Service Worker / PWA — offline storage only (PWA is a production concern)

---

## Compliance View (`/compliance`)

### KPI Summary Panel

Four stat cards (computed signals, update live):

- **Total Assessments**
- **HIGH Risk** count
- **Pending Review** count
- **Integrity Mismatches** count

### Assessment List

- All assessments shown by default
- Filter by: **Branch**, **Risk Tier**
- KYC status filter deferred to future version

### Side Panel (slide-over, right-aligned ~480px)

Opens on record click — list stays visible in background.

Contains:

- Full assessment detail with all fields
- Computed risk badge + any integrity/completeness flags
- Action buttons:
  - **Approve** — available for LOW and MEDIUM
  - **Reject** — available for any tier
  - **Escalate to EDD** — available for MEDIUM (promotes to Enhanced Due Diligence)
  - HIGH-risk records: Approve is replaced with **Senior Sign-off Required** — confirmation flow with explicit acknowledgement step inside the panel

Compliance officers cannot edit assessment data — actions only. Preserves audit trail integrity.

---

## Auditor View (`/auditor`)

- **Read-only** — no actions available
- Findings summary at top: missing fields count + integrity mismatch count
- Full audit table: all records, all fields visible
- **Integrity mismatch column** — flags where stored `risk_classification` ≠ system-computed classification
- **Completeness flag** — flags records with entries in `missingFields[]`
- Filter by: **Branch**, **RM name**, **Date range**

---

## CSV Dirty Data Strategy

- All records loaded regardless of data quality — flag, don't discard
- On bootstrap: types coerced (`"TRUE"` → `boolean`, empty strings → `null`)
- `computedRiskClassification` calculated fresh for every record
- `integrityMismatch` set where stored classification contradicts computed
- `missingFields[]` populated for any required field that is null/empty
- Dirty records surface as findings in the Auditor view — hiding them would defeat the compliance purpose

---

## Architectural Considerations (Debrief Topics)

Not implemented in the prototype but reflected in design choices:

| Concern                | Prototype reflects it by…                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| **Offline-first**      | IndexedDB draft storage + sync listener pattern                                                    |
| **Regulatory change**  | Risk engine is a pure isolated function — swap the rules config without touching UI                |
| **FCA record-keeping** | `submittedAt`, `submittedBy`, `complianceActionAt`, `complianceActionBy` on every record           |
| **Multi-branch scale** | Branch is a first-class field; service interface is backend-agnostic (signal store swaps for HTTP) |
