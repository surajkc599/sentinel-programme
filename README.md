# SENTINEL — Client Onboarding Risk Assessment

A web application for UK wealth management firms that helps Relationship Managers log client assessments, automatically calculates risk classification, and gives Compliance Officers and Auditors a clear view of all submissions.

---

## What you need before starting

You need two free tools installed on your computer:

1. **Node.js** (version 18 or higher)
   Download from: https://nodejs.org — choose the **LTS** version and run the installer.

2. **Git** (to download the code)
   Download from: https://git-scm.com

To check if they are already installed, open a terminal (on Mac: **Terminal**, on Windows: **Command Prompt**) and type:

```
node --version
npm --version
```

If you see version numbers, you are good to go.

---

## Getting started

### Step 1 — Download the code

```bash
git clone https://github.com/YOUR-USERNAME/sentinel-programme.git
cd sentinel-programme
```

> Replace `YOUR-USERNAME` with the actual GitHub username.

### Step 2 — Install dependencies

This downloads all the libraries the app needs. Run it once after cloning.

```bash
npm install
```

### Step 3 — Start the app

```bash
npm start
```

Then open your browser and go to:

**http://localhost:4200**

The app will reload automatically if you make any changes to the code.

---

## Switching roles

The app has three roles you can switch between using the dropdown in the top-right corner:

| Role                     | What they can do                                                           |
| ------------------------ | -------------------------------------------------------------------------- |
| **Relationship Manager** | Fill in and submit new client assessments                                  |
| **Compliance Officer**   | Review submissions and approve, reject, or flag for enhanced due diligence |
| **Auditor**              | Read-only view of all assessments for cross-checking and audit             |

---

## Offline support

The app works without an internet connection. If you go offline:

- Assessments are saved locally in your browser (IndexedDB)
- They sync automatically when your connection returns
- Offline drafts are shown with a **Draft (Offline)** status badge

---

## Running the tests

```bash
npm test
```

This runs the unit test suite (76 tests) covering the risk classification engine and assessment service.

---

## Building for production

```bash
npm run build
```

The optimised output is placed in the `dist/` folder, ready to be deployed to any static web host.

---

## Project structure (for developers)

```
src/
├── app/
│   ├── core/
│   │   ├── models/          # Data types (Assessment, RiskClassification, etc.)
│   │   └── services/        # Business logic, state management, offline sync
│   ├── features/
│   │   ├── rm/              # Relationship Manager view
│   │   ├── compliance/      # Compliance Officer view
│   │   └── auditor/         # Auditor view
│   └── shared/
│       └── components/      # Reusable UI components (RiskBadge, StatusBadge, etc.)
└── assets/
    └── data/                # Seed data (46 sample client records)
```

---

## Tech stack

- **Angular 21** — frontend framework
- **Angular Material** — UI component library
- **Vitest** — unit testing
- **IndexedDB** — offline draft storage
- **TypeScript** — strict type checking throughout
