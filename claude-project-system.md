# Claude Code Project System

A set of global skills for Claude Code that scaffold full-stack projects and guide feature development end-to-end. Designed for solo developers or small teams who want a consistent, high-quality setup without repeating the same decisions on every project.

---

## Table of Contents

1. [What This Is](#what-this-is)
2. [Installation](#installation)
3. [Skills Overview](#skills-overview)
4. [The Four Stacks](#the-four-stacks)
5. [Frontend Rules (Non-Negotiable)](#frontend-rules-non-negotiable)
6. [Agent Team](#agent-team)
7. [Git Workflow](#git-workflow)
8. [Keeping Context Small](#keeping-context-small)
9. [How to Use: initproject](#how-to-use-initproject)
10. [How to Use: newfeature](#how-to-use-newfeature)
11. [Project File Structure](#project-file-structure)
12. [The initproject skill file](#the-initproject-skill-file)

---

## What This Is

Four Claude Code skills. The two that do the heavy lifting for new projects:

| Skill | Scope | What it does |
|---|---|---|
| `/initproject` | Global (`~/.claude/skills/`) | Scaffolds a new project, installs deps, creates git+GitHub, generates an agent team, writes the newfeature skill |
| `/newfeature` | Per-project (`.claude/skills/`) | Builds features end-to-end using specialist agents, with pauses for user approval between phases |

The system is opinionated. It bakes in a specific stack, specific frontend rules, and a specific agent structure so you don't have to make those decisions every time.

---

## Installation

### Requirements

- [Claude Code](https://claude.ai/claude-code) installed and authenticated
- Node.js v20+ and pnpm
- git
- [GitHub CLI (`gh`)](https://cli.github.com/) — authenticated with `gh auth login`
- Firebase CLI (`pnpm add -g firebase-tools`) — only needed for Firebase projects
- Docker — only for the two pgvector stacks
- Go 1.23+ and golang-migrate — only for the Go + pgvector stack

### Step 1: Install the skills

Follow [SETUP.md](SETUP.md) — it copies all four skill files from `skills/` into
`~/.claude/skills/`. Afterwards, `/boilr-update` keeps them current and `/boilr-version` shows
what you have against what's published.

### Step 2: Verify

Open a new Claude Code session. You should see `initproject` listed in the available skills. Run `/initproject` from an empty directory to use it.

> **Note:** The `newfeature` skill is written automatically into each project by `initproject`. You don't need to install it manually.

---

## Skills Overview

### `/initproject` — Global Skill

Run this once per new project from an empty directory. It walks through 8 phases:

1. **Safety check** — warns if the directory isn't empty
2. **Stack selection** — Firebase, Node.js+React, Node + pgvector + MCP, or Go + pgvector + MCP
3. **Project details** — app name, multi-tenant, auth provider
4. **Scaffold** — creates all directories, config files, and boilerplate; runs `pnpm install`
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

## The Four Stacks

### Always included (every stack)

| Layer | Technology |
|---|---|
| Language | TypeScript everywhere, except the Go + pgvector backend |
| Frontend build | Vite + React |
| Styling | TailwindCSS v4 |
| Server/async state | TanStack React Query v5 |
| Client UI state | Jotai v2 |
| UI components | shadcn/ui (self-contained, no Radix peer dep) |
| Package manager | pnpm |

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

### Stack C: Node + pgvector + MCP

Best for semantic search, embeddings or recommenders that need vector similarity plus an MCP
endpoint, while staying in the Node ecosystem. Same frontend and same deploy targets as Stack B.

| Layer | Technology |
|---|---|
| Database | PostgreSQL + pgvector + Drizzle ORM |
| Local DB | Docker `pgvector/pgvector` via `docker-compose` |
| Backend | Express + BoilrApi |
| Worker | Separate ingest/embedding process (`api/src/worker`) |
| Embeddings | Pluggable `Embedder` interface (`api/src/embed`) |
| MCP server | `@modelcontextprotocol/sdk` over stdio (`api/src/mcp`) |
| Migrations | Drizzle-generated SQL; `CREATE EXTENSION vector` is migration `0000` |
| Frontend deploy | Firebase Hosting |
| API deploy | Firebase App Hosting (`apphosting.yaml`) |

---

### Stack D: Go + pgvector + MCP

The same vector/MCP capabilities as Stack C with a Go backend, for when you'd rather not run
Node on the server. The React frontend is identical.

| Layer | Technology |
|---|---|
| Database | PostgreSQL + pgvector (`pgx` + `pgvector-go`) |
| Local DB | Docker `pgvector/pgvector` via `docker-compose` |
| Backend | Go — `chi` routing, `golang-jwt` auth, `cmd/` + `internal/` layout |
| Worker | Separate binary (`cmd/worker`) |
| Embeddings | Pluggable `Embedder` interface (`internal/embed`) |
| MCP server | `github.com/modelcontextprotocol/go-sdk` (`cmd/mcp` + `internal/mcpserver`) |
| Migrations | Hand-written `.up.sql`/`.down.sql` for golang-migrate |
| Frontend deploy | Firebase Hosting |
| API deploy | Cloud Run |

```
my-app/
├── app/                  # Vite + React (identical to Stack B)
├── cmd/
│   ├── api/              # HTTP server entrypoint
│   ├── worker/           # ingest + embedding
│   └── mcp/              # MCP server
├── internal/
│   ├── config/  store/  httpapi/  embed/  mcpserver/
├── db/migrations/        # golang-migrate .up.sql / .down.sql
├── docker-compose.yml    # local Postgres + pgvector
├── CLAUDE.md
└── .claude/
    ├── agents/
    └── skills/newfeature/
```

**Rules both pgvector stacks enforce** — baked into the generated `CLAUDE.md` and into the
Backend, Database and Code Reviewer agents:

- Never mix vector spaces — raw numeric attributes stay in their own columns, never concatenated
  into the text embedding
- Store `embedding_model` per row; changing models means re-embedding the corpus
- `CREATE EXTENSION vector` runs before any `vector` column exists
- Long-running ingest/embedding work belongs in the worker, never in an HTTP handler
- The embeddings client is pluggable — code against `Embedder`, never a provider SDK directly
- MCP tools reuse the API's service layer rather than duplicating query logic

> Both pgvector stacks start on a local Docker Postgres. Moving to a hosted database later
> (e.g. Neon) is a one-line `DATABASE_URL` swap — Neon is plain Postgres over the wire, so no
> code or schema changes.

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
- Stack: Firebase, Node.js+React, Node + pgvector + MCP, or Go + pgvector + MCP?
- App name
- Multi-tenant? (Yes/No)
- Auth provider (Firebase Auth / JWT / None)
- GitHub visibility (Private / Public)

### 4. Wait for it to finish

At each phase boundary, it will pause and ask for approval. You'll see:
- `app/` scaffold + pnpm install complete ✅
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
cd api && pnpm db:migrate
```

### 6. Start developing

```bash
cd app && pnpm dev
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

## The initproject skill file

The skill itself lives at [`skills/initproject/SKILL.md`](skills/initproject/SKILL.md) — that
file is the source of truth, and it is what `/boilr-update` installs.

This document used to inline a full copy of it. That copy silently went stale (it sat at 1.3.0
while the skill moved on), and anyone following its "paste this into `~/.claude`" instruction
would have *downgraded* their install. Pointing at the real file instead means the two can no
longer disagree.

To install or update:

- **First time** — follow [SETUP.md](SETUP.md), which copies all four skill files into
  `~/.claude/skills/`.
- **Afterwards** — run `/boilr-update`, which fetches the latest version of each skill straight
  from this repo. `/boilr-version` shows what you have against what's published.

> The `newfeature` skill is embedded inside `initproject` and written automatically into each
> new project — there is nothing separate to copy.
