# Working Principles

> **Purpose:** A short, high-signal rubric read at the start of every AI session.
> Distilled from hard-won lessons across Phases 1–8 of the String Quartet Performance Score project.
> This is NOT comprehensive documentation — that lives in `STRING_QUARTET_PIPELINE_PLAN.md`.
> This IS the set of principles that prevent repeated mistakes.

---

## How to Use This Document

### Starting a session
1. **AI reads this file first** — it's short enough to be reliably internalized every time.
2. AI reads `IMPLEMENTATION_PROGRESS.md` → RESUME HERE section.
3. If starting a new phase, AI reads that phase's pre-implementation protocol.
4. **AI states back** what it understands the current task to be — you confirm before work begins.

### During a session
- If the AI violates a principle below, correct it and ask it to add a new principle or refine an existing one.
- If a new hard-won lesson emerges from debugging or problem-solving, capture it here before ending the session.

### Amending this document
- Keep it under ~100 lines of principles. Distill, don't accumulate.
- Each principle should be one sentence or a short bullet. If it needs a paragraph, it belongs in the pipeline plan, not here.
- Date and phase-tag new additions so you can trace their origin.
- Periodically review: if a principle has never been relevant in 3+ phases, consider removing it.

---

## Bug Fixing

- **Fix upstream, not downstream.** If the source is wrong, fix the source — don't add workarounds in consumers. *(Phase 4: 1-line CSS fix vs. hours of Puppeteer workarounds)*
- **Root cause before implementation.** Add diagnostic logging, isolate the problem, confirm the cause, then fix. Never guess-and-patch.
- **Minimal fix.** Prefer a single-line change over an engineered solution. The simplest correct fix is the best fix.

## Code Reading

- **Read before you write (5:1 ratio).** Read the full source of every function being overridden or called. Document all branches, shared state, and internal calls. *(Phase 3: ASB-190 and ASB-193 both came from overriding functions without reading their source)*
- **Check all callers.** Before modifying a function, know everything that calls it.
- **Trace the event chain.** Socket events → handlers → state changes → rendering. Know the full path before touching any node.

## Implementation Process

- **Follow the pre-implementation protocol (§13.2.7).** System inventory → source reading → contracts → risk register → staged plan → focused tests → integration. No shortcuts.
- **One system per stage.** Each stage is independently testable. Never combine two untested changes.
- **Test at every stage boundary.** Automated + visual + behavioral. Don't accumulate untested work.
- **Never skip 👁️ human verification.** Present human tests to the user and wait for confirmation before moving to the next stage. *(Phase 5: lesson learned)*
- **Integration test after all stages.** Full end-to-end regression before declaring a phase complete.

## Architecture

- **Subtractive, not additive — for the client.** Strip the Workshop down rather than rebuilding from scratch. The real renderer is always more faithful than a reimplementation. *(Phase 1: subtractive approach preserved all rendering fidelity)*
- **Server architecture may evolve freely.** The existing Workshop server is a starting point, not a constraint. New architecture, enhancements, robustness features, and fallbacks are welcome when the current server is insufficient. Refer to §13.9 (Cloud Deployment) for planned evolution.
- **Patches file, not source modification.** Keep `public/index.html` (Workshop) unchanged when possible. Put overrides in patches files injected by the build script. *(Exception: Phase 4 CSS margin fix was a genuine source bug)*
- **Guard clause pattern.** Workshop code uses `if (window.X)` guards — this makes stripping safe. Respect this pattern.
- **Puppeteer `page.pdf()` re-layouts CSS independently.** The print rendering context is NOT the same as the viewport. Never assume injected CSS will behave identically in both contexts. *(Phase 4)*

## Documentation

- **Documents are the source of truth, not memories.** Memories are a convenience layer for session continuity. Every critical detail must be written into `STRING_QUARTET_PIPELINE_PLAN.md` or `IMPLEMENTATION_PROGRESS.md`.
- **Post-mortem every phase.** Capture bugs, lessons, decisions, and future impacts before moving on. Use the template in §13.2.7.
- **Decisions log with rationale.** Every non-obvious decision gets a one-line entry with the "why." Future sessions need the reasoning, not just the choice.

## Risk Awareness

- **Add "source assumptions" to every risk register.** If your plan assumes the source CSS/JS behaves a certain way, that's a risk. *(Phase 4: asymmetric margins were invisible until PDF capture)*
- **Navigation math: even page boundaries.** Score navigation must land on even page indices. Odd pages flip top/bottom rendering. *(Phase 4: `pairIndex × 2 × secondsPerPage`)*
- **Duration calculations must scan all fields.** Don't assume `startSeconds + duration` — check `endSeconds` explicitly. *(Phase 4: curves[153].endSeconds=508.05 was the true end)*
- **Workshop `page % 2` pattern.** Used in 4+ maker systems (Curve, LineWedge, SVG, GC). Any new system using this pattern needs the bottom-ref swap override. *(Phase 3)*

## Multi-Client & Socket

- **`ScoreTime.now()` for live position, not `currentScoreTimeMs`.** `currentScoreTimeMs` is only updated on stop — it's stale during playback. *(Phase 8: marker-at-zero bug)*
- **Socket ID is not available at init.** `ClockSync.socket.id` isn't set when patches init (connect event already fired). Use polling + event hooks to resolve it. *(Phase 8: leader badge bug)*
- **Stub events must mirror full server payload shape.** If the server sends `leaderId` in `scoreState`, the offline stub must too. Missing fields cause silent feature failures. *(Phase 8: offline leader badge)*
- **Test offline stub AND real server.** They have different timing characteristics. A feature that works on one may break on the other. *(Phase 8: bugs #5-6)*
- **Centralize navigation through a single function.** Multiple code paths calling `GraphicTimeline.onGoto()` directly leads to state inconsistency. Route through `SyncMode.localGoto()`. *(Phase 8: 5 independent paths → 1)*

---

## Changelog
| Date | Phase | Addition |
|------|-------|---------|
| Mar 21, 2026 | 1–4 | Initial document — distilled from all Phase 1–4 post-mortems |
| Mar 23, 2026 | 8 | Added Multi-Client & Socket section (5 principles from Phase 8 post-mortem) |
