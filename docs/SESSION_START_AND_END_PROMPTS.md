# Session Start and End Prompts

Quick reference for maintaining documentation across sessions.

---

## Starting a Session

**Say:** `"Continuing AI score building"`

Cascade will:
1. Read the progress file and workflow
2. Report: last session date, pending work, current ASB number
3. Ask what to work on

---

## Ending a Session

**Say:** `"Wrapping up"`

Cascade will:
1. Summarize what was accomplished
2. Suggest a Tier 2 commit if threshold met (4+ increments)
3. Update progress file with pending work and last session summary

---

## During a Session

**Nothing needed from you.** Cascade will:
- Create ASB-XXX memories after code changes
- Suggest Tier 2 commits when the threshold (4 increments) is reached
- Log lessons learned to Workflow Methodology doc

---

## Manual Triggers

| You say | What happens |
|---------|--------------|
| `"Tier 2 commit"` | Git commit summarizing all Tier 1 work since last commit |
| `"Tier 3 milestone"` | Full docs update + git commit + git tag |
| `/ai-score-building` | Activates the workflow (same as "Continuing AI score building") |

---

## Key Files

| File | Purpose |
|------|---------|
| `docs/AI_SCORE_BUILDING_PROGRESS.md` | Session state, ASB numbering, commit history |
| `docs/WORKFLOW_METHODOLOGY.md` | Lessons learned, patterns, ideas |
| `.windsurf/workflows/ai-score-building.md` | Full workflow definition |
