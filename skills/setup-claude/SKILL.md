---
name: setup-claude
description: Set up Claude Code in an existing project. Analyzes the codebase, creates CLAUDE.md with project conventions, generates a specialized agent team in .claude/agents/, and writes the /newfeature development workflow skill.
argument-hint: ""
---

# Setup Claude

**Version:** 1.0.0

Adds Claude Code's agent infrastructure to an existing project. Scans the codebase to understand the stack and structure, then generates a project-specific CLAUDE.md, a team of specialized agents, and a `/newfeature` development workflow skill.

Execution mode: **pause at phase boundaries** — present a summary at the end of each major phase and wait for user approval before continuing.

## Changelog

### 1.0.0 — 2026-03-16
- Initial release: codebase analysis, CLAUDE.md generation, agent team, newfeature skill

---

## Phase 1: Analyze Project

Scan the current working directory to understand the project. Run ALL of the following:

### 1a: Directory structure

Run `ls -la` and a broad file search to see the project layout:

```bash
find . -maxdepth 3 -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/build/*' -not -path '*/.next/*' -not -path '*/__pycache__/*' -not -path '*/venv/*' -not -path '*/.venv/*' -type f \( -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.toml" -o -name "*.lock" -o -name "*.config.*" -o -name "Dockerfile" -o -name "Makefile" -o -name "*.prisma" -o -name "*.rules" \) | head -60
```

Do NOT use the Glob tool for this — use Bash for an accurate picture including hidden files.

### 1b: Package / dependency files

Read all `package.json` files (check root, and subdirectories: `app/`, `frontend/`, `web/`, `client/`, `api/`, `server/`, `backend/`, `functions/`, `packages/*/`, `services/*/`). Also check for `pyproject.toml`, `go.mod`, `Cargo.toml`, `Gemfile`, `requirements.txt`, `pom.xml`, `build.gradle` if not a Node project.

Note: name, dependencies, devDependencies, scripts.

### 1c: Config files

Read whichever of these exist:
- `tsconfig.json` / `jsconfig.json` (root and subdirectories)
- `vite.config.*` / `next.config.*` / `nuxt.config.*` / `webpack.config.*` / `astro.config.*`
- `firebase.json` / `.firebaserc` / `firestore.rules`
- `prisma/schema.prisma` or `*/prisma/schema.prisma`
- `drizzle.config.*`
- `docker-compose.yml` / `Dockerfile`
- `.github/workflows/*.yml`
- `tailwind.config.*` / `postcss.config.*`
- `vercel.json` / `netlify.toml` / `fly.toml` / `render.yaml` / `railway.json`
- `.env.example` / `.env.local.example`
- `supabase/config.toml`

### 1d: Existing Claude config

Check if any of these already exist:
- `CLAUDE.md`
- `.claude/` directory
- `.claude/agents/`
- `.claude/skills/`

If they exist, read their contents and warn the user they will be overwritten or merged.

### 1e: Git status

Run `git status`, `git branch`, and `git remote -v`.

### 1f: Build analysis

From everything gathered, determine:

| Dimension | Detect |
|---|---|
| Language(s) | TypeScript, JavaScript, Python, Go, Rust, Java, etc. |
| Frontend framework | React, Next.js, Vue, Nuxt, Svelte, SvelteKit, Angular, Astro, none |
| Backend framework | Express, Fastify, NestJS, Hono, Django, FastAPI, Flask, Gin, Laravel, Rails, Firebase Functions, none |
| Database | PostgreSQL, MySQL, MongoDB, Firestore, SQLite, Supabase, Redis, none |
| ORM / query builder | Prisma, Drizzle, TypeORM, Sequelize, Mongoose, SQLAlchemy, none |
| Deployment | Firebase, Vercel, AWS, GCP, Docker, Railway, Fly.io, Render, Netlify, etc. |
| Structure | Monorepo / single package / workspace |
| Package manager | npm, yarn, pnpm, bun |
| CSS / styling | Tailwind, CSS modules, styled-components, Sass, vanilla CSS, etc. |
| State management | React Query, SWR, Redux, Zustand, Jotai, Pinia, Vuex, etc. |
| Component library | shadcn/ui, MUI, Ant Design, Chakra, Radix, Headless UI, etc. |
| Auth | Firebase Auth, NextAuth, Clerk, Auth0, Supabase Auth, Lucia, custom JWT, none |
| Testing | Jest, Vitest, Playwright, Cypress, pytest, Go test, etc. |

**Pause** — Present the analysis:

```
Project Analysis

  Name:            <from package.json or directory name>
  Language:        <detected>
  Frontend:        <framework + key libs>
  Backend:         <framework + key libs>
  Database:        <type + ORM>
  Deployment:      <detected or "not detected">
  Structure:       <monorepo / single package>
  Package manager: <detected>
  Auth:            <detected or "not detected">
  Testing:         <detected or "none found">
  Claude config:   <none / partial / exists>
```

Use `AskUserQuestion`:
- Header: "Project analysis"
- Question: "Does this look right? Anything to correct or add?"
- Options: "Looks correct" / "Let me correct something"

If they correct something, update the analysis and re-present.

---

## Phase 2: Gather Details

Ask follow-up questions to fill gaps and learn preferences.

**Question 1:**
- Header: "Coding rules"
- Question: "Are there specific coding rules or patterns you want strictly enforced? These become hard-block items in code review — violations must be fixed before merge. Examples: 'no useEffect for data fetching', 'always use server components for data loading', 'no any types', 'all API routes must validate input'."
- Options: *(user types via Other)* / "No special rules"

**Question 2:**
- Header: "Agent team"
- Question: "Which agent roles should be created?"
- Options:
  - "Full team — PM, Frontend, Backend, Database, DevOps, Code Reviewer"
  - "Frontend only — PM, Frontend, Code Reviewer"
  - "Backend only — PM, Backend, Database, Code Reviewer"
  - "Fullstack minimal — PM, Fullstack Engineer, Code Reviewer"
  - "Let me pick"

If "Let me pick": ask which roles they want from: Project Manager, Frontend Engineer, Backend Engineer, Fullstack Engineer, Database Engineer, DevOps / CI/CD, Code Reviewer.

**Question 3** (only if auth was not detected in Phase 1):
- Header: "Auth"
- Question: "What auth system does this project use?"
- Options: "Firebase Auth" / "NextAuth / Auth.js" / "Clerk" / "Supabase Auth" / "Custom JWT" / "None" / "Other"

Store: `CUSTOM_RULES`, `TEAM_CHOICE`, `AUTH` (if asked).

---

## Phase 3: Create CLAUDE.md

Generate a `CLAUDE.md` file for the project root.

### Principles:
- **Specific** — every line applies to THIS project. No generic filler.
- **Concise** — a developer reads the whole thing in under 2 minutes.
- **Actionable** — rules are clear and testable, not vague suggestions.

### Required sections:

```markdown
# <Project Name>

<1-2 sentence description of what the project is and does>

## Stack

<Bulleted list of every technology, with versions where known>

## Structure

<Actual directory layout, 2-3 levels deep, with 1-line annotations>

## Commands

<Actual scripts from package.json / Makefile / etc., grouped by purpose:>
<  Dev: npm run dev, npm run dev:api>
<  Build: npm run build>
<  Test: npm test, npm run test:e2e>
<  Lint: npm run lint, npm run typecheck>
<  DB: npm run db:migrate, npm run db:generate>
```

### Include IF applicable:

```markdown
## Conventions

<Coding patterns specific to this project — from codebase analysis and user's custom rules>

## Rules

<Hard rules that must never be broken — from user input in Phase 2>
<Each rule should be one clear sentence>

## Git Workflow

- Default branch: `main` (production)
- Development branch: `develop`
- Feature branches: `feature/<slug>` from `develop`
- Commit style: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)

## Environment

<Env vars needed and how to set them — sourced from .env.example if it exists>

## Testing

<How to run tests, any testing conventions>
```

### Do NOT include:
- Agent instructions (those go in agent files)
- Lengthy explanations of how frameworks work
- Rules that contradict the existing codebase's established patterns
- Obvious things ("use TypeScript" in a TypeScript project)

**If a `CLAUDE.md` already exists:** show a diff of proposed changes and ask whether to replace, merge, or skip.

**Pause** — Show the full generated CLAUDE.md content.

Use `AskUserQuestion`:
- Header: "CLAUDE.md"
- Question: "Does this look right?"
- Options: "Yes, write it" / "I want changes" / "Skip"

If "I want changes": ask what to change, apply, and re-present.

Write the file.

---

## Phase 4: Generate Agent Team

Create the `.claude/agents/` directory and generate agent files based on the team composition chosen in Phase 2.

### Agent file format

Every agent file follows this structure:

```markdown
---
model: <opus OR sonnet>
description: <one-line description>
---

# <Role Name>

## Identity

<What this agent does and doesn't do — 1-2 sentences>

## Scope

**Owns:** <file paths/patterns this agent is responsible for>
**Never touches:** <paths outside this agent's domain>

## Rules

<Numbered list of non-negotiable rules for this agent>

## Patterns

<Stack-specific patterns with code examples where helpful>

## Workflow

<Step-by-step process this agent follows when given a task>
```

### Agent definitions

Generate the following agents based on team choice. **Tailor every agent's rules and patterns to the actual stack detected in Phase 1.**

---

#### ROUTER.md — always generated

The routing guide that maps tasks to agents. Must include:

1. **Agent table** — columns: Agent, Model, Domain, File
2. **Routing rules** — "when to use which agent" as a clear decision list
3. **File ownership** — maps actual project directories and file patterns to responsible agents
4. **Escalation paths** — what happens when an agent encounters work outside its domain (e.g., "Frontend agent finds a missing API endpoint → route to Backend Engineer")

---

#### project-manager.md — always generated, Opus

- Plans features and creates implementation plans. Never writes code.
- Creates task breakdowns grouped by agent domain, in dependency order
- Routes tasks to the correct specialist agent
- Resolves conflicts between agents
- Plan format includes: feature summary, files affected, task breakdown, risks, suggested branch name

---

#### code-reviewer.md — always generated, Opus

- Reviews all changes on the feature branch before merge
- Output format: APPROVED / CHANGES REQUESTED with specific file:line references

**Hard-block list** (review fails, must fix before merge):
- Hardcoded secrets, credentials, or API keys
- Missing input validation at API/function boundaries
- Missing authorization checks on data-mutating endpoints
- All custom rules from Phase 2 become hard-blocks

**Stack-specific hard-blocks** — add these based on what was detected:
- React + React Query: any `useEffect` used for data fetching
- React: props drilled more than 1 level, full objects passed as props instead of IDs
- Next.js App Router: `useEffect` for data fetching in client components, data fetching in client components that should be server components
- Any backend: unbounded database queries (missing pagination/limits), raw DB errors exposed to clients

**Warning list** (should fix but doesn't block):
- Missing error handling
- Overly complex functions (>50 lines)
- `any` types in TypeScript
- Missing tests for new functionality

If CHANGES REQUESTED: list exactly what needs to change, which file:line, and which agent should fix it.

---

#### frontend-engineer.md — if team includes Frontend, Sonnet

Scope: all frontend source code (components, pages, hooks, stores, styles).

Generate rules specific to the detected frontend stack:

**React + React Query:**
- No `useEffect` for data fetching — always `useQuery` / `useMutation`
- Pass IDs as props, not full objects — let each component load its own data
- No prop drilling beyond 1 level — use React Query hooks or state atoms
- Small components (~150 lines max, single responsibility)
- Include ❌/✅ code examples for the top rules

**React + SWR:**
- Same rules as React Query, adapted for SWR's `useSWR` / `useSWRMutation` API

**Next.js (App Router):**
- Server Components by default, `'use client'` only when needed (interactivity, browser APIs)
- Data fetching in Server Components or Route Handlers, not in client components
- No `useEffect` for data fetching in client components
- Use Next.js caching and revalidation patterns

**Vue + Pinia:**
- Composition API only (`<script setup>`), no Options API
- Pinia stores for shared state
- Composables (`use*.ts`) for reusable logic

**Svelte / SvelteKit:**
- `+page.server.ts` load functions for data fetching
- Stores for shared state
- Keep components small and focused

*Adapt to whatever was detected. If the project uses a component library (shadcn, MUI, etc.), note it in scope.*

---

#### backend-engineer.md — if team includes Backend, Sonnet

Scope: all backend/API source code (routes, controllers, services, middleware).

Core rules (adapt terminology to actual framework):
1. Validate all inputs at the route/function boundary using the project's validation library (Zod, TypeBox, Joi, Pydantic, class-validator, etc.)
2. Check authorization before any data read or write — never assume the caller is allowed
3. Keep route handlers thin — business logic belongs in a `services/` or `lib/` layer, not inline
4. Never expose raw database errors or stack traces to clients — catch and return safe error messages
5. Never hardcode secrets, connection strings, or API keys — always read from environment variables
6. Use explicit return types on route handlers and service functions
7. Every endpoint that modifies data must be idempotent or handle duplicate requests safely

Adapt patterns to the actual framework:
- Express: middleware patterns, error handling middleware
- Fastify: schema validation, hooks
- NestJS: decorators, guards, pipes
- Django/DRF: serializers, permissions, views
- FastAPI: Pydantic models, dependencies
- Firebase Functions: onCall/onRequest patterns

---

#### database-engineer.md — if team includes Database, Opus

Scope: schema files, migrations, database queries, security rules.

**Before making ANY schema change, always:**
1. Describe exactly what will change and why
2. Show the migration/schema diff to the user
3. Use `AskUserQuestion`: "Should I apply this change?" — options: "Yes, apply" / "No, adjust first"
4. Only proceed after explicit approval

**Hard rules:**
- Never run migrations without user approval
- Never modify security rules / RLS policies without showing the full before/after diff
- Label destructive changes (drops, renames, type changes) explicitly as **destructive/breaking** in the approval prompt
- For destructive changes: require a second confirmation — "This change is irreversible. Confirm?"
- Document rollback path in commit messages

Adapt to actual DB + ORM:
- Prisma: `prisma migrate dev`, `schema.prisma` patterns
- Drizzle: drizzle-kit migrations
- Firestore: security rules, collection design, composite indexes
- Supabase: RLS policies, migrations
- Raw SQL: numbered migration files

---

#### devops.md — if team includes DevOps, Sonnet

Scope: deployment config, CI/CD workflows, infrastructure files.

- Owns: `.github/workflows/`, deployment configs (`firebase.json`, `vercel.json`, `Dockerfile`, `docker-compose.yml`, etc.), environment/infra files
- Never touches application code
- Before changing any deployment/CI config: describe the change and get user approval

Rules:
- Never store secrets in config files — use platform secret management (`${{ secrets.* }}` in GitHub Actions, env vars in deployment platforms)
- CI must run type checking and linting on PRs
- Deploy workflows only trigger on push to `main`
- Never skip type checking or tests in CI

---

#### fullstack-engineer.md — if "Fullstack minimal" team chosen, Sonnet

- Combines frontend + backend scope
- Include the most critical rules from both domains
- Reference all source directories (frontend and backend)
- Follow the same validation, auth, and component rules as the separate agents would

---

**Pause** — List all agent files that will be created with a 1-line description of each.

Use `AskUserQuestion`:
- Header: "Agent team"
- Question: "Ready to create these agent files?"
- Options: "Yes, create them" / "Adjust" / "Skip agents"

If "Adjust": ask what to change, update, and re-present.

Write all agent files.

---

## Phase 5: Create newfeature Skill

Create `.claude/skills/newfeature/SKILL.md` — a feature development workflow tailored to this project's actual agent team.

### The generated skill must include these phases:

**Phase 1: Feature Description**
Use `AskUserQuestion` to ask:
- What feature to build (free text)
- Priority: Urgent / High / Normal / Low
- Whether DB changes are needed (only ask if the project has a database and a Database Engineer agent)

**Phase 2: Load Context**
Read `CLAUDE.md` and all files in `.claude/agents/`.

**Phase 3: PM Creates Plan**
Invoke the Project Manager agent to produce an implementation plan:
- Feature summary (2-3 sentences)
- Files and areas affected (grouped by domain)
- Task breakdown by agent, in dependency order
- Risks and dependencies
- Suggested branch name: `feature/<slug>`
- The PM must NOT write any code — only plan.

**Phase 4: User Validates Plan**
Pause for approval. Options: "Yes, proceed" / "Adjust scope" / "Cancel".
If "Adjust scope": collect feedback, send back to PM, re-present.

**Phase 5: Create Git Branch**
```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b <BRANCH_NAME>
```

**Phase 6+: Execution Phases**
One phase per specialist agent, in dependency order. The order depends on which agents exist:
1. Database changes first (if DB Engineer exists and DB changes needed)
2. Backend next (if Backend Engineer exists)
3. Frontend next (if Frontend Engineer exists)
4. DevOps last (if DevOps agent exists and deployment changes needed)
— OR —
1. Fullstack Engineer handles all implementation (if using fullstack minimal team)

For each execution phase:
- Invoke the agent with their specific task from the PM's plan
- The agent commits their work: `git add <specific files> && git commit -m "<type>(<scope>): <description>"`
- Pause for user review after each phase
- Options: "Looks good, continue" / "Redo this phase" / "Cancel feature"

**Code Review Phase**
Invoke the Code Reviewer to review all changes: `git diff develop...<BRANCH_NAME>`.
- If CHANGES REQUESTED: route fixes to the right agent, then re-review
- Repeat until APPROVED

**Summary Phase**
Print: feature name, branch, list of commits (`git log --oneline develop..<BRANCH_NAME>`), and next steps (merge instructions).

### Important:
- **Only reference agents that were actually created in Phase 4** — if no DB engineer was created, the skill must not include a DB phase
- Use actual file paths from this project
- The skill must work as a standalone file with no external dependencies

**Pause** — "Newfeature skill created."

Use `AskUserQuestion`:
- Options: "Looks good" / "Adjust" / "Skip"

---

## Phase 6: Commit & Summary

Use `AskUserQuestion`:
- Header: "Commit"
- Question: "Commit all Claude setup files?"
- Options: "Yes, commit" / "No, I'll commit later"

If yes:
```bash
git add CLAUDE.md .claude/
git commit -m "chore: add Claude Code agent team and development workflow"
```

Print summary:

```
Setup complete!

Files created:
  CLAUDE.md                                Project conventions and rules
  .claude/agents/ROUTER.md                 Agent routing guide
  .claude/agents/project-manager.md        Planning and orchestration (Opus)
  <list all other agent files created with role and model>
  .claude/skills/newfeature/SKILL.md       Feature development workflow

Next steps:
  1. Review the generated files and tweak any rules or conventions
  2. Start building features:  /newfeature
  3. Talk to a specific agent:  @frontend-engineer "build a login page"
```

---

## Important Notes

- **Read before writing** — always analyze the existing codebase first. Never generate generic boilerplate.
- **Adapt to the stack** — agent instructions must reference the actual technologies, file paths, and patterns in the project.
- **Don't contradict the codebase** — if the project consistently uses a pattern, don't write rules against it unless the user explicitly asked for a change.
- **Keep it concise** — CLAUDE.md should be under 200 lines. Agent files should be under 150 lines each.
- **Phase pauses** — always pause between phases and get user approval before continuing.
- **No assumptions** — if something wasn't detected and wasn't asked about, don't make it up. Only include what you actually know about the project.
