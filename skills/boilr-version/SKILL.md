---
name: boilr-version
description: Show installed versions of boilr-claude skills and check for updates.
argument-hint: ""
---

# Boilr Version Check

Show the installed version of each boilr-claude skill and whether updates are available.

## Step 1: Read installed versions

Read the **Version:** line from each installed skill file:

- `~/.claude/skills/initproject/SKILL.md`
- `~/.claude/skills/setup-claude/SKILL.md`

Extract the version number from the line that starts with `**Version:**`.

If a skill file is missing, show "not installed".

## Step 2: Read repo versions

Read the **Version:** line from the repo source files:

- `~/code/boilr-claude/skills/initproject/SKILL.md`
- `~/code/boilr-claude/skills/setup-claude/SKILL.md`

If the repo directory doesn't exist, skip the update check and just show installed versions.

## Step 3: Compare and display

Print a table like this:

```
boilr-claude skills

Skill            Installed    Latest    Status
initproject      1.2.0        1.2.0     up to date
setup-claude     1.0.0        1.1.0     update available

To update: cd ~/code/boilr-claude && git pull && claude "read SETUP.md"
```

- If installed == latest → "up to date"
- If installed < latest → "update available"
- If not installed → "not installed"
- If repo not found → show installed versions only, skip Latest/Status columns
