# SENTINEL Prototype — Angular Architecture

---

## 1. High-Level Layered Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER                                  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    APP SHELL                              │  │
│  │   AppComponent  ·  Header (role switcher, RM selector)   │  │
│  │   RouterOutlet  ·  AppConfig  ·  AppRoutes               │  │
│  └────────────────────────┬──────────────────────────────────┘  │
│                           │ lazy routes                         │
│         ┌─────────────────┼──────────────────┐                  │
│         ▼                 ▼                  ▼                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  RM Feature │  │ Compliance   │  │ Auditor      │           │
│  │  /rm        │  │ Feature      │  │ Feature      │           │
│  │             │  │ /compliance  │  │ /auditor     │           │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                │                 │                    │
│         └────────────────┴─────────────────┘                    │
│                          │ inject()                             │
│  ┌───────────────────────▼───────────────────────────────────┐  │
│  │                   SERVICES LAYER                          │  │
│  │                                                           │  │
│  │   AssessmentService      RiskEngineService                │  │
│  │   WritableSignal<        classifyRisk()                   │  │
│  │   Assessment[]>          pure function                    │  │
│  │                                                           │  │
│  │   IndexedDbService       UserContextService               │  │
│  │   draft storage          active role + RM name            │  │
│  └───────────────────────┬───────────────────────────────────┘  │
│                          │                                      │
│  ┌───────────────────────▼───────────────────────────────────┐  │
│  │                    DATA LAYER                             │  │
│  │                                                           │  │
│  │   assets/data/                  IndexedDB                 │  │
│  │   client_onboarding.json        (offline drafts)          │  │
│  │   (bootstrapped on app init)                              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Tree

```mermaid
graph TD
  App["AppComponent\n(shell + header)"]

  App --> RM["RmComponent\n/rm (lazy)"]
  App --> CO["ComplianceComponent\n/compliance (lazy)"]
  App --> AU["AuditorComponent\n/auditor (lazy)"]

  RM --> AF["AssessmentFormComponent\n(new assessment + live risk badge)"]
  RM --> RS["RecentSubmissionsComponent\n(my submissions list)"]

  CO --> KPI["KpiPanelComponent\n(4 stat cards)"]
  CO --> AL["AssessmentListComponent\n(filterable table)"]
  CO --> SP["AssessmentDetailPanelComponent\n(slide-over side panel)"]

  AU --> FS["FindingsSummaryComponent\n(mismatch + missing counts)"]
  AU --> AT["AuditTableComponent\n(read-only full table)"]

  AF --> RB["RiskBadgeComponent\n(shared)"]
  AL --> RB
  AT --> RB
  RS --> SB["StatusBadgeComponent\n(shared)"]
  AL --> SB
  AT --> IF["IntegrityFlagComponent\n(shared)"]
```

---

## 3. Services & State

```mermaid
graph LR
  JSON["client_onboarding.json\n(assets)"]
  IDB["IndexedDB\n(browser)"]

  JSON -->|"APP_INITIALIZER\n bootstrap load"| AS

  subgraph "Services (providedIn: 'root')"
    AS["AssessmentService\nassessments: WritableSignal&lt;Assessment[]&gt;\nadd() / updateStatus() / syncDrafts()"]
    RE["RiskEngineService\nclassifyRisk(a): RiskTier\npure, stateless"]
    IS["IndexedDbService\nsave(draft) / getAll() / remove(id)"]
    UC["UserContextService\nactiveRole: Signal&lt;Role&gt;\nactiveRm: Signal&lt;string&gt;"]
  end

  AS -->|"on offline submit"| IS
  IS -->|"on network restore"| AS
  RE -->|"called on bootstrap\n+ in form computed()"| AS
  UC -->|"inject in header\n+ RM form"| AS
```

---

## 4. Data Flow — New Assessment Submission

```mermaid
sequenceDiagram
  participant RM as RM (browser)
  participant Form as AssessmentFormComponent
  participant RE as RiskEngineService
  participant UC as UserContextService
  participant AS as AssessmentService
  participant IDB as IndexedDbService

  RM->>Form: fills in fields
  Form->>RE: computed() → classifyRisk(formValue)
  RE-->>Form: RiskTier (live badge updates)

  RM->>Form: clicks Submit

  alt Online
    Form->>UC: get submittedBy, branch
    Form->>AS: add(assessment, syncStatus:'synced')
    AS-->>Form: signal updates → RecentSubmissions reflects new record
  else Offline
    Form->>IDB: save(assessment, syncStatus:'draft')
    IDB-->>Form: stored
    Form->>AS: add(assessment, syncStatus:'draft')
    Note over AS: Draft visible in My Submissions
    AS-->>IDB: network restore → syncDrafts()
    IDB-->>AS: drafts flushed, syncStatus→'synced'
  end
```

---

## 5. Data Flow — Compliance Action

```mermaid
sequenceDiagram
  participant CO as Compliance Officer
  participant List as AssessmentListComponent
  participant Panel as AssessmentDetailPanelComponent
  participant AS as AssessmentService

  CO->>List: clicks assessment row
  List->>Panel: open(assessmentId)
  Panel-->>CO: shows full detail + action buttons

  alt LOW or MEDIUM
    CO->>Panel: clicks Approve / Reject / EDD
    Panel->>AS: updateStatus(id, complianceAction, actionBy, actionAt)
  else HIGH risk
    CO->>Panel: clicks Senior Sign-off Required
    Panel-->>CO: confirmation step (explicit acknowledgement)
    CO->>Panel: confirms
    Panel->>AS: updateStatus(id, 'EDD', actionBy, actionAt)
  end

  AS-->>List: signal update → list re-renders
  AS-->>KPI: computed() → KPI cards update live
  AS-->>RS: computed() → RM's Recent Submissions badge updates
```

---

## 6. Offline Sync State Machine

```
         submit()
[FORM] ──────────────► [SYNCED]
           online

         submit()
[FORM] ──────────────► [DRAFT]
           offline          │
                            │ network restore
                            ▼
                    [PENDING_SYNC]
                            │
                            │ syncDrafts() completes
                            ▼
                        [SYNCED]
```

---

## 7. File Structure

```
src/
├── app/
│   ├── app.ts                        # App shell component
│   ├── app.html
│   ├── app.config.ts                 # provideRouter, APP_INITIALIZER
│   ├── app.routes.ts                 # lazy route definitions
│   │
│   ├── features/
│   │   ├── rm/
│   │   │   ├── rm.routes.ts
│   │   │   ├── rm.component.ts
│   │   │   ├── assessment-form/
│   │   │   │   └── assessment-form.component.ts
│   │   │   └── recent-submissions/
│   │   │       └── recent-submissions.component.ts
│   │   │
│   │   ├── compliance/
│   │   │   ├── compliance.routes.ts
│   │   │   ├── compliance.component.ts
│   │   │   ├── kpi-panel/
│   │   │   │   └── kpi-panel.component.ts
│   │   │   ├── assessment-list/
│   │   │   │   └── assessment-list.component.ts
│   │   │   └── assessment-detail-panel/
│   │   │       └── assessment-detail-panel.component.ts
│   │   │
│   │   └── auditor/
│   │       ├── auditor.routes.ts
│   │       ├── auditor.component.ts
│   │       ├── findings-summary/
│   │       │   └── findings-summary.component.ts
│   │       └── audit-table/
│   │           └── audit-table.component.ts
│   │
│   ├── shared/
│   │   └── components/
│   │       ├── risk-badge/
│   │       ├── status-badge/
│   │       └── integrity-flag/
│   │
│   └── core/
│       ├── models/
│       │   └── assessment.model.ts   # Assessment interface + enums
│       └── services/
│           ├── assessment.service.ts
│           ├── risk-engine.service.ts
│           ├── indexed-db.service.ts
│           └── user-context.service.ts
│
└── assets/
    └── data/
        └── client_onboarding.json    # converted from CSV
```

---

## 8. Key Angular Patterns Used

| Pattern                          | Where                                                         |
| -------------------------------- | ------------------------------------------------------------- |
| `WritableSignal`                 | `AssessmentService` — source of truth for all records         |
| `computed()`                     | Risk badge in form, KPI cards, filtered list views            |
| `APP_INITIALIZER`                | Load JSON + bootstrap `AssessmentService` before first render |
| Lazy loading                     | All 3 feature routes                                          |
| `ChangeDetectionStrategy.OnPush` | All components                                                |
| `inject()`                       | Service injection in all components                           |
| `input()` / `output()`           | All shared components                                         |
| Reactive Forms                   | Assessment intake form with validators                        |
| Native control flow              | `@if`, `@for`, `@switch` throughout templates                 |
