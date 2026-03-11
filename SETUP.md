# Setup

You are helping the user install the Claude Project System skills. Follow these steps precisely, in order. Do not skip any step.

---

## What you are installing

Two global Claude Code skills:

1. **`/initproject`** — scaffolds a new full-stack TypeScript project in any empty directory
2. **`/setup-claude`** — adds Claude Code agents, CLAUDE.md, and the `/newfeature` skill to an existing project

---

## Step 1: Create the skill directories

```bash
mkdir -p ~/.claude/skills/initproject
mkdir -p ~/.claude/skills/setup-claude
```

---

## Step 2: Copy the skill files

```bash
cp skills/initproject/SKILL.md ~/.claude/skills/initproject/SKILL.md
cp skills/setup-claude/SKILL.md ~/.claude/skills/setup-claude/SKILL.md
```

---

## Step 3: Verify

```bash
ls ~/.claude/skills/initproject/SKILL.md ~/.claude/skills/setup-claude/SKILL.md
```

If both files exist, the install succeeded.

---

## Step 4: Tell the user they are ready

Print this message:

```
Setup complete!

Two skills are now installed globally:

  /initproject    Scaffold a new project from scratch
  /setup-claude   Add Claude agents + skills to an existing project

To start a new project:
  1. mkdir ~/code/my-app && cd ~/code/my-app
  2. claude
  3. /initproject

To set up Claude in an existing project:
  1. cd ~/code/existing-project
  2. claude
  3. /setup-claude

Requirements:
  - Node.js v20+
  - git
  - GitHub CLI (gh auth login)
  - Firebase CLI (firebase login) — only for Firebase stack projects
```

---

## Notes

- The `boilrapi/` folder in this repo is the Express API framework used by the Node.js + React stack. The initproject skill embeds those files and copies them into new projects automatically — you do not need to touch that folder.
- The Firebase stack (Firestore + Functions) does not use BoilrAPI at all.
- Full documentation is in `claude-project-system.md`.
