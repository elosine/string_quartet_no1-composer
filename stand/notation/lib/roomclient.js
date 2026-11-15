// roomclient.js — THE STAND'S ROOM CLIENT (PLAN 9h-2; DESIGN §3–§6; AR-3, 11,
// 12, 41, 43, 44, 45).
//
// One socket to the stand server, one clock, one tuple:
//   · hello(token) → welcome: who I am (part, piece, mode, the room's tuple)
//   · ping → pong: the clock samples, fed to the kit's floor clock (syncclock.js,
//     AS IS — AR-41) — six quick ones to lock, then one every 2 s in a room,
//     one every 10 s alone; calibration tried every 30 s until it holds
//   · state / mode: the room's tuple and mode, as they change
//   · serverNow(): room time on this device = the floor clock's reading; before
//     the first lock, the welcome's own stamp (AR-63: calibration is margin, not
//     a precondition)
//   · transport: the tuple READ as the notation engine's transport interface
//     (now · nowAt · isPlaying; play/pause/seek are no-ops — the room moves, not
//     the stand) — the stand swaps it in while the room plays
//   · persistence across sleeps and reloads (AR-43): the clock's model and its
//     trusted history go to the local store; on return they are restored and
//     RE-VERIFIED against five fresh samples before they are trusted
//   · the welcome is cached per token, so a stand opened offline still knows its
//     part (the offline floor, AR-56 — the rest is 9m)
//
//   makeRoomClient({ token, io, SyncClock, posture?, localNow?, on: { welcome,
//     state, mode, roster, rooms, refused, status, display } })
//     -> { connect, serverNow, transport, send, setMode, resync, ready, status,
//          cachedWelcome, positionAt }
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NotationRoom = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  const SPEEDS = [0.5, 0.7, 0.85, 1];
  const FAST_MS = 300, ROOM_MS = 2000, ALONE_MS = 10000, CAL_MS = 30000, CAL_SPAN_MS = 35000;
  const VERIFY_MS = 50;         // a restored clock must agree with fresh samples to this
  const STORE_MAX_AGE_MS = 12 * 3600 * 1000;

  // the one formula (DESIGN §5): before the anchor the music has not moved yet
  function positionAt(tuple, serverMs) {
    if (!tuple) return 0;
    if (!tuple.playing || serverMs == null) return tuple.anchorScoreTime;
    return tuple.anchorScoreTime + Math.max(0, serverMs - tuple.anchorServerTime) / 1000 * tuple.rate;
  }

  function makeRoomClient(opts) {
    const o = opts || {};
    const L = () => (o.localNow ? o.localNow() : performance.now());
    const on = o.on || {};
    const emit = (k, x) => { if (typeof on[k] === 'function') { try { on[k](x); } catch (e) { console.error(e); } } };
    const store = (typeof localStorage !== 'undefined') ? localStorage : null;
    const host = (typeof location !== 'undefined' && location.host) || 'local';
    const KEY_CLOCK = 'room:clock:' + host, KEY_WELCOME = 'room:welcome:' + o.token;

    const st = { online: false, welcome: null, refused: null, mode: 'ALONE', room: 'ensemble', tuple: null,
      roster: null, rooms: null, crude: null, restored: false, verify: null, readySent: null };
    let socket = null, clock = null, pingTimer = null, calTimer = null, fastLeft = 0, lastSave = 0;
    const preLock = [];

    // ---- the clock ----------------------------------------------------------------
    function serverNow(Lx) {
      const l = Lx == null ? L() : Lx;
      if (clock && clock.state !== 'unlocked') return clock.now(l);
      if (st.crude != null) return l + st.crude;
      return null;
    }
    function save() {
      if (!store || !clock || clock.state === 'unlocked') return;
      const now = L();
      if (now - lastSave < 10000) return;
      lastSave = now;
      try {
        store.setItem(KEY_CLOCK, JSON.stringify({
          at: Date.now(), d0: Date.now() - now,
          theta0: clock.theta0, L0: clock.L0, rho: clock.rho, calibrated: clock.calibrated,
          H: clock.H.slice(-80), rtts: clock.rtts.slice(-40), rttMins: clock.rttMins.slice(-40), devs: clock.devs.slice(-40),
        }));
      } catch (e) { /* the store is a convenience */ }
    }
    // AR-43: the device clock ran through the sleep; the old samples and the new
    // fit one line once shifted onto this page's timebase (wall clock as the bridge)
    function restore() {
      if (!store || !clock) return false;
      let s = null;
      try { s = JSON.parse(store.getItem(KEY_CLOCK) || 'null'); } catch (e) { s = null; }
      if (!s || !Array.isArray(s.H) || s.H.length < 3 || Date.now() - s.at > STORE_MAX_AGE_MS) return false;
      const shift = s.d0 - (Date.now() - L());    // old local ms -> new local ms
      try {
        clock.H = s.H.map(h => Object.assign({}, h, { mid: h.mid + shift, off: h.off - shift }));
        clock.rtts = s.rtts || []; clock.rttMins = s.rttMins || []; clock.devs = s.devs || [];
        clock.theta0 = s.theta0 - shift; clock.L0 = s.L0 + shift; clock.rho = s.rho || 0; clock.calibrated = !!s.calibrated;
        clock.pending = 0; clock.pendingAt = L(); clock.state = 'locked';
        st.restored = true; st.verify = [];
        return true;
      } catch (e) { st.restored = false; return false; }
    }
    function onSample(x) {
      if (!clock) return;
      if (st.verify) {
        // a restored clock: five fresh samples decide whether it still holds
        st.verify.push(x);
        if (st.verify.length < 5) return;
        const best = st.verify.slice().sort((a, b) => (a.Lr - a.Ls) - (b.Lr - b.Ls))[0];
        const fresh = best.S - (best.Ls + best.Lr) / 2, model = clock.applied(best.Lr);
        const fresh5 = st.verify.slice();
        st.verify = null;
        if (Math.abs(fresh - model) > VERIFY_MS) {
          clock.lock(fresh5); st.restored = false;        // the store was stale: lock fresh
        } else for (const s of fresh5) clock.ingest(s);     // it holds: carry on
        afterSample();
        return;
      }
      if (clock.state === 'unlocked') {
        preLock.push(x);
        if (preLock.length >= 5) { clock.lock(preLock.splice(0)); afterSample(); }
        return;
      }
      clock.ingest(x);
      afterSample();
    }
    function afterSample() {
      save();
      readiness();
      emit('status', status());
    }
    function ping() {
      if (!socket || !socket.connected) return;
      const Ls = L();
      socket.emit('ping', Ls, reply => { if (reply && typeof reply.ts === 'number') onSample({ Ls, Lr: L(), S: reply.ts }); });
    }
    function schedule() {
      clearTimeout(pingTimer);
      const ms = fastLeft > 0 ? FAST_MS : (st.mode === 'ALONE' ? ALONE_MS : ROOM_MS);
      pingTimer = setTimeout(() => { if (fastLeft > 0) fastLeft--; ping(); schedule(); }, ms);
    }
    function stopPings() { clearTimeout(pingTimer); pingTimer = null; }
    function tryCalibrate() {
      if (clock && clock.state !== 'unlocked' && !clock.calibrated) {
        const r = clock.calibrate(L(), CAL_SPAN_MS);
        if (r && !r.refused) { lastSave = 0; save(); readiness(); emit('status', status()); }
      }
    }
    // the dot's truth, told to the leader (DESIGN §3: ready(video, calibrated))
    function readiness() {
      const now = { video: false, calibrated: !!(clock && clock.calibrated), locked: !!(clock && clock.state !== 'unlocked') };
      const key = JSON.stringify(now);
      if (key === st.readySent || !socket || !socket.connected || !st.welcome) return;
      st.readySent = key;
      socket.emit('ready', { video: now.video, calibrated: now.calibrated });
    }

    // ---- the socket --------------------------------------------------------------
    function hello() {
      const Ls = L();
      socket.emit('hello', { token: o.token }, a => {
        if (!a || !a.ok) { st.refused = a || { ok: false, error: 'no answer' }; emit('refused', st.refused); return; }
        const Lr = L();
        st.welcome = a; st.refused = null; st.mode = a.mode; st.tuple = a.roomState; st.room = a.room || 'ensemble';
        st.roster = a.roster; st.rooms = a.rooms;
        if (typeof a.serverTime === 'number') st.crude = a.serverTime - (Ls + Lr) / 2;
        if (store) { try { store.setItem(KEY_WELCOME, JSON.stringify({ at: Date.now(), welcome: cacheable(a) })); } catch (e) { /* */ } }
        st.readySent = null;
        fastLeft = 6; schedule();
        emit('welcome', a);
        readiness();
      });
    }
    const cacheable = a => ({ role: a.role, piece: a.piece, part: a.part, partIndex: a.partIndex, rowId: a.rowId, name: a.name,
      mode: a.mode, letters: a.letters, ensemble: a.ensemble ? { id: a.ensemble.id, name: a.ensemble.name } : null });
    function cachedWelcome() {
      if (!store) return null;
      try { const c = JSON.parse(store.getItem(KEY_WELCOME) || 'null'); return c && c.welcome ? c.welcome : null; } catch (e) { return null; }
    }
    function connect() {
      if (!o.io) throw new Error('no socket.io client');
      if (!o.SyncClock) throw new Error('no SyncClock');
      clock = new o.SyncClock({ posture: o.posture || 'rehearsal' });
      restore();
      socket = o.io(o.url || undefined, { transports: ['websocket'], reconnectionDelayMax: 5000 });
      socket.on('connect', () => { st.online = true; hello(); emit('status', status()); });
      socket.on('disconnect', () => { st.online = false; stopPings(); emit('status', status()); });
      socket.on('state', t => { st.tuple = t; emit('state', t); });
      socket.on('mode', m => { st.mode = m.mode; if (m.roomState) st.tuple = m.roomState; fastLeft = Math.max(fastLeft, 2); schedule(); emit('mode', m); });
      socket.on('roster', r => { st.roster = r; emit('roster', r); });
      socket.on('rooms', r => { st.rooms = r && r.list; emit('rooms', r); });
      socket.on('display', d => emit('display', d));
      socket.on('refused', r => { if (r && (r.what === 'token' || r.what === 'hello')) { st.refused = r; emit('refused', r); } });
      clearInterval(calTimer); calTimer = setInterval(tryCalibrate, CAL_MS);
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') { fastLeft = Math.max(fastLeft, 3); if (socket && socket.connected) schedule(); }
      });
      return socket;
    }
    const call = (ev, msg) => new Promise(res => { if (!socket || !socket.connected) return res({ ok: false, error: 'offline' }); socket.emit(ev, msg, res); });

    // ---- the tuple as a transport (DESIGN §5: the live reader) ----------------------
    const transport = {
      now: () => positionAt(st.tuple, serverNow()),
      nowAt: ts => positionAt(st.tuple, serverNow(ts)),
      isPlaying: () => !!(st.tuple && st.tuple.playing),
      play() { }, pause() { }, seek() { }, attachAudio() { }, detachAudio() { }, setOffset() { },
    };

    function status() {
      const l = L(), sn = serverNow(l);
      return {
        online: st.online, mode: st.mode, room: st.room, tuple: st.tuple, position: positionAt(st.tuple, sn),
        serverNow: sn, crudeOffsetMs: st.crude, restored: st.restored, verifying: !!st.verify,
        locked: !!(clock && clock.state !== 'unlocked'), calibrated: !!(clock && clock.calibrated),
        clock: clock ? clock.status(l) : null, refused: st.refused, role: st.welcome ? st.welcome.role : null,
      };
    }

    return {
      connect, serverNow, transport, status, cachedWelcome, positionAt, SPEEDS,
      send: req => call('state', req), setMode: mode => call('mode', { mode }), resync: () => call('resync', {}),
      ready: x => call('ready', x), get socket() { return socket; }, get welcome() { return st.welcome; }, get tuple() { return st.tuple; }, get mode() { return st.mode; },
    };
  }

  return { makeRoomClient, positionAt, SPEEDS };
});
