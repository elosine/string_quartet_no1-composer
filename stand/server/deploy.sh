#!/usr/bin/env bash
# deploy.sh — every deploy after the first. Run ON THE BOX, from anywhere:
#
#     bash /home/deploy/sq1-stand/stand/server/deploy.sh
#
# pull -> install the stand's two dependencies -> restart under PM2 -> health check -> the films.
# The first time on the box: stand/server/README.md, "The box".
set -euo pipefail
cd "$(dirname "$0")/.."          # the stand's folder

echo "== pull"
git pull --ff-only

echo "== install (the stand's own dependencies)"
npm ci --omit=dev

echo "== restart"
if pm2 describe sq1-stand >/dev/null 2>&1; then
  pm2 restart sq1-stand --update-env
else
  pm2 start server/ecosystem.config.js
fi
pm2 save >/dev/null

echo "== health"
PORT="${PORT:-5302}"
ok=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  if out=$(curl -fsS "http://127.0.0.1:${PORT}/health" 2>/dev/null); then echo "$out"; ok=1; break; fi
  sleep 1
done
if [ "$ok" != 1 ]; then
  echo "!! /health did not answer on port ${PORT}"
  pm2 logs sq1-stand --lines 30 --nostream
  exit 1
fi

echo "== the films (they are not in git: copied from the composer's PC)"
missing=0
for f in violin1 violin2 viola cello fullscore; do
  if [ -s "films/$f.mp4" ]; then printf '   %-14s %s bytes\n' "$f.mp4" "$(stat -c %s "films/$f.mp4")"; else echo "   MISSING  films/$f.mp4"; missing=1; fi
done
if [ "$missing" = 1 ]; then echo "!! copy the films (stand/server/README.md, The box, step 3)"; exit 1; fi
echo "== OK"
