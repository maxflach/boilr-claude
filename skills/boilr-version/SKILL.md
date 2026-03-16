---
name: boilr-version
description: Show installed versions of boilr-claude skills and check for updates from GitHub.
argument-hint: ""
---

# Boilr Version Check

**Version:** 1.1.0

Show the installed version of each boilr-claude skill and whether updates are available.

## Changelog

### 1.1.0 — 2026-03-16
- Check versions against GitHub instead of local repo
- Include boilr-version and boilr-update in the check
- Point users to /boilr-update

### 1.0.0 — 2026-03-16
- Initial release: compare installed vs local repo versions

---

## Step 1: Read installed versions

Read the **Version:** line from each installed skill file:

- `~/.claude/skills/initproject/SKILL.md`
- `~/.claude/skills/setup-claude/SKILL.md`
- `~/.claude/skills/boilr-version/SKILL.md`
- `~/.claude/skills/boilr-update/SKILL.md`

Extract the version number from the line that starts with `**Version:**`.

If a skill file is missing, show "not installed".

## Step 2: Fetch latest versions from GitHub

Use `WebFetch` to read the raw skill files from the public repo:

- `https://raw.githubusercontent.com/maxflach/boilr-claude/main/skills/initproject/SKILL.md`
- `https://raw.githubusercontent.com/maxflach/boilr-claude/main/skills/setup-claude/SKILL.md`
- `https://raw.githubusercontent.com/maxflach/boilr-claude/main/skills/boilr-version/SKILL.md`
- `https://raw.githubusercontent.com/maxflach/boilr-claude/main/skills/boilr-update/SKILL.md`

Extract the version number from each.

## Step 3: Compare and display

Print a table like this:

```
boilr-claude skills

Skill            Installed    Latest    Status
initproject      1.2.0        1.3.0     update available
setup-claude     1.0.0        1.0.0     up to date
boilr-version    1.1.0        1.1.0     up to date
boilr-update     —            1.0.0     not installed

Run /boilr-update to update all skills to the latest version.
```

- If installed == latest → "up to date"
- If installed < latest → "update available"
- If not installed → "not installed"
- If fetch fails → show installed versions only with a note that GitHub is unreachable
