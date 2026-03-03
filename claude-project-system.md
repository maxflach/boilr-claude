# Claude Code Project System

A set of global skills for Claude Code that scaffold full-stack TypeScript projects and guide feature development end-to-end. Designed for solo developers or small teams who want a consistent, high-quality setup without repeating the same decisions on every project.

---

## Table of Contents

1. [What This Is](#what-this-is)
2. [Installation](#installation)
3. [Skills Overview](#skills-overview)
4. [The Two Stacks](#the-two-stacks)
5. [Frontend Rules (Non-Negotiable)](#frontend-rules-non-negotiable)
6. [Agent Team](#agent-team)
7. [Git Workflow](#git-workflow)
8. [Keeping Context Small](#keeping-context-small)
9. [How to Use: initproject](#how-to-use-initproject)
10. [How to Use: newfeature](#how-to-use-newfeature)
11. [Project File Structure](#project-file-structure)
12. [Full Skill File: initproject](#full-skill-file-initproject)

---

## What This Is

Two Claude Code skills that do the heavy lifting for new projects:

| Skill | Scope | What it does |
|---|---|---|
| `/initproject` | Global (`~/.claude/skills/`) | Scaffolds a new project, installs deps, creates git+GitHub, generates an agent team, writes the newfeature skill |
| `/newfeature` | Per-project (`.claude/skills/`) | Builds features end-to-end using specialist agents, with pauses for user approval between phases |

The system is opinionated. It bakes in a specific stack, specific frontend rules, and a specific agent structure so you don't have to make those decisions every time.

---

## Installation

### Requirements

- [Claude Code](https://claude.ai/claude-code) installed and authenticated
- Node.js + npm
- git
- [GitHub CLI (`gh`)](https://cli.github.com/) — authenticated with `gh auth login`
- Firebase CLI (`npm install -g firebase-tools`) — only needed for Firebase projects

### Step 1: Create the skill directory

```bash
mkdir -p ~/.claude/skills/initproject
```

### Step 2: Copy the skill file

Copy the contents of the **Full Skill File** section at the bottom of this document into:

```
~/.claude/skills/initproject/SKILL.md
```

### Step 3: Verify

Open a new Claude Code session. You should see `initproject` listed in the available skills. Run `/initproject` from an empty directory to use it.

> **Note:** The `newfeature` skill is written automatically into each project by `initproject`. You don't need to install it manually.

---

## Skills Overview

### `/initproject` — Global Skill

Run this once per new project from an empty directory. It walks through 8 phases:

1. **Safety check** — warns if the directory isn't empty
2. **Stack selection** — Firebase or Node.js+React
3. **Project details** — app name, multi-tenant, auth provider
4. **Scaffold** — creates all directories, config files, and boilerplate; runs `npm install`
5. **Git + GitHub** — initializes git on a `develop` branch, creates GitHub repo, pushes
6. **Agent team** — generates specialist agent files in `.claude/agents/`
7. **newfeature skill** — writes `.claude/skills/newfeature/SKILL.md` into the project
8. **Summary** — prints everything created, next steps

Each phase pauses for user approval before continuing.

---

### `/newfeature` — Project-Level Skill

Run this inside a project whenever you want to build a feature. It walks through 10 phases:

1. **Feature description** — what to build, priority, whether DB changes are needed
2. **Load project context** — reads `CLAUDE.md`, `ROUTER.md`, agent files
3. **PM creates plan** — Project Manager (Opus) produces a detailed plan
4. **User validates** — review and approve (or adjust) the plan
5. **Create git branch** — `feature/<slug>` off `develop`
6. **DB phase** — Database Engineer makes schema changes (if needed)
7. **Backend phase** — Backend Engineer implements API/functions
8. **Frontend phase** — Frontend Engineer builds components
9. **DevOps phase** — DevOps updates deployment config (if needed)
10. **Code review** — Code Reviewer checks everything; hard-blocks certain patterns
11. **Summary** — lists all commits, next steps to merge

---

## The Two Stacks

### Always included (both stacks)

| Layer | Technology |
|---|---|
| Language | TypeScript (everywhere, always) |
| Frontend build | Vite + React |
| Styling | TailwindCSS v4 |
| Server/async state | TanStack React Query v5 |
| Client UI state | Jotai v2 |
| UI components | shadcn/ui (self-contained, no Radix peer dep) |
| Package manager | npm |

---

### Stack A: Firebase

Best for real-time apps, rapid prototyping, or teams already on Firebase.

| Layer | Technology |
|---|---|
| Database | Firebase Firestore |
| Backend | Firebase Functions (onCall pattern) |
| Auth | Firebase Auth |
| Hosting | Firebase Hosting |
| Input validation | Zod |
| Monorepo structure | `app/` (frontend) + `functions/` (backend) |

**Region defaults:** always `europe-west1` for Functions, `eur3` for Firestore.

```
my-app/
├── app/                  # Vite + React
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── store/        # Jotai atoms
│       └── lib/          # firebase.ts, queryClient.ts
├── functions/            # Firebase Functions
│   └── src/
│       ├── index.ts
│       └── lib/
├── firebase.json
├── .firebaserc
├── firestore.rules
├── CLAUDE.md
└── .claude/
    ├── agents/
    └── skills/newfeature/
```

---

### Stack B: Node.js + React

Best for relational data or complex queries. Everything still deploys to Firebase — frontend on Firebase Hosting, API on Firebase App Hosting.

| Layer | Technology |
|---|---|
| Database | PostgreSQL + Prisma |
| Backend | Express + BoilrApi (typed endpoint registry) |
| Auth | JWT (`jsonwebtoken`) |
| Validation | TypeBox (`@sinclair/typebox`) |
| OpenAPI docs | Auto-generated from TypeBox schemas, Swagger UI at `/api/doc` |
| Frontend client | hey-api (generated from OpenAPI spec — no raw fetch) |
| Frontend deploy | Firebase Hosting |
| API deploy | Firebase App Hosting (`apphosting.yaml`) |
| Monorepo structure | `app/` (frontend) + `api/` (backend) |

```
my-app/
├── app/                  # Vite + React
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── store/        # Jotai atoms
│       └── lib/          # apiClient.ts, queryClient.ts
├── api/                  # Express backend
│   └── src/
│       ├── routes/
│       ├── services/
│       ├── middleware/
│       └── lib/
│   └── prisma/
│       └── schema.prisma
├── CLAUDE.md
└── .claude/
    ├── agents/
    └── skills/newfeature/
```

---

## Frontend Rules (Non-Negotiable)

These rules are baked into `CLAUDE.md`, the Frontend Engineer agent, and the Code Reviewer agent. The Code Reviewer will **block** any feature that violates them.

---

### Rule 1: Never use `useEffect` for data fetching

This is the single most common source of:
- Infinite render loops
- Race conditions (multiple requests in flight, last response wins randomly)
- Memory leaks (component unmounts before fetch resolves, then tries to set state)
- Stale data (you forget to add deps or add too many)

```tsx
// ❌ NEVER DO THIS
function UserCard({ userId }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetchUser(userId).then(setUser); // race condition, memory leak, refetch hell
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

**`useEffect` is only acceptable for:**
- DOM measurements (scroll position, element size)
- Third-party library initialization (maps, chart libraries)
- Focus management

Even for those cases, question whether it's really needed before writing it.

---

### Rule 2: Pass IDs as props, not full objects

Components receive IDs (or keys) and load their own data via React Query. They do NOT receive large pre-fetched objects as props.

**Why:** React Query deduplicates requests by query key. If 5 components all call `useQuery(['user', userId])`, there is only **one** network request. Pass the ID and let React Query handle the rest.

```tsx
// ❌ NEVER — passing full objects as props
function OrderList({ orders }) {
  return orders.map(o => <OrderRow order={o} />);
}

function OrderRow({ order }) {
  return <div>{order.id}: {order.status}</div>;
}

// ✅ ALWAYS — pass IDs, each component self-loads
function OrderList({ orderIds }) {
  return orderIds.map(id => <OrderRow orderId={id} />);
}

function OrderRow({ orderId }) {
  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.get(`/orders/${orderId}`),
  });
  if (!order) return null;
  return <div>{order.id}: {order.status}</div>;
}
```

---

### Rule 3: No prop drilling beyond 1 level

Data should not be passed more than one level deep as props.

If something needs to travel 2+ levels:
- Server data → use a React Query hook in the component that needs it
- UI state → use a Jotai atom

This forces components to be independently self-sufficient.

---

### Rule 4: Small, focused components

- Each component does **one thing**
- A component file should rarely exceed ~150 lines
- If a component renders a list AND manages filtering AND fetches data, it's too big
- Extract sub-concerns into named child components aggressively

---

### Rule 5: Jotai atoms for client-only state

- Jotai atoms are for UI state: modal open/close, active tab, filter selections, optimistic UI
- Never put server data in a Jotai atom — that's React Query's job
- Atoms live in `src/store/` — one file per domain

```typescript
// src/store/uiAtoms.ts
import { atom } from 'jotai';

export const sidebarOpenAtom = atom(false);
export const activeTabAtom = atom<'overview' | 'details'>('overview');

// src/store/filterAtoms.ts
export const dateRangeAtom = atom<{ from: Date; to: Date } | null>(null);
export const statusFilterAtom = atom<string[]>([]);
```

---

### Rule 6: React Query key conventions

Query keys follow a consistent pattern so the cache is predictable:

```typescript
// Single resource
useQuery({ queryKey: ['user', userId], queryFn: () => api.getUser(userId) });

// List with optional filters
useQuery({ queryKey: ['orders', 'list', filters], queryFn: () => api.getOrders(filters) });

// Nested resource
useQuery({ queryKey: ['user', userId, 'orders'], queryFn: () => api.getUserOrders(userId) });
```

---

## Agent Team

Each project gets a team of specialist agents generated by `initproject`. They live in `.claude/agents/`.

### Firebase project

| Agent | Model | Scope |
|---|---|---|
| Project Manager | Opus | Entire project — orchestration only, never writes code |
| Frontend Engineer | Sonnet | `app/src/` |
| Backend Engineer | Sonnet | `functions/src/` |
| Database Engineer | Opus | Firestore schema, security rules, indexes |
| DevOps | Sonnet | `firebase.json`, `.firebaserc`, deployment config |
| CI/CD Engineer | Sonnet | `.github/workflows/` |
| Code Reviewer | Opus | All changed files — hard-blocks rule violations |

### Node.js + React project

| Agent | Model | Scope |
|---|---|---|
| Project Manager | Opus | Entire project — orchestration only, never writes code |
| Frontend Engineer | Sonnet | `app/src/` |
| Backend Engineer | Sonnet | `api/src/` |
| Database Engineer | Opus | `api/prisma/`, migrations, complex queries |
| DevOps | Sonnet | `firebase.json`, `apphosting.yaml`, `.firebaserc` |
| CI/CD Engineer | Sonnet | `.github/workflows/` |
| Code Reviewer | Opus | All changed files — hard-blocks rule violations |

### Why Opus for PM, DB, and Reviewer?

- **Project Manager:** Orchestration quality matters. A bad plan cascades into bad code.
- **Database Engineer:** Schema changes are irreversible. Getting them wrong is expensive.
- **Code Reviewer:** The reviewer is the last line of defense. It needs to catch subtle issues.

### ROUTER.md

`initproject` also creates `.claude/agents/ROUTER.md` — a routing guide that explains which agent to invoke for which type of task. When you open a project in Claude Code, the ROUTER.md is the first thing to read.

---

## Git Workflow

```
main          ← production (never commit directly here)
  └── develop ← integration branch
        ├── feature/add-auth
        ├── feature/order-history
        └── feature/email-notifications
```

- `initproject` creates the `develop` branch and pushes it to GitHub
- `newfeature` creates `feature/<slug>` off `develop`
- After the Code Reviewer approves, you merge `feature/<slug>` → `develop`
- Merging `develop` → `main` is a manual step (deploy when ready)

**Commit style:** conventional commits
- `feat(frontend): add user profile page`
- `feat(backend): add order creation endpoint`
- `feat(db): add orders table migration`
- `chore(devops): update deploy config`
- `fix(frontend): fix query key for order list`

---

## Keeping Context Small

Context is the most limited resource in a Claude Code session. Every file read, every code example, and every agent instruction consumes it. Once context fills up, Claude starts losing earlier information and quality degrades. These rules keep context usage low throughout the system.

---

### Rule 1: ROUTER.md is a lookup table, not a document

**ROUTER.md should be short — under 100 lines.** It is read at the start of almost every agent interaction, so its cost is paid repeatedly. If it's 400 lines, you burn context on every feature.

**Good ROUTER.md:**
- One table: agent → model → file scope
- One table: task type → which agent to call
- That's it

**Bad ROUTER.md:**
- Long prose descriptions of each agent
- Examples of what each agent does
- Repeated information from the agent files themselves

The agent files are the detailed reference. ROUTER.md is just the index.

---

### Rule 2: Agents only read files in their own scope

Each agent file declares a **file scope** — the directories it owns. When an agent is invoked, it should only read files within its scope unless it explicitly needs a cross-boundary reference.

- Frontend Engineer: only reads `app/src/`
- Backend Engineer: only reads `functions/src/` or `api/src/`
- Database Engineer: only reads schema/rules files
- DevOps: only reads config files

**Never ask an agent to "read the whole project".** Give it the specific task from the PM's plan and let it read only what it needs.

---

### Rule 3: Start a fresh session per feature

When you run `/newfeature`, do it at the start of a new Claude Code session — not after an hour of other conversation. Every message and file read in your current session is already in context. Starting fresh means the feature gets the full context window.

If you feel the session getting slow or responses getting less precise, start a new session. Claude Code will re-read `CLAUDE.md` and `ROUTER.md` automatically.

---

### Rule 4: Keep agent files focused, not exhaustive

Each agent file should answer one question: **"What do I need to know to do my job in this project?"**

- Include: file paths, key patterns with short code examples, hard rules, escalation criteria
- Exclude: tutorial-level explanations, redundant context that's in CLAUDE.md, long prose
- Target length: **~80–120 lines** per agent file. If an agent file is 300+ lines, it's too long and will hurt context every time it's read.

---

### Rule 5: Don't load all agents upfront

The `newfeature` skill only reads agent files that are relevant to the current feature. If a feature doesn't need DB changes, `database-engineer.md` is not loaded. If there are no DevOps changes in the plan, `devops.md` is not loaded.

**When routing manually (outside of `/newfeature`):** read ROUTER.md to pick the agent, then read only that agent's file. Don't read all 6 agent files to decide which one to use.

---

### Rule 6: Summarize, don't paste

When handing context between phases (e.g., PM plan → Backend Engineer), pass a **summary** of what the previous phase produced, not a full paste of the raw output.

Instead of: "Here is the full PM plan output: [500 lines]"
Use: "The PM plan says: add a `POST /orders` endpoint that creates an order and deducts inventory. See `api/src/routes/orders.ts` (doesn't exist yet)."

---

### Rule 7: Commit often, start fresh

Each agent commits their own work at the end of their phase. This means you can start a new Claude session after each phase if needed — the work is preserved in git, and the new session only needs to know what comes next, not everything that came before.

The pause-and-approve pattern in `/newfeature` is also a natural checkpoint to start a fresh session between phases if context is getting heavy.

---

### Quick reference: context cost per item

| Item | Approximate context cost |
|---|---|
| ROUTER.md (100 lines) | Low |
| One agent file (100 lines) | Low |
| CLAUDE.md (150 lines) | Low |
| One agent file (300+ lines) | Medium — trim it |
| Full project file scan | High — avoid |
| Pasting full PM plan output | Medium — summarize instead |
| Reading all 6 agent files | High — only read what you need |
| Long running conversation before /newfeature | High — start fresh |

---

## How to Use: initproject

### 1. Create an empty directory

```bash
mkdir ~/code/my-app && cd ~/code/my-app
```

### 2. Run the skill

```
/initproject
```

### 3. Answer the questions

The skill will ask (one phase at a time):
- Stack: Firebase or Node.js+React?
- App name
- Multi-tenant? (Yes/No)
- Auth provider (Firebase Auth / JWT / None)
- GitHub visibility (Private / Public)

### 4. Wait for it to finish

At each phase boundary, it will pause and ask for approval. You'll see:
- `app/` scaffold + npm install complete ✅
- git on `develop` + GitHub repo created ✅
- Agent team generated ✅
- newfeature skill written ✅

### 5. Configure environment variables

**Firebase:**
```bash
cp app/.env.example app/.env
# Fill in Firebase config from Firebase Console → Project Settings
firebase login
firebase use my-app
```

**Node.js:**
```bash
cp api/.env.example api/.env
# Fill in DATABASE_URL
cd api && npm run db:migrate
```

### 6. Start developing

```bash
cd app && npm run dev
```

Then use `/newfeature` to build features.

---

## How to Use: newfeature

### 1. Open the project in Claude Code

```bash
cd ~/code/my-app
claude
```

### 2. Run the skill

```
/newfeature
```

### 3. Describe the feature

The skill asks:
- What feature do you want to build?
- Priority (Urgent / High / Normal / Low)
- Does this require DB schema changes? (Yes / No / Unsure)

### 4. Review the PM's plan

The Project Manager (Opus) produces a plan with:
- Feature summary
- Files and areas affected
- Task breakdown by domain
- Risks and dependencies
- Suggested branch name

You can approve it, ask to adjust scope, or cancel.

### 5. Watch it build

The skill runs each phase with a pause in between:
- DB Engineer (if schema changes)
- Backend Engineer
- Frontend Engineer
- DevOps (if deployment config changes)
- Code Reviewer

Each agent commits their own work. If the reviewer finds issues, the relevant agent fixes them.

### 6. Merge when ready

```bash
git checkout develop
git merge --no-ff feature/my-feature
git push origin develop
git branch -d feature/my-feature
```

---

## Project File Structure

After `initproject` runs, here's what every project has:

### Root

```
my-app/
├── CLAUDE.md             ← Project conventions (rules, stack, naming)
├── .gitignore
├── app/                  ← Frontend (always)
├── functions/ OR api/    ← Backend (stack-dependent)
├── firebase.json         ← Firebase projects only
├── .firebaserc           ← Firebase projects only
├── firestore.rules       ← Firebase projects only
└── .claude/
    ├── agents/
    │   ├── ROUTER.md
    │   ├── project-manager.md
    │   ├── frontend-engineer.md
    │   ├── backend-engineer.md
    │   ├── database-engineer.md
    │   ├── devops.md
    │   └── code-reviewer.md
    └── skills/
        └── newfeature/
            └── SKILL.md
```

### Frontend (`app/src/`)

```
app/src/
├── components/           ← Shared, reusable components
├── pages/                ← Route entry points
├── hooks/                ← Custom React Query hooks (one per resource)
│   ├── useUser.ts
│   ├── useOrders.ts
│   └── ...
├── store/                ← Jotai atoms (client-only state)
│   ├── uiAtoms.ts
│   └── filterAtoms.ts
└── lib/
    ├── queryClient.ts    ← React Query client config
    ├── firebase.ts       ← Firebase SDK init (Firebase stack)
    └── apiClient.ts      ← Typed fetch wrapper (Node.js stack)
```

### Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Components | PascalCase | `UserCard.tsx`, `OrderList.tsx` |
| Pages | PascalCase + Page suffix | `HomePage.tsx`, `OrdersPage.tsx` |
| Hooks | use + Resource | `useUser.ts`, `useOrders.ts` |
| Atoms | domain + Atoms | `uiAtoms.ts`, `filterAtoms.ts` |
| API functions | camelCase in lib/ | `api.getUser()`, `api.createOrder()` |
| Types | PascalCase | `User`, `Order`, `CreateOrderInput` |

---

## Full Skill File: initproject

Copy the content below into `~/.claude/skills/initproject/SKILL.md` exactly as-is.

> The `newfeature` skill is embedded inside `initproject` and written automatically to each project — you don't need to copy it separately.

---

```markdown
---
name: initproject
description: Scaffold a new full-stack project from scratch. Checks the directory is empty, asks for stack type and project details, scaffolds the project structure, installs dependencies, initializes git with a develop branch, creates a GitHub repo, generates the agent team, and writes the newfeature skill.
argument-hint: ""
---

# Init Project Skill

Scaffolds a new full-stack TypeScript project in the current working directory. Supports two stacks: **Firebase** (Firestore + Functions + Auth + Hosting) and **Node.js + React** (PostgreSQL + Prisma + Express + React). Always uses Vite + React + TailwindCSS v4 + React Query + Jotai + shadcn/ui on the frontend.

Execution mode: **pause at phase boundaries** — present a summary at the end of each major phase and wait for user approval before continuing.

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
  - "Node.js + React" — "PostgreSQL + Prisma + Express API + React frontend. Best for relational data, complex queries, or when you need a portable backend."

Store the answer as `STACK` (either `firebase` or `nodejs`).

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

**Pause** — show summary of choices and ask "Ready to scaffold? This will create the project structure and install dependencies."

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
mkdir -p .claude/agents .claude/skills/newfeature
```

**Node.js + React stack:**
```
mkdir -p app/src/components app/src/pages app/src/hooks app/src/store app/src/lib
mkdir -p api/src/routes api/src/services api/src/middleware api/src/lib
mkdir -p api/prisma
mkdir -p .claude/agents .claude/skills/newfeature
```

### 4b: Write config files

#### Both stacks — app/ frontend

Write `app/package.json`:
```json
{
  "name": "<APP_NAME>-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "jotai": "^2.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.0.0"
  },
  "devDependencies": {
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

export default defineConfig({
  plugins: [react()],
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
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "serve": "npm run build && firebase emulators:start --only functions",
    "shell": "npm run build && firebase functions:shell",
    "start": "npm run shell",
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
```
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

Write `api/package.json`:
```json
{
  "name": "<APP_NAME>-api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.0.0",
    "express": "^4.19.0",
    "cors": "^2.8.5",
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "@types/cors": "^2.8.0",
    "prisma": "^5.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

Write `api/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Write `api/src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Register routes here
// import { userRoutes } from './routes/users';
// app.use('/users', userRoutes);

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});

export default app;
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
PORT=3000
JWT_SECRET=
```

Write `app/src/lib/apiClient.ts`:
```typescript
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
```

Write `app/.env.example`:
```
VITE_API_URL=http://localhost:3000
```

#### Both stacks — root files

Write `.gitignore`:
```
# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
lib/
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

# Prisma
prisma/*.db
```

Write `CLAUDE.md`:
```markdown
# <APP_NAME> — Project Conventions

## Stack

<!-- Firebase or Node.js + React — filled by initproject -->

## Architecture

- **Frontend:** Vite + React + TypeScript in `app/src/`
- **Backend:** <!-- Firebase Functions in `functions/src/` OR Express API in `api/src/` -->
- **Database:** <!-- Firestore OR PostgreSQL + Prisma -->
- **Auth:** <!-- Firebase Auth OR JWT OR None -->
- **Multi-tenant:** <!-- Yes / No -->

## Frontend Rules (Non-Negotiable)

### ❌ NEVER use `useEffect` for data fetching

This is the most common source of infinite loops, race conditions, and stale data bugs.

\`\`\`tsx
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
\`\`\`

`useEffect` is only acceptable for truly imperative DOM side effects. Even then, question whether it's really needed.

### ✅ React Query for all server/async state

- Use `useQuery` for reads, `useMutation` for writes
- Query keys follow the pattern: `['resource', id]`
- Never use `useEffect + useState` to fetch data

### ✅ Pass IDs as props, not full objects

\`\`\`tsx
// ❌ NEVER
function OrderList({ orders }) {
  return orders.map(o => <OrderRow order={o} />);
}

// ✅ ALWAYS
function OrderList({ orderIds }) {
  return orderIds.map(id => <OrderRow orderId={id} />);
}
\`\`\`

### ✅ No prop drilling beyond 1 level

Beyond 1 level: use a React Query hook (server data) or Jotai atom (UI state).

### ✅ Small, focused components

One responsibility per component. ~150 lines max. Extract aggressively.

### ✅ Jotai atoms for client-only state

Atoms in `src/store/`. Never put server data in an atom.

## Directory Structure

\`\`\`
app/src/
├── components/    # Shared components
├── pages/         # Route entry points
├── hooks/         # React Query hooks
├── store/         # Jotai atoms
└── lib/           # SDK clients, utilities
\`\`\`

## Package Manager

**npm** — always use `npm install`, `npm run dev`, etc.

## Git Workflow

- Default branch: `main`
- Development branch: `develop`
- Feature branches: `feature/<slug>` off `develop`
- Commit style: conventional commits
```

### 4c: Install dependencies

Run npm install in each package directory:

```bash
cd app && npm install
```

For Firebase:
```bash
cd ../functions && npm install
```

For Node.js + React:
```bash
cd ../api && npm install
```

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
- **Firebase stack** → Architecture: "Firebase", Database: "Firestore", Repo: "Monorepo", UI: "shadcn/ui"
- **Node.js + React** → Architecture: "API + Generated Client", Database: "Prisma + PostgreSQL", Repo: "Monorepo", UI: "shadcn/ui"
- Auth: use the `AUTH_PROVIDER` from Phase 3
- Multi-tenant: use `MULTI_TENANT` from Phase 3
- Agent roles: "Full team"

Generate these agent files in `.claude/agents/`:

| File | Role | Model |
|---|---|---|
| `project-manager.md` | Project Manager | Opus |
| `frontend-engineer.md` | Frontend Engineer | Sonnet |
| `backend-engineer.md` | Backend Engineer | Sonnet |
| `database-engineer.md` | Database Engineer | Opus |
| `devops.md` | DevOps | Sonnet |
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
- Unbounded Firestore queries (Firebase) or missing WHERE clauses in queries (Node.js)

**Backend Engineer** must include these rules:
- Always validate all inputs with Zod at the route/function boundary — never trust incoming data
- Always check authorization before any data read or write
- Keep route handlers thin — business logic in a `services/` layer, not inline in handlers
- Never expose raw database errors or stack traces to clients
- Never hardcode secrets — always read from environment variables
- Use explicit TypeScript return types on all handlers and service functions
- Every endpoint that modifies data must be idempotent or handle duplicate requests safely

**Database Engineer** must include these rules and behaviors:

**Before making ANY schema change, always:**
1. Describe exactly what will change and why
2. Show the migration/rule diff to the user
3. Call `AskUserQuestion` — "Should I apply this change?" — options: "Yes, apply" / "No, adjust first"
4. Only proceed after explicit approval

**Hard rules:**
- Never run `prisma migrate dev` without user approval
- Never modify `firestore.rules` without showing the full before/after diff first
- Never drop a column, rename a field, or change a type without labeling it as a **destructive/breaking change**
- For destructive changes, require a second confirmation: "This change is irreversible. Confirm?"
- Never delete indexes or collections
- Firebase stack: always use region `eur3` for Firestore, `europe-west1` for Functions
- Node.js stack: every migration must have a rollback path documented in the commit message

**ROUTER.md** must include:
- Agent table with model and domain
- When to use each agent
- File ownership table with actual project paths
- Escalation paths

**Pause** — "Agent team generated. Ready to write the newfeature skill?"

Use `AskUserQuestion`:
- Options: "Yes, write it" / "No, stop here"

---

## Phase 7: Write `newfeature` Skill

Write the following content verbatim to `.claude/skills/newfeature/SKILL.md`:

```
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

Invoke the **Project Manager agent** with the following prompt:

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
```
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
2. **Show the diff** — present the proposed migration SQL / Prisma schema change / Firestore rules change to the user
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
- Commit with: `git add . && git commit -m "feat(backend): <description>"`

**Pause** — "Backend phase complete. Review the backend changes above."

Use `AskUserQuestion`:
- Options: "Looks good, continue to frontend" / "Redo backend phase" / "Cancel feature"

---

## Phase 7: Frontend Phase

Invoke the **Frontend Engineer agent** with the relevant task from the PM's plan.

The Frontend Engineer must follow all rules from `CLAUDE.md` without exception:
- React Query for all data fetching — no useEffect for data
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
  [list commits: git log --oneline develop..<BRANCH_NAME>]

Next steps:
  1. Review the diff: git diff develop...<BRANCH_NAME>
  2. Merge when ready: git checkout develop && git merge --no-ff <BRANCH_NAME>
  3. Push: git push origin develop
  4. Delete branch: git branch -d <BRANCH_NAME>
```

Run `push-status done "<project>" "Feature <FEATURE_DESC> complete on <BRANCH_NAME>"` to notify the agent dashboard.
```

---

## Phase 8: Final Summary

Print a full summary of everything that was created:

```
✅ Project initialized: <APP_NAME>

Stack: <Firebase OR Node.js + React>
Auth: <AUTH_PROVIDER>
Multi-tenant: <MULTI_TENANT>

Files created:
  app/                    Vite + React frontend
  <functions/ OR api/>    <Firebase Functions OR Express API>
  CLAUDE.md               Project conventions
  .gitignore
  <firebase.json + .firebaserc + firestore.rules   (Firebase only)>
  <api/prisma/schema.prisma                        (Node.js only)>

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
  1. <Firebase only> Add Firebase config to app/.env (copy from app/.env.example)
     Then: firebase login && firebase use <APP_NAME>
  2. <Node.js only> Set DATABASE_URL in api/.env, then: cd api && npm run db:migrate
  3. Start dev: cd app && npm run dev
  4. Build features: /newfeature
```

Run `push-status done "<APP_NAME>" "Project scaffold complete — stack: <stack>, agents + newfeature skill ready"`.

---

## Important Notes

- **npm only** — always use `npm install`, never yarn or pnpm
- **Firebase regions** — always `europe-west1` for Functions, `eur3` for Firestore
- **TailwindCSS v4** — uses `@import "tailwindcss"` in CSS (not the v3 config file approach)
- **shadcn/ui** — components are self-contained (no Radix peer dependency required)
- **useEffect rule** — prominently embedded in `CLAUDE.md`, Frontend Engineer agent, and Code Reviewer agent
- **Phase pauses** — always pause between phases and get user approval before continuing
```
