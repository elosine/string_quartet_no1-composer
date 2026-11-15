# The film stand — String Quartet No. 1

One Node process: the registry, the room, the clock, the admin lines, and the files the page needs. Each part is
a FILM of the old Performance Score (made by `scripts/film_part.js`); the page plays it on the room's clock.
The record of how it came to be is `docs/PROJECT_JOURNAL.md` §2.

## Run it here

```
node C:\Users\jwloy\GitHub\string_quartet_no1-composer\stand\server\server.js
```

→ `http://localhost:5302/` and the LAN addresses it prints. Then, once, in a second window:

```
node C:\Users\jwloy\GitHub\string_quartet_no1-composer\stand\tools\setup.js
```

It registers the piece from `stand/piece.json`, makes an ensemble if there is none, and prints the address of
the LINK SHEET (every player's link with a QR code). Data lives in `stand/server/data/` (gitignored). The five
films live in `stand/films/` (gitignored — about 270 MB).

## The checks

```
node stand/tools/shell_check.js      the server and the room, with scripted stands
node stand/tools/film_check.js       the page itself, two headless stands on the real films
```

Both start their own server on a scratch folder and a private port; nothing of yours is touched.

## The box

The quartet's box: Hetzner, `5.161.233.35`, Ubuntu, Node, nginx + certbot, PM2 under the `deploy` user. Already
running there: `sq1-server` (the first performance system, `justinwenloyang.com/string-quartet-no1`),
`bcb-server` (the tubas, port 5300), `ss-server` (the septet, port 5301).

| | |
|---|---|
| Address | **`string-quartet-no-1.justinwenloyang.com`** |
| Folder on the box | `/home/deploy/sq1-stand` (a sparse clone: only `stand/`) |
| PM2 name | `sq1-stand` |
| Port | `5302` |
| nginx site | `sq1-stand` |
| Piece id | `sq1` |

Every line below is ONE line, the same in Command Prompt and PowerShell.

### First deploy (once)

1. **DNS** (Cloudflare): an A record, name `string-quartet-no-1`, content `5.161.233.35`, proxy OFF ("DNS
   only" — the clock samples must not pass through Cloudflare's proxy). TTL Auto.
2. **Clone, install, start:**
   ```
   ssh -i C:\Users\jwloy\.ssh\id_ed25519 root@5.161.233.35 "su - deploy -c 'git clone --depth 1 --filter=blob:none --sparse https://github.com/elosine/string_quartet_no1-composer.git /home/deploy/sq1-stand && cd /home/deploy/sq1-stand && git sparse-checkout set stand && cd stand && mkdir -p films && npm ci --omit=dev && pm2 start server/ecosystem.config.js && pm2 save && sleep 2 && curl -s http://127.0.0.1:5302/health'"
   ```
   Ends with `{"ok":true,…}`.
3. **The films** (not in git — copied from the PC, about 270 MB), then their owner set and listed:
   ```
   scp -i C:\Users\jwloy\.ssh\id_ed25519 -r C:\Users\jwloy\GitHub\string_quartet_no1-composer\stand\films root@5.161.233.35:/home/deploy/sq1-stand/stand/
   ```
   ```
   ssh -i C:\Users\jwloy\.ssh\id_ed25519 root@5.161.233.35 "chown -R deploy:deploy /home/deploy/sq1-stand/stand/films && ls -l /home/deploy/sq1-stand/stand/films"
   ```
   Five files: cello, fullscore, viola, violin1, violin2.
4. **nginx + HTTPS:**
   ```
   ssh -i C:\Users\jwloy\.ssh\id_ed25519 root@5.161.233.35 "cp /home/deploy/sq1-stand/stand/server/nginx.conf.example /etc/nginx/sites-available/sq1-stand && sed -i 's/stand.example.org/string-quartet-no-1.justinwenloyang.com/' /etc/nginx/sites-available/sq1-stand && ln -sf /etc/nginx/sites-available/sq1-stand /etc/nginx/sites-enabled/sq1-stand && nginx -t && systemctl reload nginx && certbot --nginx -d string-quartet-no-1.justinwenloyang.com --non-interactive --redirect"
   ```
5. **Health through the address, and the box's admin key:**
   ```
   ssh -i C:\Users\jwloy\.ssh\id_ed25519 root@5.161.233.35 "curl -s https://string-quartet-no-1.justinwenloyang.com/health && echo && cat /home/deploy/sq1-stand/stand/server/data/admin.key"
   ```
6. **The piece, the ensemble, the link sheet** — from the PC, with that key in place of KEY:
   ```
   node C:\Users\jwloy\GitHub\string_quartet_no1-composer\stand\tools\setup.js "JACK Studio Readings" --server https://string-quartet-no-1.justinwenloyang.com --key KEY
   ```
   It prints the link sheet's address. Open it, print it or keep it: one QR code per player.

### Every later deploy (a change to the page or the server)

```
ssh -i C:\Users\jwloy\.ssh\id_ed25519 root@5.161.233.35 "su - deploy -c 'bash /home/deploy/sq1-stand/stand/server/deploy.sh'"
```

A re-made film is copied again with step 3's two lines; the stands notice the new size and load it afresh.

### Where these lines come from

Steps 2, 4 and 5 are the septet's lines (`septet_2026/server/README.md`), which ran first time on this box, with
the names changed and two additions: the sparse clone (this repository is large; the box needs only `stand/`)
and the install inside `stand/`. A clean copy of `stand/` was installed and started on the PC that way
(2026-11-15). **Step 3's `scp` line has not been run by anyone yet.**

## The players

- Their link, in **Safari** — not from a Home Screen icon (there the film does not play; journal §2).
- The instructions: `/notation/app/help.html` on the stand's address.
