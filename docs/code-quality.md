# SENTINEL Prototype — Code Quality

---

## Summary

| Tool                        | Scope                      | Enforcement point                |
| --------------------------- | -------------------------- | -------------------------------- |
| Prettier                    | Format                     | Pre-commit hook                  |
| ESLint (`@angular-eslint`)  | Lint                       | Pre-commit hook                  |
| TypeScript strict           | Type safety                | Pre-commit hook (`tsc --noEmit`) |
| Vitest                      | Unit tests                 | Manual / CI                      |
| Coverage (100% risk engine) | Business logic correctness | CI                               |
| SonarQube                   | Full code quality gate     | Production CI only               |

---

## Prettier

Already configured in `.prettierrc`:

- Print width: 100
- Single quotes
- Angular HTML parser for `.html` files

Run manually: `npx prettier --check .`

---

## ESLint

Package: `@angular-eslint` (includes `@typescript-eslint` and Angular-specific rules).

### Setup

```bash
ng add @angular-eslint/schematics
```

### Enforcement

- **Warns, does not block the build** (`ng lint` is advisory during development)
- **Blocks commits** via the pre-commit hook (see below)

### Key rules enabled

| Rule                                                        | Reason                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------ |
| `@typescript-eslint/no-explicit-any`                        | `any` breaks type safety — use `unknown`                           |
| `@typescript-eslint/explicit-function-return-type`          | Service methods must declare return types                          |
| `@angular-eslint/no-lifecycle-call`                         | Lifecycle hooks must not be called manually                        |
| `@angular-eslint/use-lifecycle-interface`                   | Lifecycle interfaces must be declared                              |
| `@angular-eslint/prefer-on-push-component-change-detection` | Enforces `OnPush` on all components                                |
| `@angular-eslint/no-host-metadata-property`                 | Use `host` object in decorator, not `@HostBinding`/`@HostListener` |

---

## Pre-Commit Hooks — Husky + lint-staged

### Setup

```bash
npm install --save-dev husky lint-staged
npx husky init
```

### Hook configuration (`.husky/pre-commit`)

```bash
npx lint-staged
```

### lint-staged configuration (`package.json`)

```json
"lint-staged": {
  "*.{ts,html,scss,json}": "prettier --check",
  "*.ts": [
    "eslint --max-warnings=0",
    "tsc --noEmit --skipLibCheck"
  ]
}
```

### What runs on commit

| Check                     | Files                                       | Blocks commit?                          |
| ------------------------- | ------------------------------------------- | --------------------------------------- |
| `prettier --check`        | All staged `.ts`, `.html`, `.scss`, `.json` | Yes                                     |
| `eslint --max-warnings=0` | Staged `.ts` only                           | Yes                                     |
| `tsc --noEmit`            | Staged `.ts` only                           | Yes                                     |
| Tests                     | —                                           | **No** — tests run in CI, not on commit |

Keeping tests out of the pre-commit hook ensures the hook completes in under 5 seconds.

---

## Unit Tests — Vitest

Vitest is already installed (`vitest ^4.0.8`, `jsdom ^28.0.0`).

### What to test

Only business logic that has regulatory or state-correctness implications:

| File                                   | What to test                                                                               | Why                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `core/services/risk-engine.service.ts` | Every rule combination across HIGH / MEDIUM / LOW                                          | Regulatory-critical — a wrong classification is a compliance failure |
| `core/services/assessment.service.ts`  | `add()`, `updateStatus()`, `syncDrafts()`                                                  | Core state mutations                                                 |
| CSV bootstrap / data coercion          | Type coercion (`"TRUE"` → `boolean`), `integrityMismatch` flag, `missingFields` population | Non-trivial parsing logic                                            |

### What to skip

| File                 | Reason to skip                                                   |
| -------------------- | ---------------------------------------------------------------- |
| `IndexedDbService`   | IndexedDB in jsdom requires complex mocking for minimal value    |
| Components           | Template rendering tests are high-effort, low-ROI in a prototype |
| `UserContextService` | Trivial signal reads/writes — no logic to assert                 |

### Risk engine test cases (non-exhaustive)

```typescript
// HIGH triggers
classifyRisk({ pep_status: true, ... })                         // → HIGH
classifyRisk({ sanctions_screening_match: true, ... })          // → HIGH
classifyRisk({ adverse_media_flag: true, ... })                 // → HIGH
classifyRisk({ country_of_tax_residence: 'Russia', ... })       // → HIGH

// MEDIUM triggers (no HIGH flags present)
classifyRisk({ client_type: 'ENTITY', ... })                    // → MEDIUM
classifyRisk({ country_of_tax_residence: 'UAE', ... })          // → MEDIUM
classifyRisk({ annual_income: 600000, source_of_funds: 'Gift' }) // → MEDIUM
classifyRisk({ annual_income: 600000, source_of_funds: 'Employment' }) // → LOW (income alone not enough)

// LOW
classifyRisk({ /* no flags, UK resident, individual, income < 500k */ }) // → LOW

// Highest tier wins
classifyRisk({ pep_status: true, client_type: 'ENTITY' })       // → HIGH (not MEDIUM)
```

### Running tests

```bash
npx vitest           # watch mode
npx vitest run       # single run (CI)
npx vitest --coverage  # with coverage report
```

---

## Coverage

### Threshold: 100% on the risk engine only

Configured in `vitest.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  include: ['src/app/core/services/risk-engine.service.ts'],
  thresholds: {
    lines: 100,
    functions: 100,
    branches: 100,
    statements: 100
  }
}
```

**No global coverage threshold.** A blanket percentage (e.g. 80% across all files) incentivises writing trivial tests to hit the number rather than testing what matters. The risk engine is the only file where 100% is both achievable and genuinely meaningful.

---

## SonarQube — Production Only

> Not configured for the prototype.

### Production quality gate (documented intent)

When the product moves to a real CI pipeline, a SonarQube quality gate would block merge-to-main if any of the following are breached:

| Metric                    | Threshold               |
| ------------------------- | ----------------------- |
| Cognitive complexity      | > 15 per function       |
| Code duplication          | > 3%                    |
| Security hotspots         | Any unreviewed          |
| Bugs (SonarQube detected) | Any new bug on new code |
| Coverage (new code)       | < 80%                   |

### Why not for the prototype

- Requires a SonarQube server or SonarCloud instance
- Adds CI pipeline complexity
- Its value (trend analysis, hotspot tracking, duplication across a large codebase) does not materialise at prototype scale
- ESLint + TypeScript strict + 100% risk engine coverage already catches the relevant issues at this stage
