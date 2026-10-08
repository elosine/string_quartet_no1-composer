# print/ — the print score, updates of October 2026

Everything made in October 2026 for the print score sent to the JACK Quartet call lives here.

**The originals are not changed.** They stay where they were until the performance score and
parts are finalized (a separate build, later):

| Original | Where | What it is |
|---|---|---|
| The performance instructions | `docs/notation_instructions/` | the live site's page, as posted March 2026 |
| The print score and parts | `builds/print/` | the PDFs of 2026-03-21 |

## What is here

| Folder | What it holds |
|---|---|
| `instructions/` | The updated performance instructions — a working copy of the original page. **`instructions/UPDATES.md` lists every change.** |
| `cover/` | The cover, in the house style. Words in `cover.json`; `make_cover.ps1` draws it; `node scripts/render_cover.js` prints it to PDF. |
| `score/` | The assembled print score (cover + instructions + score), once built. |
| `formats.json` | The sheet every page is drawn on (the score's own 1200 × 900 pt). |
| `preview_server.js` | `node print/preview_server.js` → `http://localhost:3003/` — look at anything here in a browser. Local only; not part of the website. |

## To build the print score

```
powershell -ExecutionPolicy Bypass -File print/cover/make_cover.ps1     (only if the cover's words changed)
node scripts/render_cover.js                                            (only if the cover changed)
node scripts/build_print_score.js
```

The last one lays the instructions out on the score's sheet, then joins **cover + instructions + score**
into `score/String_Quartet_No_1-JYang.pdf`. The score pages are `builds/print/full_score.pdf`, as they are.
It also writes `instructions/print.html` (the instruction sheets as a page — generated, not tracked) and
`score/instructions.pdf` (those sheets alone).

**The final barline** (added 2026-10-08) is drawn by this build onto the last score page of the assembled PDF —
thin and thick, at the right edge of the last system (about 10 px inside the page's white), from about 10 px
under the timeline's numbers down to the same margin above the system's foot. It is in the assembled PDF only:
`builds/print/full_score.pdf`, the parts and the live score do not have it.

**How the instructions are set on paper** — after Recombination's print front: a title bar, two columns, the
score's face. Each block of the page keeps its on-screen layout and is scaled whole to the print column.
The eight notation fragments stand two to a row. The script's header has the detail.

## Where a finished copy goes

`submissions/Jack_Quartet_2026/` — a copy of the assembled score, as `String_Quartet_No_1-JYang.pdf`.
