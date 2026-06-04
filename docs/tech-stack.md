# SENTINEL Prototype — Technical Choices

---

## Core Stack

| Technology | Version | Role                                               |
| ---------- | ------- | -------------------------------------------------- |
| Angular    | 21.2    | Application framework                              |
| TypeScript | 5.9     | Language                                           |
| HTML5      | —       | Markup + native APIs                               |
| SCSS       | —       | Styling                                            |
| RxJS       | 7.8     | Observable utilities (minimal — signals preferred) |

---

## Angular 21

### Why Angular

- Opinionated full framework — routing, forms, DI, and change detection all built in, no assembly required
- Signals (stable since v17) give fine-grained reactivity without a third-party state library
- `APP_INITIALIZER` provides a clean hook for bootstrapping CSV data before first render
- Strong TypeScript integration by default

### Key Angular features in use

| Feature                          | Usage in SENTINEL                                                        |
| -------------------------------- | ------------------------------------------------------------------------ |
| Standalone components            | Default in v20+ — no NgModules                                           |
| Signals (`signal`, `computed`)   | All state management and derived values                                  |
| `APP_INITIALIZER`                | Load `client_onboarding.json` and seed `AssessmentService` before render |
| Lazy-loaded routes               | `/rm`, `/compliance`, `/auditor` each in their own chunk                 |
| Reactive Forms                   | Assessment intake form with built-in validators                          |
| `ChangeDetectionStrategy.OnPush` | All components — only re-renders when signal/input changes               |
| `inject()`                       | Service injection in all components (no constructor injection)           |
| `input()` / `output()`           | Signal-based component API for all shared components                     |
| Native control flow              | `@if`, `@for`, `@switch` — no `*ngIf` / `*ngFor` directives              |
| `NgOptimizedImage`               | Any static images (logo, branch icons)                                   |

---

## TypeScript 5.9

- Strict mode enabled (`strict: true` in `tsconfig.json`)
- `unknown` over `any` for uncertain types
- Type inference used where the type is obvious — no redundant annotations
- Discriminated unions for `RiskTier`, `KycStatus`, `SyncStatus`, `Role`
- All models in `core/models/assessment.model.ts` — single source of truth for types

---

## HTML5 Native APIs

| API                                             | Usage                                                  |
| ----------------------------------------------- | ------------------------------------------------------ |
| `IndexedDB`                                     | Offline draft storage                                  |
| `navigator.onLine`                              | Initial network state check                            |
| `window.addEventListener('online' / 'offline')` | Network change detection for sync trigger              |
| `crypto.randomUUID()`                           | Client-side `client_id` generation for new assessments |
| `Date.now()` / `new Date().toISOString()`       | Timestamps for `submittedAt`, `complianceActionAt`     |

---

## SCSS

- Component-scoped styles via Angular's `styleUrl` per component
- Global design tokens (brand colours, typography, spacing) defined in `src/styles.scss` as CSS custom properties

```scss
// src/styles.scss — design tokens
:root {
  --color-primary: #1b2a4a;
  --color-primary-light: #3d5a80;
  --color-success: #2d6a4f;
  --color-warning: #e09f3e;
  --color-error: #9b2226;
  --color-neutral: #6b7280;
  --color-bg: #f8f9fa;
  --color-card: #ffffff;
  --color-text: #1f2937;

  --radius-card: 8px;
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.08);
  --gap-card: 16px;
  --padding-page: 24px;
  --tap-target-min: 44px; /* WCAG touch target minimum */
}
```

- No utility-class framework (no Tailwind/Bootstrap) — keeps bundle lean, styles colocated with components

---

## Layout — CSS Grid + Flexbox

### Strategy: Grid for 2D structure, Flexbox for 1D alignment

| Use case                             | Approach                                                             |
| ------------------------------------ | -------------------------------------------------------------------- |
| Page shell (header + content area)   | CSS Grid (`grid-template-rows: auto 1fr`)                            |
| KPI stat cards (4 across)            | CSS Grid (`grid-template-columns: repeat(4, 1fr)`)                   |
| Audit/compliance table               | CSS Grid or HTML `<table>` for tabular data                          |
| Form field groups                    | CSS Grid (`grid-template-columns: 1fr 1fr`) for two-column groupings |
| Slide-over panel + list              | CSS Grid (`grid-template-columns: 1fr 480px`)                        |
| Button rows, badge groups, nav items | Flexbox (`display: flex; gap: ...`)                                  |
| Form field + label stacking          | Flexbox column                                                       |

### Responsive breakpoints

Primary target is **1024×768 (iPad landscape)** — all layouts designed mobile-first from this baseline.

```scss
// Breakpoints
$bp-tablet: 1024px; // primary target — iPad landscape
$bp-desktop: 1280px; // wider desktop screens

// Example: KPI cards collapse from 4-col to 2-col below tablet
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr); // mobile default

  @media (min-width: $bp-tablet) {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

### Touch targets

All interactive elements enforce `min-height: 44px; min-width: 44px` via the `--tap-target-min` token — satisfies both WCAG 2.5.5 and the problem statement's tablet requirement.

---

## IndexedDB — Offline Draft Storage

### Why IndexedDB over localStorage

| Concern                         | localStorage                     | IndexedDB                                    |
| ------------------------------- | -------------------------------- | -------------------------------------------- |
| Storage limit                   | ~5MB                             | 50MB+ (quota-managed)                        |
| Data type                       | Strings only                     | Structured objects (no serialisation needed) |
| Async                           | Synchronous (blocks main thread) | Async (non-blocking)                         |
| Suitable for assessment records | No                               | Yes                                          |

### Implementation approach

- Raw IndexedDB API wrapped in a typed `IndexedDbService` — no third-party library
- One object store: `drafts` — keyed by `client_id`
- Operations: `save(assessment)`, `getAll()`, `remove(id)`
- Called by `AssessmentService.syncDrafts()` on `window.online` event

```typescript
// Conceptual store schema
interface DraftStore {
  keyPath: 'client_id';
  records: Assessment[]; // full Assessment objects with syncStatus: 'draft'
}
```

### Sync flow

1. App starts → `IndexedDbService.getAll()` → merge any unsynced drafts into signal store
2. User submits while offline → `IndexedDbService.save(assessment)` → signal store gets draft record
3. Network restores → `window.online` event → `AssessmentService.syncDrafts()` → drafts promoted to `syncStatus: 'synced'` → `IndexedDbService.remove(id)`

---

## PWA — Future Complete Offline Support

> Not implemented in the prototype. This section documents the production path.

### What the prototype already establishes

- IndexedDB draft storage (the data persistence layer is in place)
- Network status detection (the sync trigger is in place)
- `AssessmentService` interface is backend-agnostic (signals swap for HTTP calls)

### What a full PWA would add

| Addition                                  | Purpose                                                                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `@angular/service-worker`                 | Registers a Service Worker via Angular's built-in PWA support                                                                          |
| `ngsw-config.json`                        | Cache strategies: `CacheFirst` for app assets, `StaleWhileRevalidate` for JSON data                                                    |
| Web App Manifest (`manifest.webmanifest`) | Install to home screen, fullscreen mode, Halcyon branding                                                                              |
| Background Sync API                       | Queue sync requests while offline; browser retries automatically when network restores — more robust than the `window.online` listener |
| Push Notifications                        | Notify RM when compliance has actioned their submission                                                                                |

### Enabling PWA in Angular

```bash
ng add @angular/pwa
```

This scaffolds the Service Worker registration, `ngsw-config.json`, and manifest automatically. The existing IndexedDB + sync service would then hand off to Background Sync for reliability.

### Cache strategy for regulatory data

Risk classification rules and sanctions lists change when FCA guidance is updated. The Service Worker cache strategy for these must be `NetworkFirst` (not `CacheFirst`) to ensure the app never silently applies stale rules when online.

---

## Accessibility (WCAG AA)

All components must pass AXE checks. Key requirements:

| Requirement                    | Implementation                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| Colour contrast ≥ 4.5:1 (text) | Brand palette validated against WCAG AA                                               |
| Touch targets ≥ 44×44px        | `--tap-target-min` CSS token enforced globally                                        |
| Focus visible                  | Custom focus ring on all interactive elements                                         |
| ARIA labels                    | `aria-label` on icon-only buttons; `aria-live` on risk badge (announces live updates) |
| Form labelling                 | All inputs have associated `<label>` elements                                         |
| Keyboard navigation            | All interactions reachable without a pointer                                          |
