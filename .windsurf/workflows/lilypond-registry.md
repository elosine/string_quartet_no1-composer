---
description: LilyPond Settings Registry - consult and update notation settings when working on .ly files
---

# LilyPond Settings Registry Workflow

Use this workflow when creating, editing, or reviewing any `.ly` file.

## On Invocation

1. Read `docs/LILYPOND_SETTINGS_REGISTRY.md` in full
2. Report to the user:
   - Registry last updated date
   - Current defaults relevant to the task (e.g., if working on a pizzicato file, report notehead, stem, tuplet, and layout defaults)
3. Ask the user what mode they need:
   - **New file** — apply current defaults from registry
   - **Update setting** — change a current default and update the registry
   - **Add setting** — register a newly discovered setting
   - **Lookup** — find a specific setting or its history

## Mode: New File

1. Start from `lilypond_code/StartingTemplate.ly`
2. Apply all **CURRENT DEFAULT** values from the registry
3. If the file uses technique-specific settings (e.g., feathered beams, pressure wedge, cross noteheads), pull those from the relevant registry section
4. Confirm with the user before writing

## Mode: Update Setting

1. User describes what they want to change (e.g., "make stem lengths 5.5 instead of 6")
2. Find the setting in the registry
3. Show the current value, all historical values, and any rationale
4. Make the change in the active `.ly` file
5. Update the registry:
   - Move old "CURRENT DEFAULT" to the variants table
   - Mark the new value as **CURRENT DEFAULT**
   - Add a date and brief rationale note
6. If the setting is also in `StartingTemplate.ly` or `MasterTemplate.ly`, update those files too
7. Confirm all changes with the user

## Mode: Add Setting

1. User describes a new setting they've discovered or created
2. Check the registry — does a similar setting already exist?
   - If yes: add the new value as a variant with source file
   - If no: create a new entry in the appropriate section (or a new section if needed)
3. Ask the user: is this the new default, or just a technique-specific variant?
4. Update the registry accordingly
5. If it's a new default, update `StartingTemplate.ly` and `MasterTemplate.ly`

## Mode: Lookup

1. User asks about a specific setting (e.g., "what tuplet padding values have we used?")
2. Find the setting in the registry
3. Report: current value, all variants, source files, decision history
4. No changes made unless user requests

## After Any Change

- Confirm the registry has been updated
- Report what was changed and where
- Suggest a Tier 2 commit if multiple settings were updated
