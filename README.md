# String Quartet No. 1 — Composer Environment

An interactive composition and performance system for **String Quartet No. 1** by Justin Wen-Lo Yang. This repository contains the complete pipeline: a browser-based Workshop for composing the score, a build system that transforms it into a standalone Performance Score web app, and the production server that delivers it to performers.

**Live:** [justinwenloyang.com](https://justinwenloyang.com)
**Score:** [justinwenloyang.com/string-quartet-no1](https://justinwenloyang.com/string-quartet-no1)
**Demo:** [YouTube](https://www.youtube.com/watch?v=ZfRsF_S-vuE)

## Architecture

```
Workshop (compose) → Build Pipeline (strip/patch) → Performance Score (deploy)
```

- **Workshop** (`public/index.html` + `server.js`) — Full composition environment with notation, MIDI, curves, SVG graphics, and a canvas-based score timeline
- **Build Pipeline** (`scripts/build_performance_app.js`) — Strips Workshop-only systems (~40% size reduction), injects rehearsal/performance mode, parts view, annotations, sync, and converts SVG text to font-independent paths
- **Performance Score** (`scripts/performance_server.js`) — Express + Socket.IO server with JWT auth, room management, synchronized playback, and real-time clock sync

## Quick Start

### Workshop (local composition)
```bash
npm install
node server.js
# → http://localhost:3000
```

### Performance Score (local preview)
```bash
npm install
node scripts/build_performance_app.js
node scripts/performance_server.js
# → http://localhost:3001
```

### Deploy to Production
```bash
git add . && git commit -m "description" && git push
ssh -i ~/.ssh/id_ed25519 root@5.161.233.35 \
  "su - deploy -c 'cd /home/deploy/sq1 && git pull && node scripts/build_performance_app.js'"
# Add: pm2 restart sq1-server  (if performance_server.js changed)
```

## Project Structure

```
public/              Workshop app (index.html = entire composition engine)
server.js            Workshop server (Node.js, serves public/)
scripts/             Build pipeline + performance server + patch files
  build_performance_app.js   Transforms Workshop → Performance Score
  performance_server.js      Production Express + Socket.IO server
  performance_*_patches.js   Canvas, parts, rehearsal, annotation patches
  generate_doc_pdfs.js       Puppeteer PDF generation
landing/             SQ1 landing page (instrument picker, rooms)
homepage/            Portfolio homepage (justinwenloyang.com)
docs/                All project documentation (40+ files)
  STRING_QUARTET_PIPELINE_PLAN.md   Master reference document
  IMPLEMENTATION_PROGRESS.md        Phase-by-phase progress log
  PROJECT_JOURNAL.md                Consolidated project journal (Phase 16)
  technical_manual/                 Performer guide (HTML + PDF)
  notation_instructions/            Music performance instructions (HTML + PDF)
scores/              Saved score JSON files
lilypond_code/       LilyPond notation fragments + SVG assembly tooling
curve_library/       Saved dynamic curve presets
gc_library/          Graphic component presets (conductor gestures)
tools/               Standalone HTML utility tools
builds/              Generated output (gitignored)
data/                Runtime sessions + performer profiles (gitignored)
```

## Documentation

- **`docs/STRING_QUARTET_PIPELINE_PLAN.md`** — Master reference: full architecture, all 16 phases, design decisions, post-mortems
- **`docs/IMPLEMENTATION_PROGRESS.md`** — Phase-by-phase implementation log with status
- **`docs/PROJECT_JOURNAL.md`** — Consolidated project journal with AI quick-start guide
- **`docs/WORKING_PRINCIPLES.md`** — Development methodology and principles

## Tags

- `v1.0-composition` — End of composition phase (March 5, 2026)
- `v1.0-production` — Production deployment complete with homepage (March 26, 2026)
- `phase-N-complete` — Individual phase completion points

## License

See [LICENSE](LICENSE) for details.