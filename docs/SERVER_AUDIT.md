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
| 1 | Dependency integrity | ✅ Partial (npm install done, npm ci + audit pending) | Apr 15 |
| 2 | PM2 crash history | ⬜ Not started | |
| 3 | Deploy script | ⬜ Not started | |
| 4 | Health endpoint | ⬜ Not started | |
| 5 | Uptime monitoring | ⬜ Not started | |
| 6 | Nginx hardening | ⬜ Not started | |
| 7 | Log management | ⬜ Not started | |
| 8 | node_modules protection | ⬜ Not started | |
| 9 | SSL renewal | ⬜ Not started | |
| 10 | Security scan | ⬜ Not started | |

---

## Incident Log

### Apr 15, 2026 — Missing node_modules packages
- **Symptom:** 502 errors on all sub-resources (socket.io.js, score.json, staff SVGs). HTML page loaded but score was blank.
- **Root cause:** 86 npm packages missing from `node_modules`, including `socket.io`. Server process (19 days uptime) had socket.io loaded in memory but couldn't serve client JS from disk. Nginx cascade: first empty reply marked upstream dead → all subsequent requests got "no live upstreams" → 502.
- **Fix:** `npm install` + `pm2 restart sq1-server`
- **Prevention:** Items 1, 3, 4, 5 above.
