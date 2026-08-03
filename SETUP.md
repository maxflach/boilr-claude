# Setup

You are helping the user install the Claude Project System skills. Follow these steps precisely, in order. Do not skip any step.

---

## What you are installing

Four global Claude Code skills:

1. **`/initproject`** — scaffolds a new full-stack project in any empty directory
2. **`/setup-claude`** — adds Claude Code agents, CLAUDE.md, and the `/newfeature` skill to an existing project
3. **`/boilr-version`** — shows installed versions and checks for updates
4. **`/boilr-update`** — updates all skills to the latest version from GitHub

---

## Step 1: Create the skill directories

```bash
mkdir -p ~/.claude/skills/initproject
mkdir -p ~/.claude/skills/setup-claude
mkdir -p ~/.claude/skills/boilr-version
mkdir -p ~/.claude/skills/boilr-update
```

---

## Step 2: Copy the skill files

```bash
cp skills/initproject/SKILL.md ~/.claude/skills/initproject/SKILL.md
cp skills/setup-claude/SKILL.md ~/.claude/skills/setup-claude/SKILL.md
cp skills/boilr-version/SKILL.md ~/.claude/skills/boilr-version/SKILL.md
cp skills/boilr-update/SKILL.md ~/.claude/skills/boilr-update/SKILL.md
```

---

## Step 3: Verify

```bash
ls ~/.claude/skills/initproject/SKILL.md ~/.claude/skills/setup-claude/SKILL.md ~/.claude/skills/boilr-version/SKILL.md ~/.claude/skills/boilr-update/SKILL.md
```

If all four files exist, the install succeeded.

---

## Step 4: Tell the user they are ready

Print this message:

```
Setup complete!

Four skills are now installed globally:

  /initproject      Scaffold a new project from scratch
  /setup-claude     Add Claude agents + skills to an existing project
  /boilr-version    Check installed versions and updates
  /boilr-update     Update skills to the latest version

To start a new project:
  1. mkdir ~/code/my-app && cd ~/code/my-app
  2. claude
  3. /initproject

To set up Claude in an existing project:
  1. cd ~/code/existing-project
  2. claude
  3. /setup-claude

Requirements:
  - Node.js v20+ and pnpm
  - git
  - GitHub CLI (gh auth login)
  - Firebase CLI (firebase login) — only for Firebase stack projects
  - JDK 21+                      — only for Firestore rules tests
  - Docker                       — only for the pgvector stacks
  - Go 1.23+ and golang-migrate  — only for the Go + pgvector stack
```

---

## Notes

- The `boilrapi/` folder in this repo is the Express API framework used by the Node.js + React and Node + pgvector stacks. The initproject skill embeds those files and copies them into new projects automatically — you do not need to touch that folder.
- The Firebase stack (Firestore + Functions) does not use BoilrAPI at all. Neither does the Go + pgvector stack, which has its own `cmd/` + `internal/` layout.
- Full documentation is in `claude-project-system.md`.
