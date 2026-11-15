# String Quartet No. 1 — Project Journal

**Composer:** Justin Wen-Lo Yang  
**Repository:** `elosine/string_quartet_no1-composer`  
**Production:** Live at `justinwenloyang.com` — homepage at `/`, SQ1 at `/string-quartet-no1`  
**Created:** 2024 (Workshop development) — 2026 (Performance pipeline complete)  
**Git Tags:** `v1.0-composition`, `v1.0-production`, `phase-15-complete`

> **This document consolidates ~40 individual markdown docs** accumulated across a year of AI-assisted development. The originals are preserved as separate files in `docs/` for reference. This journal provides narrative context, cross-references, and a unified reading path through the project's history.

---

## §2 Resume Here

> The cold-start block that `/session-start` reads. §3 – §6 follow it; everything after them (Parts 0–IV) is the consolidated history up to April 2026.

> **► CURRENT POSITION (2026-11-12): ACCEPTED TO THE 2026 JACK STUDIO READINGS — THE READING IS 2026-11-23.
> THE READINESS PLAN AGREED (top line below). ► NEXT: step 1, prove the live app today on the real devices.**
> Written as the handoff from the tubas/septet session of 2026-11-12 (its RUNNING_LOG 122); the septet's design
> sitting is paused at its proofing pass until after the readings.

### THE DECISION (2026-11-12, the composer's "yes")

- **The readings run on THIS repo's own performance system as it is** — the first generation: the Workshop builds
  into the performance app (`scripts/build_performance_app.js`), served by `scripts/performance_server.js`
  (Express + Socket.IO, rooms, sync, the parts view, rehearsal and performance modes, annotations), live on the box
  as `sq1-server` and linked from the site. **The new stand built for Tempus and the tubas (the seams, the room
  client, the strip, the remote, the display, the floor clock) is NOT ported before the 23rd:** its recipe
  (`for_seven_tubas/docs/PORTING.md`) assumes a notation library, an IR and a registry, and this piece's notation
  lives in the Workshop's canvas engine with LilyPond fragments, curves and the GC library — a port is weeks. It
  comes later, as the tubas' plan 9q foresees.
- **The composer's words:** *"it's just almost like a sight reading. I have a feeling they might not rehearse very
  much before. So that will be the main thing, is to have everything really robust and ready to go, and they can
  just play through the piece. … My slot is 45 minutes, so there might be a little bit of start and stop. So I
  need to be able to do some of that. As a secondary consideration, they may want to look at it beforehand. …
  the whole sort of follow the leader was confusing for me … we just need to simplify things and make sure
  everything's robust, make sure it's performable, but we can do some start and stop on the day, and then also
  see if we can have a rehearsal version ready as well."*

### THE TOP LINE (agreed 2026-11-12 — each step gets its own talk when reached; nothing built before that)

1. **Prove it today.** The live app on the composer's iPad and laptop, end to end: a room, four parts, play, stop,
   a jump, sync. Collect every fault, one line each, here.
2. **Fix what blocks, then harden the server.** The April audit's leftovers (`docs/SERVER_AUDIT.md`: the restart
   causes, a health check, a deploy script, log rotation), so it stays up through a 45-minute slot.
3. **Simplify the control.** One plain way for the composer to start, stop and jump; the players only follow. One
   page of instructions for the day.
4. **The look-ahead version.** A link each player can open any time before the 23rd — their part or the full score,
   playing on its own — with the instructions.
5. **The handouts.** One link or QR per player, the Technical Manual (`docs/technical_manual/`), the print score
   (`print/score/String_Quartet_No_1-JYang.pdf`, 36 pp) and the parts (`builds/print/`).
6. **A dress run at home.** iPad, laptop and phone as players, with start and stop as on the day.

### STEP 1 TRAIL (prove it on the real devices)

- **2026-11-13 — the two-device pass: "all work"** (his words). The live site; the laptop made the room as
  Violin I, the iPad joined as Cello in Safari; play, stop, a jump to 120 s, and play on from there, as the
  Technical Manual describes them. No fault named. *Not yet done:* all four parts at once; a long run (the
  whole 8:28); the Start Performance path.

- **2026-11-13 — the four-player pass (three laptop tabs/windows + the iPad): FAILED.** His words: "its a mess,
  unacceptable, pages are wrong, animation corresponds to different pages, different tabs at different times; I
  remember these problems." Three faults: (1) the pages shown are wrong · (2) the animation belongs to a different
  page than the one shown · (3) the players are at different times. He asked for an assessment of moving the score
  onto the new stand instead ("the time might be similar to fixing these problems, and might be a better fit");
  the current build of the stand is in the tuba repo, close to finished.

- **2026-11-13 — the AI's assessment of the move to the new stand (given in chat, NOT yet agreed).** Read: the
  file lists and call sites only, no code in depth. (a) The newest stand is in `septet_2026` (stand.html 52 KB
  with `roomclient.js`, `strip.js`, `seams.js`, `remote.html`, `leader.html`), not in `for_seven_tubas` (its
  stand.html is the 2026-11-01 one, 23 KB). (b) The stand's server, rooms, clock, links, strip and remote do not
  care what the notation is. (c) Its drawing (`layout.js` → `render.js` → `seams.js` → `animlive.js`) reads an
  IR this piece does not have. (d) This piece's score (`builds/performance/score.json`, 14.6 MB) is objects
  placed by time on four tracks: 542 notation images · 225 curves · 248 GCs · 75 line wedges · 32 badges.
  **The route proposed: do not translate to the IR; give the stand a second, small drawing module for this
  piece** — a row of N seconds drawn from score.json, the moving things (cursor, GC balls) on top. The handoff's
  "a port is weeks" assumed the translation. Rough size, a guess: 4–6 working days. *Not checked:* whether the
  four-tab test itself made part of the mess (a browser slows tabs that are not in front).

- **2026-11-13 — his ask on the route:** both a dynamic rehearsal version and a VIDEO-based performance version,
  **the video version first.** His picture of the new system: "a set of clippings like the print score and then
  with an animation overlay on top" (the AI: yes, that is its shape). Found: the stand's video renderer is plan
  item 9l in `for_seven_tubas/docs/PLAN.md`, status `todo` — designed (`ENGINE_BRIEF.md` § C) and measured in
  the test kit (T4), not built into the stand; the tubas' `tools/export_video.js` films the IR renderer, not
  this piece. The AI's thought, NOT checked: film each part from the OLD app stepped frame by frame (it drew
  correctly on two devices; `scripts/capture_score_images.js` exists), and play the films on the new shell.

- **2026-11-13 — his flag:** this piece has animations the new stand does not — "mostly just the dial/pie
  animation to countdown the line wedges, there may be others." A film of the old app carries them as they
  are; a live drawing on the new stand would have to build each one. The list of them is not yet made.

### THE NEW TOP LINE (agreed 2026-11-13, his "yes pls start" — REPLACES the top line above)

The reading runs on FILMS of the parts, played by the new stand's shell on one clock. Video first; the live
rehearsal version only if days remain.

1. **A test film.** Thirty seconds of one part, filmed from the old app. Done when he says the drawing and the
   animations are right. (The gate: if the old app cannot be filmed cleanly, the road changes to drawing the
   clippings fresh.)
2. **The four films** — each part, the whole piece — plus the full score.
3. **The stand's shell into this repo** — server, rooms, clock, one link per player (from `septet_2026`, by
   `for_seven_tubas/docs/PORTING.md` § 5).
4. **The video player on the stand** — play, stop, jump, all films on one clock (the tubas' plan 9l, unbuilt).
5. **Prove it on his devices** — the whole piece, with stops and jumps.
6. **Onto the box** — its own address, a link or QR per player.
7. **The handouts and the look-ahead link.**
8. **A dress run at home.**
9. **The live rehearsal version,** only if days remain.

### STEP 1 OF THE NEW TOP LINE — THE TEST FILM (2026-11-13)

- **Built: `scripts/film_part.js`** — films the old app alone, frame by frame, into an mp4 (`builds/film/`,
  gitignored). The app runs on its offline stub (no server, no room, no sync); the page's clock (Date.now,
  performance.now, setTimeout, setInterval, requestAnimationFrame) is replaced before its code runs by one the
  tool steps a frame at a time, so frame N is the app at exactly N / fps of score time (checked every frame,
  to 0.5 ms). `node scripts/film_part.js --track 1 --from 0 --to 32 --name test_violin1_0-30`.
- **The test film: `builds/film/test_violin1_0-30.mp4`** — Violin I, 6 pages a screen, score 0 → 32 s (the
  timeline's 0:00 is score second 2, the lead-in), 1600 × 1200, 30 fps, 960 frames, 3.2 MB, 48 s to make.
  **► WAITING ON HIS EYE: are the drawing and the animations right?** The AI looked at two frames only: at 0:05
  the cursor and the line wedge's dial are there; at 0:18 the cursor, a GC ball at its impact, and rows 1–2
  already showing pages 7–8.
- **✓ STEP 1 DONE — his eye, 2026-11-13: "test looks good."** The gate is open: the films come from the old
  app. ► NEXT: step 2, the four films and the full score (its talk first: pages a screen, size, frame rate).
- **STEP 2, the look, settled 2026-11-13:** 6 rows a screen (his "6 good") · 2048 × 1536 (the test's 1600 × 1200
  layout at scale 1.28) · 60 frames a second · the 2 s lead-in stays in the film (the AI's three, not objected
  to). **Violin I whole is filming** (detached, log `builds/film/violin1.log`): score 0 → 516 s, 30,960 frames
  at about 13 a second, so about 40 minutes a part at this size. The tool now ends the film cleanly if the
  score stops itself at its end.
- **Violin I whole: `builds/film/violin1.mp4`** — 30,960 frames, score 0 → 516 s, 48.6 MB, 35 minutes to film
  (65 ms a frame). ► WAITING ON HIS EYE. The AI looked at three frames: 4:08 a busy spot, right; 8:27 the last
  curve ending with its dial; 8:34 the cursor running on over empty rows — **the score does not stop itself
  when filmed alone, so the film's end is a cut to choose** (the last ink is at about 8:28 on the timeline;
  a cut needs no re-filming). **Violin II, Viola and Cello are filming one after another** (detached, logs
  beside the films, about two hours), started before his look because a fault he finds would mean re-filming
  all four anyway. The full score is NOT started: its view is a different layout and wants its own short test.
- **✓ Violin I whole — his eye, 2026-11-13, on the iPad (a 26 MB copy sent through the chat; the chat's limit
  is 30 MB): "all looks good."** **THE FILM'S END, his choice: 8:30 on the timeline** = score second 512 = a
  film of exactly 512 s (2 s lead-in + 8:30), 30,720 frames. The cut films go in `builds/film/cut/`
  (`ffmpeg -i <part>.mp4 -t 512 -c copy`); `cut/violin1.mp4` is made.
- **The full score view films too** (`--track 0`): `builds/film/test_fullscore_0-30.mp4`, 30 s, 5 MB — two
  systems a screen, four parts each, a coloured cursor on every part. Sent to him; ✓ his eye, 2026-11-13: "full score test looks fine."
  The whole full score is filming (detached, `builds/film/fullscore.log`) beside the three parts.
- **Two things the filming found.** (1) Filmed alone, the app drew no cursor and no animation: its drawing
  loop (`AnimationEngine.start`) is started only by the server's `scoreState` message, which the offline stub
  never sends. The tool starts it. (2) A headless screenshot took 1.4 s with Chrome's GPU on and 45 ms with
  `--disable-gpu` — the tool's default now. At 50 ms a frame the whole piece (514 s) is about 13 minutes a part.
- **Hidden in the film:** the controls overlay, the sync dot, the annotation button and toolbar, the offline
  banner. The mini-map bar at the foot is left in.
- **Not yet decided:** the film's size and frame rate for the iPad · whether the lead-in is in the film ·
  whether the mini-map stays.

### STEP 4's SHAPE — HIS ASK (2026-11-13, said while the films ran; not yet built, its talk still to come)

- **ONE version for everything** — the look-ahead at home, the run-throughs in the slot, and the reading. His
  words: "like the orig rehearsal but with the video version, so players can move about independantly and play
  etc but the leader plays and all snaps … it isnt ideal if they do some run thrus in one version and then have
  to open another version for the performance." And: "I don't nesessarily want to introduce to much new build."
- **The AI's reading (from `septet_2026/notation/lib/roomclient.js`'s header and the tubas' journal, not a deep
  read):** this is the new stand's own design — a stand has a LOCAL transport (alone: play, swipe, jump) and
  the ROOM's transport, swapped in while the room plays; the composer checked exactly this on Tempus ("play ·
  stop · speeds · local play · swipes · the block while playing · jump to 3:55 · AGAIN"). So the new build is
  only the film player obeying whichever transport is live; a seek is needed for jumps anyway.

- **WHO MOVES THE ROOM (his answer, 2026-11-13):** NOT the composer — "I don't think I'll be involved at all,
  probably just an observer, maybe answer questions, but they should control the score." So the room's controls
  sit with the players. **EVERY player has the room's buttons** (his "yes everyone has buttons") — no leader
  to choose; on each stand, one button plays alone and one plays for everyone. The composer's own screen just
  follows the room (the full score film). *Rejected:* one named leader (Violin I) — a role to explain and manage.

### STEP 3 — THE STAND'S SHELL IN THIS REPO: BUILT + PC-VERIFIED (2026-11-13)

- **Where: `stand/`** — apart from the old system, which is untouched. Copied from `septet_2026` @ 6fda30d:
  `stand/server/` (clock, marks, protocol, ratelimit, registry, rooms, server) · `stand/tools/admin.js` ·
  `stand/notation/lib/roomclient.js` · `stand/testkit/js/syncclock.js` (the folder names are the stand's own
  URLs, kept so nothing in the room client moves). NOT copied: the notation library, stand.html, strip.js,
  remote.html, the IR, deploy.sh / README / nginx (those are renamed at step 6, the box).
- **The quartet's changes, each marked `[sq1]`:** the port **5302** (tubas 5300, septet 5301) · `/films/` is
  served, with Range · every link opens ONE page, `notation/app/film.html` (step 4 — not written yet) ·
  `registry.js`: a piece may register with no IR when it gives its parts and a `film` block · a piece with
  `everyoneLeads` lets every player's stand move the room (`protocol.js` isLeader) · `admin.js register-file`.
- **The piece: `stand/piece.json`** — id `sq1`, "String Quartet No. 1", Violin I · Violin II · Viola · Cello,
  everyoneLeads, film { the five file names, duration 512, leadIn 2, fps 60, rowSeconds 8, rows 6 }.
- **The films go in `stand/films/`** (gitignored, with `stand/server/data/`). How they reach the box is step 6's
  question — five files of about 50 MB, not for git.
- **Proved: `node stand/tools/shell_check.js` → 20 ok, 0 failed** (its own server on port 5399, a scratch
  data folder): the piece registers · four named player links and a gatekeeper link · every player welcomed to
  their part and told they may move the room · EACH of the four plays and stops the room and all five stands
  hear it · a jump lands everyone on the same place · a film is served with Range · nothing outside the stand's
  folders is served. No device has touched it yet.
- **His question while this ran, for step 4's talk:** "how do they know if they are playing by themselves or
  for the group?"

- **HOW A PLAYER KNOWS — decided 2026-11-13 (his "2 buttons good"):** two buttons named for what they do,
  [Play alone] and [Play all] · alone looks quiet and changes nobody else's screen · while the room plays every
  stand wears a band ("ALL · started by Viola"), the alone button is gone and only [Stop all] shows · a player
  practising alone is pulled in when someone presses [Play all]. The band's wording and colour are the AI's
  first proposal, for his eye on the iPad.

### STEP 4 — THE FILM PAGE: BUILT + PC-VERIFIED (2026-11-13). ► NEXT: HIS HANDS, at the desktop with the iPad

- **`stand/notation/app/film.html`** — one page for every link. A player's link plays that part's film, the
  gatekeeper's the full score film. The DOOR first (the piece, the part, the film loading with a bar, one
  [Open] tap — the tap lets the device start the film by itself later, and asks it to stay awake); the whole
  film is fetched onto the device (and kept in the browser's cache where the page is on https or localhost).
- **Two transports, one film.** ALONE = the stand's own clock: [Play alone] / [Stop], a row back, a row
  forward (a row = 8 s; rows start at 2 + 8k film seconds), the time bar, [To the start]. ALL = the room's
  clock: [Play all] starts the room FROM WHERE THAT STAND IS, with a 4-second count on every stand (COUNT_MS);
  every stand jumps there, wears the orange frame and "ALL · started by <part>", loses its alone controls,
  and shows [Stop all]; [Stop all] leaves every stand on that place. There is no separate "jump everyone": go
  there alone, press [Play all]. Blue = alone playing; orange = all.
- **Keeping time:** the tubas' frame servo (`stand/testkit/js/servo.js`, copied as is) trims playbackRate on
  every presented frame; a gap over 350 ms is closed by a seek; a stopped film is seeked onto its place.
- **The controls sit BESIDE the film** when the screen is wider than 4:3 by 84 px or more (an 11-inch iPad
  full screen has 87; Safari with its toolbar has more), else in a 72 px bar under it (a 4:3 iPad full screen).
- **`rooms.js`**: a state request may carry `by` (who moved the room) — it rides in the tuple.
- **The link sheet:** `GET /admin/sheet?key=<admin key>` — every ensemble's links with a QR code each
  (`qrcode` added to package.json); opened as localhost it prints the LAN address so a tablet can scan it.
  **`node stand/tools/setup.js`** registers the piece, makes "Home test" if there is no ensemble, and prints
  the sheet's address.
- **Proved on the PC:** `node stand/tools/film_check.js` → **17 ok, 0 failed** (two headless stands, an
  11-inch iPad's size, the real films): the door · alone moves one stand only, within 7 ms of its clock · the
  row buttons · [Play all] from Violin II: both count down on Violin II's place, then both run within 7.3 ms
  of the room's clock over five seconds · [Play alone] dead while the room plays · [Stop all] from Violin I:
  both stopped on one place. `shell_check` 22 ok. **NOT proved: anything on a real iPad or over real Wi-Fi —
  Safari's start, its seeks, the wake lock, the 50 MB load.** That is his test, step 5.
- **✓ STEP 2 DONE — ALL FIVE FILMS are in `stand/films/`** (gitignored), each 2048 × 1536, 60 fps, 512.03 s:
  violin1 50.9 MB · violin2 53.0 · viola 51.9 · cello 50.4 · fullscore 66.3 (273 MB together). The uncut
  originals (516 s) are in `builds/film/`. The cut: `ffmpeg -i builds/film/<part>.mp4 -t 512 -c copy -movflags
  +faststart stand/films/<part>.mp4`. His eye has been on Violin I whole and on the full score's first 30 s;
  Violin II, Viola, Cello and the rest of the full score are unseen by anyone.
- **His two questions, answered 2026-11-13:** no local server at the reading (the box, step 6; a spare laptop
  is possible, not set up) · the film can be loaded any day before (kept in the browser over https; Safari may
  clear it after about a week unvisited; untested on an iPad).

### STEP 5 TRAIL — HIS DEVICES (begun 2026-11-15)

- **His desktop has TWO LAN addresses: 10.2.0.2 (a VPN's, the AI's reading) and 192.168.1.15 (the home
  Wi-Fi — his "the 192").** The link sheet printed its QR codes with the FIRST one, which a tablet cannot
  reach. Fixed in `server.js` linkSheet: 192.168.x first, then 172.16–31.x, then 10.x. The server must be
  restarted to take it. *Not checked:* whether the VPN or Windows' firewall lets the iPad reach port 5302.

- **2026-11-15 — the Violin I link OPENS on his iPad** over home Wi-Fi from the QR sheet (after the restart).
  He has "some design things" — NOT yet named; held for THE DESIGN CONVERSATION, which comes after step 5's
  function test and before the box. Step 5 tests function only: does it work on the real devices.

- **2026-11-15 — three stands open and work: iPad (Violin I), laptop (Violin II), desktop (Cello)** — his
  "they all work." **NOTED, not to fix now (his word): a bit of a stutter on the DESKTOP only** (Windows 10;
  he guesses the graphics or the many open windows). Not diagnosed. The iPad and the laptop are smooth.
  *Not yet said by him:* whether [Play all] / [Stop all] across the three was tried, and the screen staying on.

- **✓ STEP 5's FUNCTION TEST — his word, 2026-11-15: "everything works … all the buttons and everything
  work"** on the iPad, the laptop and the desktop, [Play all] and [Stop all] included. The iPad's screen stayed
  on "for a few minutes at least"; the whole piece played through is still to do (he will, later).

### THE DESIGN CONVERSATION (opened 2026-11-15 — DISCUSS FIRST, build only on his go)

His notes, as he said them, about the controls column:
1. **It should take less space — about HALF the width.** "I think just smaller on the side is better than on
   the top."
2. **The state box** ("STOPPED"): a smaller font — "that seems to be the limiting factor."
3. **[Play alone] / [Play all]:** smaller font, the two words stacked, the button about half the width.
4. **The two arrow buttons stacked** one over the other, not side by side.
5. **A NUMBER BOX in place of the time slider,** "so they can type in a time."
6. **[To the start] → "Start",** half width.
7. **The header:** just the part's name ("Viola"); not "String Quartet No. 1".
8. **To evaluate: a SPEED control,** "maybe like a slider"; sliders "haven't worked great" in the past and want
   better calibration.
9. **His first question, before any of it:** on the iPad, does a thinner column show MORE of the score, or is
   the score already as big as it will ever be? (On the laptop there is black space, so nothing to gain.)

**Settled 2026-11-15:** on his iPad there is no black above or below the score (only the time-and-battery
bar), so the score is at its full height and a thinner column gains nothing. **He WITHDREW notes 1–4, 6, 7**
("you can disregard the things I said"). **KEPT: note 5, the number box in place of the slider — build it.
Note 8, the speed — to discuss.** (The AI's point that Safari's toolbar costs about a tenth of the height, and
that the Home Screen's full screen would win it back, was made and not taken up.)

**BUILT 2026-11-15 — THE TIME BOX** (`film.html`; the slider is gone): the time shown IS the box — tap it,
type, Go (ENTER). With a colon it is minutes:seconds (`2:10`); digits alone read the same way, the last two as
seconds (`136` = 1:36, `45` = 0:45, `830` = 8:30); a full stop, comma or space serves as the colon. The time is
the timeline's (0:00 = the first beat; the film adds its 2 s lead-in). A time that is not one, or past the end,
turns the box's border red and moves nothing. Dead while the room plays. `film_check` **21 ok, 0 failed** (four
new: 2:10 · 45 · a refused 9:99 · 136). NOT yet tried on the iPad's own keyboard. The stands take it on a
reload; the server needs no restart.

**BUILT 2026-11-15, on his three words** ("lets display and type in seconds and go for speed", then the run-up):
- **THE TIME IS IN SECONDS** — the box shows the timeline's whole seconds (96; −2 and −1 in the lead-in), the
  numbers printed along every row, under a small "seconds" label; a typed number is seconds (96, 96.5). A
  colon form (1:36) is still read. *Replaces* the m:ss box of an hour earlier.
- **THE SPEED** — one button cycling 100 · 85 · 70 · 50 % (the server's own four; the AI's steps, not a slider —
  he said "go for speed" after that recommendation). It is the STAND's setting: [Play alone] runs at it;
  [Play all] gives it to the room and the band reads "ALL · 70%"; after [Stop all] each stand keeps its own.
- **[Play all]: NO COUNT-DOWN; A ONE-SECOND RUN-UP** (his rule: "I type in 490 … it starts at 489"; with the
  cursor just in place, "the cursor jumps back 1 second from where it is and then starts playing"). RUNUP_S = 1.
  A lead of 0.8 s (LEAD_MS) stays, unshown, so every stand can hear the message and put its film on the place
  before all start on one instant — so the place itself arrives about 1.8 s after the press. [Play alone] is
  unchanged (no run-up) — he spoke of [Play all] only.
- `film_check` **27 ok, 0 failed**: the room at 100 % within 7.1 ms, at 70 % within 7.2 ms, alone at 50 % three
  seconds of film in six. None of the three is yet seen on the iPad.

**► OPEN FAULT (2026-11-15): ON THE iPAD THE FILM DOES NOT PLAY** — his words: "the other cursors play, and the
iPad cursor doesn't play regardless of whether I hit play all or play alone, or if it started from another
part. Only on the iPad." It played on the iPad before the seconds / speed / run-up build. **Cause NOT found;**
the AI cannot see the iPad. What was done, all PC-verified only (`film_check` 27 ok):
- *the start can no longer chase its own seeks* (one aimed seek, then play; the seek's end is no longer taken
  on the browser's word alone — `isSeeking()`; each device's seek time is learned, `seekEst`; the servo may
  trim 5 %). This answers [Play all] reaching a slow seeker, NOT a film that will not play alone.
- *LEAD_MS 800 → 300* — his second point: the pause before the run-up ("the cursor jumps back 1 second and
  starts playing immediately … if it can't be fixed, just leave it"). It cannot be zero; a stand not ready in
  0.3 s joins a moment late.
- *when the film should move and has sat paused for 1.2 s:* a [Tap to play] button over the score (a touch may
  always start a film) and a four-line READOUT in the corner (paused · seeking · ready state · film time against
  wanted · the count of play() calls and the browser's refusal by name · tab or Home Screen app). Tapping the
  corner line shows the readout at any time. **► NEXT: his reload, and what the readout says.**

- **His answer: the iPad's part is now opened from a HOME SCREEN ICON** ("is it possible that I did add to home
  screen? I'm using that button"); the earlier, working test was in Safari's tab. "I reloaded the iPad and
  nothing's changed." **The AI's GUESS, not proved:** a Home Screen app will not play a film held in memory (a
  blob), which is how the page loads the film. Built on that guess: a Home Screen app (`navigator.standalone`)
  takes the film straight from the server (`?direct=1` forces it anywhere); and any stand whose in-memory film
  errors, or shows no frame 4 s after the door, falls back to the server by itself (`useServer`). The readout's
  last line now says app/tab and memory/server. `film_check` 27 ok. *Cost if the guess is right:* a Home Screen
  stand streams its film and does not hold it whole, so it leans on the network during play.

- **Still not playing after that (his report):** the iPad stays in the room (its [Play all] starts the others),
  it jumps where told (to the start, to second 400) and shows the cursor there — "just the cursor doesn't
  move" — and NO [Tap to play] came. So the film's data and its seeks are fine; only PLAY fails; and the blob
  guess is not the answer (or not all of it). **Why no button came:** the watch asked "is the film paused?",
  and a refused play() flips `paused` off and on each frame, so the watch never held. **Changed:** "not
  started" is now judged by the film's own time standing still for 1.2 s · play() is asked again every 0.4 s,
  not every frame · [Play alone] starts the film INSIDE the touch. **The AI's next guess, unproved:** the
  device refuses a play() that no touch began — Low Power Mode does that, and so may the Home Screen mode.
  If so, [Play alone] and [Tap to play] will work and a start by ANOTHER player will need a tap each time.
  The readout's third line (the refusal's name) decides it. `film_check` 27 ok.

- **✓ RESOLVED FOR NOW (his report, 2026-11-15): IN SAFARI IT WORKS** — the film plays, and "all the other
  things seem to work." The Home Screen icon "didn't even pick up the changes" (so the AI's two fixes for it
  were never run there) and "just doesn't seem to be viable." **HIS RULING: LOW PRIORITY, at the end if there
  is time. The stand is used in SAFARI, not from a Home Screen icon — the players' instructions must say so.**
  His priority: "get everything proofed and usable as soon as possible." The whole piece played through: later.
- **A fault the AI found while preparing the tap talk, FIXED:** the two arrows landed two seconds INTO a row.
  A row on screen is 8 s of FILM time from the film's zero — row k = film [8k, 8k+8), its left edge at
  timeline 8k − 2 — and the rows behind the cursor are replaced AT the row change (seen at film 8.3 s: row 0
  already shows the page that starts at 46). So at film time T, with p = floor(T/8), the screen shows pages
  p … p+5, page q in row (q mod 6). `rowStart = 8k` now. `film_check` 27 ok.

### THE DESIGN LIST AS IT STANDS (2026-11-15)

Done: the time box, in seconds · the speed button · [Play all] with the one-second run-up, no count.
Withdrawn by him: the narrower column and everything that went with it (smaller fonts, stacked words, stacked
arrows, "Start", the part name alone). Open: **the tap to place the cursor** (in discussion). Low priority: the
Home Screen icon. For his eye, never yet commented on: the band's wording and colours.

**BUILT 2026-11-15 — THE TAP TO PLACE THE CURSOR** (his two answers: "only when stopped, exactly where the
finger is"). A touch on a PART's score puts the cursor there: only while that stand is stopped (not playing
alone, not while the room plays), exactly at the finger, no snapping. A tap is a touch that lifts within 0.7 s
and 14 px (a drag or a resting hand is not one). The arithmetic: the row from the touch's height, the fraction
across from its x, the page from the ring rule (above) — the film's own frame measured as rows starting 6.2 px
in and 1587.2 px long on a 1600 × 1200 frame, the first row's top at 3 px, 198.4 px each. **NOT on the full
score film** (two systems a screen, a different layout) — the tap is off there. `film_check` **30 ok** (three
new: half way along the fourth row → film 28 s; from page 3 the second row = page 7; no effect while playing
alone), and the AI looked at the shot: the cursor stands half way along the fourth row. Not yet tried by a
finger on the iPad.

- **✓ THE TAP on the iPad — his word, 2026-11-15: "that all works."** The first commit of the stand is pushed
  (6f933c37).

### TO DELIVERY (his ask, 2026-11-15: "do everything that needs to be done to get it in deliverable shape"; then
### go back for the set-aside things, "notably" the Home Screen icon)

**Done by the AI, PC-verified:**
- **The three part films nobody had watched** (Violin II, Viola, Cello): one frame each at the start, the
  middle and the end looked at — the right part's name and clef, its own music, the same ending. Not watched
  in motion.
- **The box's files** (`stand/server/README.md` § The box — the six first-deploy lines and the one later-deploy
  line; `ecosystem.config.js` PM2 `sq1-stand`, port 5302; `deploy.sh`; `nginx.conf.example`). The stand has its
  OWN `stand/package.json` + lock (socket.io, qrcode), so the box installs those two and not the Workshop's
  puppeteer. A clean copy of `stand/` was installed with `npm ci --omit=dev` and started on the PC: /health,
  the link sheet, the socket client and the page all answered. The folder on the box is a SPARSE clone
  (`stand/` only), `/home/deploy/sq1-stand`; the repository is public (its page answers signed out).
- **The address PROPOSED, his to confirm: `string-quartet-no-1.justinwenloyang.com`** (the house convention,
  D102 in the tubas' journal: the title's words, lowercase, hyphens).
- **The films go to the box by `scp`** (README step 3) — 270 MB, not for git. **That line has not been run.**
- **The players' page: `stand/notation/app/help.html`** (`/notation/app/help.html` on the stand; printable; a
  "How it works" link on the door) — Safari not a Home Screen icon, Low Power Mode off, the six rows, alone,
  together, what to do if something looks wrong. FOR HIS EYE before any player sees it.
- **A reloaded stand rejoins a playing room** on the room's place (new in `film_check`, as the help page
  promises); after [Stop all] every stand now sits on the same frame (a stopped film is placed to half a
  frame, was 20 ms). `film_check` **31 ok**, `shell_check` 22 ok.

**HIS, in order:** confirm the address · the DNS record · README's lines 2–6 · the link sheet from the box ·
the iPad from the box, in Safari (and whether the film is kept on a second open) · the help page read · THE
WHOLE PIECE PLAYED THROUGH on his devices (the dress run) · the links to the quartet.
**Not done, known:** the old Technical Manual describes the FIRST system, not this stand · the print score and
parts are unchanged · the site's landing page still links the old app.

- **✓ THE ADDRESS, his word 2026-11-15: "address is fine"** — `string-quartet-no-1.justinwenloyang.com`.
- **A NOTE FOR LATER (his, 2026-11-15): A BACKUP SERVER TO RUN FROM HIS WINDOWS 10 LAPTOP** at the reading, in
  case the box or the venue's internet fails. Not built, not planned. (What exists: `server.js --spare
  <snapshot>` from the septet's stand, untested here; the laptop would need Node, the repo's `stand/` with its
  films, and the players' devices on the laptop's network; over plain http the films are not kept in the
  browser.)

### STEP 6 TRAIL — THE BOX (2026-11-15, his hands)

- ✓ the Cloudflare A record `string-quartet-no-1` → 5.161.233.35, proxy off — "saved".
- ✓ README line 2 (the sparse clone, the install inside `stand/`, PM2 `sq1-stand`) — ran first time; /health
  on the box answered ok true.

- ✓ README line 3 — the `scp` of the films (the line nobody had run): ran first time, "done"; the owner set
  and the listing: "it shows five files". The file sizes on the box were not read back.

- ✓ README line 4 (nginx + certbot): "successfully deployed". ✓ line 5: /health through
  `https://string-quartet-no-1.justinwenloyang.com` answers ok true. The box's admin key stays with him (not
  put in the chat or here).

- ✓ README line 6 (`setup.js "JACK Studio Readings" --server … --key …`): the piece registered on the box, the
  ensemble made, and **the link sheet opens from the box with five QR codes** (his word). **✓ STEP 6's SIX
  LINES ALL RAN, each first time.** ► NEXT: the iPad from the box, in Safari — the door, the film's load, play
  alone, and whether a second open finds the film kept.

- **THE iPAD FROM THE BOX, in Safari (his report, 2026-11-15):** it opens, plays, "the normal parts of the test
  worked"; **the second open did NOT need to load the film again** (the browser keeps it — the look-ahead's
  promise holds). **BUT: "a few stutters" on the first open, and on the second "really bad jitters … it jumped
  back and forth a couple times"** — playing alone. Cause NOT measured (the AI cannot see the iPad). Its
  reading: a stand playing alone was made to chase its own clock, like a stand in the room; when the film fell
  behind, it seeked, landed off, and seeked again — and the second open played the film straight off the
  browser's stored copy, which is slower to read than memory.
  **Changed (PC-verified only, `film_check` 32 ok):**
  (1) ALONE, THE FILM IS THE CLOCK — a stand playing by itself never trims or seeks its film; its place is the
  film's own time. An arrow or a typed time while playing is one seek, then the film leads again.
  (2) The kept copy is read whole into memory before it plays.
  (3) In the room: a seek only for a gap over 0.5 s (was 0.35), and never two closer than 1.5 s (was 0.7).
  (4) The 4-second "no frame → take it from the server" fallback is REMOVED — it was built on the Home Screen
  guess, never confirmed, and could have switched a healthy stand to streaming; the fallback on a real media
  error stays.
  **► NEXT: the later-deploy line, then his iPad again — alone, and above all [Play all] across devices over
  the internet, which is what the reading needs and has not yet been tried from the box.**

- ✓ The later-deploy line (`deploy.sh` on the box) ran: "it ends with OK" — the box now serves b9ae308c (alone,
  the film is the clock). The script's own listing of the five films passed with it.

- **✓ THE JITTER IS GONE — his word, 2026-11-15, the iPad from the box, alone: "it's smooth now."**
- `setup.js` now also prints the five links as text (he asked for the box's links in the chat; the AI does not
  hold the box's key, so he runs the line and pastes what he wants). Not yet committed.

- **[PLAY ALL] FROM THE BOX, three devices (2026-11-15):** his first report: "bad jitter at same place on violin
  1 with 1st gc" (the iPad). The AI tracked the cursor frame by frame through the first GC in the film
  (`violin1.mp4`, film 4–8 s, 240 frames): forward 4.2 px every frame, never back, never still — **the film is
  clean there.** Then his: **"2nd time and 3rd time gone."** So it came ONCE, on the first play after opening,
  and not again. **Cause NOT found, NOT reproduced.** The AI's guess, unproved: something that settles once in
  the first minute of a stand's life (the clock's lock and its calibration at about 30 s move the room's time
  a little; or the device's decoder warming). OPEN, to watch for in the dress run. The page keeps no record of
  its own seeks, so a recurrence leaves no trace — a small event log in the readout would fix that (proposed,
  not built). Whether the three STARTED, STAYED and STOPPED together: not yet said by him.

- **IT REPRODUCES (his report + a screenshot of the iPad, 2026-11-15):** all three stands reloaded, [Play all]
  pressed on the iPad from the start: "it consistently stutters when it gets to about here" — the cursor at
  second 3, "as it approaches the GC", "not at exactly the same spot". Before today's change it stuttered
  DURING the GC ("that made that impossible to play"); now BEFORE it. So it is tied to TIME SINCE THE START
  (about five seconds in), not to a place — and it comes on the first play after a reload ("2nd time and 3rd
  time gone"). **The AI's reading, unmeasured:** the first play() after a page load is slow on the iPad (the
  decoder starting), so the film sets off a few tenths of a second behind the room; the servo then runs it 5 %
  fast for several seconds to catch up, and a film run 5 % fast drops a frame in twenty — the stutter; before
  today's change the same gap tripped a seek instead, a second later (during the GC).
  **Built on that reading (PC-verified only):** (1) THE DOOR WARMS THE FILM — [Open] plays a dozen frames
  behind the door ("Preparing…") so the first real play is not the decoder's first; (2) THE START IS CALLED
  EARLY by the device's own start time (`startEst`, learned from each clean start's error, kept in the
  browser) — play() goes out that long before the room's instant; (3) the readout shows the last start's
  error, the estimate, and a count of seeks while playing.

### HIS NOTES OF 2026-11-15, before the Violin I play-through (nothing here to be done now)

- **THE ORDER HE SET:** first the whole of Violin I played through, reporting what he finds; THEN the deploy
  line for ff04e49e (the door's warm-up, the early start); then "see if there's any immediate fixes to that
  cursor jitter". **"Crucially, we have to fix that initial jitter."** He has seen no more instances of it yet.
- **A GENERAL UNSMOOTHNESS OF THE CURSOR** — "a bit of a sort of stutter that's similar to the kind I had with
  the old system, which I thought the video part was going to resolve … I think it's playable, but there is a
  little bit of jitter. It's just not very smooth, the cursor." He wonders whether it is the old score's format,
  and whether the new pieces will be free of it. "Otherwise, this is something we need to address for future
  things. I'm not sure it's worth it for this one." Not diagnosed. What IS measured: in the film the cursor
  advances 4.2 px on every frame through film 4–8 s (no frame back, none still), so that stretch of the film
  is even. Not known: whether he sees it playing alone (the film untouched) or only in the room (the servo
  trimming the rate), and on which devices.
- **FOR THE NEXT PIECE, TO EVALUATE THEN (his thought, not a decision):** "this system is fine. I think I don't
  need to do all the things we had mentioned before. We should just have, this is much simpler, a system like
  this for all cases. So there's just one score. They can rehearse, they can play alone, they can play an
  ensemble." No remote: "the conductor open a score on an iPad or even on a phone if the buttons are big
  enough." "Let's evaluate that when we get to it for the next piece and see if I'm losing anything." It holds
  "if we can iron out all the video smoothness issues." (This bears on the tubas' PLAN §9 and the septet's
  stand — to be carried there when that work resumes.)
- **ANNOTATIONS: dropped from his mind for now** — "maybe they can just print the paper score and annotate on
  that." A note for later, NOT now: a little research into what performers who read from iPads do with PDF
  scores — do they annotate on them directly?

- **His observation during the play-through (before ff04e49e is deployed):** "once played to about 210 then back
  to start that initial jitter gone." So the jitter belongs to the FIRST play after the page opens and does not
  return on a later start in the same sitting — which is what the door's warm-up is aimed at. Still unproved
  until he has run the deploy line and reloaded.

- **✓ THE WHOLE OF VIOLIN I PLAYED THROUGH on the iPad (2026-11-15): "run thru no other issues"** — beyond "the
  lack of cursor smoothness throughout" (the general note above).
- **ff04e49e DEPLOYED by him, and the first-play stutter is NOT cured:** "the iPad had maybe not quite a severe
  stutter, but a noticeable stutter at a different spot a little bit later. And then the second play, it seemed
  smooth." So the warm-up and the early start changed its size and its moment and did not remove it.
  **CONFIRMED so far (facts, not readings):** it comes on the first play after the page opens and not on later
  plays · the film's own frames are even where measured · alone-play's back-and-forth went with "the film is
  the clock". **NOT confirmed: the cause.** The AI's "slow first start" reading is weakened by this result.
  **Wanted from him: after a first-play stutter, the readout's line "start … est … seeks …"** (tap
  "connected"), and whether that play was [Play alone] or [Play all].

- **THE FIRST DATA FROM THE iPAD (his photo of the readout, 2026-11-15, after a first play that he stopped at
  second 7):** `start 6ms est 121` · `seeks 0` · `plays 2 no error` · `ready 4` · `tab memory` · `seekEst 0.08`.
  **So two readings are RULED OUT for that play: the film did NOT start late (6 ms), and there was NO seek.**
  What is left: the servo taking hold of the film's rate early in a stand's life (it has not yet learned the
  device's own drift — `motor` is learned only after ten seconds of playing, and kept for later plays, which
  would fit "the second play is smooth"), or the device's decoder, or the clock. NOT confirmed.
  **Added to the readout (ff04e49e + this):** `trim N max X% at <film seconds> off Y ms` — how often the servo
  took hold, how hard, where, and the film's worst distance from the room — and `motor … ppm <policy>`.
  **The two plays wanted from him, each after a fresh reload:** [Play alone] from the start for twenty seconds
  (no servo at all — does it stutter?), then [Play all] from the start, and a photo of the readout.

- **HIS SECOND PHOTO (the same page load, a second play from the start, taken before 718f1321 was deployed):**
  "it stuttered pretty severely at a slightly later point" — stopped at second 10; `start −6ms est 124` ·
  `seeks 0` · `plays 3 no error`. **So it is NOT only the first play after a load** (the earlier "second play
  smooth" does not hold every time); again the start was on time and there was no seek. It comes some seconds
  into a play in the first minute or so of a stand's life, and was not seen later in the play-through.
  **The readout now carries three more records** (this commit): `gaps` (frames that came over 45 ms after the
  one before — the device's drawing; alone and in the room) · `steps` (the room's time moving by over 4 ms
  between two frames — the clock correcting itself, with the size) · `clock` (the floor clock's state, round
  trip, what is still being slewed, its corrections, relocks and trips). With `trim` these separate the three
  causes left: the servo, the clock, the device. `film_check` 33 ok. **► NEXT: his deploy, a reload, [Play
  all] from the start, stop after the stutter, a photo of the readout.**

- **THE READOUT WITH ALL ITS RECORDS (his third photo, 25d34a0b on the box, [Play all] from the start after a
  reload, stopped at second 8):**
  `start 11ms est 117` · `seeks 0` · `trim 3 max 5.2% at 0,1,10 off 264ms` · `gaps 16 max 171ms at 0,1,1,2,2,4`
  · `steps 0` · `clock locked cal rtt 54 pend 0.0 corr 0/0ms relock 0 trip 0` · `motor −2000ppm previous`.
  **What this settles:**
  · THE CLOCK IS NOT THE CAUSE — no step, no correction, no relock; it is locked and calibrated; the round trip
    to the box is 54 ms.
  · THE FILM REALLY FELL BEHIND THE ROOM, BY 264 ms AT WORST, with no seek and an on-time start — so the film
    itself stalled while "playing". Sixteen frames came late in under ten seconds, the worst 171 ms after the
    one before, most of them in the first four seconds. (Safari is known to under-report frame callbacks — the
    tubas' test kit — so the COUNT is soft; the 264 ms is measured from the film's own time and is not.)
  · THE SERVO THEN MADE IT LONGER: it took hold three times and ran the film at the full 5 % to catch up, which
    for 264 ms is five seconds of fast, frame-dropping film — the stutter he sees after the stall. Its learned
    drift sits at its limit (−2000 ppm): it believes this film runs slow all the time, which would fit his
    "lack of cursor smoothness throughout".
  **THE READING NOW (still a reading): THE iPAD IS NOT DECODING THIS FILM FAST ENOUGH TO PLAY IT EVENLY.** The
  film is 2048 × 1536 at 60 fps, H.264 High, level 5.1, with B-frames (847 of the first 1,200 frames) and
  x264's "slow" preset (several reference frames); one 128 KB key frame a second.
  **THE EXPERIMENT (building):** two lighter Violin I films beside the present one, chosen by `?film=a` or
  `?film=b` on a link — `a` the same size with no B-frames and one reference frame; `b` the same, at
  1600 × 1200. Same test each: a reload, [Play all] from the start, a photo of the readout. `gaps` and `off`
  are the numbers to compare.

### HOW TO WORK HERE (carried from the other pieces)

- The composer starts and stops every server; the AI gives the exact line and the link, never runs them. From the
  README: Workshop `node C:\Users\jwloy\GitHub\string_quartet_no1-composer\server.js` → `http://localhost:3000` ·
  the performance app locally: build with `node C:\Users\jwloy\GitHub\string_quartet_no1-composer\scripts\build_performance_app.js`,
  then `node C:\Users\jwloy\GitHub\string_quartet_no1-composer\scripts\performance_server.js` → `http://localhost:3001` ·
  live: `https://justinwenloyang.com/string-quartet-no1` (the box: `/home/deploy/sq1`, PM2 `sq1-server`; the
  deploy line and the sparse-clone warning are in the README and §3's DEPLOY NOTE).
- Tests only when make-or-break; one verification per claim, on the real device; plain words; every reply ends
  with "Your steps"; findings collected as named, fixed together on the composer's go.
- Journal as the work happens (a RUNNING_LOG-style trail belongs in this §2 or a new `docs/RUNNING_LOG.md`).

### OPEN, CARRIED

- Two local commits of 2026-10-08 were never pushed until the handoff commit (see git log); the §3 DEPLOY NOTE
  (the server's sparse clone and the tracked PDFs) applies before the next deploy.

---

### LAST SESSION — 2026-10-08 (session 1 of the October work; Claude Code — Fable 5.1, then Opus 5.5)

- **The goal: a submission print score for the "2026 JACK Studio Readings"** (the JACK Quartet reads existing quartets; sessions December 2026, New York; **application deadline 2026-10-22, 11:59 pm ET**; `https://www.jackquartet.com/studio`). A Google Form: a LINK to the score (required), a link to a recording (optional), title, duration as h:mm, year, played before, technical needs. **He fills and submits it himself.**
- **The print score is assembled: `print/score/String_Quartet_No_1-JYang.pdf` — 36 pages, every one 1200 × 900 pt: cover 1 + performance instructions 3 + score 32.** A byte copy is in `submissions/Jack_Quartet_2026/`. Build: `node scripts/build_print_score.js` (`print/README.md` has the steps).
- **Everything new lives in `print/`; the originals are untouched** — `docs/notation_instructions/` (the live site's page, byte-identical to the site on this day) and `builds/print/` (the March PDFs, now tracked with `git add -f`).
- **Three updates to the score as sent, all his:** the Line Wedge figure replaced by a wedge that changes thickness · an opening paragraph taken from Recombination's instructions · a final barline at the right edge of the last system. `print/instructions/UPDATES.md` lists the instruction changes.
- **To look at anything in `print/`:** `node print/preview_server.js` → `http://localhost:3003/score/String_Quartet_No_1-JYang.pdf` · `/instructions/` · `/cover/cover-score-landscape.pdf`. (The servers started this session were stopped at its end.)

### NEXT UP

1. **His:** the form. The AI flagged three entries from his screenshots, his to settle — the duration typed `8:35` where the form wants h:mm (the score runs 508 s = 8:28, so `0:09`) · the title `String Quartet Number 1` against `No. 1` on the cover · technical needs `none` for a score read from four screens over the internet.
2. **His:** the Drive copy must be the latest build (2026-10-08 10:30, 3,491,043 bytes) and viewable by anyone with the link. The AI offered to check through his Drive; not asked.
3. Any further findings on the draft: fix together on his go, rebuild, re-copy to `submissions/Jack_Quartet_2026/`.
4. **Later, slotted by him among the other pieces:** the full performance score and parts — a separate build, when the originals are finalized.

### OPEN AT SESSION END

- **Not pushed.** Two local commits on `main`. See the deploy note in §3 before the next deploy.
- The final barline is in the ASSEMBLED PDF only — not in `builds/print/full_score.pdf`, the parts, the Workshop score or the live site.

### OPEN QUESTIONS

- The deadline (2026-10-22) is NOT on his imminent list (`composition-planning-and-notes/docs/next.md`). Asked in chat; add only at his word.
- A demo-recording link in the instructions, as Recombination has after its opening paragraph? Offered; he has not said.

### BLOCKERS

- None.

## §3 Principles

*Lessons of the October 2026 session. The older ones are in `docs/WORKING_PRINCIPLES.md`.*

- **Draw onto a PDF page from the PDF's own measurements, not the screen's.** Chrome lays the page out again for print: in `full_score.pdf` the score SVG runs x 11.99 → 1589.01, on screen 11.67 → 1588.33. A third of a pixel at the left, more than a pixel at the right. *(the final barline)*
- **A PDF page can be measured without poppler:** crop it to a few pixels with pdf-lib (`setMediaBox` + `setCropBox`), open the crop in headless Chrome's own PDF viewer, screenshot, read the colour edges in a canvas. Good to a few hundredths of a pixel.
- **`builds/` is gitignored.** A PDF there that must be kept goes in with `git add -f`. New print work goes in `print/`.
- **DEPLOY NOTE: `builds/print/*.pdf` are now tracked, and the live server holds its own untracked copies** (the landing page links `/print/full_score.pdf` and the four 6-page parts). The server is a sparse clone; if its sparse patterns include `builds/`, the next `git pull` there will refuse to overwrite them. Look at `.git/info/sparse-checkout` on the server before deploying. Not checked this session — no deploy was made.
- **A Bash heredoc on this machine halves backslashes** (`\\s` arrived as `\s`, then JavaScript made it `s` — a regex silently stopped matching). A script with a regex goes to disk with the Write tool, or builds the backslash with `String.fromCharCode(92)`. And a Bash command over ~8 KB fails with a false quote error — Write tool again.
- **Recombination's server answers 404 for a bare folder URL** — ask for `/docs/notation_instructions/index.html`.

## §4 Decisions

- **2026-11-12 — THE READINGS RUN ON THE FIRST-GENERATION SYSTEM AS IT IS;** the new stand (Tempus, the tubas) comes to the quartet after the readings. The composer: "I think I agree with you if we can keep that system, as long as we can make sure it's robust and runs well on the iPads."

- **D-Oct-1 · The October 2026 updates live in `print/`; the originals are not touched** (his ask). He keeps `docs/notation_instructions/` and `builds/print/` as posted until the performance score and parts are finalized in a separate build. *Rejected:* editing the live page in place (a deploy would change the site); an `updates/` folder apart from the cover (two homes for one job). `print/instructions/UPDATES.md` is the list of changes; each is marked in the page as `[update 2026-10 #N]`.
- **D-Oct-2 · The March print PDFs are tracked in place** — `builds/print/full_score.pdf` and the twelve parts, force-added. The five test PDFs there (`stage4_*`, `test_vector`) are left untracked.
- **D-Oct-3 · The cover is the house's, with the block centred** (his ask). Generator copied whole from `septet_LGMF_2026/print/cover/make_cover.ps1`; words in `print/cover/cover.json`; title + name, no subtitle; `"vertical": "centre"` is a key added to THIS repo's copy (cap-top of the first line to the baseline of the last, centred on the sheet's height). Without it the block sits at the house place, 27.1 % down. The sheet is the score's own, 1200 × 900 pt (`print/formats.json`).
- **D-Oct-4 · The instructions print in the house dress, two columns** (he: "as in Recombination… one column or two, your discernment"). The sheet is 1600 × 1200 px — slightly LARGER than A3 landscape. Title bar and rule, column-fill auto, Crimson Pro Light, text 13 px. Each block keeps its on-screen layout (an 840 px column) and is scaled whole to the print column, 87.4 %; a block never breaks. **The eight notation fragments stand two to a row at 82 % of their page size** — *rejected:* one under the other, as on the web page: four sheets, the last with a single entry. Now three.
- **D-Oct-5 · Line Wedge: the flat line replaced by the swell** (his choice among keep-both / replace / a taper). `images/lineWedge_hairpin_264.svg` = the original folder's unused `lineWedge_hairpin_from 264.svg`.
- **D-Oct-6 · The instructions open with Recombination's first paragraph**, word for word, the piece's name changed (his ask).
- **D-Oct-7 · The final barline: at the last system's right edge, in the assembled PDF only** (his ask, placed by him on a second pass). The thick bar's right edge 10 px inside the page's white (he said "15… maybe about 10"); from 10 px under the timeline's numbers down to the same margin above the system's foot (y 625.1 → 1169.9, x to 1579.0). Weights are the house's (`septet_LGMF_2026` rules.json `finalBarLine`): thin 0.19 · gap 0.30 · thick 0.60 staff space, the instrument staves' own staff space (6.65 px) → 1.26 / 3.99 px, solid black. *Replaced:* the first pass, at the curves' end (508.05 s, 75.6 % across) with the extent of the opening system line. *Not done:* putting it in the Workshop score — that would reach the live site and the parts.

## §5 Done

- **2026-10-08** — the print score for the JACK Studio Readings assembled: cover, instructions, score, final barline. 36 pages.

## §6 Human Notes

- *(2026-10-08)* The form and the upload are his. Deadline 2026-10-22, 11:59 pm ET.

---

## Table of Contents

- [Part 0: AI Quick-Start](#part-0-ai-quick-start)
- [Part I: Workshop Development (Composition Phase)](#part-i-workshop-development-composition-phase)
  - [I.1 — What the Workshop Is](#i1--what-the-workshop-is)
  - [I.2 — Curve System](#i2--curve-system)
  - [I.3 — Musical Material Systems](#i3--musical-material-systems)
  - [I.4 — LilyPond Notation Pipeline](#i4--lilypond-notation-pipeline)
  - [I.5 — MIDI Generation Architecture](#i5--midi-generation-architecture)
  - [I.6 — AI-Assisted Composition Workflow](#i6--ai-assisted-composition-workflow)
  - [I.7 — Score Data Model](#i7--score-data-model)
- [Part II: Performance Pipeline (Phases 1–15)](#part-ii-performance-pipeline-phases-115)
  - [II.1 — Architecture Overview](#ii1--architecture-overview)
  - [II.2 — Build System](#ii2--build-system)
  - [II.3 — Phase Summary Table](#ii3--phase-summary-table)
  - [II.4 — Key Engineering Decisions](#ii4--key-engineering-decisions)
  - [II.5 — Testing & Quality](#ii5--testing--quality)
- [Part III: Operations & Deployment](#part-iii-operations--deployment)
  - [III.1 — Server Architecture](#iii1--server-architecture)
  - [III.2 — Deploy Process](#iii2--deploy-process)
  - [III.3 — Routing](#iii3--routing)
  - [III.4 — Maintenance](#iii4--maintenance)
- [Part IV: Future — New Piece Guide](#part-iv-future--new-piece-guide)
  - [IV.1 — What's Reusable](#iv1--whats-reusable)
  - [IV.2 — What's Piece-Specific](#iv2--whats-piece-specific)
  - [IV.3 — Creating a New Piece Repository](#iv3--creating-a-new-piece-repository)
  - [IV.4 — Onboarding Checklist](#iv4--onboarding-checklist)
- [Appendix A: Document Inventory](#appendix-a-document-inventory)

---

# Part 0: AI Quick-Start

> **Purpose:** Give any AI assistant enough context to be productive within minutes. Read this section first; drill into later parts only as needed.

## What This Project Is

**String Quartet No. 1** is a contemporary music composition for string quartet. The piece uses a **scrolling digital score** instead of traditional printed pages — performers read from tablets/laptops in real time, with animated conducting cues (Gravitational Conductors), colored curves representing gestures, and embedded notation fragments.

The project has two major software components:

1. **Workshop** (`public/index.html`, `server.js`) — A browser-based composition environment where the composer builds the score. It runs locally on `localhost:5000`. This is a single large HTML file (~30,000+ lines) with all rendering, editing, MIDI playback, and UI systems embedded.

2. **Performance Score** (`builds/performance/index.html`) — A stripped, optimized version of the Workshop HTML deployed to a web server. Built by `scripts/build_performance_app.js`, which performs subtractive transformations (removing editor UI, injecting patches for sync, parts mode, rehearsal tools). Performers access this at `justinwenloyang.com/string-quartet-no1`.

## Key Architecture Principles

- **Subtractive build:** The Performance Score is the Workshop with editing UI removed and performance features injected via patch files. This preserves rendering fidelity.
- **Patches, not source modification:** Performance features live in `scripts/performance_*_patches.js` files. The Workshop `public/index.html` stays unchanged.
- **Score as JSON:** All composition data (curves, SVG elements, MIDI snippets, GCs, bundles) is serialized to/from JSON via `ScoreManager`.
- **LilyPond for notation:** Musical notation is rendered as SVG via LilyPond, then inserted into the score. A custom pipeline (render → crop → insert) handles each technique.
- **MIDI channel banks:** 12 MIDI channels organized in 3 banks — Base (0–3), Vibrato (4–7), Volume (8–11) — to isolate persistent CC state.

## File Map (Where Things Live)

| Path | What It Is |
|------|-----------|
| `public/index.html` | Workshop — the composition engine (DO NOT MODIFY for performance features) |
| `server.js` | Workshop dev server (port 5000) |
| `scripts/build_performance_app.js` | Build script: Workshop → Performance Score |
| `scripts/performance_server.js` | Production Express server (port 3001) |
| `scripts/performance_*_patches.js` | Patch files injected during build (canvas, parts, rehearsal, annotation) |
| `scores/` | Score JSON files (composition data — the creative output) |
| `lilypond_code/` | LilyPond source files (`.ly`), tooling (`modify_midi.js`, `state_tracker.js`, `crop_svg.js`), SVG assembly engine |
| `landing/` | SQ1 landing page (instrument picker, room management) |
| `homepage/` | Composer homepage (portfolio, social links) |
| `docs/` | 40 markdown documents (this journal consolidates them) |
| `curve_library/` | Saved curve presets (JSON) |
| `gc_library/` | Saved Gravitational Conductor presets (JSON) |
| `SVG_graphics/` | Pre-generated notation SVGs (Bartók pizz, CLB, etc.) |
| `public/fonts/` | Crimson Pro font files for notation text |
| `public/pitchesSVGs/` | Pitch marker SVGs for glissando display |
| `tools/` | Standalone utility HTML tools |

## Musical Material Systems

The Workshop supports several musical gesture types, each with its own pipeline:

| System | CC0 | MIDI Channels | Key Files |
|--------|-----|---------------|-----------|
| **Long Tone Glissando** | — | 8–11 (Volume) | `AI_GLISSANDO_PROMPT_GUIDE.md` |
| **Crescendo/Decrescendo** | — | 8–11 (Volume) | `AI_CRESCENDO_PROMPT_GUIDE.md` |
| **Vibrato** | 89 | 4–7 (Vibrato) | `AI_VIBRATO_PROMPT_GUIDE.md` |
| **Bartók Pizzicato** | 97 | 0–3 (Base) | `AI_BARTOK_PIZZ_PROMPT_GUIDE.md` |
| **Pizzicato Tremolo** | 95 | 8–11 (Volume) | `AI_PIZZ_TREMOLO_PROMPT_GUIDE.md` |
| **Pizz Tremolo Glissando** | 95 | 8–11 (Volume) | `AI_PIZZ_TREM_GLISS_PROMPT_GUIDE.md` |
| **Bow Overpressure** | 53 | 0–3 (Base) | `AI_SCORE_BUILDING_PROGRESS.md` |
| **Col Legno Battuto/Jeté** | — | 0–3 (Base) | `AI_SCORE_BUILDING_PROGRESS.md` |
| **Notation Fragments** | varies | 0–3 (Base) | `NOTATION_FRAGMENT_WORKFLOW.md` |
| **Feathered Beam (Accel/Decel)** | — | 0–3 (Base) | `AI_SCORE_BUILDING_PROGRESS.md` |

Each system follows the **Musical Material Workflow** (`MUSICAL_MATERIAL_WORKFLOW.md`): build pipeline off-score → integrate via UI → optionally automate via AI Command Bridge.

## AI Interaction Patterns

Four patterns evolved for inserting musical material, each an improvement:

1. **Console Script → Save → Reload** — AI generates JS, user pastes in console, saves, reloads
2. **Programmatic API → Save → Reload** — UI buttons trigger pipelines, but still need save/reload
3. **Direct Live Insertion** — Everything happens in one click, no reload needed
4. **AI Direct (Pattern 4)** — AI sends commands via `POST /api/ai/command` → Socket.IO → browser eval. Hands-free.

**Pattern 4 is the target for all systems.** The composer describes what they want in natural language; it materializes in the score.

## Working Protocols

| Protocol | Document | When |
|----------|----------|------|
| **Session start** | `WORKING_PRINCIPLES.md` | Read first every session |
| **Pre-implementation** | `STRING_QUARTET_PIPELINE_PLAN.md` §13.2.7 | Before any new phase |
| **LilyPond work** | `LILYPOND_SETTINGS_REGISTRY.md` | Before any `.ly` file |
| **Score building** | `AI_SCORE_BUILDING_PROGRESS.md` | During composition sessions |
| **Testing** | `TESTING_PROTOCOL.md` | After integration work |
| **Post-mortem** | `IMPLEMENTATION_PROGRESS.md` | After completing each phase |

## Quick Commands

```bash
# Workshop (composition)
node server.js                    # Start Workshop on :5000

# Build Performance Score
node scripts/build_performance_app.js

# Performance server (local testing)
node scripts/performance_server.js  # Start on :3001

# Deploy to production
ssh -i C:\Users\jwloy\.ssh\id_ed25519 root@5.161.233.35 \
  "su - deploy -c 'cd /home/deploy/sq1 && git pull && node scripts/build_performance_app.js'"
```

---

# Part I: Workshop Development (Composition Phase)

## I.1 — What the Workshop Is

The Workshop is a browser-based composition environment — a single HTML page (`public/index.html`) that provides:

- **Scrolling timeline** — a horizontal score canvas where time flows left-to-right
- **Four instrument tracks** — Violin I, Violin II, Viola, Cello (mapped to tracks 1–4)
- **Graphic objects** — Curves (CurveMaker), Gravitational Conductors (GCMaker), SVG elements (SVGElementManager), Line-Wedges (LineWedgeMaker), MIDI snippets (MidiController), Badges (BadgeMaker)
- **Score persistence** — JSON save/load via ScoreManager with auto-save and versioning
- **MIDI playback** — Web MIDI API for real-time playback of all MIDI snippets
- **LilyPond integration** — Server endpoints for rendering notation to SVG
- **AI Command Bridge** — Socket.IO bridge for hands-free AI composition

The Workshop server (`server.js`, port 5000) provides REST endpoints for file operations, LilyPond rendering, curve/GC libraries, and the AI command bridge.

**Original docs:** `CURVE_SYSTEM_ARCHITECTURE.md`, `KEYBOARD_SHORTCUTS.md`, `MISCELLANEOUS_NOTES.md`

## I.2 — Curve System

Curves are the foundational graphic element. They represent gesture shapes — pitch trajectories, volume envelopes, vibrato intensity — as time-indexed bezier paths on the score timeline.

**Key concepts:**
- **CurveDatabase** — in-memory CRUD store, registered with ScoreManager
- **CurveMaker** — rendering, selection, editing, multi-page display, library save/recall
- **curveData** — sampled at 100 Hz (10ms intervals), normalized Y values 0–1
- **Curve models** — logarithmic, exponential, power, sigmoid, bezier — controlled by slope parameter (-3 to +3)
- **Fill modes** — line, fill-down, fill-up — visual representation of the gesture
- **Curve Follower** — real-time animated meter during playback (O(1) lookup)

Curves drive multiple musical systems. In Long Tone Glissando, the curve Y maps to pitch. In Crescendo/Decrescendo, it maps to CC7 volume. In Vibrato, it maps to CC4/channel pressure intensity.

**Original doc:** `CURVE_SYSTEM_ARCHITECTURE.md`

## I.3 — Musical Material Systems

Each musical gesture type has a complete pipeline: inputs → LilyPond notation → SVG → MIDI → score insertion. Systems are documented in dedicated workflow docs and AI prompt guides.

### Bundle System

Most systems use a **bundle** — a linked group of components (GC + SVG + MIDI snippet + curve) that move and delete together. The bundle system provides:
- **Unified drag** — drag any component, all move together
- **Unified delete** — delete any component, all are removed
- **Persistence** — bundles exported/imported via ScoreManager

Bundle types: CD (crescendo/decrescendo), VIB (vibrato), BP (Bartók pizz), PT (pizz tremolo), PTG (pizz trem glissando), NF (notation fragment), BOP (bow overpressure), AD (accel/decel feathered beam).

### Musical Material Catalog (MM System)

A higher-level grouping: **Musical Materials** (`MUSICAL_MATERIAL_SYSTEM.md`) let the composer name and version groups of bundles as compositional units. Captured via MultiSelect → purple MM button.

### Gravitational Conductor (GC)

An ictus-based animated conducting cue — a bouncing ball that impacts at a specific time. The kinetic curve (descent → impact → ascent) informs performance interpretation. Parameters: stiffness, damping, ictus percentage, descent ratio, duration, color.

### Selection & Grouping

- **ObjectSelector** — Ctrl+Win+Click opens a menu for overlapping objects
- **MultiSelect** — Shift+Click toggles objects in/out of group selection
- **Floating toolbar** — Duplicate, Delete, Track change, Time shift for selected objects

**Original docs:** `MUSICAL_MATERIAL_WORKFLOW.md`, `MUSICAL_MATERIAL_SYSTEM.md`, `KEYBOARD_SHORTCUTS.md`, `Bundle_Manager_Guide.md`

## I.4 — LilyPond Notation Pipeline

All notation SVGs are generated via LilyPond. The project uses a structured pipeline:

1. **Templates** — Parameterized `.ly` files for each technique (glissando, vibrato, crescendo, Bartók pizz, Z-stem, feathered beam, etc.)
2. **Settings Registry** — `LILYPOND_SETTINGS_REGISTRY.md` is the single source of truth (extracted from 433 `.ly` files, 771 unique setting lines)
3. **StartingTemplate.ly** — Clean base for new files
4. **Rendering** — LilyPond CLI or Frescobaldi produces SVG + MIDI + event log
5. **Cropping** — `crop_svg.js` trims whitespace from LilyPond's full-paper SVG
6. **SVG Assembly Engine** — `lilypond_code/svg_assembly/assemble_svg.js` assembles notation from component glyphs (alternative to LilyPond for simple cases)

### MIDI Tagging System

A custom pipeline for injecting per-note MIDI metadata:
1. **`midi-tags.ily`** — LilyPond shorthand variables (`\midiPizz`, `\midiSfz`, etc.)
2. **`midi-logger.ily`** — Scheme engraver that writes JSON event log during compilation
3. **`state_tracker.js`** — Converts event log → CC map JSON
4. **`modify_midi.js`** — Injects CC events and velocity overrides into raw MIDI

This decoupled pipeline means notation and MIDI serve different purposes from the same input.

**Original docs:** `AI_LILYPOND_PROMPT_GUIDE.md`, `LILYPOND_SETTINGS_REGISTRY.md`, `NOTATION_FRAGMENT_WORKFLOW.md`, `LY_NAMING_CONVENTION.md`, `Violin_Notation_Guide.md`, `Viola_Notation_Guide.md`, `Cello_Notation_Guide.md`

## I.5 — MIDI Generation Architecture

**12 MIDI channels in 3 banks:**

| Bank | Channels | Purpose | Systems |
|------|----------|---------|---------|
| **Base** | 0–3 | Note events, CC0 articulation, pitch bend | Bartók pizz, Bow overpressure, Notation fragments, Pizz trem glissando |
| **Vibrato** | 4–7 | CC4 modulation + channel pressure | Vibrato |
| **Volume** | 8–11 | CC7 volume ramp | Long tone glissando, Crescendo/decresc, Pizz tremolo |

**Why separate banks?** The synth doesn't reliably respond to CC120/CC123 for state reset. A crescendo ending at CC7=127 leaves the channel permanently loud. Isolating by bank prevents cross-contamination.

**CC0 Articulation IDs:** 53 (bow overpressure), 89 (vibrato/senza vibrato), 95 (pizz tremolo), 97 (Bartók pizz). Full registry in `MIDI_MUSIC_GENERATION.md` §4.

**Virtual instrument pitch bend range:** ±1 semitone (not the typical ±2). Quarter-tone: +50 cents = bend 12288, -50 cents = bend 4096, center = 8192.

**Original docs:** `MIDI_MUSIC_GENERATION.md`, `AI_SCORE_BUILDING_PROGRESS.md` (§MIDI Channel Designation)

## I.6 — AI-Assisted Composition Workflow

The composition process uses a 3-tier documentation system:

| Tier | Scope | Action |
|------|-------|--------|
| **Tier 1** | Each code change | Memory + ASB-NNN entry |
| **Tier 2** | Every 3–4 increments | Git commit summarizing ASB range |
| **Tier 3** | Major milestone | Full docs update + git tag |

**Session protocol:**
1. Read `WORKING_PRINCIPLES.md` (86 lines — short enough for every session)
2. Read `AI_SCORE_BUILDING_PROGRESS.md` → Session Startup Checklist
3. AI states understanding of current task; user confirms
4. Work proceeds with Tier 1 documentation
5. Wrap up: summarize, suggest Tier 2 commit, update progress

**ASB numbering:** Sequential from ASB-001 through ASB-189+ (as of Mar 2026). Each ASB is an atomic unit of composition work.

**Original docs:** `AI_SCORE_BUILDING_PROGRESS.md`, `WORKFLOW_METHODOLOGY.md`, `SESSION_START_AND_END_PROMPTS.md`, `WORKING_PRINCIPLES.md`

## I.7 — Score Data Model

The score is a single JSON file containing:

- **CurveDatabase** — all curves with sample data
- **MidiSnippetDatabase** — all MIDI snippets with event arrays
- **SVGElementManager data** — all SVG notation elements (base64 data URLs)
- **GCMaker data** — all Gravitational Conductors
- **LineWedgeMaker data** — all line-wedge objects
- **MotiveDatabase** — motive data (experimental)
- **BadgeDatabase** — animated badge elements
- **Bundle registries** — per-system bundle linkages (CD, VIB, BP, PT, PTG, NF, BOP, AD)
- **Musical Materials** — named, versioned groups of bundles
- **Score metadata** — cursor position, page, zoom, timeline length

Score files are in `scores/` (numbered sequentially, e.g., "2295-FinalScore-preVersioning.json"). The `scores/versions/` subdirectory holds timestamped backups.

**Original doc:** `BULK_MOVE_OBJECTS.md` (documents all 7+ object types and their time fields)

---

# Part II: Performance Pipeline (Phases 1–15)

## II.1 — Architecture Overview

The Performance Score transforms the Workshop into a deployable web app for live performance:

```
Workshop HTML (public/index.html)
        │
        ▼  build_performance_app.js
┌───────────────────────────────────┐
│  Strip editor UI                  │
│  Inject canvas patches            │
│  Inject parts mode patches        │
│  Inject rehearsal mode patches    │
│  Inject annotation patches        │
│  Embed score JSON                 │
│  Convert SVG text → vector paths  │
│  Copy fonts, staff SVGs, pitch SVGs│
└───────────────────────────────────┘
        │
        ▼
Performance HTML (builds/performance/index.html)
        │
        ▼  performance_server.js
┌───────────────────────────────────┐
│  Express server (port 3001)       │
│  Socket.IO (multi-client sync)    │
│  JWT session management           │
│  Room system                      │
│  Static file serving              │
└───────────────────────────────────┘
        │
        ▼
Live at justinwenloyang.com
```

**Key insight: Subtractive, not additive.** The build strips the Workshop down rather than rebuilding from scratch. This preserves all rendering fidelity — every curve, SVG, animation, and layout behaves exactly as it does in the composer's Workshop.

## II.2 — Build System

`scripts/build_performance_app.js` performs these transformations:

1. **Read** Workshop HTML
2. **Apply canvas patches** — replace rendering methods for performance context
3. **Apply parts patches** — add per-instrument part view (configurable page count)
4. **Apply rehearsal patches** — add gestures, markers, loops, annotations, sync controls, speed control, performance mode, emergency controls
5. **Apply annotation patches** — add annotation overlays
6. **Embed** score JSON inline (from `scores/2295-FinalScore-preVersioning.json`)
7. **Generate** stamp glyph paths from Emmentaler font (via `svg_component_library.json`)
8. **Convert** SVG text to vector paths via opentype.js (eliminates font dependency)
9. **Copy** staff header SVGs, pitch marker SVGs, font files to build output

Output: `builds/performance/index.html` + supporting assets.

## II.3 — Phase Summary Table

| Phase | Name | What It Did |
|-------|------|-------------|
| 1 | Subtractive Build | Strip Workshop → Performance HTML |
| 2 | Score Embedding | Inline score JSON, remove file I/O |
| 3 | Canvas Patches | Replace rendering for performance context |
| 4 | Print Score | PDF generation via Puppeteer (page pairs, proper margins) |
| 5 | Multi-page Curves | Curves spanning page boundaries render correctly |
| 6 | SVG Elements | Notation SVGs render, resize, multi-page |
| 7 | GC Animation | Gravitational Conductor bouncing ball in performance |
| 8 | Multi-Client Sync | Socket.IO sync, leader election, offline stub, navigation centralization |
| 9 | Line-Wedges | Line-wedge rendering in performance |
| 10 | Speed Control | Adjustable playback speed |
| 11 | Performance Mode | Readiness check, countdown, locked playback, ceremony, emergency controls |
| 12 | Parts Mode | Per-instrument view, configurable page count, swipe gestures |
| 13 | Rehearsal Mode | Full gesture reference, markers, loops, annotations, MiniMap overlay |
| 14 | Website & Production | Landing page, homepage, cloud deployment (Hetzner VPS), PM2, nginx, sparse git clone |
| 15 | Homepage & Polish | Homepage at `/`, SQ1 at `/string-quartet-no1`, YouTube link, sync bar auto-fade |

## II.4 — Key Engineering Decisions

1. **Subtractive approach** (Phase 1) — preserve Workshop rendering fidelity, don't reimplement
2. **Patches files** — keep `public/index.html` unchanged; all performance features in separate `.js` files
3. **Guard clause pattern** — Workshop uses `if (window.X)` guards, making stripping safe
4. **Socket.IO for sync** — real-time multi-client coordination with leader election
5. **Offline stub** — fallback when no server connection; must mirror server payload shape
6. **Navigation centralization** (Phase 8) — all goto paths through `SyncMode.localGoto()` (was 5 independent paths)
7. **Text-to-paths** (Phase 14) — opentype.js converts Crimson Pro text in SVGs to vector outlines, eliminating font dependency
8. **Sparse git clone** (Phase 14) — production server only checks out needed files (scripts, landing, docs, one score file)
9. **JWT session management** — returning performer detection via localStorage token

## II.5 — Testing & Quality

**Testing Protocol** (`TESTING_PROTOCOL.md`) — 15 tests across 4 tiers, ~25 minutes:

| Tier | Tests | Focus |
|------|-------|-------|
| 1 | 1.1–1.5 | Single-client parts: page turns, swipe/sync, goto, loop, page count |
| 2 | 2.1–2.5 | Multi-client: sync, broadcast isolation, disconnect/reconnect |
| 3 | 3.1–3.4 | Full score basics, cross-mode in same room |
| 4 | 4.1–4.4 | Edge cases: overflow, rapid input, boundary loops, font rendering |

**Pre-Implementation Protocol** (§13.2.7) — 7 steps before every phase:
1. System inventory → 2. Source reading (5:1 read:write ratio) → 3. Contract documentation → 4. Risk register → 5. Staged plan → 6. Focused tests → 7. Integration verification

**Working Principles** (`WORKING_PRINCIPLES.md`) — Distilled from all post-mortems:
- Fix upstream, not downstream
- Root cause before implementation
- Minimal fix (single-line when possible)
- Read before you write (5:1 ratio)
- One system per stage
- Never skip human verification

**Original docs:** `TESTING_PROTOCOL.md`, `WORKING_PRINCIPLES.md`, `STRING_QUARTET_PIPELINE_PLAN.md`, `IMPLEMENTATION_PROGRESS.md`

---

# Part III: Operations & Deployment

## III.1 — Server Architecture

**Production server:** Hetzner VPS at `5.161.233.35` (`justinwenloyang.com`)

| Component | Detail |
|-----------|--------|
| **OS** | Ubuntu (Hetzner cloud) |
| **User** | `deploy` (non-root, runs the app) |
| **Process manager** | PM2 (`sq1-server`) with systemd auto-restart |
| **Reverse proxy** | nginx (TLS termination, static caching) |
| **Node.js** | Express server (`scripts/performance_server.js`) |
| **Git** | Sparse clone at `/home/deploy/sq1/` |
| **Domain** | `justinwenloyang.com` (DNS → Hetzner IP) |

**Sparse checkout includes only production-needed files:**
- `scripts/`, `landing/`, `docs/`, `lilypond_code/`, `homepage/`
- `public/index.html`, `public/fonts/`, `public/pitchesSVGs/`
- `scores/2295-FinalScore-preVersioning.json`
- `package.json`, `package-lock.json`

## III.2 — Deploy Process

```bash
# 1. Edit locally, rebuild if needed
node scripts/build_performance_app.js

# 2. Commit and push
git add -A && git commit -m "description" && git push

# 3. One-liner deploy (pull + rebuild on server)
ssh -i C:\Users\jwloy\.ssh\id_ed25519 root@5.161.233.35 \
  "su - deploy -c 'cd /home/deploy/sq1 && git pull && node scripts/build_performance_app.js'"

# 4. If performance_server.js changed:
ssh -i C:\Users\jwloy\.ssh\id_ed25519 root@5.161.233.35 \
  "su - deploy -c 'pm2 restart sq1-server'"
```

The setup script `setup_server_clone.sh` automates initial server setup (sparse clone, npm install, build, PM2 start).

## III.3 — Routing

| URL | Content |
|-----|---------|
| `/` | Homepage — composer name, works list, social links |
| `/string-quartet-no1` | SQ1 landing page (name, instrument, pages, room, docs, print) |
| `/score` | SQ1 Performance Score app |
| `/docs/*` | Technical manual, notation instructions |
| `/print/*` | Print score PDFs |
| `/api/*` | Session API (JWT join, room management) |

## III.4 — Maintenance

- **PM2 auto-restart** — if the Node process crashes, PM2 restarts it automatically
- **Systemd service** — `pm2-deploy.service` ensures PM2 survives server reboot
- **Logs** — `pm2 logs sq1-server` for runtime output
- **SSL** — managed by nginx (Let's Encrypt or similar)
- **Git pull** — production always pulls from `main` branch

---

# Part IV: Future — New Piece Guide

## IV.1 — What's Reusable

The following infrastructure transfers directly to a new piece:

| Category | Files | Notes |
|----------|-------|-------|
| **Workshop engine** | `public/index.html`, `server.js`, `index.js` | The composition environment |
| **Build pipeline** | `scripts/build_performance_app.js`, all patch files | Transforms Workshop → Performance |
| **Production server** | `scripts/performance_server.js` | Multi-client sync, rooms, JWT |
| **Landing page** | `landing/` (template) | Customize title, instruments |
| **Homepage** | `homepage/` | Add new piece card |
| **LilyPond tooling** | `lilypond_code/*.ly` templates, `svg_assembly/`, `pitches/`, `modify_midi.js`, `state_tracker.js`, `crop_svg.js` | Full notation pipeline |
| **Fonts** | `public/fonts/` | Crimson Pro for notation text |
| **Pitch SVGs** | `public/pitchesSVGs/` | Glissando pitch display |
| **SVG graphics** | `SVG_graphics/` | Reusable graphic elements |
| **Curve presets** | `curve_library/` | Compositional shape templates |
| **GC presets** | `gc_library/` | Conductor gesture presets |
| **Documentation** | `docs/` | All 40 markdown docs |
| **Utility tools** | `tools/` | Standalone HTML tools |
| **Config** | `.gitignore`, `.gitattributes`, `LICENSE`, `package.json` | Project setup |

## IV.2 — What's Piece-Specific (Drop for New Piece)

| Category | Path(s) | Size |
|----------|---------|------|
| Score files | `scores/`, `scoresBackUp/` | ~29 GB |
| Audio renders | `public/audio_files/`, `StrQtrNo1-AudioRender-*/` | ~1.6 GB |
| MIDI files | `midi files/`, `midi_exports/` | varies |
| Reaper project | `Reaper/` | varies |
| Legacy/scratch | `Diagonistic/`, `JY_oldCode/`, `old_archived/`, `misc/` | ~4 MB |
| Motive library | `motive_library/` | 7.2 MB (test data) |
| AI conversation logs | `ai files/` | 1.3 MB |
| Root-level fonts | `fonts/` | duplicate of `public/fonts/` |
| Empty dirs | `svg_compositions/` | 0 |
| Runtime data | `data/` | session data |
| Generated LilyPond outputs | `lilypond_code/*.mid`, `*.svg`, `*.pdf` (root level) | varies |
| SQ1-specific tempo variants | `lilypond_code/tempo_variants/` | SQ1 specific |

## IV.3 — Creating a New Piece Repository

**Recommended approach:** Clone the repo, then surgically remove piece-specific files.

```bash
# 1. Clone
git clone https://github.com/elosine/string_quartet_no1-composer.git new-piece-name
cd new-piece-name

# 2. Remove piece-specific directories
rm -rf scores/ scoresBackUp/
rm -rf "public/audio_files/" "StrQtrNo1-AudioRender-"*
rm -rf "midi files/" midi_exports/
rm -rf Reaper/
rm -rf Diagonistic/ JY_oldCode/ old_archived/ misc/
rm -rf motive_library/ "ai files/" fonts/ svg_compositions/ data/
rm -rf lilypond_code/tempo_variants/

# 3. Remove generated LilyPond outputs (keep .ly and tooling subdirs)
find lilypond_code -maxdepth 1 -name "*.mid" -o -name "*.svg" -o -name "*.pdf" | xargs rm -f

# 4. Create a fresh score directory
mkdir scores

# 5. Update README, landing page title/instruments, homepage card

# 6. Initialize fresh git history (optional)
rm -rf .git
git init
git add -A
git commit -m "Initial: new piece from SQ1 infrastructure"
```

**Customize for instrumentation:**
- Update track count in Workshop HTML (search for `gTrack` references)
- Update `performance_server.js` room logic if needed
- Update landing page instrument picker
- Update MIDI channel mapping if different number of instruments

## IV.4 — Onboarding Checklist

For a new AI session on a new piece:

1. Read `docs/WORKING_PRINCIPLES.md` — session protocol
2. Read this journal (Part 0) — architecture overview
3. Read `docs/AI_SCORE_BUILDING_PROGRESS.md` → Session Startup Checklist
4. If doing LilyPond work: read `docs/LILYPOND_SETTINGS_REGISTRY.md`
5. If building new material: read `docs/MUSICAL_MATERIAL_WORKFLOW.md`
6. If doing performance pipeline work: read `docs/STRING_QUARTET_PIPELINE_PLAN.md` for the relevant phase

---

# Appendix A: Document Inventory

All 40 original documents in `docs/`, organized by category. Each is preserved as a separate file.

## Process & Methodology

| Document | Lines | Purpose |
|----------|-------|---------|
| `WORKING_PRINCIPLES.md` | 86 | Session-start rubric — distilled lessons from all phases |
| `WORKFLOW_METHODOLOGY.md` | 188 | AI-assisted score building patterns and lessons |
| `SESSION_START_AND_END_PROMPTS.md` | 71 | Quick reference for session triggers |
| `TESTING_PROTOCOL.md` | 215 | 15-test protocol for Performance Score verification |
| `KEYBOARD_SHORTCUTS.md` | 94 | All keyboard/mouse commands in the Workshop |
| `MISCELLANEOUS_NOTES.md` | 24 | PowerShell server management tips |
| `BULK_MOVE_OBJECTS.md` | — | Scripts for bulk-moving objects in score JSON |
| `ONEDRIVE_MIGRATION_GUIDE.md` | — | Notes on migrating the repo from OneDrive |

## AI Prompt Guides

| Document | Lines | Musical System |
|----------|-------|---------------|
| `AI_LILYPOND_PROMPT_GUIDE.md` | 225 | General LilyPond notation creation |
| `AI_GLISSANDO_PROMPT_GUIDE.md` | 216 | Long Tone Glissando |
| `AI_CRESCENDO_PROMPT_GUIDE.md` | 208 | Crescendo/Decrescendo |
| `AI_VIBRATO_PROMPT_GUIDE.md` | 229 | Vibrato Motive |
| `AI_BARTOK_PIZZ_PROMPT_GUIDE.md` | 224 | Bartók Pizzicato |
| `AI_PIZZ_TREMOLO_PROMPT_GUIDE.md` | 307 | Pizzicato Tremolo |
| `AI_PIZZ_TREM_GLISS_PROMPT_GUIDE.md` | 309 | Pizzicato Tremolo Glissando |

## System Architecture & Implementation

| Document | Lines | System |
|----------|-------|--------|
| `CURVE_SYSTEM_ARCHITECTURE.md` | 232 | Complete Curve System analysis |
| `LONG_TONE_IMPLEMENTATION.md` | 226 | Long Tone Glissando system |
| `VIBRATO_SYSTEM_IMPLEMENTATION.md` | 259 | Vibrato system |
| `MIDI_MUSIC_GENERATION.md` | 1187 | MIDI architecture, all systems, channel banks, tools |
| `MUSICAL_MATERIAL_WORKFLOW.md` | 231 | General musical material pipeline |
| `MUSICAL_MATERIAL_SYSTEM.md` | 102 | Musical Material catalog (MM naming/versioning) |
| `Bundle_Manager_Guide.md` | — | Bundle system guide |
| `CURVE_FUGUE_ALGORITHM_1.md` | — | Compositional algorithm notes |
| `Sequence_Generator_Guide.md` | — | Sequence generator tool guide |

## Notation & Workflow

| Document | Lines | Topic |
|----------|-------|-------|
| `LILYPOND_SETTINGS_REGISTRY.md` | 2150 | Single source of truth for all LilyPond settings |
| `NOTATION_FRAGMENT_WORKFLOW.md` | 822 | End-to-end notation fragment pipeline (10 steps) |
| `BARTOK_PIZZICATO_WORKFLOW.md` | 230 | Bartók Pizz generation workflow |
| `LONG_TONE_GLISSANDO_WORKFLOW.md` | — | Long Tone workflow |
| `PIZZICATO_TREMOLO_WORKFLOW.md` | — | Pizz Tremolo workflow |
| `PIZZICATO_TREMOLO_GLISSANDO_WORKFLOW.md` | — | Pizz Trem Glissando workflow |
| `LY_NAMING_CONVENTION.md` | — | LilyPond file naming convention |
| `Notation Fragment 005 Refinement.md` | — | Specific fragment refinement notes |
| `Notation_Research.md` | — | Notation research notes |

## Instrument-Specific Notation

| Document | Topic |
|----------|-------|
| `Violin_Notation_Guide.md` | Violin-specific notation guidance |
| `Viola_Notation_Guide.md` | Viola-specific notation guidance |
| `Cello_Notation_Guide.md` | Cello-specific notation guidance |

## Performance & Deployment

| Document | Lines | Topic |
|----------|-------|-------|
| `Performance_Instructions.md` | 60 | Performance interpretation guidance (GC system) |
| `AI_SCORE_BUILDING_PROGRESS.md` | 1131 | Session state, ASB numbering, all system statuses |

## Master References

| Document | Lines | Topic |
|----------|-------|-------|
| `STRING_QUARTET_PIPELINE_PLAN.md` | 5500+ | Complete pipeline plan — all phases, protocols, architecture |
| `IMPLEMENTATION_PROGRESS.md` | 3100+ | Phase-by-phase progress log with post-mortems |
