---
name: boilr-update
description: Update all boilr-claude skills to the latest version from GitHub.
argument-hint: ""
---

# Boilr Update

**Version:** 1.0.0

Update all locally installed boilr-claude skills by fetching the latest versions directly from the public GitHub repo.

## Changelog

### 1.0.0 — 2026-03-16
- Initial release: fetch and update skills from GitHub

---

## Step 1: Fetch latest skill files from GitHub

Use `WebFetch` to download each skill from the public repo's main branch:

| Skill | URL |
|---|---|
| initproject | `https://raw.githubusercontent.com/maxflach/boilr-claude/main/skills/initproject/SKILL.md` |
| setup-claude | `https://raw.githubusercontent.com/maxflach/boilr-claude/main/skills/setup-claude/SKILL.md` |
| boilr-version | `https://raw.githubusercontent.com/maxflach/boilr-claude/main/skills/boilr-version/SKILL.md` |
| boilr-update | `https://raw.githubusercontent.com/maxflach/boilr-claude/main/skills/boilr-update/SKILL.md` |

Fetch all four in parallel.

If any fetch fails, report the error and skip that skill (continue with the others).

## Step 2: Compare versions

For each skill, read the currently installed version from `~/.claude/skills/<name>/SKILL.md` and compare with the fetched version.

Extract version from the `**Version:**` line.

Categorize each skill:
- **update** — fetched version is newer than installed
- **up to date** — versions match
- **new** — not currently installed
- **fetch failed** — could not download

## Step 3: Show what will change

Print a summary before writing anything:

```
boilr-update

Skill            Installed    Latest    Action
initproject      1.2.0        1.3.0     will update
setup-claude     1.0.0        1.0.0     up to date
boilr-version    1.0.0        1.1.0     will update
boilr-update     1.0.0        1.0.0     up to date
```

If everything is already up to date, print "All skills are up to date." and stop.

Otherwise, use `AskUserQuestion`:
- Header: "Update"
- Question: "Update skills to the latest versions?"
- Options: "Yes, update" / "No, cancel"

If No → stop.

## Step 4: Write updated files

For each skill that needs updating or installing:

```bash
mkdir -p ~/.claude/skills/<name>
```

Then use the `Write` tool to write the fetched content to `~/.claude/skills/<name>/SKILL.md`.

## Step 5: Confirm

Print the result:

```
Updated:
  initproject      1.2.0 → 1.3.0
  boilr-version    1.0.0 → 1.1.0

All skills are now up to date.
```
