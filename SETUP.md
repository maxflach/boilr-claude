# Setup

You are helping the user install the Claude Project System. Follow these steps precisely, in order. Do not skip any step.

---

## What you are installing

The `/initproject` skill — a global Claude Code skill that scaffolds a full-stack TypeScript project in any empty directory. Once installed, the user can run `/initproject` anywhere.

---

## Step 1: Create the skill directory

```bash
mkdir -p ~/.claude/skills/initproject
```

---

## Step 2: Copy the skill file

The skill file is in this repo at `skills/initproject/SKILL.md`. Copy it to the global Claude skills directory:

```bash
cp skills/initproject/SKILL.md ~/.claude/skills/initproject/SKILL.md
```

---

## Step 3: Verify

```bash
ls ~/.claude/skills/initproject/SKILL.md
```

If the file exists, the install succeeded.

---

## Step 4: Tell the user they are ready

Print this message:

```
✅ Setup complete!

The /initproject skill is now installed globally.

To start a new project:
  1. Create an empty directory:   mkdir ~/code/my-app && cd ~/code/my-app
  2. Open Claude Code:            claude
  3. Run:                         /initproject

You will be asked what stack to use (Firebase or Node.js + React), the app name,
and a few other questions. Each major phase pauses for your approval.

Requirements before running /initproject:
  - Node.js v20+
  - git
  - GitHub CLI (gh auth login)
  - Firebase CLI (firebase login)
```

---

## Notes

- The `boilrapi/` folder in this repo is the Express API framework used by the Node.js + React stack. The initproject skill embeds those files and copies them into new projects automatically — you do not need to touch that folder.
- The Firebase stack (Firestore + Functions) does not use BoilrAPI at all.
- Full documentation is in `claude-project-system.md`.
