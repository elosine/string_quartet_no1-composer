# Maintenance Guide

**Last Updated:** Mar 26, 2026

Quick reference for ongoing maintenance of the String Quartet No. 1 production deployment and repository.

---

## Production Server

| Item | Detail |
|------|--------|
| **Host** | Hetzner VPS — `5.161.233.35` (`justinwenloyang.com`) |
| **User** | `deploy` (non-root) |
| **App path** | `/home/deploy/sq1/` (sparse git clone) |
| **Process** | PM2 `sq1-server` → `node scripts/performance_server.js` |
| **Auto-restart** | PM2 + systemd (`pm2-deploy.service`) |
| **Reverse proxy** | nginx (TLS, static caching) |

### Common Operations

```bash
# SSH into server
ssh -i C:\Users\jwloy\.ssh\id_ed25519 root@5.161.233.35

# Switch to deploy user
su - deploy

# Check server status
pm2 status

# View logs
pm2 logs sq1-server --lines 50

# Restart server
pm2 restart sq1-server

# Full redeploy (from local machine)
ssh -i C:\Users\jwloy\.ssh\id_ed25519 root@5.161.233.35 \
  "su - deploy -c 'cd /home/deploy/sq1 && git pull && node scripts/build_performance_app.js'"

# If performance_server.js changed, also restart:
ssh -i C:\Users\jwloy\.ssh\id_ed25519 root@5.161.233.35 \
  "su - deploy -c 'pm2 restart sq1-server'"
```

### Deployment Checklist

1. Make changes locally
2. If score or patches changed: `node scripts/build_performance_app.js`
3. `git add -A && git commit -m "description" && git push`
4. Run deploy one-liner (above)
5. If `performance_server.js` changed: restart PM2
6. Verify at `https://justinwenloyang.com/string-quartet-no1`

---

## Repository Structure

See `docs/PROJECT_JOURNAL.md` Part 0 → File Map for the complete layout.

### Key Git Tags

| Tag | What It Marks |
|-----|--------------|
| `v1.0-composition` | Composition phase complete (Workshop, all musical material) |
| `v1.0-production` | Full production deployment (Performance Score live) |
| `phase-15-complete` | Homepage + polish complete |
| `phase-16-archive` | Final cleanup, documentation, archive |

### Branches

Only `main` is used. All work is linear on main.

---

## Score Data

- **Production score:** `scores/2295-FinalScore-preVersioning.json` (embedded in build)
- **Score backups:** `scores/versions/` (timestamped JSON)
- **To update the production score:** Change the score path in `build_performance_app.js` line 1, rebuild, deploy

---

## Dependencies

```bash
npm install   # from repo root
```

Key packages:
- `express` — HTTP server
- `socket.io` — real-time multi-client sync
- `jsonwebtoken` — JWT session management
- `opentype.js` — font → vector path conversion in build

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Site down | PM2 crashed or server rebooted | SSH in, `pm2 status`, `pm2 restart sq1-server` |
| Score not updating | Build output stale | Rebuild locally, push, deploy |
| Fonts not rendering | Text-to-paths not run | Rebuild (`build_performance_app.js` runs opentype.js) |
| Room sync broken | Server restart cleared rooms | Performers rejoin; rooms are ephemeral |
| SSL certificate expired | Let's Encrypt renewal failed | Check nginx config, renew cert |
| Sparse checkout missing files | New file not in sparse patterns | Update `.git/info/sparse-checkout` on server |

---

## Creating a New Piece

See `docs/PROJECT_JOURNAL.md` Part IV or run:

```bash
./scripts/create_new_piece.sh <new-piece-name> <target-directory>
```

---

## Documentation Index

| Document | Purpose |
|----------|---------|
| `docs/PROJECT_JOURNAL.md` | Consolidated project journal (start here) |
| `docs/WORKING_PRINCIPLES.md` | Session-start principles |
| `docs/STRING_QUARTET_PIPELINE_PLAN.md` | Complete pipeline plan (all phases) |
| `docs/IMPLEMENTATION_PROGRESS.md` | Phase-by-phase progress with post-mortems |
| `README.md` | Project overview and quick start |
