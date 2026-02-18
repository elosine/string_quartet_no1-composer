# Session Start and End Prompts + Other Prompts

Quick reference for maintaining documentation across sessions and repeatable operations.

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

## Bulk Move All Objects in a Save Score

**Say:** `"Bulk move objects in save score [FILENAME]. Move all objects from [THRESHOLD] seconds by [DELTA] seconds. Make a copy first."`

Cascade will:
1. Copy the original score to a new incremented file
2. Analyze all object types and their time anchor fields
3. Flag any objects spanning the threshold boundary
4. Apply the move to all 7 object types (curves, motives, MIDI snippets + internal events, audio clips, GCs, SVG elements, MIDI track events)
5. Run full verification (thousands of per-field tests) confirming exact shift + formation preservation

**Reference doc:** `docs/BULK_MOVE_OBJECTS.md` — contains copy-pastable scripts for move, verify, and analysis. Just change 3 constants: `THRESHOLD`, `DELTA`, `INPUT`.

---

## Key Files

| File | Purpose |
|------|---------|
| `docs/AI_SCORE_BUILDING_PROGRESS.md` | Session state, ASB numbering, commit history |
| `docs/WORKFLOW_METHODOLOGY.md` | Lessons learned, patterns, ideas |
| `.windsurf/workflows/ai-score-building.md` | Full workflow definition |
| `docs/BULK_MOVE_OBJECTS.md` | Bulk move scripts, object type reference, verification, history |
