# RUNNING LOG — String Quartet No. 1

The trail of the work, as it happened, moved out of the journal's §2 to keep it lean. Newest work at the foot.

## The November 2026 work — the 2026 JACK Studio Readings (2026-11-12 → 11-18; Claude Code, Fable 5.2)

Moved here verbatim from `docs/PROJECT_JOURNAL.md` §2 at the session end of 2026-11-18. Read top to bottom: the first-generation system's failure, the films, the stand, the composer's design rulings, the iPad stutter's trail, the proofing, the print parts, the dress run, the sending.

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

- **The two trial films are made (b801a595 pushed):** `stand/films/a/violin1.mp4` — 2048 × 1536, 60 fps, no
  B-frames, one reference frame, a key frame a second, 54.1 MB · `stand/films/b/violin1.mp4` — the same at
  1600 × 1200 (level 4.2), 44.1 MB. Both transcoded from the present film (`-preset medium -crf 17
  -x264-params ref=1:bframes=0:keyint=60:min-keyint=60:scenecut=0`); the frames' times are identical to the
  original's (checked at both ends: 0 … 511.983 s, 30,722 frames). A link with `?film=a` or `?film=b` plays
  them; the readout's last line names the version. ► HIS: the deploy line, the two folders copied to the box,
  then Violin I with `?film=a` and with `?film=b`, a photo of the readout after each.

- **THE TWO TRIAL FILMS ON THE iPAD (his two photos, 4:41 and 4:42, each about twenty seconds of [Play all]
  from the start; the readout's last line, which names the film, is cut off in both):**
  · `trim 18 max 5.0% at 0,0,8,14,15 off 217ms` · `gaps 44 max 146ms` · `steps 0` · `clock locked cal rtt 117
    pend 5.7 corr 1/15ms` · `motor −2000ppm nearest`
  · `trim 21 max 5.0% at 0,2,8,13,14 off 133ms` · `gaps 42 max 110ms` · `steps 0` · `clock holdover cal rtt 78
    trip 1` · `motor −2000ppm nearest`
  **THE LIGHTER FILMS DID NOT HELP — the "iPad cannot decode this film" reading is REFUTED** (the smaller,
  plainer film has as many late frames as the full one). **What the numbers DO show: the servo took hold of
  the film's speed about ONCE A SECOND (18 and 21 times in twenty seconds), each time at its full 5 %, and its
  learned drift is pinned at its limit.** It is hunting: speed up, let go, fall behind, speed up. And [Play
  alone], where nothing touches the speed, he called smooth. **The reading now (to be tested, not proved): on
  Safari every change of playbackRate costs the film a moment, so the servo's corrections make the lag they
  then correct** — the first-minute stutters AND "the lack of cursor smoothness throughout", which he saw
  playing in the room. (The servo is the tubas' test-kit one; here its trim limit was raised from 2 % to 5 %
  on 2026-11-15, which made each grab harder.)
  **THE TEST (building): IN THE ROOM THE FILM RUNS FREE** — started on the room's instant (the start is
  already within 6–21 ms on the iPad), then left at exactly the room's speed with no trimming; if it is ever
  more than 120 ms out for half a second, one aimed seek. Two tablets' clocks differ by tens of parts per
  million, so a free film stays within a frame or two over the whole piece. `?servo=on` on a link brings the
  old behaviour back for a comparison.

- **His eye on the two trial films:** "Both films have a fair bit of jitter, probably as bad as the original.
  And number B probably is a little less worse, but a few seconds in, it had a significant jitter. And they
  all sort of start out quite jittery … the cursor's quite jittery." His eye and the numbers agree: the
  encoding is not the cause.
- **BUILT (PC-verified only): IN THE ROOM THE FILM RUNS FREE.** No trimming of the speed at all (the servo
  stays in the page, behind `?servo=on`, for a comparison). A stand: (1) at the door, after the warm-up, times
  one more start — play() to the first new frame — and takes that as its own start time (`door` in the
  readout; a kept, learned value still wins); (2) calls play() that long before the room's instant; (3) in the
  first four seconds puts itself on the place by a seek if it is more than 40 ms out (twice at most, the aim
  learned from where the last seek landed); (4) after that is left alone unless 120 ms out for a quarter
  second. `film_check` 33 ok: two stands within 11.8 ms of the room at 100 %, 1.8 ms at 70 %, with no trim.
  The readout's new line: `free off <ms>`. **This is the test of the reading that the servo's speed changes
  are what the iPad stutters on. ► HIS: the deploy line, a reload, [Play all] from the start, his eye, a
  photo.** (The trial films `a/` and `b/` stay on the box, unused unless a link asks.)

- **4c4b2f4e ON THE iPAD BROKE TWO THINGS (his report + a photo, 2026-11-15):** "The first play played maybe a
  second or two and then stopped altogether. Continued playing in the other scores. Now I can't go back to the
  start. To the start doesn't work. Or it says −2, but the score shows something different." The photo:
  `film 14.49 want 0.00` (stopped, the film NOT on the place) · `start 14ms est 59 door 27` · `seeks 1` ·
  `free off −` · `trim 0` · `off 83ms` · `gaps 18 max 50ms` · `steps 0` · `plays 3`.
  **(1) [To the start] — a real bug, the AI's, FOUND AND FIXED.** A stopped film is not seeked twice to the same
  place (a guard against a browser that snaps a seek). Since "alone, the film is the clock" a stop lands
  exactly on the film's own time, so no seek happens at a stop, and the guard still held the LAST place asked
  for — the start. The guard is now cleared whenever the film plays. In `film_check` (new).
  **(2) The film froze in the room — cause NOT proved.** The readout shows one seek made while playing (the
  "settling" seek the AI added an hour before: a film over 40 ms out in its first four seconds) and only three
  play() calls, so the film was not paused: it sat frozen while "playing". The AI's reading: on the iPad that
  seek left the film stalled. **Changed:** the settling seek is REMOVED; a free film is put back only if over
  150 ms out, three seconds or more after a start, and at most once in five seconds · the start's measurement
  is taken 2.5 s in (was 0.3 s), so what a tablet loses in its first seconds is learned and the next start is
  called that much earlier (no correction at all on a device that has played once) · a film that makes no
  progress for 1.5 s while not paused is paused by the page, and the start logic plays it again (`rescues` in
  the readout).
  **What that photo also shows, the good part:** with the speed left alone there was NO trim, the worst gap
  between frames fell from 146–171 ms to 50 ms, and the film's worst distance from the room from 217–264 ms to
  83 ms. His eye on the smoothness is not yet given.
  `film_check` 34 ok.

- **212f761d ON THE iPAD (his photo, 5:06 PM, [Play all] from the start, stopped at second 21):**
  `start 13ms est 51 door 29` · `seeks 0` · `rescues 0` · `free off −` · `trim 0` · **`off 14ms`** ·
  `gaps 32 max 50ms at 2,3,3,3,3,4` · `steps 0` · `clock locked cal rtt 121 corr 0` · `plays 2 no error`.
  **It played on (no freeze), with no seek, no rescue and no trim, and the film's WORST distance from the room
  in over twenty seconds was 14 ms** (it was 133–264 ms with the servo). The frame-gap count (32, none over
  50 ms) is the soft number — Safari under-reports its frame callbacks — and had been 16–44 with gaps up to
  171 ms. **His eye on it: not yet said.** [To the start]: not yet reported.

- **✓ HIS EYE, 2026-11-15, on 212f761d from the box: "that all works and it is smoother."** The free-running
  film stays as the stand's way in the room. (The reading that the servo's speed changes were the iPad's
  jitter is now supported by his eye and by the numbers; the freeze did not return; [To the start] works.)
- **His question: can the parts now get out of sync more easily?** The AI's answer, given in chat: yes, a
  little, and bounded. Every [Play all] puts all stands on one instant (13 ms on the iPad). After that each
  film runs on its own device's clock — tens of parts in a million between devices, so some tens of
  milliseconds at most over the 8½ minutes; a stand that stalls stays behind by what it lost, up to 150 ms,
  where one seek puts it back. MEASURED: 14 ms worst in twenty seconds on the iPad. NOT measured: the whole
  piece. The readout's `off` on each device after a full [Play all] run is that measurement — for the dress run.

### THE PROOFING PASS — the other parts on the iPad (begun 2026-11-15/16). Findings collected; fixed together on his go.

1. **Violin II, at second 21 (he thinks also 22): NOTATION IS HIDDEN BEHIND A BADGE** (the flocking badges —
   the dark squares). His rule, for everywhere: **"all the notation should be drawn on top so you can see
   it."** This is in the film (the old app's drawing order), so the cure is in the filming — the badges' layer
   put under the notation's before the frames are taken — and the films re-made. Not yet looked at by the AI.

2. **Viola, at second 18: A GC WITH NO NOTATION** ("check orig"). **Checked in the score's data
   (`builds/performance/score.json`) and in the films — the cause FOUND:** the viola's GC is
   `GC_20260116_151414`, impact 18.30, track 3. Its notation is element 42,
   `SVG_20260217_194202_41_M4_vla_BartokPizz_Cs3_final` (a Bartók pizz, C♯3), at 18.24 — **stored on TRACK 2
   (Violin II) with `offsetYFraction` 1.03**, that is, one whole lane BELOW Violin II's own: in the FULL SCORE
   it is drawn in the viola's lane, where it belongs to the eye; in the PARTS it is filed under Violin II and
   drawn below that part's row, so it shows in NEITHER part. It is the only element in the score placed a lane
   away from its track (542 checked; the 13 others outside the usual band are the furioso / delicato words at
   the foot of a lane and one tall gliss, all in their own lanes), and the only GC of 248 without its notation
   on its own track. The cure, at filming: that element moved to track 3 at the same height in the lane
   (`offsetYFraction` 0.03). *Not checked:* whether the old app's viola part and the PRINTED viola part
   (`builds/print/Viola_*.pdf`) lack it too — they are made from the same parts view, so probably.
3. **Viola: the same as finding 1** — notation behind the badges.

**The proofing pass closed by him (2026-11-16): "I think that's mostly it."** Three findings, above. He asked to
DISCUSS the changes and the process first — and to assess the fixes WITHOUT a full re-run — and for an
assessment of bigger GCs: "if the impact point, the ball at the bottom, could be bigger, and the actual
traveling ball too … probably about twice as big as it is … I don't want to get too bogged down in graphic
details if it's not done easily."

**The AI's assessment, given in chat (nothing built):**
- **The GC, found in the old app's code:** the travelling ball is a canvas circle of radius 5 px
  (`ctx.arc(ballPos.x, ballPos.y, 5, …)`, two places — the full score's and the parts'); the impact dot is an
  SVG circle of radius 4 (`impactMarker.setAttribute('r', '4')`, two places). Twice as big = 10 and 8. EASY:
  two numbers, changed for the filming only. To look at in a clip: the bigger ball crossing notation at the
  impact, and its size in the full score's narrower lanes.
- **All three changes belong in the FILMING, not in the old app or the score file:** `film_part.js` serves the
  app to its own headless browser, so it can hand it (a) the score with element 42 moved to the viola,
  (b) the app with the two radii doubled, and (c) the badges' layer put under the notation's — each a named,
  recorded patch.
- **The process proposed:** the patches → SHORT CLIPS of the very spots (Violin II 19–24 s; Viola 16–22 s; a
  busy GC spot; the same in the full score), a minute each to film, sent to him in the chat → his eye → on his
  go, all five films re-made (about three hours unattended), cut, copied to the box with the `scp` line (no
  deploy; the stands see the new size and load afresh) → he spot-checks two or three places on the iPad.

**His go (2026-11-16): "ok that all is good"** — the process and the bigger GC in the clips. His question first:
what is left after the re-filming (answered in chat; the list is "WHAT IS LEFT TO DELIVERY" below).

**BUILT — the three patches, in `scripts/film_part.js` only** (the old app and the score file are not written):
`patchFile()` hands the tool's own browser (1) the score with element 42 on track 3 (`offsetYFraction` 0.03),
(2) the app with the GC's ball and impact dot scaled by `--gc` (2 → 10 px and 8 px; the tool refuses if it does
not find exactly two of each line); and before every frame (3) `__filmOrder()` keeps the notation's layer last
in each row's SVG. `--raw 1` films the app as it is. **Patch 3 goes further than the badges: the notation is
now above the line wedges and the curves too** — the AI's reading of "all the notation should be drawn on
top"; in the old app the wedges' bands and the curves' fills lay over it. For his eye.
**THE CLIPS, sent to him in the chat** (`builds/film/clip_*.mp4`, 2048 × 1536, 60 fps, `--gc 2`): Violin II
film 17–27 s · Viola film 15–25 s · the full score film 15–27 s. The AI looked at one frame of each: the
viola's Bartók pizz stands at its GC at 18.3; notation shows over the badges at 21–22 (black notes on the
badge's dark blue — on top, though not strongly); the doubled ball and dot read clearly in the parts and look
large in the full score's lanes, where a dot at the foot of a lane is half over the lane's edge.
**► WAITING ON HIS EYE:** the three fixes, the GC's size (parts / full score), notation over wedges and curves.

**His answers on the first clips (2026-11-16):** yes · look at the printed viola part · "try making the bouncing
ball the same size as the impact ball, the destination ball" · assess making the badges that cover notation
"a lighter transparency" — ideally only those, or all if that is easier, or not at all if it is a problem:
"They're not super crucial."
- **THE PRINTED VIOLA PART LACKS THE PIZZ — CONFIRMED** (`builds/print/Viola_6pages.pdf`, page 1, rendered with
  MiKTeX's `pdftoppm` and looked at): on the third row the GC stands at 18.3 with nothing at its foot. The
  same page shows the badge over the notation at 21. So the PRINT PARTS carry both faults (the 4- and 8-page
  viola parts are made the same way; not opened). Whether to re-make the print parts: HIS, not yet asked.
- **BUILT: the ball = the dot.** `--gc 2` now gives both a radius of 8 px (`--ball N` for another).
- **BUILT: patch 4, the lighter badge** (`--badge 0.3`). EASY, and his ideal was possible: before the frames,
  each badge is measured against the notation of its own row; one with a fifth or more of itself over a
  notation element is drawn at 30 % strength, the others stay solid (`--badgeAll 1` would lighten every one).
  In the Violin II clip two badges go pale (at 16 and at 21) and three stay solid.
- **The second clips, sent:** `clip2_violin2_15-25.mp4`, `clip2_viola_13-23.mp4`. The AI looked at one frame of
  the Violin II clip. **► WAITING ON HIS EYE:** the ball's size · the pale badges (30 %) · and, still, notation
  over the wedges and curves, and the GC's size in the full score.

**His answers on the second clips (2026-11-16):**
- **"Badges too light; could you try about 1/2 as much as current"** → the lightening halved: 65 % strength
  (was 30 %). `clip3_violin2_15-25.mp4` sent. ► his eye.
- **✓ "Yes, notation in front of everything is fine. That looks good."** — patch 3 as built (over the badges,
  the wedges and the curves) is APPROVED.
- **The print parts:** "I'm not sure the ensemble will use printed parts, but we should have those available
  for them … if we can, let's make the fixes to the print parts as well."
  **WHAT EXISTS (clarified for him):** twelve part PDFs from 2026-03-21 in `builds/print/` — Violin I,
  Violin II, Viola, Cello, each at 4, 6 and 8 rows a page — and `full_score.pdf`; the site's landing page
  links the four 6-row parts and the full score. They were made by `scripts/generate_print_pdf.js`, which
  prints the same parts view the films are taken from — hence the same two faults.
  **BUILT:** the patches moved into ONE file, `scripts/proof_patches.js` (the score's patch; the layer order
  and the lighter badge), used by `film_part.js` and by `generate_print_pdf.js --patched`. The print tool
  gained `--patched`, `--parts` (the twelve, no full score), `--badge F` (0.65) and `--out DIR`; without
  them it does exactly what it did in March, and `builds/print/` (the March files, D-Oct-2) is NOT touched.
  **The corrected parts go to `print/parts/`.** The viola's 6-row part made first and its page 1 looked at by
  the AI: the Bartók pizz stands at the GC at 18.3, notation is over everything, the two badges that cover
  notation are at 65 %. Sent to him. All twelve are being made.
  *Not changed in print:* the GC's impact dot (the bigger GC was asked for the moving ball on the stand) ·
  the PRINT FULL SCORE (`builds/print/full_score.pdf`, and the assembled 36-page score sent to JACK): it has
  the pizz, in the viola's lane, and still has badges over notation.

**✓ HIS GO, 2026-11-16: "badges good go ahead and refilm."** The films' look is settled: the viola's pizz in
the viola · notation on top of everything · the GC's ball and impact dot 8 px (`--gc 2`) · a badge that covers
notation at 65 % (`--badge 0.65`).
- **THE RE-FILMING IS RUNNING** (two unattended chains, started 2026-11-16; logs `builds/film/v2_<part>.log`):
  `node scripts/film_part.js --track N --pages 6 --from 0 --to 516 --fps 60 --scale 1.28 --gc 2 --badge 0.65
  --name v2_<part>`, then each film cut to 512 s straight into `stand/films/<part>.mp4` (the log ends with
  `cut-ok`). Chain A: Violin I, Violin II, Cello. Chain B: Viola, the full score. About ten frames a second
  each while two run together, so about fifty minutes a film: chain B about two hours, chain A about two and a
  half. The first films (2026-11-13) stay in `builds/film/` under their old names.
- **The full score is filmed with the doubled GC too** — the AI had flagged the dot as large in its narrow
  lanes; he saw that clip and did not object; `--gc 1` for track 0 would undo it.
- **✓ The twelve corrected print parts committed** (`print/parts/`, c19312d1). Not yet on the site.
- **► WHEN THE FILMS ARE DONE:** the AI looks at a few frames of each · HIS: the `scp` line (README step 3; the
  five films, and no deploy) and the owner line · his spot-check on the iPad.

- **✓ THE FIVE FILMS ARE RE-MADE (2026-11-16, done by about 18:30) and cut into `stand/films/`** — every log
  ends `cut-ok`; each film 2048 × 1536, 30,722 frames (512.03 s): violin1 51.6 MB · violin2 53.8 · viola 52.7 ·
  cello (its log: 48.83 MB before the cut) · fullscore 67.0. The AI looked at ONE row of each part at second
  18.35 (film 20.35): the viola has its Bartók pizz with the ball on the GC; the badges that cover notation
  are pale and the notation reads over them; the impact dots are the new size. The full score film and the
  rest of each part: not looked at. **► HIS: the two lines that copy the films to the box (README § The box,
  step 3) — no deploy — then a spot-check on the iPad.**

- **✓ THE RE-MADE FILMS ARE ON THE BOX AND SPOT-CHECKED — his word, 2026-11-18: "spot checks good."** The
  films are final. ► NEXT, in order: his read of the players' page (`/notation/app/help.html`) · the dress run
  (the whole piece, [Play all], three devices, the readout's `off` on each) · the links to the quartet. The
  reading is 2026-11-23.

- **THE PLAYERS' PAGE, EDITABLE IN PLACE (his ask, 2026-11-18: "Could you make the editable HTML? We did this
  for some of the papers"). BUILT + PC-verified:** `node stand/tools/edit_server.js` →
  `http://localhost:5303/help.html` — the page with the papers' Edit switch (`stand/tools/edit_switch.js`,
  ported whole from `paperSubmissions/papers/edit.js`: Edit → click any text and type → Save / Done; CTRL+B,
  CTRL+I, ENTER = a new line of the same kind, CTRL+S). **The switch is put into the page BY THAT SERVER as it
  serves it; `help.html` itself never holds it**, so the players' copy on the box has no Edit bar, and the
  stand's own server cannot write a page. The edit server listens on this computer only (127.0.0.1); each save
  keeps the file as it was in `stand/server/data/help-versions/` (gitignored); a save is refused if the file
  changed on disk since the page read it. The page's one HTML entity (`&middot;`) was written as its character
  so that a save with nothing changed leaves the file byte for byte the same. Tested in a headless browser on
  the real page, 8 of 8 (the bar, Edit, an unchanged save, a typed word saved into its own line only, the
  version kept, no trace of the switch in the file), and the file restored exactly. **► HIS: his edits; then
  the AI commits and he runs the deploy line, which is what puts the page before the players.**

- **HIS EDITS TO THE PLAYERS' PAGE, dictated 2026-11-18 and made by the AI in `help.html`:** the sections
  "Opening your part" and "Reading it" REMOVED whole · a "Notes" section at the foot, holding the two lines kept
  from "Opening your part" (Safari itself, not a Home Screen icon; the yellow battery icon) — its other two
  lines (open the link sideways; wait for the bar and press Open) are dropped · "Playing by yourself" → "Playing
  solo", its lines now: "Play alone moves only the score on your screen." · "**Move cursor.** While the score is
  stopped, tap anywhere to move the cursor to that spot." · the arrows (unchanged) · "… Touch it, type a number,
  press Go to jump to that time in the score." · "Toggle the 100% button to change the play speed of the
  score." "Playing together" and "If something looks wrong" untouched. Not yet deployed.
- **His second round, 2026-11-18:** "Playing together" is now two lines — "Press [Play all] to start the score
  for everyone. Anyone can start the group." · "While the group is playing, controls become inactive until
  stop." (the "every screen jumps" and the [Stop all] lines removed at his word — so the page no longer names
  [Stop all]) · the closing line about the performance instructions removed. He asked what [Tap to play] is
  (answered in chat) and to see the PDFs he may forward: `print/score/` opened for him — the 36-page score
  (cover, 3 pages of instructions, 32 of score) and `instructions.pdf`. What the record shows was sent: a LINK
  to that score, in the October application form, which he filled himself; nothing records the parts sent.

- **His third round on the players' page, 2026-11-18:** the line under the title is now just "Justin Yang"
  (his first and last name; "reading your part from the screen" removed). The browser tab's title follows it.

### THE PRINT PARTS, FOR SENDING (opened 2026-11-18 — in discussion, nothing built)

His ask: "we need to produce print versions of the part scores … put together a plan … you can include the
performance instructions with each of the parts as well, just the same one. Let's discuss briefly what page
size they should be at … in a part score that's distributed by PDF to iPads, what paper size and orientation
do they typically use?" What exists to build from: the twelve corrected part PDFs (`print/parts/`, pages of
1200 × 900 pt, landscape 4:3, at 4, 6 or 8 rows a page; the 6-row part is 11 pages) · `print/score/
instructions.pdf` (3 pages, the same 1200 × 900 pt landscape, the house dress) · the house cover generator
(`print/cover/`) · `scripts/build_print_score.js`, which assembled cover + instructions + score for the
October submission. The AI's answer on the page, given in chat (from general knowledge, not researched):
PDF parts read on tablets are mostly portrait Letter or A4 because they began as paper; a score laid out in
wide time rows wants landscape, and 4:3 landscape is an iPad's own shape. Recommended: keep landscape 4:3,
six rows a page as on the stand. ► his answer awaited.

**✓ THE PLAYERS' PAGE IS HIS (2026-11-18: "ok good. Let's use these instructions … push it to the actual
score").** Further rounds the same day: "Playing together" moved above "Playing solo" · "Anyone can start the
group. Press [Play all] to start the score." · "[Play alone] moves the score only on your screen." · "To move
the cursor: while the score is stopped, tap anywhere to move the cursor to that spot." (no bold). Committed and
pushed (d12b61ca). **► It reaches the players only when he runs the deploy line.**

**✓ THE PRINT PARTS, BUILT (his go the same message: "go ahead and make those print parts … with your specs").**
- **The specs (the AI's, accepted):** every page on the score's own sheet, landscape 4:3 (1200 × 900 pt); six
  rows a page, as on the stand.
- **`node scripts/build_print_parts.js`** (new) assembles each part from what existed: a COVER in the house
  style with the part's name under the title (`print/cover/make_cover.ps1`, words written to
  `print/parts/cover/<part>.json`; printed and checked the way `render_cover.js` does — one page, the sheet's
  size, the house face named in the PDF and each line within 3 % of the generator's measure) + THE PERFORMANCE
  INSTRUCTIONS (`print/score/instructions.pdf`, the same three sheets in each) + THE PART
  (`print/parts/<Part>_6pages.pdf`, the corrected ones).
- **The four files: `print/parts/assembled/String_Quartet_No_1-<Violin_I|Violin_II|Viola|Cello>-JYang.pdf`** —
  15 pages each (1 + 3 + 11), 1.7–1.8 MB. The AI looked at the viola's cover only ("String Quartet No. 1 /
  Viola / Justin Yang", centred). The viola part sent to him; the folder opened on the desktop.
- *Not in them:* the final barline (the October score has one, drawn into its assembled PDF only) · a bigger
  GC dot (print keeps the old size). *Not done:* putting them on the site; sending them.

- **A FAULT HE FOUND, 2026-11-18: "How do you get out of the instructions? No back button appeared."** The
  door's "How it works" opened the page in a NEW TAB, which has no way back. **FIXED:** the instructions now
  open OVER the door, in the same page, with a [Close] button top right; the part underneath is never left.
  In `film_check` (35 ok), and the shot looked at. Needs the deploy line, like the page's new words.

- **✓ THE PRINT PARTS — his word, 2026-11-18: "the parts are good too, the print parts."** The four assembled
  parts are final. **► NEXT, his order: the trial run (the dress run), then everything made ready for sending.**
  The dress run: three devices freshly reloaded, [Play all] from the start to the end, [Stop all], then the
  readout on each device (tap "connected") — the number after "off" on the `trim` line is that stand's worst
  distance from the room over the run.

- **THE DRESS RUN, 2026-11-18, about 10:05–10:16 — the iPad's readout after the WHOLE PIECE with [Play all]
  (his photo; Violin I, from the box, Safari):** `film 512.00 want 512.00` (it ran to the end) · `start −12ms
  est 63 door 44` · **`seeks 0` · `rescues 0`** · `free off 2ms` · `trim 0` · **`off 12ms`** · `gaps 437 max
  67ms` · `steps 0` · `clock locked cal rtt 48 corr 2/7ms relock 0 trip 1` · `plays 2 no error`.
  **THE iPAD'S FILM WAS NEVER MORE THAN 12 ms FROM THE ROOM IN EIGHT AND A HALF MINUTES, with no correction of
  any kind** — the answer to his question of 2026-11-15 whether free-running parts drift apart. (The `gaps`
  count is the soft number, Safari under-reporting its frame callbacks; none over 67 ms.) **A second device's readout (his photo; a desktop browser — which of the laptop or the desktop he did not
  say):** `film 512.00 want 512.00` · `seeks 0 rescues 0` · `trim 0` · **`off 21ms`** · `gaps 0` · `steps 0` ·
  `clock locked cal rtt 38 corr 3/9ms relock 0 trip 0` · `est 1 door 14` (its start was not measured: `start −`).
  So two devices ran the whole piece 12 ms and 21 ms from the room at worst — at most about 33 ms from each
  other — with no seek and no rescue. **The third device (his photo, a desktop browser):** `film 511.99 want 512.00` · `seeks 0 rescues 0` ·
  `trim 0` · **`off 37ms`** · `gaps 0` · `steps 0` · `clock locked cal rtt 50 corr 0/0ms`.
  **✓ THE DRESS RUN'S NUMBERS: all three devices played the whole piece to the end from the box, with no seek,
  no rescue and no trim; their worst distances from the room were 12, 21 and 37 ms.** His eye on the run: not
  yet said in words.
  *Noticed by the AI, to settle before the links go out:* the room now sits STOPPED AT THE END (512 s), and a
  stand opened fresh lands where the room last stopped — so the quartet's first open would show the last
  page. The room must be put back to the start (or the quartet given a fresh ensemble of their own).

### FOR SENDING (2026-11-18)

- **How he sends (his words):** he drafts the email himself · "probably just links, not QR codes" · "the 5 links
  to the actual iPad part, and then the 5 links to the scores" · to the viola player, "who also manages the
  tech", who forwards them · **he sends it to himself first and tests every link.**
- **BUILT for it:**
  · THE FIVE SCORE PDFs ARE NOW LINKS ON THE STAND: `stand/notation/print/` holds the four assembled parts and
    the 36-page score (copies of `print/parts/assembled/*.pdf` and `print/score/String_Quartet_No_1-JYang.pdf`),
    served at `/notation/print/<file>`; the server now names `.pdf` as `application/pdf`, so a browser shows it.
  · A STAND OPENED FRESH WHILE THE ROOM HAS LONG STOOD STILL OPENS AT THE START (the room stopped more than
    30 minutes ago, by the server's clock) — it used to land wherever the room last stopped, which after the
    dress run is the end. Sooner than that a fresh stand still joins the room's place (a tablet reloaded in a
    rehearsal). `film_check` 37 ok (both cases, the long one by `?idle=1`). No room reset is needed.
- **► HIS: the deploy line; then the ten links tested from his own email.**
- *Known, told him:* the 36-page score is October's — it has the viola's pizz, in the viola's lane, and its
  badges still lie over notation; the four parts are the corrected ones.

### WHAT IS LEFT TO DELIVERY (as told him 2026-11-16)

After his yes to the clips: all five films re-made (about three hours unattended), cut, copied to the box (his
one `scp` line) → his spot-check on the iPad → the players' page read by him (`help.html`) → the dress run (the
whole piece with [Play all] on three devices; the readout's `off` on each) → the links and the page to the
quartet. Beside it: the printed viola part checked for the pizz at 18 · the two trial films removed from the
box. For afterwards, as he set them aside: the Home Screen icon · a backup server on the laptop · the desktop's
stutter · the site's landing page and the old Technical Manual.
