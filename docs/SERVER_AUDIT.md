# Server Stability Audit

**Date:** Apr 15, 2026
**Trigger:** 502 errors on justinwenloyang.com — socket.io + 85 other packages missing from `node_modules` on Hetzner VPS. Server process survived (loaded in memory) but couldn't serve static assets from missing packages. Nginx cascade failure turned one bad response into site-wide 502s.

**Server:** Hetzner CPX11, IP 5.161.233.35, domain justinwenloyang.com (Cloudflare)
**Stack:** Node.js + Express + Socket.IO + PM2 + Nginx + Let's Encrypt

---

## Audit Checklist

### 1. Dependency Integrity ✅ FIXED
- [x] `npm install` restored 86 missing packages
- [ ] Run `npm ci` (clean install from lockfile) for guaranteed reproducibility
- [ ] Run `npm ls --all 2>&1 | grep -i "ERR\|MISSING"` — verify zero issues
- [ ] Run `npm audit` — review 2 high severity vulnerabilities found

### 2. PM2 Crash History
- [ ] `pm2 logs sq1-server --err --lines 200 --nostream` — review all past crashes
- [ ] Determine why 16 restarts occurred in 19 days
- [ ] Check if restarts correlate with deploy timestamps or bot activity
- [ ] Verify PM2 auto-start on reboot: `systemctl status pm2-deploy.service`

### 3. Deploy Process Hardening
- [ ] Create `/home/deploy/sq1/deploy.sh` script that runs:
  1. `git pull`
  2. `npm ci` (always, not just when package.json changes)
  3. `node scripts/build_performance_app.js`
  4. `pm2 restart sq1-server`
  5. Health check (`curl -sf http://localhost:3001/health`)
  6. Print success/failure
- [ ] Update deploy memory/docs to reference the script instead of the one-liner
- [ ] Test the script end-to-end

### 4. Health Check Endpoint
- [ ] Add `GET /health` to `performance_server.js` that returns:
  ```json
  {
    "status": "ok",
    "uptime": 12345,
    "socketio": true,
    "scoreFile": true,
    "memoryMB": 80
  }
  ```
- [ ] Verify key dependencies are loadable (not just that the process is alive)
- [ ] Test with `curl http://localhost:3001/health`

### 5. Uptime Monitoring
- [ ] Set up UptimeRobot (free tier) or Cloudflare health check
- [ ] Monitor `https://justinwenloyang.com/health` (once endpoint exists)
- [ ] Configure email/SMS alert on 5xx or timeout
- [ ] Verify alert fires by temporarily stopping PM2

### 6. Nginx Hardening
- [ ] Review `proxy_connect_timeout`, `proxy_read_timeout` settings
- [ ] Add `proxy_next_upstream error timeout` to retry on transient failures
- [ ] Consider `proxy_intercept_errors on` with custom error pages
- [ ] Test: what happens when Node.js is down? (should show a friendly error, not raw 502)

### 7. Log Management
- [ ] `pm2 install pm2-logrotate` — prevent log files from growing unbounded
- [ ] Configure: max 10MB per file, keep 10 rotations
- [ ] Verify PM2 logs include timestamps: `pm2 start ... --time`

### 8. node_modules Protection
- [ ] Confirm `node_modules` is in `.gitignore` (so `git clean` won't delete it)
- [ ] Check if any deploy step runs `git clean` — if so, add `-e node_modules`
- [ ] Consider: should `npm ci` be a PM2 pre-start hook?

### 9. SSL Certificate Renewal
- [ ] `certbot renew --dry-run` — verify auto-renewal works
- [ ] Check timer: `systemctl list-timers | grep certbot`
- [ ] Current expiry: Jun 24, 2026

### 10. Security Quick-Scan
- [ ] Review `npm audit` output — fix or document the 2 high vulnerabilities
- [ ] Session creation endpoint: confirm `express-rate-limit` is applied
- [ ] Check for open ports: `ss -tlnp` — only 80, 443, 3001 should be listening (3000 is the dashboard — verify intentional)
- [ ] Review Cloudflare settings: is the proxy enabled (orange cloud) or DNS-only?
- [ ] Verify no sensitive files exposed (e.g., `.env`, `data/`, `package.json`)

---

## Progress

| # | Item | Status | Date |
|---|------|--------|------|
| 1 | Dependency integrity | ✅ Done — `npm install` restored 86 packages, `npm ls` clean, `npm audit` reviewed | Apr 15 |
| 2 | PM2 crash history | ✅ Done — 16 restarts from missing deps + trust proxy error. PM2 autostart fixed (`pm2-deploy.service` active) | Apr 15 |
| 3 | Deploy script | ✅ Done — `/home/deploy/sq1/deploy.sh` (pull, npm install, build, restart, health check) | Apr 15 |
| 4 | Health endpoint | ✅ Done — `GET /health` returns status, uptime, socketio, scoreFile, memoryMB | Apr 15 |
| 5 | Uptime monitoring | ⬜ Not started — set up UptimeRobot or Cloudflare to ping `/health` | |
| 6 | Nginx hardening | ✅ Done — `proxy_pass` changed to `127.0.0.1`, added connect/read/send timeouts | Apr 15 |
| 7 | Log management | ✅ Done — `pm2-logrotate` installed (10MB max, 10 retained, compressed) | Apr 15 |
| 8 | node_modules protection | ✅ Done — removed 977 tracked files from git (`git rm -r --cached node_modules`). Root cause of original incident. | Apr 15 |
| 9 | SSL renewal | ✅ Verified — certbot timer active, next run Apr 16, cert valid till Jun 24, 2026 | Apr 15 |
| 10 | Security scan | ✅ Partial — `trust proxy` fixed, server bound to 127.0.0.1, port 3001 no longer exposed. `npm audit`: 2 high (basic-ftp in Puppeteer, path-to-regexp in Express — low risk). Session spam bots noted. | Apr 15 |

## Deploy Process (Updated)

**New one-liner (replaces old manual steps):**
```
ssh -i C:\Users\jwloy\.ssh\id_ed25519 root@5.161.233.35 "su - deploy -c '/home/deploy/sq1/deploy.sh'"
```

The script handles: `git pull` → `npm install` → build → restart → health check → `pm2 save`.

---

## Incident Log

### Apr 15, 2026 — Missing node_modules packages
- **Symptom:** 502 errors on all sub-resources (socket.io.js, score.json, staff SVGs). HTML page loaded but score was blank.
- **Root cause found:** 977 `node_modules` files were **tracked in git** (committed before `.gitignore` existed). Every `git pull` overwrote installed packages with stale tracked versions, corrupting the dependency tree. The old deploy one-liner did not run `npm install`, so corrupted packages persisted.
- **Chain of failure:** Missing `socket.io` → empty reply on `/socket.io/socket.io.js` → nginx marked upstream dead → cascade 502 on all subsequent requests in the batch.
- **Fix:** `git rm -r --cached node_modules` (untrack), `npm install` (restore), `pm2 restart` (reload).
- **Prevention:** Items 1, 3, 4, 8 — deploy script now always runs `npm install`, node_modules untracked from git.

### Additional issues found and fixed
- **`express-rate-limit` trust proxy error:** Server behind nginx but `trust proxy` not set → rate limiter couldn't identify real IPs. Fixed: `app.set('trust proxy', 1)`.
- **Server listening on all interfaces:** Port 3001 was directly accessible from internet without SSL. Fixed: bound to `127.0.0.1`.
- **Nginx IPv6 resolution:** `proxy_pass http://localhost:3001` resolved to `::1` first, failing. Fixed: explicit `127.0.0.1`.
- **PM2 autostart broken:** `pm2-deploy.service` was `inactive (dead)`. Fixed: killed PM2, restarted via systemd, verified `enabled`.
- **No log rotation:** PM2 logs growing unbounded. Fixed: `pm2-logrotate` with 10MB/10 file limits.
