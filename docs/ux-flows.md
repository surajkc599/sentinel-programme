# SENTINEL Prototype — UX Flows

Primary device: iPad landscape (1024×768). All flows optimised for touch with 44×44px minimum tap targets.

---

## App Shell — Header (all roles)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Halcyon Capital Partners          [Role: RM ▾]  [Logged in as ▾]  │
│  SENTINEL Onboarding                                                │
└─────────────────────────────────────────────────────────────────────┘
```

- **Role switcher** — toggles between RM / Compliance / Auditor views (navigates to `/rm`, `/compliance`, `/auditor`)
- **Logged in as** — visible only when Role = RM; dropdown of RM names from CSV; sets `submittedBy` and filters "My Recent Submissions"

---

## 1. RM Flow (`/rm`)

### Journey: Submit a new client assessment

```
App loads → navigates to /rm
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  NEW ASSESSMENT                                                  │
│                                        Risk: [ ● MEDIUM ]  ←── live badge,
│                                                              updates as RM types
│  ┌──────────────────────────┐  ┌─────────────────────────────┐  │
│  │  CLIENT IDENTITY         │  │  FINANCIAL PROFILE          │  │
│  │  Client Name  [______]   │  │  Annual Income   [_______]  │  │
│  │  Client Type  [▾ type ]  │  │  Source of Funds [▾ type ]  │  │
│  │  Country      [______]   │  │                             │  │
│  └──────────────────────────┘  └─────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────┐  ┌─────────────────────────────┐  │
│  │  SCREENING FLAGS         │  │  DOCUMENTATION              │  │
│  │  PEP Status       [○ ●]  │  │  ID Verified Date [______]  │  │
│  │  Sanctions Match  [○ ●]  │  │  Docs Complete    [○ ●]     │  │
│  │  Adverse Media    [○ ●]  │  │                             │  │
│  └──────────────────────────┘  └─────────────────────────────┘  │
│                                                                  │
│  Auto-populated (not shown as inputs):                           │
│  client_id (UUID), branch, onboarding_date (today),              │
│  relationship_manager (from header), kyc_status (PENDING)        │
│                                                                  │
│                              [ Submit Assessment ]               │
└──────────────────────────────────────────────────────────────────┘
```

**On Submit:**

```
                    ┌── Online ──► Assessment added to store
                    │              syncStatus: 'synced'
[Submit Assessment]─┤              Status badge: PENDING
                    │
                    └── Offline ─► Saved to IndexedDB
                                   syncStatus: 'draft'
                                   Status badge: DRAFT (Offline)
                                        │
                                        │ network restores
                                        ▼
                                   Auto-synced to store
                                   syncStatus: 'synced'
                                   Status badge: PENDING
```

**Validation errors** — inline, per field, on submit attempt. Form does not submit until all required fields are valid.

---

### My Recent Submissions (below the form)

```
┌──────────────────────────────────────────────────────────────────┐
│  MY RECENT SUBMISSIONS                                           │
│                                                                  │
│  CLIENT NAME      RISK       KYC STATUS    DATE        RM        │
│  Jane Smith       ● HIGH     ⏳ PENDING    03 Jun 26   S.Chen    │
│  Raj Patel        ● LOW      ✓ APPROVED    02 Jun 26   S.Chen    │
│  Amara Osei       ● MEDIUM   ⚡ EDD         01 Jun 26   S.Chen    │
│  Luis Ferreira    ● MEDIUM   ⛔ REJECTED    31 May 26   S.Chen    │
│  Wei Zhang        ● HIGH     📶 DRAFT       30 May 26   S.Chen    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

- Filtered to the active RM (from header selector)
- Status badges update live when compliance officer acts
- Offline drafts shown with network indicator badge

---

## 2. Compliance Flow (`/compliance`)

### Journey: Review and act on pending assessments

```
App loads → navigates to /compliance
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  KPI SUMMARY                                                     │
│                                                                  │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────────┐  │
│  │    46     │  │    12     │  │     8     │  │      3      │  │
│  │  Total    │  │   HIGH    │  │  Pending  │  │ Mismatches  │  │
│  │Assessments│  │   Risk    │  │  Review   │  │             │  │
│  └───────────┘  └───────────┘  └───────────┘  └─────────────┘  │
│                                (all computed() signals — live)   │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  Filter: [Branch ▾]  [Risk Tier ▾]                               │
│                                                                  │
│  CLIENT NAME    BRANCH      RISK      KYC STATUS   RM            │
│  Jane Smith     Canary Wh.  ● HIGH    ⏳ PENDING    S. Chen       │
│  Raj Patel      Leeds       ● LOW     ⏳ PENDING    T. Wang       │
│  Amara Osei     Manchester  ● MEDIUM  ⏳ PENDING    D. Patel      │
│  ...                                                             │
└──────────────────────────────────────────────────────────────────┘
```

**Click a row → side panel slides in:**

```
┌────────────────────────────┐ ┌─────────────────────────────────┐
│  Assessment list           │ │  ASSESSMENT DETAIL            × │
│  (stays visible)           │ │                                 │
│                            │ │  Jane Smith  ·  CLT-047         │
│  Jane Smith   ● HIGH  ►    │ │  Submitted: 03 Jun 26, 09:14    │
│  Raj Patel    ● LOW        │ │  By: Sarah Chen  ·  Canary Wh.  │
│  Amara Osei   ● MED        │ │                                 │
│  ...                       │ │  Risk:  ● HIGH                  │
│                            │ │  ⚠ Integrity mismatch detected  │
│                            │ │                                 │
│                            │ │  ── CLIENT IDENTITY ──────────  │
│                            │ │  Name:     Jane Smith           │
│                            │ │  Type:     INDIVIDUAL           │
│                            │ │  Country:  Russia               │
│                            │ │                                 │
│                            │ │  ── SCREENING FLAGS ───────────  │
│                            │ │  PEP:       No                  │
│                            │ │  Sanctions: No                  │
│                            │ │  Adverse:   No                  │
│                            │ │                                 │
│                            │ │  ── ACTIONS ───────────────────  │
│                            │ │                                 │
│                            │ │  LOW / MEDIUM:                  │
│                            │ │  [Approve]  [Reject]  [→ EDD]   │
│                            │ │                                 │
│                            │ │  HIGH only:                     │
│                            │ │  ┌─────────────────────────┐    │
│                            │ │  │ ⚠ Senior Sign-off       │    │
│                            │ │  │ Required                 │    │
│                            │ │  │                         │    │
│                            │ │  │ ☐ I confirm I have      │    │
│                            │ │  │   reviewed this EDD     │    │
│                            │ │  │   assessment and         │    │
│                            │ │  │   authorise progression  │    │
│                            │ │  │                         │    │
│                            │ │  │ [Confirm EDD]  [Reject]  │    │
│                            │ │  └─────────────────────────┘    │
└────────────────────────────┘ └─────────────────────────────────┘
```

**After action:**

- Side panel closes
- KPI cards recompute live
- Row status badge updates in the list
- RM's "My Recent Submissions" badge also updates live (shared signal store)

---

## 3. Auditor Flow (`/auditor`)

### Journey: Review records for compliance findings

```
App loads → navigates to /auditor
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  FINDINGS SUMMARY                                                │
│                                                                  │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐ │
│  │           3              │  │             5                │ │
│  │  Integrity Mismatches    │  │   Incomplete Records         │ │
│  │  (stored ≠ computed)     │  │   (missing required fields)  │ │
│  └──────────────────────────┘  └──────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  Filter: [Branch ▾]  [RM Name ▾]  [Date Range ▾]                │
│                                                                  │
│  ID        CLIENT       STORED    COMPUTED   FLAGS               │
│  CLT-003   J. Smith     HIGH      HIGH       ✓ Clean             │
│  CLT-007   R. Patel     LOW       MEDIUM     ⚠ Mismatch          │
│  CLT-012   A. Khan      MEDIUM    MEDIUM     ⚠ Incomplete        │
│  CLT-019   B. Wong      HIGH      HIGH       ✓ Clean             │
│  CLT-023   L. Ferreira  HIGH      LOW        ⚠ Mismatch          │
│  ...                                                             │
│                                                                  │
│  (no action buttons — read-only throughout)                      │
└──────────────────────────────────────────────────────────────────┘
```

**Click a row → side panel slides in:**

```
┌────────────────────────────┐ ┌─────────────────────────────────┐
│  Audit table               │ │  FULL RECORD DETAIL           × │
│  (stays visible)           │ │                                 │
│                            │ │  CLT-007  ·  Raj Patel          │
│  CLT-003  ✓                │ │  Assessed: 15 Apr 26, 14:32     │
│  CLT-007  ⚠ ►              │ │  By: Thomas Wang  ·  Leeds      │
│  CLT-012  ⚠                │ │                                 │
│  ...                       │ │  Stored risk:    LOW            │
│                            │ │  Computed risk:  MEDIUM         │
│                            │ │  ⚠ Mismatch reason:             │
│                            │ │    client_type = ENTITY         │
│                            │ │    triggers MEDIUM — not flagged │
│                            │ │    at time of assessment        │
│                            │ │                                 │
│                            │ │  Missing fields:                │
│                            │ │  • id_verification_date         │
│                            │ │                                 │
│                            │ │  ── ALL FIELDS ───────────────  │
│                            │ │  client_id:      CLT-007        │
│                            │ │  branch:         Leeds          │
│                            │ │  client_type:    ENTITY         │
│                            │ │  country:        United Kingdom  │
│                            │ │  annual_income:  £340,000       │
│                            │ │  source_of_funds: Employment    │
│                            │ │  pep_status:     No             │
│                            │ │  sanctions:      No             │
│                            │ │  adverse_media:  No             │
│                            │ │  documentation:  Complete       │
│                            │ │  id_verified:    ⚠ Missing      │
│                            │ │                                 │
│                            │ │  (no action buttons)            │
└────────────────────────────┘ └─────────────────────────────────┘
```

---

## Angular Material Components Mapping

| UX Element                             | Angular Material Component                          |
| -------------------------------------- | --------------------------------------------------- |
| Role switcher / RM dropdown            | `mat-select`                                        |
| Form fields                            | `mat-form-field` + `matInput`                       |
| Toggle switches (PEP, Sanctions, etc.) | `mat-slide-toggle`                                  |
| Date pickers                           | `mat-datepicker`                                    |
| Submit / action buttons                | `mat-button` / `mat-raised-button`                  |
| Side panel                             | `mat-sidenav` (end position)                        |
| Data tables                            | `mat-table`                                         |
| KPI stat cards                         | Custom component on `mat-card`                      |
| Risk / status badges                   | Custom `RiskBadgeComponent`, `StatusBadgeComponent` |
| Senior sign-off checkbox               | `mat-checkbox`                                      |
| Filter dropdowns                       | `mat-select`                                        |
| Integrity / warning icons              | `mat-icon`                                          |

---

## Angular Material Theming

Clean, minimal theme override using CSS custom properties — no deep Material class overrides.

```scss
// src/styles.scss
@use '@angular/material' as mat;

@include mat.core();

$sentinel-theme: mat.define-theme(
  (
    color: (
      theme-type: light,
      primary: mat.$azure-palette,
    ),
    typography: (
      brand-family: 'Inter, sans-serif',
      plain-family: 'Inter, sans-serif',
    ),
  )
);

html {
  @include mat.all-component-themes($sentinel-theme);
}

// Override with Halcyon brand tokens
:root {
  --mat-sys-primary: #1b2a4a;
  --mat-sys-on-primary: #ffffff;
  --mat-sys-secondary: #3d5a80;
  --mat-sys-surface: #ffffff;
  --mat-sys-background: #f8f9fa;
  --mat-sys-error: #9b2226;
}
```

Token overrides are the only customisation needed — no `::ng-deep`, no Material class overrides.
