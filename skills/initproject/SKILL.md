---
name: initproject
description: Scaffold a new full-stack project from scratch. Captures a functional description (Linear ticket or prompt), checks the directory is empty, asks for stack type and project details, scaffolds the project structure, installs dependencies, initializes git with a develop branch, creates a GitHub repo, generates the agent team, and writes the newfeature skill.
argument-hint: ""
---

# Init Project Skill

**Version:** 1.8.0

Scaffolds a new full-stack project in the current working directory. Supports four stacks: **Firebase** (Firestore + Functions + Auth + Hosting), **Node.js + React** (PostgreSQL + Prisma + Express + React), **Node + pgvector + MCP** (Postgres/pgvector + Drizzle + Express API + ingest worker + MCP server + React), and **Go + pgvector + MCP** (Postgres/pgvector + Go API + ingest worker + MCP server + React). The two pgvector stacks default to a local Docker Postgres+pgvector and are built for semantic search / embeddings / recommenders. Always uses Vite + React + TailwindCSS v4 + React Query + Jotai + shadcn/ui on the frontend.

Execution mode: **pause at phase boundaries** — present a summary at the end of each major phase and wait for user approval before continuing.

## Changelog

### 1.8.0 — 2026-08-03
- **Two new stacks: `Node + pgvector + MCP` and `Go + pgvector + MCP`.** Postgres + pgvector for
  vector similarity, an ingest/background worker, a pluggable embeddings client, and an MCP server
  exposing the app's tools. Local dev runs the `pgvector/pgvector` Docker image via
  `docker-compose`; moving to a hosted Postgres later (e.g. Neon) is a one-line `DATABASE_URL`
  swap, since Neon is plain Postgres over the wire. Built for semantic search, embeddings and
  recommenders
- The Node variant is Drizzle + Express; the Go variant is pgx + chi with golang-migrate. They
  share the same shape and the same React frontend as the Node.js + React stack, differing only in
  backend language
- Threaded through the whole skill, not bolted on: stack selection, directory layout, file
  templates, `.gitignore`, install steps, CI/CD, the agent team, the `newfeature` skill and the
  final summary. The generated `CLAUDE.md` gains a `## Backend Rules — pgvector stacks` section
- The Go API deploys to Cloud Run through the same Workload Identity Federation as every other
  job — its secrets live in GCP Secret Manager and are referenced with `--set-secrets`, never
  copied into GitHub
- Rules the generated agents must follow: never mix vector spaces (raw numeric attributes stay in
  their own columns, never inside the text embedding), store `embedding_model` per row so model
  swaps are detectable, `CREATE EXTENSION vector` before any `vector` column, embedding work in
  the worker rather than an HTTP handler, and MCP tools reuse the API's service layer

### 1.7.0 — 2026-08-03
- **CI now authenticates to GCP keylessly via Workload Identity Federation.** Replaces the
  service-account JSON key, which many Google Workspace orgs block outright with
  `constraints/iam.disableServiceAccountKeyCreation` — and which is a long-lived credential
  sitting in GitHub regardless. Adds the full `gcloud` provisioning sequence, including the
  `attribute-condition` that pins the provider to one repository (without it, any repo on
  GitHub could assume the service account)
- Every authenticating job now declares `permissions: id-token: write`
- Hosting and preview channels deploy through `firebase-tools` on ADC, because
  `FirebaseExtended/action-hosting-deploy` only accepts a JSON key. Preview URLs are posted
  as a single updated PR comment instead
- Adds `verify-auth.yml`, a manual smoke test that exchanges the OIDC token and dry-runs a
  rules deploy — so federation problems surface in a minute rather than during a deploy
- Documents reading the web SDK config from the Firebase Management REST API when the CLI's
  credentials are stale, including the `x-goog-user-project` header whose absence produces a
  misleading `SERVICE_DISABLED` error
- Warns that `gh secret set` from an empty file succeeds silently, leaving an empty secret
- Lists the Functions v2 IAM roles that are easy to miss (run, artifactregistry, cloudbuild,
  eventarc) — omitting them fails the deploy late and confusingly

### 1.6.0 — 2026-08-03
- **CI/CD is now a first-class part of the scaffold, not an afterthought.** Three workflows:
  `ci.yml` (lint, types, build, rules tests, brand/doc checks), `deploy.yml` (production) and
  a new `preview.yml` (Firebase Hosting preview channel per PR)
- **Fixed a real ordering bug in the deploy workflow**: it shipped hosting *before* functions,
  rules and indexes, so a release could briefly serve a frontend calling a callable or index
  that did not exist yet. Backend now deploys first, with indexes before functions. The
  Node.js stack gets the same treatment via a `db-migrate` job that gates the frontend
- **eslint is actually installed and configured.** Previously the templates shipped a `lint`
  script referencing an eslint that was never a dependency and had no config — dead config
  that never ran. Now flat configs for both packages (eslint 9+ ignores `.eslintrc` and
  removed `--ext`), with `react-hooks` rules as the mechanical half of the
  no-fetch-in-`useEffect` rule. The backend config must be `.mjs`, since a CommonJS package
  cannot declare `"type": "module"`
- **Added Firestore rules tests** (`rules-tests/`, `@firebase/rules-unit-testing` + vitest) for
  the Firebase stack. Rules *are* the authorization layer; nothing else verified them. Covers
  client-write denial, role boundaries in both directions, self-elevation, confidential
  collections and list-query leakage
- Note that the Firestore emulator requires **JDK 21+** — firebase-tools rejects older
- Service-account auth replaces the deprecated `FIREBASE_TOKEN` / `firebase login:ci`
- Workflow-security rules written into the CI/CD agent: no untrusted event data in `run:`
  blocks, no `pull_request_target` with PR checkout, no secrets in script bodies
- Concurrency groups: CI cancels superseded runs; production deploy queues instead
- The install phase now verifies with `lint + tsc + build` per package, not just `pnpm install`

### 1.5.0 — 2026-08-02
- **Switch to pnpm throughout**, resolving the contradiction with the global standard in `~/.claude/CLAUDE.md`. All templates, install steps and GitHub workflows now use pnpm: `packageManager` field, `pnpm/action-setup@v4` + `cache: pnpm` + `pnpm-lock.yaml` paths, `pnpm install --frozen-lockfile`, `pnpm exec` over npx
- Document that pnpm blocks dependency build scripts by default, and pre-list the ones that are actually required (`esbuild` for Vite, `prisma` for client generation) in `pnpm.onlyBuiltDependencies`
- State explicitly that `app/` and `functions/`/`api/` stay independent pnpm projects — a root workspace breaks Firebase Functions deploys
- Fix `.gitignore` template: bare `dist/` and `lib/` also matched `app/src/lib/` and silently excluded source from the initial commit. Now anchored
- Add the required `app/src/vite-env.d.ts`; without it `import.meta.env` is untyped and `tsc --noEmit` fails on every env var, breaking the build and CI
- Add `@tailwindcss/vite` to the frontend deps and Vite config — Tailwind v4's `@import "tailwindcss"` does nothing without it
- Update hey-api to `^0.99.0` and drop the deprecated `@hey-api/client-fetch` dependency (bundled into `@hey-api/openapi-ts` since v0.73). Generation moves to `openapi-ts.config.ts`; client config moves to `src/lib/apiClient.ts` outside the generated folder; the generated client is committed so CI can typecheck

### 1.4.0 — 2026-07-01
- Add "Access model" question in Phase 3 (first-user-admin + waitroom / open / invite-only), asked only when auth is enabled
- Thread `ACCESS_MODEL` into `CLAUDE.md` (Access & Roles section) and every agent's context — question + context only, no code scaffolding

### 1.3.0 — 2026-04-28
- Add functional description step (Linear ticket or prompt) before categorical questions
- Thread `BUILD_DESCRIPTION` through `CLAUDE.md` and every agent's context

### 1.2.0 — 2026-03-16
- Ask what the user is building and why after stack selection
- Thread project vision into CLAUDE.md and agent team context

### 1.1.0 — 2026-03-16
- Add SETUP.md for Claude-driven install flow

### 1.0.0 — 2026-03-16
- Initial release: full project scaffolding with Firebase and Node.js stacks

---

## Phase 1: Safety Check

Run `ls -la` in the current working directory (do NOT use the Glob tool — we need to see hidden files and an accurate empty check).

If **any files or directories exist** (beyond a `.git` folder), show the user what was found and warn:

> "This directory is not empty. Initializing here may overwrite or conflict with existing files. Do you want to continue anyway?"

Use `AskUserQuestion`:
- Header: "Directory check"
- Question: "The current directory contains existing files. Continue anyway?"
- Options: "Yes, continue" / "No, abort"

If they say **No** → print "Aborted. Navigate to an empty directory and try again." and stop.

If the directory is empty → proceed immediately to Phase 2.

---

## Phase 2: Stack Selection

Use `AskUserQuestion` (single question):

- Header: "Stack"
- Question: "Which stack should this project use?"
- Options:
  - "Firebase" — "Firestore + Firebase Functions (onCall) + Firebase Auth + Firebase Hosting. Best for real-time apps, rapid prototyping, or teams already on Firebase."
  - "Node.js + React" — "PostgreSQL + Prisma + Express API + React frontend. Frontend on Firebase Hosting, API on Firebase App Hosting. Best for relational data or complex queries."
  - "Node + pgvector + MCP" — "Postgres + pgvector + Drizzle ORM + Express (BoilrApi) API + ingest/background worker + MCP server + React frontend. Local dev on Docker pgvector. Best for semantic search, embeddings, or recommenders that need vector similarity + an MCP endpoint, while staying in the Node/Firebase ecosystem."
  - "Go + pgvector + MCP" — "Postgres + pgvector + Go HTTP API + ingest/background worker + MCP server + React frontend. Local dev on Docker pgvector. Same vector/MCP capabilities as the Node variant, but a Go backend (pgx, chi) for teams that prefer Go."

Store the answer as `STACK` (`firebase`, `nodejs`, `nodevec`, or `go`).

> The two `pgvector` stacks (`nodevec`, `go`) share the same shape: a Postgres+pgvector DB run locally via `docker-compose` (the `pgvector/pgvector` image), an HTTP API, a separate **ingest/background worker** process, a pluggable **embeddings client**, and an **MCP server** exposing the app's tools. They differ only in backend language/runtime. Moving the DB to a hosted provider later (e.g. Neon serverless) is a one-line `DATABASE_URL` swap — Neon is plain Postgres over the wire, so no code changes.

### Functional description

Now capture a rich functional description of the app — what it does, key features, user flows. This grounds every downstream decision (CLAUDE.md, agent context, scaffolding choices) in the actual product, not just a category.

Use `AskUserQuestion`:
- Header: "Source"
- Question: "How would you like to describe what we're building?"
- Options:
  - "Linear ticket" — "Paste a Linear ticket URL or ID; we'll pull the title + description"
  - "Prompt" — "Describe the app's functionality in your own words"
- Use `multiSelect: false`

**If "Linear ticket":**
1. Use `AskUserQuestion` (header: "Linear ticket", question: "Paste the Linear ticket URL or ID.", options: none — user types via Other) to get the ticket reference.
2. Parse the workspace slug from the URL: `linear.app/<workspace>/issue/<TEAM-123>` → workspace = `<workspace>`, issue ID = `<TEAM-123>`.
3. If only an issue ID was pasted (no URL), use `AskUserQuestion` (header: "Workspace", options: `fleetly` / `mdl` / `njuju`) to pick the workspace.
4. Call `mcp__linear-<workspace>__get_issue` with the issue ID to fetch the title and description.
5. Combine the result as `<title>\n\n<description>` and store it as `BUILD_DESCRIPTION`.
6. Show the fetched ticket title + a short excerpt of the description back to the user and ask `AskUserQuestion` (header: "Confirm ticket", options: "Yes, that's the one" / "No, try a different ticket"). If "No", restart this step.

**If "Prompt":**
- Use `AskUserQuestion` (header: "Description", question: "What are we building? Describe the functionality, key features, and user flows.", options: none — user types via Other).
- Store the typed answer as `BUILD_DESCRIPTION`.

### Categorize the project

Now categorize the project to inform the agent team's context. Use `AskUserQuestion` with two questions:

**Question 1:**
- Header: "Building"
- Question: "What category does this app fall into?"
- Options:
  - "SaaS platform" — "A multi-user web app with subscriptions, dashboards, or team features"
  - "Internal tool" — "An internal dashboard, admin panel, or operations tool for a team or company"
  - "Consumer app" — "A public-facing product for end users (marketplace, social, content, etc.)"
- Use `multiSelect: false`

**Question 2:**
- Header: "Purpose"
- Question: "Why are you building this? What problem does it solve or what's the goal?"
- Options:
  - "New product" — "Building something new from scratch — a product idea or MVP"
  - "Replace manual process" — "Automating something currently done manually or in spreadsheets"
  - "Client project" — "Building this for a client or external stakeholder"
- Use `multiSelect: false`

Store: `PROJECT_VISION` (category), `PROJECT_PURPOSE` (why).

Users will often type their own answers via "Other" — that's expected and preferred since it gives more detail.

---

## Phase 3: Project Details

Use `AskUserQuestion` with multiple questions in one call:

**Question 1:**
- Header: "App name"
- Question: "What is the app name? (used for package.json, Firebase project ID, folder name, etc.)"
- Options: *(none — user will type via Other)*
- Use `multiSelect: false`

**Question 2:**
- Header: "Multi-tenant"
- Question: "Is this a multi-tenant application? (data scoped per company/org/tenant)"
- Options:
  - "Yes" — "Data is partitioned by tenant ID. Affects DB schema, auth rules, and agent instructions."
  - "No" — "Single-tenant or user-scoped only."

**Question 3:**
- Header: "Auth provider"
- Question: "How will authentication work?"
- Options:
  - "Firebase Auth" — "Firebase Authentication (email/password, Google OAuth, etc.)"
  - "JWT" — "Custom JWT-based auth (issued by your API)"
  - "None" — "No authentication for now"

Store: `APP_NAME`, `MULTI_TENANT`, `AUTH_PROVIDER`.

### Access model

**Only ask this if `AUTH_PROVIDER` is not "None".** If auth is "None", set `ACCESS_MODEL` to `open` and skip the question.

Use `AskUserQuestion`:
- Header: "Access model"
- Question: "How should users get access once they authenticate?"
- Options:
  - "First-user-admin + waitroom" — "The first person to sign in becomes the admin; everyone else lands in a waitroom (pending) until an admin approves them. Admin can approve/reject users and manage roles."
  - "Open" — "Any authenticated user immediately gets full access. Simplest; good for trusted/internal groups or early prototypes."
  - "Invite-only" — "Admins pre-authorize specific emails/domains; only invited users can get in."
- Use `multiSelect: false`

Store: `ACCESS_MODEL` (`first-user-admin`, `open`, or `invite-only`).

**Pause** — show a summary of all choices and ask "Ready to scaffold? This will create the project structure and install dependencies." The summary must include:
- `BUILD_DESCRIPTION` (what we're building)
- `PROJECT_VISION` (category)
- `PROJECT_PURPOSE` (why)
- `STACK`, `APP_NAME`, `MULTI_TENANT`, `AUTH_PROVIDER`, `ACCESS_MODEL`

Use `AskUserQuestion`:
- Options: "Yes, scaffold it" / "No, let me reconsider"

If No → go back to Phase 2.

---

## Phase 4: Scaffold Project

### 4a: Create directory structure

Create the following structure depending on the stack. Use the Bash tool to run `mkdir -p` commands.

**Firebase stack:**
```
mkdir -p app/src/components app/src/pages app/src/hooks app/src/store app/src/lib
mkdir -p functions/src/lib
mkdir -p rules-tests
mkdir -p .github/workflows
mkdir -p .claude/agents .claude/skills/newfeature
```

**Node.js + React stack:**
```
mkdir -p app/src/components app/src/pages app/src/hooks app/src/store app/src/lib
mkdir -p api/src/api api/src/app api/src/types api/src/utils api/src/services
mkdir -p api/prisma
mkdir -p .github/workflows
mkdir -p .claude/agents .claude/skills/newfeature

**Node + pgvector + MCP stack:**
```
mkdir -p app/src/components app/src/pages app/src/hooks app/src/store app/src/lib
mkdir -p api/src/api api/src/app api/src/types api/src/utils api/src/services
mkdir -p api/src/db/migrations api/src/embed api/src/worker api/src/mcp
mkdir -p .github/workflows
mkdir -p .claude/agents .claude/skills/newfeature
```

**Go + pgvector + MCP stack:**
```
mkdir -p app/src/components app/src/pages app/src/hooks app/src/store app/src/lib
mkdir -p cmd/api cmd/worker cmd/mcp
mkdir -p internal/config internal/store internal/httpapi internal/embed internal/mcpserver
mkdir -p db/migrations
mkdir -p .github/workflows
mkdir -p .claude/agents .claude/skills/newfeature
```

```

### 4b: Write config files

#### Both stacks — `app/` frontend

Write `app/package.json`:
```json
{
  "name": "<APP_NAME>-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "packageManager": "pnpm@10.8.1",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --report-unused-disable-directives --max-warnings 0"
  },
  "pnpm": {
    "onlyBuiltDependencies": ["esbuild"]
  },
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "jotai": "^2.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.0.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

Write `app/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
```

Write `app/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Write `app/tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

Write `app/src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

Write `app/src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

Write `app/src/pages/HomePage.tsx`:
```tsx
export function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <h1 className="text-4xl font-bold text-foreground">Hello from <APP_NAME></h1>
    </main>
  );
}
```

Write `app/src/index.css`:
```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}
```

Write `app/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><APP_NAME></title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Write `app/src/vite-env.d.ts` — **required**. Without it `import.meta.env` is untyped and `tsc --noEmit` fails on every env var, which breaks both the build and CI. Add an entry for each `VITE_*` variable the project uses:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Firebase stack — mirrors app/.env.example
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  // Node.js stack
  // readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

Write `app/src/store/uiAtoms.ts`:
```typescript
import { atom } from 'jotai';

// UI state atoms — for local/client state only
// Server state belongs in React Query, not here
export const sidebarOpenAtom = atom(false);
```

Write `app/src/lib/queryClient.ts`:
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});
```

#### Firebase-specific files

Write `functions/package.json`:
```json
{
  "name": "<APP_NAME>-functions",
  "version": "0.1.0",
  "engines": { "node": "20" },
  "main": "lib/index.js",
  "packageManager": "pnpm@10.8.1",
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "serve": "pnpm run build && firebase emulators:start --only functions",
    "shell": "pnpm run build && firebase functions:shell",
    "start": "pnpm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^6.0.0",
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "firebase-functions-test": "^3.0.0"
  },
  "private": true
}
```

Write `functions/tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2020",
    "skipLibCheck": true
  },
  "compileOnSave": true,
  "include": ["src"]
}
```

Write `functions/src/index.ts`:
```typescript
import * as admin from 'firebase-admin';

admin.initializeApp();

// Export functions here
// Example: export { myFunction } from './myFunction';
```

Write `firebase.json`:
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": ["node_modules", ".git", "firebase-debug.log", "firebase-debug.*.log", "*.local"]
    }
  ],
  "hosting": {
    "public": "app/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "emulators": {
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "hosting": { "port": 5000 },
    "ui": { "enabled": true },
    "singleProjectMode": true
  }
}
```

Write `.firebaserc`:
```json
{
  "projects": {
    "default": "<APP_NAME>"
  }
}
```

Write `firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Deny all by default — add specific rules as you build features
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Write `firestore.indexes.json`:
```json
{
  "indexes": [],
  "fieldOverrides": []
}
```

Also add Firebase SDK to frontend dependencies. Update `app/package.json` to add:
```json
"firebase": "^10.0.0"
```

Write `app/src/lib/firebase.ts`:
```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

// TODO: Replace with your Firebase project config
// Get it from Firebase Console → Project Settings → Your apps
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, 'europe-west1');
```

Write `app/.env.example`:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

#### Node.js + React–specific files

The API uses the **BoilrApi** pattern — a class-based endpoint registry on top of Express that handles TypeBox validation, JWT auth, error handling, and auto-generates an OpenAPI spec. Never write raw Express route handlers; always use `api.addEndpoint(route)`.

The frontend uses **hey-api** to generate a typed client from the OpenAPI spec — no raw fetch calls.

Write `api/package.json`:
```json
{
  "name": "<APP_NAME>-api",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@10.8.1",
  "pnpm": {
    "onlyBuiltDependencies": ["prisma", "@prisma/client"]
  },
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "NODE_ENV=production node dist/index.js",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^6.0.0",
    "@sinclair/typebox": "^0.32.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.19.0",
    "jsonwebtoken": "^9.0.2",
    "pino": "^8.19.0",
    "pino-pretty": "^13.0.0",
    "swagger-ui-express": "^5.0.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.0.0",
    "@types/swagger-ui-express": "^4.1.6",
    "prisma": "^6.0.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.0"
  }
}
```

Write `api/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "compileOnSave": true,
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Write `api/src/types/index.ts`:
```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { Request, Response } from 'express';

export interface JWTPayload {
  sub: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  roles?: string[];
  [key: string]: unknown;
}

export type Route = {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  input?: {
    query?: any;
    body?: any;
    params?: any;
  };
  auth?: {
    required?: boolean;
    optional?: boolean;
    roles?: string[];
  };
  handler: (args: {
    req: Request;
    res: Response;
    query: any;
    body: any;
    params: any;
    user?: JWTPayload;
  }) => Promise<any>;
  middleware?: any[];
  validators?: {
    query?: ReturnType<typeof TypeCompiler.Compile>;
    body?: ReturnType<typeof TypeCompiler.Compile>;
    params?: ReturnType<typeof TypeCompiler.Compile>;
  };
};

export type Config = {
  port: number;
  api: {
    cors_origin?: string[];
    limit?: string;
    jwt?: {
      secret: string;
      expiresIn: string;
    };
  };
};

export interface JWTConfig {
  secret: string;
  expiresIn: string;
}
```

Write `api/src/api/index.ts` — this is the core BoilrApi class:
```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { Request, Response, Express } from 'express';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import cors from 'cors';
import { Config, Route, JWTPayload } from '../types';
import pino from 'pino';
import { JWTService } from '../utils/jwt';
import swaggerUi from 'swagger-ui-express';

class ValidationError extends Error {
  details: unknown;
  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export default class BoilrApi {
  endpoints: Array<Route>;
  cors_origin: string[];
  limit: string;
  jwtService?: JWTService;

  constructor(config: Config) {
    this.endpoints = [];
    this.cors_origin = config.api.cors_origin || [];
    this.limit = config.api.limit || '50mb';
    if (config.api.jwt) {
      this.jwtService = new JWTService(config.api.jwt);
    }
  }

  addEndpoint = (routeObj: Route): void => {
    const { input } = routeObj;
    const validators: {
      query?: ReturnType<typeof TypeCompiler.Compile>;
      body?: ReturnType<typeof TypeCompiler.Compile>;
      params?: ReturnType<typeof TypeCompiler.Compile>;
    } = {};
    if (input?.query) validators.query = TypeCompiler.Compile(input.query);
    if (input?.body) validators.body = TypeCompiler.Compile(input.body);
    if (input?.params) validators.params = TypeCompiler.Compile(input.params);
    this.endpoints.push({ ...routeObj, validators });
  };

  generateOpenApiDefinition = () => {
    const paths: Record<string, any> = {};
    this.endpoints.forEach((route) => {
      const { method, path, input, auth } = route;
      const openApiPath = path.replace(/:([^/]+)/g, '{$1}');
      if (!paths[openApiPath]) paths[openApiPath] = {};

      const operation: any = {
        summary: `${method.toUpperCase()} ${path}`,
        operationId: `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
        tags: ['API'],
        responses: {
          '200': { description: 'Successful operation', content: { 'application/json': { schema: { type: 'object' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' }, details: { type: 'array', items: { type: 'string' } } } } } } },
          '401': { description: 'Authentication error', content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } } },
          '500': { description: 'Internal server error', content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } } },
        },
      };

      if (auth?.required) operation.security = [{ bearerAuth: [] }];

      const parameters: any[] = [];
      if (input?.params) {
        Object.entries(input.params.properties || {}).forEach(([name, schema]: [string, any]) => {
          parameters.push({ name, in: 'path', required: input.params.required?.includes(name) || false, schema: this.convertTypeBoxToOpenApi(schema) });
        });
      }
      if (input?.query) {
        Object.entries(input.query.properties || {}).forEach(([name, schema]: [string, any]) => {
          parameters.push({ name, in: 'query', required: input.query.required?.includes(name) || false, schema: this.convertTypeBoxToOpenApi(schema) });
        });
      }
      if (parameters.length > 0) operation.parameters = parameters;
      if (input?.body) {
        operation.requestBody = { required: true, content: { 'application/json': { schema: this.convertTypeBoxToOpenApi(input.body) } } };
      }
      paths[openApiPath][method] = operation;
    });

    return {
      openapi: '3.0.0',
      info: { title: '<APP_NAME> API', version: '1.0.0', description: 'Auto-generated API documentation' },
      servers: [{ url: '/api', description: 'API server' }],
      paths,
      components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    };
  };

  private convertTypeBoxToOpenApi(schema: any): any {
    if (!schema) return { type: 'object' };
    if (schema.type === 'string') return { type: 'string' };
    if (schema.type === 'number') return { type: 'number' };
    if (schema.type === 'integer') return { type: 'integer' };
    if (schema.type === 'boolean') return { type: 'boolean' };
    if (schema.type === 'array') return { type: 'array', items: this.convertTypeBoxToOpenApi(schema.items) };
    if (schema.type === 'object') {
      const properties: Record<string, any> = {};
      const required: string[] = [];
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([key, value]: [string, any]) => {
          properties[key] = this.convertTypeBoxToOpenApi(value);
        });
      }
      if (schema.required) required.push(...schema.required);
      return { type: 'object', properties, required: required.length > 0 ? required : undefined };
    }
    return { type: 'object' };
  }

  private validateAuth(route: Route, req: Request): JWTPayload | undefined {
    if (!route.auth) return undefined;
    if (!route.auth.required && !route.auth.optional) return undefined;
    if (!this.jwtService && route.auth.required) throw new AuthError('JWT service not configured');
    const authHeader = req.headers.authorization;
    if (!authHeader && route.auth.required) throw new AuthError('No authorization header');
    if (!authHeader && route.auth.optional) return undefined;
    if (authHeader) {
      const token = this.jwtService!.extractTokenFromHeader(authHeader);
      const payload = this.jwtService!.verifyToken(token);
      if (route.auth.roles && route.auth.roles.length > 0) {
        const hasRequiredRole = route.auth.roles.some((role) => payload.roles?.includes(role));
        if (!hasRequiredRole) throw new AuthError('Insufficient permissions');
      }
      return payload;
    }
    return undefined;
  }

  express() {
    const app: Express = express();
    app.use(cors({
      origin: this.cors_origin,
      methods: 'GET,OPTIONS,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Accept,Accept-Encoding,Content-Length,Content-Type,Host,Origin,Authorization',
      exposedHeaders: 'Content-Length,Content-Type,Content-Disposition',
      credentials: true,
    }));
    app.use(express.json({ limit: this.limit }));
    app.use(express.urlencoded({ limit: this.limit, extended: true }));

    const openApiSpec = this.generateOpenApiDefinition();
    app.get('/openapi.json', (_req: Request, res: Response) => res.json(openApiSpec));
    app.use('/doc', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: '<APP_NAME> API Documentation',
    }));

    this.endpoints.forEach((route) => {
      const { method, path, handler, middleware = [] } = route;
      pino().info(`Adding route: ${method.toUpperCase()} ${path}`);
      const handlers = [
        ...middleware,
        async (req: Request, res: Response) => {
          try {
            const { validators } = route;
            if (validators) {
              if (validators.query && !validators.query.Check(req.query)) {
                throw new ValidationError('Invalid query', [...validators.query.Errors(req.query)]);
              }
              if (validators.body && !validators.body.Check(req.body)) {
                throw new ValidationError('Invalid body', [...validators.body.Errors(req.body)]);
              }
              if (validators.params && !validators.params.Check(req.params)) {
                throw new ValidationError('Invalid params', [...validators.params.Errors(req.params)]);
              }
            }
            const user = this.validateAuth(route, req);
            const result = await handler({ req, res, query: req.query, body: req.body, params: req.params, user });
            if (!res.headersSent) res.status(200).json(result);
          } catch (error) {
            if (error instanceof ValidationError) {
              res.status(400).json({ error: error.message, details: error.details });
            } else if (error instanceof AuthError) {
              res.status(401).json({ error: error.message });
            } else {
              res.status(500).json({ error: 'Internal Server Error' });
            }
          }
        },
      ];
      app[method](path, ...handlers);
    });

    return app;
  }
}
```

Write `api/src/utils/jwt.ts`:
```typescript
import jwt from 'jsonwebtoken';
import { JWTConfig, JWTPayload } from '../types';

export class JWTService {
  private config: JWTConfig;

  constructor(config: JWTConfig) {
    this.config = config;
  }

  generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.config.secret as jwt.Secret, {
      expiresIn: this.config.expiresIn,
    } as jwt.SignOptions);
  }

  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.config.secret as jwt.Secret) as JWTPayload;
    } catch {
      throw new Error('Invalid token');
    }
  }

  extractTokenFromHeader(header: string): string {
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) throw new Error('Invalid authorization header');
    return token;
  }
}
```

Write `api/src/services/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

Write `api/src/app/index.ts` — route registration (add new route classes here):
```typescript
import { config } from 'dotenv';
config();
import BoilrApi from '../api';
import { Config } from '../types';
import { JWTService } from '../utils/jwt';
// import { UserRoutes } from './users';

export default (appConfig: Config) => {
  const api = new BoilrApi(appConfig);

  const jwtService = new JWTService({
    secret: appConfig.api.jwt?.secret || 'fallback-secret',
    expiresIn: appConfig.api.jwt?.expiresIn || '7d',
  });

  // Register route classes here:
  // new UserRoutes(jwtService).getRoutes().forEach(r => api.addEndpoint(r));

  return api;
};
```

Write `api/src/index.ts`:
```typescript
import { config } from 'dotenv';
config();
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import createApi from './app';
import express from 'express';
import { join } from 'path';
import { createServer } from 'http';

const Config = {
  port: Number(process.env.PORT) || 8080,
  api: {
    cors_origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    limit: process.env.API_LIMIT || '50mb',
    jwt: process.env.JWT_SECRET
      ? { secret: process.env.JWT_SECRET, expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      : undefined,
  },
};

const logger = pino({
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
    },
  }),
  level: process.env.LOG_LEVEL || 'info',
});

const run = async () => {
  const prisma = new PrismaClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).prisma = prisma;

  const router = express();
  const server = createServer(router);

  const api = createApi(Config);
  router.use('/api', api.express());

  router.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info({
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${Date.now() - start}ms`,
      }, 'HTTP Request');
    });
    next();
  });

  router.use('/', express.static(join(__dirname, '../public')));

  server.listen(Config.port, () => {
    logger.info(`Server running on http://localhost:${Config.port}`);
    logger.info(`API docs: http://localhost:${Config.port}/api/doc`);
    logger.info(`OpenAPI spec: http://localhost:${Config.port}/api/openapi.json`);
  });
};

run();
```

Write `api/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Add your models here
```

Write `api/.env.example`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/<APP_NAME>
PORT=8080
JWT_SECRET=
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
NODE_ENV=development
```

Write `api/apphosting.yaml` — Firebase App Hosting config for the Node.js API:
```yaml
runConfig:
  runtime: nodejs20
  minInstances: 0

env:
  - variable: NODE_ENV
    value: production
  - variable: PORT
    value: "8080"
  - variable: JWT_EXPIRES_IN
    value: 7d
  - variable: LOG_LEVEL
    value: info
  - variable: DATABASE_URL
    secret: DATABASE_URL
  - variable: JWT_SECRET
    secret: JWT_SECRET
  - variable: CORS_ORIGIN
    secret: CORS_ORIGIN
```

Write `firebase.json` (Node.js + React stack):
```json
{
  "hosting": {
    "public": "app/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

Write `.firebaserc` (Node.js + React stack):
```json
{
  "projects": {
    "default": "<APP_NAME>"
  }
}
```

Also add hey-api to the frontend for client generation. Update `app/package.json` devDependencies to add:
```json
"@hey-api/openapi-ts": "^0.99.0"
```

There is **no separate client package** — `@hey-api/client-fetch` was deprecated at v0.73 and the fetch client now ships inside `@hey-api/openapi-ts`. Do not add it.

Add to `app/package.json` scripts:
```json
"generate:api": "openapi-ts"
```

Write `app/openapi-ts.config.ts`:
```typescript
import { defineConfig } from '@hey-api/openapi-ts';

// Generates the typed API client from the OpenAPI spec.
// Run `pnpm run generate:api` with the API running.
// Everything under src/lib/api is generated — never hand-edit it.
export default defineConfig({
  input: process.env.OPENAPI_URL ?? 'http://localhost:8080/api/openapi.json',
  output: 'src/lib/api',
  plugins: ['@hey-api/client-fetch'],
});
```

(`'@hey-api/client-fetch'` here is a **plugin name**, not a dependency.)

Write `app/src/lib/apiClient.ts` — client configuration lives outside the generated folder, which is overwritten on every regeneration:
```typescript
import { client } from './api/client.gen';

client.setConfig({ baseUrl: import.meta.env.VITE_API_URL });

// Attach the auth token to every request.
client.interceptors.request.use(async (request) => {
  const token = localStorage.getItem('token');
  if (token) request.headers.set('Authorization', `Bearer ${token}`);
  return request;
});

export { client };
```

Import it once from `app/src/main.tsx` (`import './lib/apiClient';`) so the configuration is applied before any request.

**Commit the generated `app/src/lib/api/` folder.** CI runs `tsc --noEmit`, and a fresh clone has no API running to generate against — if the folder is absent, CI fails the moment any code imports it.

Write `app/.env.example`:
```
VITE_API_URL=http://localhost:8080
```

#### Node + pgvector + MCP–specific files

This stack is the **Node.js + React** stack with two changes: the data layer is **Drizzle ORM** over Postgres+pgvector (not Prisma), and it adds three things from the architecture playbook — a **docker-compose** Postgres, an **ingest/background worker**, an **embeddings client**, and an **MCP server**.

The frontend is **identical to the Node.js + React stack** (hey-api typed client + `VITE_API_URL`). The following API files are also **identical to the Node.js + React stack** — write them exactly as specified there: `api/src/api/index.ts` (BoilrApi), `api/src/utils/jwt.ts`, `api/src/types/index.ts`, `api/src/app/index.ts`, `api/src/index.ts`, `api/tsconfig.json`, `api/apphosting.yaml`. The differences and additions are below.

Write `api/package.json` (Drizzle replaces Prisma; adds worker + mcp scripts):
```json
{
  "name": "<APP_NAME>-api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "worker": "ts-node-dev --respawn --transpile-only src/worker/index.ts",
    "mcp": "ts-node-dev --respawn --transpile-only src/mcp/index.ts",
    "build": "tsc",
    "start": "NODE_ENV=production node dist/index.js",
    "start:worker": "NODE_ENV=production node dist/worker/index.js",
    "start:mcp": "NODE_ENV=production node dist/mcp/index.js",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:up": "docker compose up -d db",
    "db:down": "docker compose down"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@sinclair/typebox": "^0.32.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "drizzle-orm": "^0.36.0",
    "express": "^4.19.0",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.13.0",
    "pgvector": "^0.2.0",
    "pino": "^8.19.0",
    "pino-pretty": "^13.0.0",
    "swagger-ui-express": "^5.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.0.0",
    "@types/pg": "^8.11.0",
    "@types/swagger-ui-express": "^4.1.6",
    "drizzle-kit": "^0.28.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.0"
  }
}
```

Write `api/drizzle.config.ts`:
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

Write `api/src/db/schema.ts` — Drizzle schema with a native `vector` column (the `<EMBED_DIM>` matches your embeddings model, e.g. 1536):
```typescript
import { pgTable, serial, text, integer, real, timestamp, jsonb, index, vector } from 'drizzle-orm/pg-core';

// Example domain table. Replace with your real entities.
// Keep raw numeric attributes OUT of the embedding — store them as plain columns
// and keep the embedding for semantic similarity only.
export const items = pgTable(
  'items',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    attributes: jsonb('attributes').$type<Record<string, unknown>>().default({}),
    embedding: vector('embedding', { dimensions: 1536 }),
    embeddingModel: text('embedding_model'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    embeddingIdx: index('items_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
  }),
);

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
```

Write `api/src/db/index.ts` — the Drizzle client over a `pg` pool:
```typescript
import { config } from 'dotenv';
config();
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
export { schema };
```

**Migrations — pgvector ordering gotcha.** `drizzle-kit migrate` only runs migrations tracked in `src/db/migrations/meta/_journal.json`; a hand-written `.sql` you drop in **will not run**. And the generated migration creates `vector` columns, which fail unless the `vector` extension already exists. So the order is:
1. `pnpm db:generate` — creates the first tracked migration (`0000_<name>.sql`) with the tables + HNSW index.
2. **Prepend** the extension to that generated file as its first statement:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   --> statement-breakpoint
   ```
   (do NOT create a separate `0000_init.sql` — it won't be journaled).
3. `pnpm db:migrate` — applies it.

Write `api/src/embed/index.ts` — a pluggable embeddings client (managed API for MVP, swap for a self-hosted model later):
```typescript
// Pluggable embeddings interface. Default impl calls a managed embeddings API.
// Swap EMBEDDINGS_PROVIDER / the implementation for a self-hosted model later.
export interface Embedder {
  readonly model: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

class ManagedEmbedder implements Embedder {
  readonly model = process.env.EMBEDDINGS_MODEL || 'text-embedding-3-small';
  readonly dimensions = Number(process.env.EMBEDDINGS_DIM || 1536);

  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetch(`${process.env.EMBEDDINGS_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.EMBEDDINGS_API_KEY}`,
      },
      body: JSON.stringify({ model: this.model, input: texts }),
    });
    if (!res.ok) throw new Error(`Embeddings API error: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { data: { embedding: number[] }[] };
    return json.data.map((d) => d.embedding);
  }
}

export const embedder: Embedder = new ManagedEmbedder();
```

Write `api/src/services/search.ts` — example vector similarity query (cosine distance via Drizzle + pgvector):
```typescript
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { items } from '../db/schema';
import { embedder } from '../embed';

// Returns the nearest items to a free-text query by cosine similarity.
export async function searchItems(query: string, limit = 20) {
  const [queryEmbedding] = await embedder.embed([query]);
  const vec = JSON.stringify(queryEmbedding); // pgvector accepts the '[...]' text form
  return db
    .select({
      id: items.id,
      name: items.name,
      score: sql<number>`1 - (${items.embedding} <=> ${vec}::vector)`,
    })
    .from(items)
    .orderBy(sql`${items.embedding} <=> ${vec}::vector`)
    .limit(limit);
}
```

Write `api/src/worker/index.ts` — the ingest/background worker (runs as its own process):
```typescript
import { config } from 'dotenv';
config();
import pino from 'pino';
import { db } from '../db';
import { items } from '../db/schema';
import { embedder } from '../embed';

const logger = pino({ transport: { target: 'pino-pretty' } });

// Ingest pipeline entrypoint: fetch source data → compose documents → embed → upsert.
// Replace the body with your real pipeline (e.g. fetch from an external API with
// backoff, map to fun-profile/features, embed the composed document, upsert).
async function runOnce() {
  logger.info('ingest worker tick');
  // Example: backfill embeddings for rows missing one.
  const rows = await db.select().from(items);
  logger.info({ count: rows.length }, 'items in db');
}

async function main() {
  await runOnce();
  // For a long-running worker, replace with a queue consumer or interval loop.
  process.exit(0);
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
```

Write `api/src/mcp/index.ts` — an MCP server (stdio) exposing the app's tools so it works directly from Claude/agents:
```typescript
import { config } from 'dotenv';
config();
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { searchItems } from '../services/search';

const server = new McpServer({ name: '<APP_NAME>', version: '0.1.0' });

// Expose your domain tools here. These are usable from any MCP client (Claude, agents).
server.tool(
  'search_items',
  'Semantic search over items by natural-language query.',
  { query: z.string(), limit: z.number().int().min(1).max(100).default(20) },
  async ({ query, limit }) => {
    const results = await searchItems(query, limit);
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Write `api/.env.example`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/<APP_NAME>?sslmode=disable
PORT=8080
JWT_SECRET=
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
NODE_ENV=development

# Embeddings (managed API for MVP; swap for self-hosted later)
EMBEDDINGS_BASE_URL=https://api.openai.com/v1
EMBEDDINGS_API_KEY=
EMBEDDINGS_MODEL=text-embedding-3-small
EMBEDDINGS_DIM=1536
```

Write `docker-compose.yml` (repo root) — local Postgres+pgvector, the default dev DB:
```yaml
services:
  db:
    image: pgvector/pgvector:pg17
    container_name: <APP_NAME>-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: <APP_NAME>
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

> **Local first, Neon later.** `pnpm db:up` starts the pgvector container; `DATABASE_URL` points at it. To move to a hosted DB later (e.g. Neon serverless), paste its connection string into `DATABASE_URL` (Neon needs `?sslmode=require` and a `-pooler` host) — no code or schema changes, since Neon is plain Postgres.

Also: the frontend hey-api setup (devDependencies, `generate:api` script, `app/.env.example` with `VITE_API_URL`) is **identical to the Node.js + React stack** — apply it here too.

#### Go + pgvector + MCP–specific files

A Go backend with the same capabilities as the Node + pgvector stack: HTTP API, ingest/background worker, embeddings client, and MCP server, over Postgres+pgvector. The **frontend is identical to the Node.js + React stack** (hey-api typed client + `VITE_API_URL` — the Go API serves the same OpenAPI-style JSON contract; generate the client against the running API). Uses `pgx` + `pgvector-go`, `chi` for routing, `golang-jwt` for auth.

Write `go.mod` (replace the module path with the user's GitHub org/repo):
```
module github.com/<GITHUB_OWNER>/<APP_NAME>

go 1.23

require (
	github.com/go-chi/chi/v5 v5.1.0
	github.com/go-chi/cors v1.2.1
	github.com/golang-jwt/jwt/v5 v5.2.1
	github.com/jackc/pgx/v5 v5.7.1
	github.com/joho/godotenv v1.5.1
	github.com/modelcontextprotocol/go-sdk v0.2.0
	github.com/pgvector/pgvector-go v0.2.2
)
```

> `modelcontextprotocol/go-sdk` and `pgvector-go` versions move fast — after writing `go.mod`, run `go mod tidy` and let it resolve the latest compatible versions; pin whatever it selects.

Write `internal/config/config.go`:
```go
package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	DatabaseURL    string
	JWTSecret      string
	JWTExpiresIn   string
	CORSOrigins    []string
	EmbedBaseURL   string
	EmbedAPIKey    string
	EmbedModel     string
	EmbedDim       int
}

func Load() Config {
	_ = godotenv.Load()
	return Config{
		Port:         getenv("PORT", "8080"),
		DatabaseURL:  os.Getenv("DATABASE_URL"),
		JWTSecret:    os.Getenv("JWT_SECRET"),
		JWTExpiresIn: getenv("JWT_EXPIRES_IN", "7d"),
		CORSOrigins:  strings.Split(getenv("CORS_ORIGIN", "http://localhost:5173"), ","),
		EmbedBaseURL: getenv("EMBEDDINGS_BASE_URL", "https://api.openai.com/v1"),
		EmbedAPIKey:  os.Getenv("EMBEDDINGS_API_KEY"),
		EmbedModel:   getenv("EMBEDDINGS_MODEL", "text-embedding-3-small"),
		EmbedDim:     1536,
	}
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
```

Write `internal/store/store.go` — pgx pool with pgvector registered:
```go
package store

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/pgvector/pgvector-go"
)

type Store struct {
	Pool *pgxpool.Pool
}

func New(ctx context.Context, databaseURL string) (*Store, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, err
	}
	return &Store{Pool: pool}, nil
}

func (s *Store) Close() { s.Pool.Close() }

// SearchResult is one nearest-neighbour hit.
type SearchResult struct {
	ID    int64   `json:"id"`
	Name  string  `json:"name"`
	Score float64 `json:"score"`
}

// SearchItems returns the nearest items to the query embedding by cosine similarity.
func (s *Store) SearchItems(ctx context.Context, queryEmbedding []float32, limit int) ([]SearchResult, error) {
	vec := pgvector.NewVector(queryEmbedding)
	rows, err := s.Pool.Query(ctx,
		`SELECT id, name, 1 - (embedding <=> $1) AS score
		 FROM items
		 ORDER BY embedding <=> $1
		 LIMIT $2`, vec, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []SearchResult
	for rows.Next() {
		var r SearchResult
		if err := rows.Scan(&r.ID, &r.Name, &r.Score); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}
```

Write `internal/embed/embed.go` — pluggable embeddings client:
```go
package embed

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

type Embedder interface {
	Embed(ctx context.Context, texts []string) ([][]float32, error)
}

type ManagedEmbedder struct {
	BaseURL string
	APIKey  string
	Model   string
	HTTP    *http.Client
}

func NewManaged(baseURL, apiKey, model string) *ManagedEmbedder {
	return &ManagedEmbedder{BaseURL: baseURL, APIKey: apiKey, Model: model, HTTP: http.DefaultClient}
}

func (m *ManagedEmbedder) Embed(ctx context.Context, texts []string) ([][]float32, error) {
	body, _ := json.Marshal(map[string]any{"model": m.Model, "input": texts})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, m.BaseURL+"/embeddings", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+m.APIKey)
	resp, err := m.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("embeddings API: %s", resp.Status)
	}
	var parsed struct {
		Data []struct {
			Embedding []float32 `json:"embedding"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, err
	}
	out := make([][]float32, len(parsed.Data))
	for i, d := range parsed.Data {
		out[i] = d.Embedding
	}
	return out, nil
}
```

Write `internal/httpapi/router.go` — chi router with health, CORS, and JWT middleware:
```go
package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/<GITHUB_OWNER>/<APP_NAME>/internal/config"
	"github.com/<GITHUB_OWNER>/<APP_NAME>/internal/embed"
	"github.com/<GITHUB_OWNER>/<APP_NAME>/internal/store"
)

type Server struct {
	cfg   config.Config
	store *store.Store
	embed embed.Embedder
}

func New(cfg config.Config, st *store.Store, em embed.Embedder) http.Handler {
	s := &Server{cfg: cfg, store: st, embed: em}
	r := chi.NewRouter()
	r.Use(middleware.Logger, middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) { writeJSON(w, 200, map[string]string{"status": "ok"}) })

	r.Route("/api", func(r chi.Router) {
		r.Get("/search", s.handleSearch)
		// Protected routes go behind s.authMiddleware (see auth.go).
	})
	return r
}

func (s *Server) handleSearch(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		writeJSON(w, 400, map[string]string{"error": "missing q"})
		return
	}
	vecs, err := s.embed.Embed(r.Context(), []string{q})
	if err != nil || len(vecs) == 0 {
		writeJSON(w, 500, map[string]string{"error": "embedding failed"})
		return
	}
	results, err := s.store.SearchItems(r.Context(), vecs[0], 20)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": "search failed"})
		return
	}
	writeJSON(w, 200, results)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
```

Write `internal/httpapi/auth.go` — JWT issue/verify + middleware:
```go
package httpapi

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type ctxKey string

const userCtxKey ctxKey = "user"

func (s *Server) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		raw, ok := strings.CutPrefix(header, "Bearer ")
		if !ok {
			writeJSON(w, 401, map[string]string{"error": "missing bearer token"})
			return
		}
		token, err := jwt.Parse(raw, func(t *jwt.Token) (any, error) { return []byte(s.cfg.JWTSecret), nil })
		if err != nil || !token.Valid {
			writeJSON(w, 401, map[string]string{"error": "invalid token"})
			return
		}
		claims, _ := token.Claims.(jwt.MapClaims)
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userCtxKey, claims)))
	})
}
```

Write `internal/mcpserver/server.go` — MCP server exposing the app's tools:
```go
package mcpserver

import (
	"context"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/<GITHUB_OWNER>/<APP_NAME>/internal/embed"
	"github.com/<GITHUB_OWNER>/<APP_NAME>/internal/store"
)

type SearchArgs struct {
	Query string `json:"query" jsonschema:"natural-language search query"`
	Limit int    `json:"limit,omitempty" jsonschema:"max results (default 20)"`
}

// New returns an MCP server exposing the app's domain tools (usable from Claude/agents).
func New(st *store.Store, em embed.Embedder) *mcp.Server {
	s := mcp.NewServer(&mcp.Implementation{Name: "<APP_NAME>", Version: "0.1.0"}, nil)

	mcp.AddTool(s, &mcp.Tool{Name: "search_items", Description: "Semantic search over items."},
		func(ctx context.Context, _ *mcp.CallToolRequest, args SearchArgs) (*mcp.CallToolResult, any, error) {
			limit := args.Limit
			if limit == 0 {
				limit = 20
			}
			vecs, err := em.Embed(ctx, []string{args.Query})
			if err != nil || len(vecs) == 0 {
				return nil, nil, err
			}
			results, err := st.SearchItems(ctx, vecs[0], limit)
			if err != nil {
				return nil, nil, err
			}
			return nil, results, nil
		})

	return s
}
```

Write `cmd/api/main.go`:
```go
package main

import (
	"context"
	"log"
	"net/http"

	"github.com/<GITHUB_OWNER>/<APP_NAME>/internal/config"
	"github.com/<GITHUB_OWNER>/<APP_NAME>/internal/embed"
	"github.com/<GITHUB_OWNER>/<APP_NAME>/internal/httpapi"
	"github.com/<GITHUB_OWNER>/<APP_NAME>/internal/store"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	st, err := store.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("store: %v", err)
	}
	defer st.Close()

	em := embed.NewManaged(cfg.EmbedBaseURL, cfg.EmbedAPIKey, cfg.EmbedModel)
	handler := httpapi.New(cfg, st, em)

	log.Printf("API listening on :%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, handler))
}
```

Write `cmd/worker/main.go`:
```go
package main

import (
	"context"
	"log"

	"github.com/<GITHUB_OWNER>/<APP_NAME>/internal/config"
	"github.com/<GITHUB_OWNER>/<APP_NAME>/internal/embed"
	"github.com/<GITHUB_OWNER>/<APP_NAME>/internal/store"
)

// Ingest/background worker. Replace runOnce with your real pipeline
// (fetch source with backoff → compose document → embed → upsert).
func main() {
	cfg := config.Load()
	ctx := context.Background()

	st, err := store.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("store: %v", err)
	}
	defer st.Close()

	_ = embed.NewManaged(cfg.EmbedBaseURL, cfg.EmbedAPIKey, cfg.EmbedModel)
	log.Println("worker tick — implement ingest pipeline here")
}
```

Write `cmd/mcp/main.go`:
```go
package main

import (
	"context"
	"log"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/<GITHUB_OWNER>/<APP_NAME>/internal/config"
	"github.com/<GITHUB_OWNER>/<APP_NAME>/internal/embed"
	"github.com/<GITHUB_OWNER>/<APP_NAME>/internal/mcpserver"
	"github.com/<GITHUB_OWNER>/<APP_NAME>/internal/store"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	st, err := store.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("store: %v", err)
	}
	defer st.Close()

	em := embed.NewManaged(cfg.EmbedBaseURL, cfg.EmbedAPIKey, cfg.EmbedModel)
	server := mcpserver.New(st, em)

	if err := server.Run(ctx, &mcp.StdioTransport{}); err != nil {
		log.Fatalf("mcp: %v", err)
	}
}
```

Write `db/migrations/0001_init.up.sql` — pgvector schema (the extension must come first):
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE items (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  attributes      JSONB NOT NULL DEFAULT '{}',
  embedding       vector(1536),
  embedding_model TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX items_embedding_idx ON items USING hnsw (embedding vector_cosine_ops);
```

Write `db/migrations/0001_init.down.sql`:
```sql
DROP TABLE IF EXISTS items;
```

Write `docker-compose.yml` (repo root) — **identical to the Node + pgvector stack's** `docker-compose.yml` above (the `pgvector/pgvector:pg17` service). Migrations are applied with `golang-migrate`:
```
migrate -path db/migrations -database "$DATABASE_URL" up
```

Write `Dockerfile` — multi-stage build for the API (Cloud Run target):
```dockerfile
FROM golang:1.23 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/api ./cmd/api

FROM gcr.io/distroless/static-debian12
COPY --from=build /out/api /api
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/api"]
```

Write `Makefile`:
```makefile
.PHONY: db-up db-down migrate api worker mcp tidy
db-up:    ; docker compose up -d db
db-down:  ; docker compose down
migrate:  ; migrate -path db/migrations -database "$(DATABASE_URL)" up
api:      ; go run ./cmd/api
worker:   ; go run ./cmd/worker
mcp:      ; go run ./cmd/mcp
tidy:     ; go mod tidy
```

Write `.env.example` (repo root):
```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/<APP_NAME>?sslmode=disable
PORT=8080
JWT_SECRET=
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info

# Embeddings (managed API for MVP; swap for self-hosted later)
EMBEDDINGS_BASE_URL=https://api.openai.com/v1
EMBEDDINGS_API_KEY=
EMBEDDINGS_MODEL=text-embedding-3-small
EMBEDDINGS_DIM=1536
```

Also apply the frontend hey-api setup (devDependencies, `generate:api` script, `app/.env.example` with `VITE_API_URL`) **identical to the Node.js + React stack** — generate the client against the running Go API's OpenAPI JSON.

> **Local first, hosted later.** `docker compose up -d db` starts pgvector locally; `DATABASE_URL` points at it. To move to a hosted DB later (e.g. Neon), swap `DATABASE_URL` (Neon needs `sslmode=require`) — no code changes.

#### Both stacks — root files

Write `.gitignore`:
```
# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs. Anchor these — a bare `lib/` or `dist/` also matches
# app/src/lib/, which is source, and silently un-stages it.
app/dist/
functions/lib/
api/dist/
build/
.firebase/

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Firebase
.firebase/

# Prisma
prisma/*.db

# Go (Go + pgvector stack)
/bin/
*.out

# Docker / local DB volumes are managed by docker-compose, not committed
```

For the **Go + pgvector** stack, also add `go.sum` is committed (do NOT ignore it).

Write `CLAUDE.md` (project-level conventions):

```markdown
# <APP_NAME> — Project Conventions

## Project

**What we're building:** <BUILD_DESCRIPTION>
**Category:** <PROJECT_VISION>
**Why:** <PROJECT_PURPOSE>

## Stack

<!-- Firebase | Node.js + React | Node + pgvector + MCP | Go + pgvector + MCP — filled by initproject -->

## Architecture

- **Frontend:** Vite + React + TypeScript in `app/src/`
- **Backend:** <!-- Firebase Functions in `functions/src/` | Express API in `api/src/` | Go API in `cmd/api` + `internal/` -->
- **Database:** <!-- Firestore | PostgreSQL + Prisma | PostgreSQL + pgvector + Drizzle | PostgreSQL + pgvector (pgx) -->
- **Auth:** <!-- Firebase Auth OR JWT OR None -->
- **Multi-tenant:** <!-- Yes / No -->
- **Access model:** <!-- ACCESS_MODEL: first-user-admin + waitroom / open / invite-only -->

<!-- For the pgvector stacks (Node + pgvector / Go + pgvector), also document: -->
<!-- - **Vector search:** pgvector cosine distance; keep raw numeric attributes OUT of the embedding (separate columns). -->
<!-- - **Ingest/worker:** a separate process (`api/src/worker` / `cmd/worker`) for batch + incremental ingest and embedding. -->
<!-- - **Embeddings:** pluggable client (`api/src/embed` / `internal/embed`); store the model name/version per row so you can detect drift. -->
<!-- - **MCP server:** exposes the app's tools (`api/src/mcp` / `cmd/mcp` + `internal/mcpserver`) for use from Claude/agents. -->
<!-- - **Local DB:** `docker compose up -d db` (pgvector image). Hosted later = swap `DATABASE_URL` only. -->

## Access & Roles

<!-- Filled from ACCESS_MODEL. Describe how users gain access so every feature respects it.

If ACCESS_MODEL is `first-user-admin`:
- The first authenticated user to sign in becomes the **admin** (role `admin`, status `active`); everyone else is created `pending` and lands in a **waitroom** until an admin approves them.
- Elect the first admin **server-side and atomically** (transaction over a `system/meta.adminInitialized` flag, or equivalent) — never let the client decide its own role.
- User/role docs are written **only by server code** (Firebase callables / admin SDK, or the API with an auth check) — clients must not be able to self-elevate.
- Admins get a management surface to approve/reject users and change roles; guard against removing the last admin.
- Enforce access in the data layer: Firestore rules read the caller's user doc (status/role); the API checks the same on each request.

If ACCESS_MODEL is `open`: any authenticated user gets full access (no waitroom). Keep an admin flag if you expect to add roles later.

If ACCESS_MODEL is `invite-only`: only pre-authorized emails/domains can gain access; unknown users are rejected. -->

## Backend Rules — pgvector stacks (Node + pgvector / Go + pgvector)

<!-- Include this section only for the two pgvector stacks. -->

- **Never mix vector spaces.** Keep raw numeric/structured attributes (playtime, age, weight, counts) in plain columns or a separate feature vector — never concatenate them into the text embedding, it degrades the semantic space.
- **Version your embeddings.** Store `embedding_model` (name + version) per row. Changing models means re-embedding the whole corpus.
- **Extension first.** The `CREATE EXTENSION vector` migration must run before any `vector` column is created — it is migration `0000`/`0001`.
- **Worker is a separate process.** Long-running ingest/embedding work runs in the worker entrypoint, not in HTTP handlers.
- **Embeddings client is pluggable.** Code against the `Embedder` interface; managed API for MVP, self-hosted model later — no call sites change.

## Frontend Rules (Non-Negotiable)

### ❌ NEVER use `useEffect` for data fetching

This is the most common source of infinite loops, race conditions, and stale data bugs.

```tsx
// ❌ NEVER DO THIS
function UserCard({ userId }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetchUser(userId).then(setUser); // race condition, memory leak
  }, [userId]);
}

// ✅ ALWAYS DO THIS
function UserCard({ userId }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });
}
```

`useEffect` is only acceptable for truly imperative DOM side effects (measurements, third-party lib init, focus). Even then, question whether it's really needed.

### ✅ React Query for all server/async state

- Use `useQuery` for reads, `useMutation` for writes
- Query keys follow the pattern: `['resource', id]` or `['resource', 'list', filters]`
- Never use `useEffect + useState` to fetch data

### ✅ Pass IDs as props, not full objects

Components receive IDs (or keys) and load their own data via React Query.

```tsx
// ❌ NEVER — passing full objects (prop drilling, coupling, no cache benefit)
function OrderList({ orders }) {
  return orders.map(o => <OrderRow order={o} />);
}

// ✅ ALWAYS — pass IDs, each component self-loads
function OrderList({ orderIds }) {
  return orderIds.map(id => <OrderRow orderId={id} />);
}

function OrderRow({ orderId }) {
  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId),
  });
}
```

React Query deduplicates requests by query key — calling the same hook in many components results in only **one** network request.

### ✅ No prop drilling beyond 1 level

Data should not be passed more than one level deep. Beyond that: use a React Query hook (for server data) or a Jotai atom (for UI state).

### ✅ Small, focused components

- Each component does **one thing**
- A component file should rarely exceed ~150 lines
- Extract sub-concerns into child components aggressively

### ✅ Jotai atoms for client-only state

- Atoms live in `src/store/` — one file per domain (`uiAtoms.ts`, `filterAtoms.ts`)
- Only use Jotai for UI state: modal open/close, active tab, filter selections, optimistic UI
- Never put server data in an atom — that belongs in React Query

## Directory Structure

```
app/src/
├── components/    # Shared UI components (small, focused, self-loading)
├── pages/         # Page-level components (route entries)
├── hooks/         # Custom React Query hooks (one hook per resource)
├── store/         # Jotai atoms (client-only state)
└── lib/           # SDK clients, query client, utilities
```

## Naming Conventions

- Components: `PascalCase.tsx`
- Hooks: `use<Resource>.ts` (e.g., `useUser.ts`, `useOrders.ts`)
- Atoms: `<domain>Atoms.ts` (e.g., `uiAtoms.ts`)
- Types: `PascalCase`, co-located with usage or in `types.ts`
- API functions: `camelCase` in `lib/` (e.g., `api.getUser()`)

## Package Manager

- **pnpm** — always use `pnpm install`, `pnpm run dev`, `pnpm exec <bin>` (never npx).

## Git Workflow

- Default branch: `main` (production)
- Development branch: `develop`
- Feature branches: `feature/<slug>` off `develop`
- Commit style: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
```

#### Linting — required, not optional

A `lint` script that references an uninstalled eslint is dead config: it never runs, so it
never catches anything, and the first person to run it hits an error. Install it properly.

**Both stacks — `app/`:**

```bash
cd app && pnpm add -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals
```

Write `app/eslint.config.js` (flat config — eslint 9+ ignores `.eslintrc`, and `--ext` was
removed):

```javascript
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2020, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // The mechanical half of the "never fetch in useEffect" rule: a missing
      // dep or a conditional hook is usually a data-fetching effect in disguise.
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
);
```

**Backend (`functions/` or `api/`):**

```bash
cd functions && pnpm add -D eslint @eslint/js typescript-eslint globals
```

Write `functions/eslint.config.mjs` — note the **`.mjs`** extension. The backend package is
CommonJS (`"module": "commonjs"` in tsconfig), so it cannot have `"type": "module"` in
`package.json`; a `.js` flat config there triggers a `MODULE_TYPELESS_PACKAGE_JSON` warning on
every run.

```javascript
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['lib', 'dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.ts'],
    languageOptions: { ecmaVersion: 2020, globals: globals.node },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
);
```

Set the script in **both** packages (no `--ext`, which flat config removed):

```json
"lint": "eslint . --report-unused-disable-directives --max-warnings 0"
```

Run `pnpm run lint` in each package before moving on and fix what it finds. Fix findings
properly — e.g. move a non-component export out of a component file rather than suppressing
`react-refresh/only-export-components`.

#### Firestore rules tests (Firebase stack)

**Only for `STACK = firebase`.** If Firestore rules are the security model — and with the
Firebase stack they are — then nothing else verifies them, and an untested rules file is an
untested authorization layer. Scaffold a test package at the repo root.

Write `rules-tests/package.json`:

```json
{
  "name": "<APP_NAME>-rules-tests",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "packageManager": "pnpm@10.8.1",
  "scripts": {
    "test": "firebase emulators:exec --only firestore --project <APP_NAME>-test 'vitest run'"
  },
  "devDependencies": {
    "@firebase/rules-unit-testing": "^4.0.1",
    "firebase": "^10.0.0",
    "vitest": "^2.1.0"
  }
}
```

Write `rules-tests/firestore.rules.test.js` covering, at minimum:

- every collection **denies client writes** (they go through Cloud Functions)
- each role boundary in both directions — allowed **and** denied
- users can read their own user/account doc but not other people's
- a user cannot write their own role or status (no self-elevation)
- any confidential collection is denied to unauthorised callers
- list queries: a correctly-filtered query succeeds, an unfiltered one that would leak
  restricted documents fails

Pattern:

```javascript
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const RULES = readFileSync(fileURLToPath(new URL('../firestore.rules', import.meta.url)), 'utf8');
let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: '<APP_NAME>-test',
    firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => { await testEnv?.cleanup(); });

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Seed with rules disabled — this is what the Cloud Functions do in production.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', 'uid-admin'), { role: 'admin', status: 'active' });
  });
});

const as = (uid) => testEnv.authenticatedContext(uid).firestore();
const anon = () => testEnv.unauthenticatedContext().firestore();

it('denies client writes', async () => {
  await assertFails(setDoc(doc(as('uid-admin'), 'things', 'x'), { a: 1 }));
});
```

The Firestore emulator requires a **JDK 21+** — firebase-tools rejects anything older. Tell
the user this if the tests fail to start locally.

#### Cloud auth for CI — Workload Identity Federation

**Do this before writing the deploy workflows; it decides how they authenticate.**

Do **not** reach for a service-account JSON key. Many Google Workspace orgs enforce
`constraints/iam.disableServiceAccountKeyCreation`, and key creation fails with
`FAILED_PRECONDITION: Key creation is not allowed on this service account`. Even where it is
allowed, a long-lived key sits in GitHub until someone remembers to rotate it.

Use **Workload Identity Federation**: GitHub's OIDC token is exchanged for a short-lived GCP
token. Nothing is stored.

Check first, and tell the user which way you are going:

```bash
gcloud resource-manager org-policies describe \
  constraints/iam.disableServiceAccountKeyCreation --project=<APP_NAME> --effective
```

Provision it (`<PROJECT_NUMBER>` from `gcloud projects describe <APP_NAME>`):

```bash
gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project=<APP_NAME>

gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions deploy" --project=<APP_NAME>

# Firebase stack roles. Functions v2 needs run/artifactregistry/cloudbuild/eventarc
# as well as cloudfunctions — a deploy fails late and confusingly without them.
for ROLE in roles/firebase.admin roles/firebasehosting.admin roles/firebaserules.admin \
            roles/datastore.indexAdmin roles/cloudfunctions.admin roles/run.admin \
            roles/artifactregistry.admin roles/cloudbuild.builds.editor \
            roles/eventarc.admin roles/serviceusage.serviceUsageConsumer \
            roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding <APP_NAME> \
    --member="serviceAccount:github-actions@<APP_NAME>.iam.gserviceaccount.com" \
    --role="$ROLE" --condition=None
done

gcloud iam workload-identity-pools create github --location=global \
  --display-name="GitHub Actions" --project=<APP_NAME>

# The attribute-condition is the security boundary. WITHOUT IT, ANY repository
# on GitHub could exchange a token for this service account.
gcloud iam workload-identity-pools providers create-oidc github \
  --location=global --workload-identity-pool=github \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository=='<GH_OWNER>/<REPO>'" \
  --project=<APP_NAME>

gcloud iam service-accounts add-iam-policy-binding \
  github-actions@<APP_NAME>.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/github/attribute.repository/<GH_OWNER>/<REPO>" \
  --project=<APP_NAME>
```

Then set the two pointers as repo secrets (neither is sensitive, but keep them as secrets so
the workflow reads uniformly):

```bash
gh secret set GCP_WORKLOAD_IDENTITY_PROVIDER --body \
  "projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/github/providers/github"
gh secret set GCP_SERVICE_ACCOUNT --body "github-actions@<APP_NAME>.iam.gserviceaccount.com"
```

Every job that authenticates needs `permissions: id-token: write` — without it GitHub will not
mint the OIDC token and `google-github-actions/auth` fails with a confusing 403.

**`FirebaseExtended/action-hosting-deploy` only accepts a JSON key**, so with WIF you deploy
hosting through `firebase-tools` on Application Default Credentials instead. That also means
writing the preview-channel URL into the PR yourself (see `preview.yml` below).

Also write `.github/workflows/verify-auth.yml` — a `workflow_dispatch` smoke test that
authenticates, runs `gcloud projects describe` and dry-runs a rules deploy. It turns "did the
federation config work?" into a 60-second check instead of a failed production deploy.

#### CI/CD — GitHub Actions workflows

Write `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [develop, main]
  push:
    branches: [develop]

# A new push to the same branch supersedes the old run.
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  PNPM_VERSION: 10.8.1
  NODE_VERSION: 20

jobs:
  frontend:
    name: Frontend — lint, types, build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
          cache-dependency-path: app/pnpm-lock.yaml

      - name: Install
        run: cd app && pnpm install --frozen-lockfile

      - name: Lint
        run: cd app && pnpm run lint

      - name: Type check
        run: cd app && pnpm exec tsc --noEmit

      # Build with placeholder config: the app must compile without real
      # secrets, and this catches a VITE_ var missing from vite-env.d.ts —
      # which would otherwise only fail at deploy time.
      - name: Build
        run: cd app && pnpm run build
        env:
          VITE_FIREBASE_API_KEY: ci-placeholder
          VITE_FIREBASE_AUTH_DOMAIN: ci.firebaseapp.com
          VITE_FIREBASE_PROJECT_ID: ci
          VITE_FIREBASE_STORAGE_BUCKET: ci.appspot.com
          VITE_FIREBASE_MESSAGING_SENDER_ID: '0'
          VITE_FIREBASE_APP_ID: ci
```

Add the backend job. **Firebase stack:**

```yaml
  functions:
    name: Functions — lint, types, build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
          cache-dependency-path: functions/pnpm-lock.yaml
      - run: cd functions && pnpm install --frozen-lockfile
      - run: cd functions && pnpm run lint
      - run: cd functions && pnpm exec tsc --noEmit
      - run: cd functions && pnpm run build

  rules:
    name: Firestore rules tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
          cache-dependency-path: rules-tests/pnpm-lock.yaml
      # The Firestore emulator needs a JDK; firebase-tools requires 21+.
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
      - name: Cache emulator jars
        uses: actions/cache@v4
        with:
          path: ~/.cache/firebase/emulators
          key: firebase-emulators-${{ runner.os }}
      - run: cd rules-tests && pnpm install --frozen-lockfile
      - run: pnpm add -g firebase-tools
      - run: cd rules-tests && pnpm test
```

**Node.js + React stack** — replace the `functions` job with:

```yaml
  api:
    name: API — lint, types, build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
          cache-dependency-path: api/pnpm-lock.yaml
      - run: cd api && pnpm install --frozen-lockfile
      - run: cd api && pnpm exec prisma generate
      - run: cd api && pnpm run lint
      - run: cd api && pnpm exec tsc --noEmit
      - run: cd api && pnpm run build
```

(`prisma generate` first — the client is not generated by install, since pnpm blocks
postinstall scripts, and `tsc` fails without it.)

The **Node + pgvector** stack uses the same `api` job, minus the `prisma generate` step — Drizzle generates SQL, not a client, so there is nothing to generate before `tsc`. Keep the lint/types/build trio.

For the **Go + pgvector** stack, replace the `api` job with a Go one:

```yaml
  go-build:
    name: API — vet, build, test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.23'
          cache: true
      - run: go mod download
      - run: go vet ./...
      - run: go build ./...
      - run: go test ./...
```

Write `.github/workflows/deploy.yml` — **Firebase stack**:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

# Never let two production deploys overlap. Do NOT cancel in progress — a
# half-cancelled Firebase deploy is worse than a queued one.
concurrency:
  group: deploy-production
  cancel-in-progress: false

env:
  PNPM_VERSION: 10.8.1
  NODE_VERSION: 20
  FIREBASE_PROJECT: <APP_NAME>

jobs:
  # BACKEND FIRST, deliberately. Rules, indexes and callables are what the
  # frontend depends on. Shipping the frontend first opens a window where it
  # calls a function that does not exist yet, or runs a query whose composite
  # index is missing — both hard runtime failures in production.
  backend:
    name: Rules, indexes and functions
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write # required to mint the GitHub OIDC token for GCP
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
          cache-dependency-path: functions/pnpm-lock.yaml
      - run: cd functions && pnpm install --frozen-lockfile
      - run: cd functions && pnpm run build
      # Keyless auth. No JSON key exists to leak or rotate; the provider only
      # accepts OIDC tokens from this repository.
      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

      - run: pnpm add -g firebase-tools

      # Indexes before functions: a callable may rely on one immediately.
      - name: Deploy rules and indexes
        run: firebase deploy --only firestore:rules,firestore:indexes --project "$FIREBASE_PROJECT" --non-interactive

      - name: Deploy functions
        run: firebase deploy --only functions --project "$FIREBASE_PROJECT" --non-interactive

  frontend:
    name: Hosting
    runs-on: ubuntu-latest
    needs: [backend]
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
          cache-dependency-path: app/pnpm-lock.yaml
      - run: cd app && pnpm install --frozen-lockfile
      - name: Build
        run: cd app && pnpm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

      - run: pnpm add -g firebase-tools

      - name: Deploy hosting
        run: firebase deploy --only hosting --project "$FIREBASE_PROJECT" --non-interactive
```

**Node.js + React stack** deploy: same ordering principle — run migrations before shipping
the frontend. Firebase App Hosting redeploys the API automatically on push to `main`, so the
job is `db-migrate` → `frontend`:

```yaml
jobs:
  db-migrate:
    name: Apply migrations
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
          cache-dependency-path: api/pnpm-lock.yaml
      - run: cd api && pnpm install --frozen-lockfile
      - run: cd api && pnpm exec prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

  frontend:
    name: Hosting
    runs-on: ubuntu-latest
    needs: [db-migrate]
    steps:
      # ... build with VITE_API_URL, then FirebaseExtended/action-hosting-deploy
```

**Node + pgvector + MCP stack** deploy: identical to the Node.js + React stack above — App
Hosting redeploys the API on push, so the workflow is `db-migrate` → `frontend`. Swap the
migrate step for Drizzle:

```yaml
      - run: cd api && pnpm db:migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

The **worker** and **MCP** processes are not web-served. Run them as a second App Hosting
backend, a Cloud Run job/service, or locally — tell the user rather than scaffolding a deploy
step you cannot verify.

**Go + pgvector + MCP stack** deploy: frontend to Firebase Hosting, Go API to **Cloud Run**,
migrations first. Authenticate with federation exactly like the other workflows — no JSON key:

```yaml
jobs:
  db-migrate:
    name: Apply migrations
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}
      - run: |
          curl -sSL https://github.com/golang-migrate/migrate/releases/latest/download/migrate.linux-amd64.tar.gz \
            | tar xz && sudo mv migrate /usr/local/bin/
      - run: migrate -path db/migrations -database "$DATABASE_URL" up
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

  api:
    name: Cloud Run
    needs: db-migrate
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}
      - uses: google-github-actions/setup-gcloud@v2
      - run: |
          gcloud run deploy <APP_NAME>-api --source . --region europe-west1 \
            --set-secrets DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,EMBEDDINGS_API_KEY=EMBEDDINGS_API_KEY:latest
```

The worker and MCP processes deploy as separate Cloud Run services/jobs with a different
entrypoint, or run locally — the workflow above deploys only the API.

Write `.github/workflows/preview.yml` — a Hosting preview channel per PR:

```yaml
name: Preview

# pull_request, NOT pull_request_target: a fork must never receive the deploy
# secret. Fork PRs skip this job instead.
on:
  pull_request:
    branches: [develop, main]

concurrency:
  group: preview-${{ github.head_ref }}
  cancel-in-progress: true

jobs:
  preview:
    name: Deploy preview channel
    runs-on: ubuntu-latest
    if: github.event.pull_request.head.repo.full_name == github.repository
    permissions:
      contents: read
      id-token: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10.8.1
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          cache-dependency-path: app/pnpm-lock.yaml
      - run: cd app && pnpm install --frozen-lockfile
      - name: Build
        run: cd app && pnpm run build
        env:
          # same VITE_* secrets as deploy.yml
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

      - run: pnpm add -g firebase-tools

      - name: Deploy preview channel
        id: preview
        env:
          CHANNEL: pr-${{ github.event.pull_request.number }}
        run: |
          firebase hosting:channel:deploy "$CHANNEL" --project <APP_NAME> \
            --expires 7d --json > channel.json
          URL=$(python3 -c "import json;d=json.load(open('channel.json'));print(list(d['result'].values())[0]['url'])")
          echo "url=$URL" >> "$GITHUB_OUTPUT"

      # Pass the URL through env, never interpolated into the script body.
      - name: Comment the preview URL
        uses: actions/github-script@v7
        env:
          PREVIEW_URL: ${{ steps.preview.outputs.url }}
        with:
          script: |
            const url = process.env.PREVIEW_URL;
            const marker = '<!-- preview-url -->';
            const body = `${marker}\n**Preview:** ${url}\n\nExpires in 7 days.`;
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner, repo: context.repo.repo,
              issue_number: context.issue.number,
            });
            const existing = comments.find(c => c.body && c.body.includes(marker));
            const api = existing ? github.rest.issues.updateComment : github.rest.issues.createComment;
            await api({
              owner: context.repo.owner, repo: context.repo.repo,
              ...(existing ? { comment_id: existing.id } : { issue_number: context.issue.number }),
              body,
            });
```

Warn the user: **preview channels share the live database**, so previews show real data.
Treat preview URLs as internal.

**Workflow security — non-negotiable:**

- Never interpolate untrusted event data (`github.event.*.title`, `.body`, commit messages,
  `github.head_ref`, `client_payload.*`) into a `run:` block. Pass it via `env:` and reference
  it as a shell variable. Using it in `concurrency:` or `if:` is safe — those are not shell.
- Never use `pull_request_target` in a workflow that checks out PR code.
- Never write a secret into a `run:` script body; pass it through `env:`.

Set the repo secrets with `gh secret set` — never print a secret value to the terminal, and
never paste one into the transcript:

- **Both stacks:** `GCP_WORKLOAD_IDENTITY_PROVIDER` and `GCP_SERVICE_ACCOUNT` (from the
  Workload Identity Federation step above).
- **Firebase stack:** all `VITE_FIREBASE_*` values, read from
  `firebase apps:sdkconfig WEB` — or, if the Firebase CLI's credentials are stale, from the
  Firebase Management REST API with a gcloud token:

  ```bash
  TOKEN=$(gcloud auth print-access-token)
  curl -s -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: <APP_NAME>" \
    "https://firebase.googleapis.com/v1beta1/projects/<APP_NAME>/webApps/<APP_ID>/config"
  ```

  (The `x-goog-user-project` header is required, otherwise the API returns a confusing
  `SERVICE_DISABLED` quota-project error.) A web app may need creating first — `POST` to
  `.../webApps` returns a long-running operation, so poll it before reading the config.
- **Node.js stack:** `VITE_API_URL` and `DATABASE_URL`.
- **Node + pgvector stack:** `VITE_API_URL` and `DATABASE_URL`, same as Node.js.
- **Go + pgvector stack:** `VITE_API_URL` (the Cloud Run URL) and `DATABASE_URL` for the
  migrate job. Everything the running API needs — `DATABASE_URL`, `JWT_SECRET`,
  `EMBEDDINGS_API_KEY` — belongs in **GCP Secret Manager**, referenced by
  `--set-secrets`, not in GitHub.

Do **not** add `FIREBASE_SERVICE_ACCOUNT` or `FIREBASE_TOKEN` — federation replaces both.

Verify a secret was actually written. `gh secret set` reading from an empty file **succeeds
silently**, leaving an empty secret that fails much later in a confusing way. Always check
the source is non-empty first.

After creating the repo, tell the user to add these secrets and to set `develop` and `main`
as protected branches requiring the CI checks to pass.

### 4c: Install dependencies

Each package directory is an **independent pnpm project with its own lockfile**. Do NOT create a root `pnpm-workspace.yaml`: Firebase deploys `functions/` standalone, and pnpm's symlinked workspace dependencies break that deploy. Keep the installs separate.

Run pnpm install in each package directory:

```bash
cd app && pnpm install
```

For Firebase:
```bash
cd ../functions && pnpm install
```

For Node.js + React:
```bash
cd ../api && pnpm install
```

For Node + pgvector + MCP:
```bash
cd ../api && pnpm install
docker compose up -d db          # start local Postgres + pgvector (use docker-compose if the v2 plugin is absent)
pnpm db:generate              # generate the Drizzle table migration from schema.ts
# → prepend `CREATE EXTENSION IF NOT EXISTS vector;` + `--> statement-breakpoint` to the generated 0000_*.sql
pnpm db:migrate               # apply the migration
```
The `docker compose` command runs from the repo root (where `docker-compose.yml` lives). Confirm Docker is running first; if it isn't, tell the user and skip the DB steps (they can run them later). If the host only has the standalone `docker-compose` (no `docker compose` v2 plugin), use `docker-compose` instead. **The extension must be prepended to the generated migration** (see the pgvector ordering gotcha above) — a separate `0000_init.sql` is not journaled and won't run.

For Go + pgvector + MCP (no `pnpm install` for the backend — it's Go):
```bash
cd app && pnpm install            # frontend only
cd ..                            # repo root (go.mod, docker-compose.yml live here)
go mod tidy                      # resolve + pin Go deps
docker compose up -d db          # start local Postgres + pgvector
migrate -path db/migrations -database "$DATABASE_URL" up   # apply pgvector schema
```
`go mod tidy` requires Go installed; `migrate` requires the `golang-migrate` CLI (`brew install golang-migrate`). If either is missing, note it to the user and skip that step rather than failing the scaffold.

**pnpm blocks dependency build scripts by default.** After each install, check the output for an "Ignored build scripts" warning. Packages that genuinely need their postinstall must be listed in `pnpm.onlyBuiltDependencies` in that package's `package.json` (the templates above already list the known ones):

- `app/` — **`esbuild` is required**; without its postinstall the binary is missing and `vite build` fails.
- `api/` — **`prisma`** must be allowed, or run `pnpm exec prisma generate` manually; the Prisma client is not generated otherwise.
- Telemetry-only scripts (e.g. `@scarf/scarf`) can safely stay blocked.

Adding to `onlyBuiltDependencies` after an install has already run does not retroactively execute the script — `rm -rf node_modules && pnpm install`, or `pnpm rebuild <pkg>`.

Verify the install actually works before moving on — run the **build and the lint** in each
package, not just the install. For the Firebase stack also run the rules tests once
(`cd rules-tests && pnpm test`); it needs a JDK 21+, so if it fails to start, tell the user
rather than silently skipping it.

A green `pnpm install` proves nothing. `pnpm run lint && pnpm exec tsc --noEmit && pnpm run build`
in every package is the actual gate, and it is exactly what CI will run.

Note: pnpm blocks postinstall scripts by default, so Prisma's client generation will NOT run automatically. Run `cd api && pnpm exec prisma generate` after install (or add `prisma` to `pnpm.onlyBuiltDependencies` in `api/package.json`).

**Pause** — show install summary and ask "Dependencies installed. Ready to initialize git and create the GitHub repo?"

Use `AskUserQuestion`:
- Options: "Yes, continue" / "No, stop here"

---

## Phase 5: Git Init + GitHub

### 5a: Visibility

Use `AskUserQuestion`:
- Header: "GitHub visibility"
- Question: "Should the GitHub repository be private or public?"
- Options: "Private" / "Public"

### 5b: Initialize git

```bash
git init
git checkout -b develop
git add .
git commit -m "chore: initial project scaffold"
```

### 5c: Create GitHub repo and push

```bash
gh repo create <APP_NAME> --<private|public> --source=. --remote=origin --push
```

Print the repo URL after success.

**Pause** — "Git initialized on `develop`, GitHub repo created and pushed. Ready to generate the agent team?"

Use `AskUserQuestion`:
- Options: "Yes, generate agents" / "No, stop here"

---

## Phase 6: Generate Agent Team

Invoke the `create-agents` skill logic directly (do not launch a subprocess — execute the agent generation steps inline):

Since we already know the stack from Phase 2, pre-fill the architecture answers:
- **Project:** use `BUILD_DESCRIPTION`, `PROJECT_VISION`, and `PROJECT_PURPOSE` from Phase 2 — include all three in every agent's system context. `BUILD_DESCRIPTION` is the most important: it describes the actual functionality the team is building, and agents should lead with it when reasoning about features. `PROJECT_VISION` provides the category and `PROJECT_PURPOSE` the motivation.
- **Firebase stack** → Architecture: "Firebase", Database: "Firestore", Repo: "Monorepo", UI: "shadcn/ui"
- **Node.js + React** → Architecture: "API + Generated Client", Database: "Prisma + PostgreSQL", Repo: "Monorepo", UI: "shadcn/ui". Frontend deploys to Firebase Hosting, API deploys to Firebase App Hosting (`apphosting.yaml` in `api/`)
- **Node + pgvector + MCP** → Architecture: "API + Generated Client + Worker + MCP", Database: "Drizzle + PostgreSQL + pgvector", Repo: "Monorepo", UI: "shadcn/ui". Frontend → Firebase Hosting, API → Firebase App Hosting, worker + MCP run as separate processes. The Backend Engineer also owns `api/src/worker`, `api/src/mcp`, and `api/src/embed`; the Database Engineer owns `api/src/db` (Drizzle schema + migrations).
- **Go + pgvector + MCP** → Architecture: "Go API + Generated Client + Worker + MCP", Database: "PostgreSQL + pgvector (pgx)", Repo: "Monorepo", UI: "shadcn/ui". Frontend → Firebase Hosting, API → Cloud Run, worker + MCP as separate Cloud Run services/jobs. The Backend Engineer owns `cmd/` + `internal/` (Go); the Database Engineer owns `db/migrations` (SQL).
- Auth: use the `AUTH_PROVIDER` from Phase 3
- Multi-tenant: use `MULTI_TENANT` from Phase 3
- Access model: use `ACCESS_MODEL` from Phase 3 — include it in every agent's context (especially Backend, Database, and Frontend). If `first-user-admin`, the agents must know: first sign-in becomes admin (elected server-side/atomically), others go to a waitroom (pending) until approved, user/role docs are written only by server code (no client self-elevation), admins get an approve/reject/roles surface, and the data layer (Firestore rules / API) enforces status+role on every access. If `invite-only`, only pre-authorized emails/domains get in. If `open`, any authenticated user has full access.
- Agent roles: "Full team"

Generate these agent files in `.claude/agents/`:

| File | Role | Model |
|---|---|---|
| `project-manager.md` | Project Manager | Opus |
| `frontend-engineer.md` | Frontend Engineer | Sonnet |
| `backend-engineer.md` | Backend Engineer | Sonnet |
| `database-engineer.md` | Database Engineer | Opus |
| `devops.md` | DevOps | Sonnet |
| `cicd.md` | CI/CD Engineer | Sonnet |
| `code-reviewer.md` | Code Reviewer | Opus |
| `ROUTER.md` | Routing guide | — |

Each agent file must follow the template from `create-agents`. Key requirements:

**Frontend Engineer** must prominently include:
- The useEffect rule (with code examples showing ❌ and ✅)
- ID-based props rule
- No prop drilling rule
- Jotai atoms for client state only

**Code Reviewer** must treat the following as hard-block issues (will reject PRs):
- Any `useEffect` used for data fetching
- Props drilled more than 1 level
- Full objects passed as props instead of IDs
- Hardcoded secrets or credentials
- Unbounded Firestore queries (Firebase) or missing WHERE clauses / `LIMIT` on queries (Node.js / pgvector stacks)
- For **pgvector stacks**: raw numeric attributes embedded into the text embedding (must be separate columns), missing `embedding_model` on stored vectors, or embedding work done inside an HTTP handler instead of the worker

**Backend Engineer** must include these rules:
- Always validate all inputs with Zod at the route/function boundary — never trust incoming data
- Always check authorization before any data read or write — never assume the caller is allowed
- Keep route handlers thin — business logic goes in a `services/` layer, not inline in handlers
- Never expose raw database errors or stack traces to clients — catch and return safe error messages
- Never hardcode secrets, connection strings, or API keys — always read from environment variables
- Use explicit TypeScript return types on all route handlers and service functions
- Every endpoint that modifies data must be idempotent or handle duplicate requests safely

For the **Go + pgvector** stack, translate the rules to Go: validate inputs at the handler boundary (struct + explicit checks, or a validator package) instead of Zod; keep business logic in `internal/` packages, not in `cmd/`; use explicit return types and wrapped errors (`fmt.Errorf("...: %w", err)`); never leak raw DB errors to clients.

For **both pgvector stacks** (Node + pgvector, Go + pgvector), the Backend Engineer also owns and must follow:
- **Never mix vector spaces** — raw numeric/structured attributes stay in plain columns or a separate feature vector, never inside the text embedding.
- **The embeddings client is pluggable** — code against the `Embedder` interface (`api/src/embed` / `internal/embed`); never call a provider SDK directly from handlers or the worker.
- **Store `embedding_model` per row** so model swaps are detectable; changing models means re-embedding the corpus.
- **Heavy/long-running work goes in the worker** (`api/src/worker` / `cmd/worker`), never inline in an HTTP handler.
- **MCP tools** (`api/src/mcp` / `cmd/mcp` + `internal/mcpserver`) reuse the same service layer as the HTTP API — never duplicate query logic.

**Database Engineer** must include these rules and behaviors:

**Before making ANY schema change, always:**
1. Describe exactly what will change and why
2. Show the migration/rule diff to the user
3. Call `AskUserQuestion` to ask: "Should I apply this change?" — options: "Yes, apply" / "No, adjust first"
4. Only proceed after explicit approval

**Hard rules:**
- Never run `prisma migrate dev` without user approval
- Never modify `firestore.rules` without showing the full before/after diff first
- Never drop a column, rename a field, or change a type without explicitly labeling it as a **destructive/breaking change** in the approval prompt
- For destructive changes, require the user to confirm with a second question: "This change is irreversible. Confirm?"
- Never delete indexes or collections
- Firebase stack: always use region `eur3` for Firestore, `europe-west1` for Functions
- Node.js stack: every migration must have a rollback path documented in the commit message
- **Node + pgvector stack:** owns `api/src/db` — the Drizzle schema (`schema.ts`) and generated migrations. Never run `drizzle-kit migrate`/`push` without approval. The `CREATE EXTENSION vector` migration must remain first. `vector` column dimensions must match the embeddings model's dimension; changing it is a **destructive/breaking change** (forces a full re-embed) and needs the second irreversible-change confirmation.
- **Go + pgvector stack:** owns `db/migrations` (hand-written `.up.sql`/`.down.sql` for golang-migrate). Every migration must ship a matching `.down.sql`. `CREATE EXTENSION vector` stays in the first migration. Same dimension-change rule as above.
- **Both pgvector stacks:** prefer an HNSW index (`vector_cosine_ops`) on embedding columns; never drop it without flagging the query-performance impact.

**CI/CD Engineer (Sonnet)** must include:
- File scope: `.github/workflows/` **only** — never application code, config or rules
- Responsibilities: `ci.yml` (lint, types, build, rules tests, on PRs), `deploy.yml`
  (production, on push to `main`), `preview.yml` (Hosting preview channel per PR)
- Per-stack deploy targets: **Node + pgvector** is the same shape as Node.js + React (frontend → Firebase Hosting, API → App Hosting), with the worker and MCP as separate processes outside the web deploy. **Go + pgvector** ships the frontend to Firebase Hosting and the Go API to **Cloud Run**, authenticating through the same federation as every other job — API secrets live in GCP Secret Manager and are referenced with `--set-secrets`, never copied into GitHub
- Before changing any workflow: describe the change and confirm with the user (same rule as
  the Database Engineer)
- Hard rules:
  - **Backend deploys before frontend.** Rules → indexes → functions, *then* hosting.
    Reordering opens a window where the new frontend calls a callable or index that does not
    exist yet. This is the single most important thing in the deploy workflow.
  - Never store secrets in workflow files — always `${{ secrets.SECRET_NAME }}`, and pass
    them via `env:` rather than interpolating into a `run:` body
  - Never interpolate untrusted event data (PR/issue titles and bodies, commit messages,
    `github.head_ref`, `client_payload.*`) into a `run:` block — use `env:` and a shell
    variable. In `concurrency:` or `if:` it is safe; those are not shell.
  - Never use `pull_request_target` in a workflow that checks out PR code; gate preview
    deploys on the PR originating from this repo so forks cannot get the deploy secret
  - **Keyless auth only** — Workload Identity Federation, never a service-account JSON key.
    Many orgs enforce `constraints/iam.disableServiceAccountKeyCreation`, and a long-lived
    key is a liability regardless. Every authenticating job needs `permissions: id-token: write`
  - The WIF provider must carry an `attribute-condition` pinning `assertion.repository` to
    this repo — without it any GitHub repository can assume the service account
  - Always run CI on PRs to `develop` AND `main`
  - Production deploy triggers only on push to `main`
  - Never skip lint, type checking or the rules tests in CI
  - `pnpm install --frozen-lockfile` in CI; set `cache-dependency-path` per package
  - Production deploy uses `concurrency` with `cancel-in-progress: false` — a half-cancelled
    Firebase deploy is worse than a queued one

**ROUTER.md** must include:
- Agent table with model and domain
- When to use each agent
- File ownership table (with actual project paths)
- Escalation paths

**Pause** — "Agent team generated. Ready to write the newfeature skill?"

Use `AskUserQuestion`:
- Options: "Yes, write it" / "No, stop here"

---

## Phase 7: Write `newfeature` Skill

Write the following content verbatim to `.claude/skills/newfeature/SKILL.md`:

````markdown
---
name: newfeature
description: Build a new feature end-to-end. Asks what to build, loads project context, routes to the Project Manager (Opus) for planning, validates with user, creates a feature branch from develop, orchestrates specialist agents, and runs a code review when done.
argument-hint: "[optional: brief feature description]"
---

# New Feature Skill

Guides the development of a new feature from idea to committed code. The Project Manager (Opus) creates the plan; specialist agents (Frontend, Backend, DB, DevOps) execute it in dependency order; the Code Reviewer validates at the end.

Execution mode: **pause at each phase boundary** — user must approve before moving to the next phase.

---

## Phase 1: Feature Description

Use `AskUserQuestion` with three questions:

**Question 1:**
- Header: "Feature"
- Question: "What feature do you want to build?"
- Options: *(user types via Other)*

**Question 2:**
- Header: "Priority"
- Question: "What is the priority of this feature?"
- Options: "Urgent" / "High" / "Normal" / "Low"

**Question 3:**
- Header: "DB changes"
- Question: "Does this feature require database schema changes?"
- Options: "Yes" / "No" / "Unsure"

Store: `FEATURE_DESC`, `PRIORITY`, `DB_CHANGES`.

---

## Phase 2: Load Project Context

Read the following files to understand the project:

1. `CLAUDE.md` — project conventions, stack, rules
2. `.claude/agents/ROUTER.md` — agent team overview and file ownership
3. `.claude/agents/project-manager.md` — PM's role and escalation rules
4. `.claude/agents/frontend-engineer.md` — frontend patterns and rules
5. `.claude/agents/backend-engineer.md` — backend patterns and rules
6. `.claude/agents/database-engineer.md` — DB patterns (if `DB_CHANGES` is Yes or Unsure)
7. `.claude/agents/devops.md` — deployment config (if relevant)

---

## Phase 3: PM Creates Plan

Invoke the **Project Manager agent** (`project-manager.md`) with the following prompt:

> You are the Project Manager for this project. A new feature has been requested:
>
> **Feature:** `<FEATURE_DESC>`
> **Priority:** `<PRIORITY>`
> **DB schema changes needed:** `<DB_CHANGES>`
>
> Please produce a detailed implementation plan with:
> 1. Feature summary (2–3 sentences)
> 2. Files and areas affected (grouped by domain)
> 3. Task breakdown by domain (frontend / backend / DB / DevOps) in dependency order
> 4. Risks and dependencies
> 5. Suggested git branch name: `feature/<slug>` (slug is 2–4 kebab-case words)
>
> Do NOT write any code. Only plan.

Present the PM's plan clearly in a structured format.

**Pause** — "Here is the Project Manager's plan. Does this look right?"

Use `AskUserQuestion`:
- Header: "Plan validation"
- Question: "Does this plan look right?"
- Options:
  - "Yes, proceed" — "Continue to branch creation and execution"
  - "Adjust scope" — "Go back to PM with feedback"
  - "Cancel" — "Abort the feature"

If "Adjust scope": ask the user for their feedback, send it back to the PM for a revised plan, then present again.
If "Cancel": print "Feature cancelled." and stop.

Store the `BRANCH_NAME` from the PM's plan (e.g., `feature/add-auth`).

---

## Phase 4: Create Git Branch

Run:
```bash
git checkout develop
git pull origin develop
git checkout -b <BRANCH_NAME>
```

Confirm: "Branch `<BRANCH_NAME>` created from `develop`."

---

## Phase 5: DB Phase (if needed)

**Only run this phase if `DB_CHANGES` is "Yes" or "Unsure".**

Invoke the **Database Engineer agent** with the relevant task from the PM's plan.

The Database Engineer **must**:
1. **Plan first** — describe exactly what schema changes are needed and why, without touching any files yet
2. **Show the diff** — present the proposed change to the user: Prisma schema change (Node.js) / Drizzle `schema.ts` + generated migration (Node + pgvector) / hand-written `.up.sql`+`.down.sql` (Go + pgvector) / Firestore rules change (Firebase). For pgvector changes, confirm the `vector` dimension matches the embeddings model and that `CREATE EXTENSION vector` precedes any `vector` column.
3. **Ask for approval** — use `AskUserQuestion` before applying anything:
   - Header: "DB change approval"
   - Question: "Apply this database change?"
   - Options: "Yes, apply" / "No, adjust first" / "Cancel"
4. For **destructive changes** (dropping columns, renaming fields, changing types, removing indexes): add a second confirmation question explicitly labeling it as irreversible
5. Only after approval: apply the change, run the migration, and commit:
   `git add . && git commit -m "feat(db): <description>"`

**Pause** — "Database phase complete. Review the DB changes above."

Use `AskUserQuestion`:
- Options: "Looks good, continue to backend" / "Redo DB phase" / "Cancel feature"

---

## Phase 6: Backend Phase

Invoke the **Backend Engineer agent** with the relevant task from the PM's plan.

The Backend Engineer should:
- Implement API endpoints / Firebase Functions as specified
- Validate inputs with Zod
- Check authorization on every endpoint
- For pgvector stacks: put any embedding/ingest work in the worker, go through the `Embedder` interface, and reuse the service layer in both the HTTP API and the MCP tools
- Commit with: `git add . && git commit -m "feat(backend): <description>"`

**Pause** — "Backend phase complete. Review the backend changes above."

Use `AskUserQuestion`:
- Options: "Looks good, continue to frontend" / "Redo backend phase" / "Cancel feature"

---

## Phase 7: Frontend Phase

Invoke the **Frontend Engineer agent** with the relevant task from the PM's plan.

The Frontend Engineer must follow all rules from `CLAUDE.md` without exception:
- React Query for all data fetching — **no useEffect for data**
- Components accept IDs as props, not full objects
- No prop drilling beyond 1 level
- Small components (~150 lines max, single responsibility)
- Jotai atoms for any UI state (modal open/close, filters, active tab)

Commit with: `git add . && git commit -m "feat(frontend): <description>"`

**Pause** — "Frontend phase complete. Review the frontend changes above."

Use `AskUserQuestion`:
- Options: "Looks good, continue to review" / "Redo frontend phase" / "Cancel feature"

---

## Phase 8: DevOps Phase (if needed)

**Only run this phase if the PM's plan includes deployment config changes.**

Invoke the **DevOps agent** with the relevant task.

Commit with: `git add . && git commit -m "chore(devops): <description>"`

**Pause** — "DevOps phase complete."

Use `AskUserQuestion`:
- Options: "Looks good, continue to review" / "Redo DevOps phase" / "Cancel feature"

---

## Phase 9: Code Review

Invoke the **Code Reviewer agent** with the following prompt:

> Review all changes made on branch `<BRANCH_NAME>` for the feature: `<FEATURE_DESC>`.
>
> Run `git diff develop...<BRANCH_NAME>` to see all changes.
>
> **Hard block issues (must fix before this feature can merge):**
> - Any `useEffect` used for data fetching (must use React Query instead)
> - Props drilled more than 1 level deep (must use hooks or atoms)
> - Full objects passed as props instead of IDs
> - Hardcoded secrets, credentials, or API keys
> - Missing input validation on backend endpoints
> - Missing authorization checks on backend endpoints
> - Unbounded Firestore queries / SQL queries without WHERE clauses
> - (pgvector stacks) Raw numeric attributes embedded into the text embedding, a `vector` migration before `CREATE EXTENSION vector`, an embeddings SDK called outside the `Embedder` interface, or stored vectors missing `embedding_model`
> - (Go stack) Missing handler-boundary validation, unwrapped errors leaked to clients, or business logic in `cmd/` instead of `internal/`
>
> **Format your review as:**
> 1. Overall assessment (APPROVED / CHANGES REQUESTED)
> 2. Hard block issues (if any) — must be fixed
> 3. Warnings — should be fixed
> 4. Notes — optional improvements
>
> If CHANGES REQUESTED: list exactly what needs to change and which agent should fix it.

If the reviewer requests changes:
- Route the fix to the appropriate specialist agent
- After fixes are committed, run the Code Reviewer again
- Repeat until APPROVED

**Pause** — "Code review complete."

Use `AskUserQuestion`:
- Options: "Merge to develop" / "Keep working on the branch"

---

## Phase 10: Summary

Print a summary:

```
✅ Feature complete: <FEATURE_DESC>

Branch: <BRANCH_NAME>
Commits:
  [list commits made during this session with git log --oneline develop..<BRANCH_NAME>]

Next steps:
  1. Review the diff: git diff develop...<BRANCH_NAME>
  2. Merge when ready: git checkout develop && git merge --no-ff <BRANCH_NAME>
  3. Push: git push origin develop
  4. Delete branch: git branch -d <BRANCH_NAME>
```

Run `push-status done "<project>" "Feature <FEATURE_DESC> complete on <BRANCH_NAME>"` to notify the agent dashboard.
````

---

## Phase 8: Final Summary

Print a full summary of everything that was created:

```
✅ Project initialized: <APP_NAME>

What we're building: <BUILD_DESCRIPTION>
Category: <PROJECT_VISION>
Purpose: <PROJECT_PURPOSE>
Stack: <Firebase | Node.js + React | Node + pgvector + MCP | Go + pgvector + MCP>
Auth: <AUTH_PROVIDER>
Access model: <ACCESS_MODEL>
Multi-tenant: <MULTI_TENANT>

Files created:
  app/                    Vite + React frontend (+ eslint.config.js)
  <functions/ OR api/>    <Firebase Functions OR Express API> (+ eslint.config.mjs)
  <rules-tests/           Firestore rules tests            (Firebase only)>
  .github/workflows/      ci.yml · deploy.yml · preview.yml · verify-auth.yml
  CLAUDE.md               Project conventions
  .gitignore
  <firebase.json + .firebaserc + firestore.rules   (Firebase only)>
  <api/prisma/schema.prisma                        (Node.js only)>
  <api/src/db + api/src/embed + api/src/worker + api/src/mcp + docker-compose.yml   (Node + pgvector only)>
  <db/migrations + internal/ + cmd/{api,worker,mcp} + docker-compose.yml + Dockerfile + Makefile   (Go + pgvector only)>

Agents generated:
  .claude/agents/ROUTER.md
  .claude/agents/project-manager.md
  .claude/agents/frontend-engineer.md
  .claude/agents/backend-engineer.md
  .claude/agents/database-engineer.md
  .claude/agents/devops.md
  .claude/agents/code-reviewer.md

Skill written:
  .claude/skills/newfeature/SKILL.md

Git:
  Branch: develop
  GitHub: <repo URL>

Next steps:
  0. Run the `verify-auth` workflow once to confirm Workload Identity Federation
     works, then protect `develop` and `main` so CI must pass before merge
  1. <Firebase only> Add Firebase config to app/.env (copy from app/.env.example)
     Then: firebase login && firebase use <APP_NAME>
  2. <Node.js only> Set DATABASE_URL in api/.env, then: cd api && pnpm run db:migrate
  3. <Node + pgvector only> cp api/.env.example api/.env, set EMBEDDINGS_API_KEY;
     docker compose up -d db && cd api && pnpm db:migrate
  4. <Go + pgvector only> cp .env.example .env, set EMBEDDINGS_API_KEY;
     docker compose up -d db && migrate -path db/migrations -database "$DATABASE_URL" up
  5. Start dev: cd app && pnpm run dev
  6. Build features: /newfeature
```

Run `push-status done "<APP_NAME>" "Project scaffold complete — stack: <stack>, agents + newfeature skill ready"`.

---

## Important Notes

### pnpm + Firebase gotchas (learned the hard way)

- **Cloud Functions build fails under pnpm** unless `@google-cloud/functions-framework` is an explicit dependency of `functions/`. npm hoists it implicitly; pnpm's strict layout does not. Add it when scaffolding a Firebase project.
- **Gen-2 function hosting rewrites** must target the Cloud Run service, not the function name:
  `"run": { "serviceId": "api", "region": "europe-west1" }` — the `"function": "..."` form 404s.
- **Hosting passes the full path through** — `/api/me` arrives at the function as `/api/me`. Mount the Express app at both `/api` and `/`.
- **Fresh gen-2 functions return 403** until `allUsers` has `roles/run.invoker` on the Cloud Run service.
- **New Firebase projects use `<project>.firebasestorage.app`**, not `.appspot.com`. Do not hardcode the old suffix.
- **Firebase Auth** needs `identityPlatform:initializeAuth` before providers can be enabled, or every call returns `CONFIGURATION_NOT_FOUND`. Google sign-in must be toggled in the console (the API requires an OAuth client id).
- **New service account keys** need ~30s before they authenticate.


- **pnpm only** — always use `pnpm install`, never npm or yarn. Matches the global standard in `~/.claude/CLAUDE.md`.
- **Firebase regions** — always `europe-west1` for Functions, `eur3` for Firestore
- **TailwindCSS v4** — uses `@import "tailwindcss"` in CSS (not the v3 config file approach)
- **shadcn/ui** — components are self-contained (no Radix peer dependency required)
- **useEffect rule** — prominently embedded in `CLAUDE.md`, Frontend Engineer agent, and Code Reviewer agent
- **pgvector stacks** — local Postgres+pgvector runs via `docker-compose` (`pgvector/pgvector` image) as the default dev DB; moving to a hosted DB (e.g. Neon) is a `DATABASE_URL` swap with no code changes (Neon is plain Postgres). Always `CREATE EXTENSION vector` before any `vector` column; keep raw numeric attributes out of the embedding; store `embedding_model` per row; embeddings go through a pluggable `Embedder` interface; ingest/embedding work runs in the worker process; the MCP server reuses the API's service layer.
- **MCP servers** — Node stack uses `@modelcontextprotocol/sdk` (stdio); Go stack uses `github.com/modelcontextprotocol/go-sdk` — both versions move fast, so `go mod tidy` / `pnpm install` and pin whatever resolves.
- **create-agents consistency** — the agent files generated in Phase 6 must be consistent with the `create-agents` skill's output format (model assignments, template structure, ROUTER.md format)
- **Phase pauses** — always pause between phases and get user approval before continuing
- **CI/CD is not optional** — a project without a green pipeline is not scaffolded. Lint must
  be installed and passing, not just referenced by a script
- **Deploy order** — backend (rules, indexes, functions / migrations) always ships before the
  frontend that depends on it
- **Firestore emulator needs JDK 21+** — firebase-tools rejects older JDKs, which breaks the
  rules tests locally and in CI
- **CI authenticates to GCP keylessly** via Workload Identity Federation. Never mint a
  service-account JSON key; org policy often forbids it, and it is a liability either way
- **`gh secret set` from an empty file succeeds silently** — always verify the source is
  non-empty, or you get an empty secret that fails much later
