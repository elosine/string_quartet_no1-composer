// protocol.js — the whole vocabulary on the socket (DESIGN §3), with its
// authority rules (AR-10, 13). Every message is small; the network carries
// changes only, never frames (AR-45).
//
//   stand → server      hello(token)            → welcome(...)             anyone with a token
//   stand ↔ server      ping(t0)                → pong(t0, ts)             every stand — the clock samples
//   leader → all        state(tuple)            play · stop · jump · speed · again, one new tuple
//                                                 ensemble room: the leader or gatekeeper token;
//                                                 a sectional: any member (last wins)
//   leader → all        mode(ALONE/REHEARSAL/CONCERT)                      the leader or gatekeeper
//   leader → all        resync                  the tuple re-anchored; stands slew to it
//   stand → all         sectional.start/join/leave → rooms(list)           any player
//   stand → server      ready(video, calibrated) → roster (the leader's count)
//   stand ↔ server      marks.put / marks.get                              the owning token
//   remote → all        display.show(partIndex | null)                     the gatekeeper
//   gatekeeper → server parts.set / row.add / token.reissue / snapshot     the ensemble page
//   (admin → server     ensemble.create / parts.set / token.reissue / piece.register — HTTP, server.js)
//
// Request messages take an ACK callback ({ ok: true, ... } or { ok: false,
// error }); the server also emits `refused` so a stand without an ack still
// hears why. Broadcasts: welcome · state · mode · rooms · roster · display.
//
// Socket.IO rooms: 'ens:<id>' = every stand of the ensemble (mode, rooms,
// roster, display go here) · 'r:<id>:ensemble' = the standing room ·
// 'r:<id>:<sectional>' = one sectional (state goes to the room the sender is in).

const clock = require('./clock');

function attachProtocol(io, ctx) {
  const { registry, rooms, marks, limiters, log } = ctx;

  const ensKey = ensId => 'ens:' + ensId;
  const roomKey = (ensId, room) => 'r:' + ensId + ':' + room;

  function rosterOf(ensId) {
    const ens = registry.ensembles[ensId];
    const r = rooms.roster(ensId);
    const leaders = new Set(ens ? ens.rows.filter(x => x.leader).map(x => x.id) : []);
    r.members = r.members.map(m => Object.assign({}, m, { leader: leaders.has(m.rowId) }));
    r.mode = ens ? ens.mode : 'ALONE';
    return r;
  }
  const broadcastRoster = ensId => io.to(ensKey(ensId)).emit('roster', rosterOf(ensId));
  const broadcastRooms = ensId => io.to(ensKey(ensId)).emit('rooms', { list: rooms.roomsList(ensId) });

  function ipOf(socket) {
    const h = socket.handshake && socket.handshake.headers;
    if (ctx.trustProxy && h && h['x-forwarded-for']) return String(h['x-forwarded-for']).split(',')[0].trim();
    return (socket.handshake && socket.handshake.address) || 'unknown';
  }

  io.on('connection', socket => {
    const ip = ipOf(socket);
    let me = null;   // { ensId, token, role, rowId, part, partIndex, name }

    const ok = (cb, x) => { if (typeof cb === 'function') cb(Object.assign({ ok: true }, x || {})); };
    const refuse = (cb, what, error, message) => {
      const r = { ok: false, what, error, message: message || error };
      socket.emit('refused', r);
      if (typeof cb === 'function') cb(r);
    };

    const ensOf = () => (me ? registry.ensembles[me.ensId] : null);
    // The leader tick is read LIVE from the registry, so a tick given after
    // `hello` applies at once; the gatekeeper's remote is a leader device too
    // (DESIGN §6: both authoritative, last command wins).
    const isLeader = () => {
      const ens = ensOf();
      if (!ens) return false;
      if (me.role === 'gatekeeper') return true;
      // [sq1] a piece registered with everyoneLeads: every player moves the room (last command wins)
      const P = registry.pieces[ens.piece];
      if (P && P.everyoneLeads && me.role === 'player') return true;
      const row = ens.rows.find(r => r.id === me.rowId);
      return !!(row && row.leader);
    };
    const requireHello = (cb, what) => { if (!me) { refuse(cb, what, 'hello first', 'say hello with your link first'); return false; } return true; };

    // ---- hello → welcome -------------------------------------------------------
    socket.on('hello', (msg, cb) => {
      if (!limiters.hello.allow(ip)) return refuse(cb, 'hello', 'rate', 'too many attempts from this address; wait a minute');
      const token = msg && typeof msg.token === 'string' ? msg.token : '';
      const res = registry.resolveToken(token);
      if (!res) return refuse(cb, 'hello', 'unknown token', 'this link is not known here');
      if (res.revoked) return refuse(cb, 'hello', 'revoked', 'this link was replaced — ask your leader for a new link');
      if (me) leaveAll();
      const ens = res.ensemble;
      const P = registry.pieces[ens.piece];
      me = {
        ensId: ens.id, token, role: res.role,
        rowId: res.row ? res.row.id : null, part: res.row ? res.row.part : null,
        partIndex: res.row ? res.row.partIndex : null, name: res.row ? res.row.name : '',
      };
      rooms.join(ens.id, socket.id, me);
      socket.join(ensKey(ens.id));
      socket.join(roomKey(ens.id, 'ensemble'));
      if (!ens.tuple) { ens.tuple = rooms.stoppedTuple(0); registry.save(); }
      const welcome = {
        role: me.role, ensemble: registry.publicEnsemble(ens), piece: registry.publicPiece(P),
        part: me.part, partIndex: me.partIndex, rowId: me.rowId, name: me.name, leader: isLeader(),
        mode: ens.mode, roomState: ens.tuple, room: 'ensemble',
        rooms: rooms.roomsList(ens.id), roster: rosterOf(ens.id), letters: P ? P.letters : [],
        displayPart: ens.displayPart == null ? null : ens.displayPart,   // 9i: the display's zoom, as last chosen
        serverTime: clock.now(), spare: !!ctx.spare,
      };
      if (me.role === 'gatekeeper') welcome.rows = registry.gatekeeperView(ens, ctx.originOf(socket.handshake.headers)).rows;
      socket.emit('welcome', welcome);
      ok(cb, welcome);
      broadcastRoster(ens.id);
      log('hello ' + me.role + (me.part ? ' ' + me.part : '') + ' → ' + ens.name + ' (' + ens.mode + ')');
    });

    // ---- the clock samples ---------------------------------------------------------
    // Stamped as late as possible. The HTTP /api/time (server.js) is the same clock.
    socket.on('ping', (t0, cb) => {
      const reply = { t0, ts: clock.now() };
      if (typeof cb === 'function') cb(reply); else socket.emit('pong', reply);
    });

    // ---- state: the one transport tuple -------------------------------------------
    socket.on('state', (req, cb) => {
      if (!requireHello(cb, 'state')) return;
      const ens = ensOf();
      const m = rooms.memberOf(me.ensId, socket.id);
      if (!m) return refuse(cb, 'state', 'not in a room');
      if (m.room === 'ensemble') {
        if (!isLeader()) return refuse(cb, 'state', 'not the leader', 'only the leader moves the ensemble room');
        ens.tuple = rooms.makeTuple(ens.tuple, req || {}, ens.mode);
        registry.save();
        io.to(roomKey(ens.id, 'ensemble')).emit('state', ens.tuple);
        ok(cb, { roomState: ens.tuple, room: 'ensemble' });
      } else {
        const sec = rooms.sectionalOf(me.ensId, m.room);
        if (!sec) return refuse(cb, 'state', 'no such sectional');
        sec.tuple = rooms.makeTuple(sec.tuple, req || {}, ens.mode);
        io.to(roomKey(ens.id, sec.id)).emit('state', sec.tuple);
        ok(cb, { roomState: sec.tuple, room: sec.id });
      }
    });

    socket.on('resync', (_msg, cb) => {
      if (!requireHello(cb, 'resync')) return;
      const ens = ensOf();
      const m = rooms.memberOf(me.ensId, socket.id);
      if (!m) return refuse(cb, 'resync', 'not in a room');
      if (m.room === 'ensemble') {
        if (!isLeader()) return refuse(cb, 'resync', 'not the leader');
        ens.tuple = rooms.resyncTuple(ens.tuple || rooms.stoppedTuple(0));
        registry.save();
        io.to(roomKey(ens.id, 'ensemble')).emit('state', ens.tuple);
        ok(cb, { roomState: ens.tuple, room: 'ensemble' });
      } else {
        const sec = rooms.sectionalOf(me.ensId, m.room);
        if (!sec) return refuse(cb, 'resync', 'no such sectional');
        sec.tuple = rooms.resyncTuple(sec.tuple);
        io.to(roomKey(ens.id, sec.id)).emit('state', sec.tuple);
        ok(cb, { roomState: sec.tuple, room: sec.id });
      }
    });

    // ---- mode: the leader's three-way switch (AR-9) ----------------------------------
    socket.on('mode', (msg, cb) => {
      if (!requireHello(cb, 'mode')) return;
      if (!isLeader()) return refuse(cb, 'mode', 'not the leader', 'only the leader or the gatekeeper sets the mode');
      const mode = msg && typeof msg === 'object' ? msg.mode : msg;
      let ens;
      try { ens = registry.setMode(me.ensId, String(mode)); } catch (e) { return refuse(cb, 'mode', e.message); }
      if (ens.mode === 'CONCERT' && ens.tuple && ens.tuple.rate !== 1) {
        ens.tuple = Object.assign({}, ens.tuple, { rate: 1, seq: (ens.tuple.seq || 0) + 1 });   // locked at 100 (AR-34, 62)
        registry.save();
      }
      io.to(ensKey(ens.id)).emit('mode', { mode: ens.mode, roomState: ens.tuple, serverTime: clock.now() });
      ok(cb, { mode: ens.mode, roomState: ens.tuple });
      log('mode ' + ens.name + ' → ' + ens.mode);
    });

    // ---- sectionals (AR-13): live only, headless, gone when empty ----------------------
    socket.on('sectional.start', (_msg, cb) => {
      if (!requireHello(cb, 'sectional.start')) return;
      if (!limiters.sectional.allow(ip)) return refuse(cb, 'sectional.start', 'rate');
      if (me.role !== 'player') return refuse(cb, 'sectional.start', 'players only');
      const prev = rooms.memberOf(me.ensId, socket.id).room;
      let sec;
      try { sec = rooms.startSectional(me.ensId, socket.id); } catch (e) { return refuse(cb, 'sectional.start', e.message); }
      socket.leave(roomKey(me.ensId, prev));
      socket.join(roomKey(me.ensId, sec.id));
      broadcastRooms(me.ensId);
      broadcastRoster(me.ensId);
      ok(cb, { room: sec.id, roomState: sec.tuple });
    });

    socket.on('sectional.join', (msg, cb) => {
      if (!requireHello(cb, 'sectional.join')) return;
      if (me.role !== 'player') return refuse(cb, 'sectional.join', 'players only');
      const id = msg && (msg.id || msg.room);
      const prev = rooms.memberOf(me.ensId, socket.id).room;
      let sec;
      try { sec = rooms.joinSectional(me.ensId, socket.id, String(id)); } catch (e) { return refuse(cb, 'sectional.join', e.message); }
      if (prev !== sec.id) { socket.leave(roomKey(me.ensId, prev)); socket.join(roomKey(me.ensId, sec.id)); }
      broadcastRooms(me.ensId);
      broadcastRoster(me.ensId);
      ok(cb, { room: sec.id, roomState: sec.tuple });
    });

    socket.on('sectional.leave', (_msg, cb) => {
      if (!requireHello(cb, 'sectional.leave')) return;
      const prev = rooms.memberOf(me.ensId, socket.id).room;
      try { rooms.leaveSectional(me.ensId, socket.id); } catch (e) { return refuse(cb, 'sectional.leave', e.message); }
      if (prev !== 'ensemble') { socket.leave(roomKey(me.ensId, prev)); socket.join(roomKey(me.ensId, 'ensemble')); }
      broadcastRooms(me.ensId);
      broadcastRoster(me.ensId);
      const ens = ensOf();
      ok(cb, { room: 'ensemble', roomState: ens.tuple });
    });

    // ---- readiness (AR-14, 63): information, never a gate ---------------------------
    socket.on('ready', (msg, cb) => {
      if (!requireHello(cb, 'ready')) return;
      const m = rooms.memberOf(me.ensId, socket.id);
      if (m) m.ready = { video: !!(msg && msg.video), calibrated: !!(msg && msg.calibrated) };
      broadcastRoster(me.ensId);
      ok(cb, { ready: m ? m.ready : null });
    });

    // ---- marks: the owning token only (AR-4) ------------------------------------------
    socket.on('marks.put', (msg, cb) => {
      if (!requireHello(cb, 'marks.put')) return;
      try { ok(cb, marks.put(me.token, msg && msg.view, msg && msg.marks)); }
      catch (e) { refuse(cb, 'marks.put', e.message); }
    });
    socket.on('marks.get', (msg, cb) => {
      if (!requireHello(cb, 'marks.get')) return;
      const view = msg && msg.view;
      if (view && view !== 'part' && view !== 'score') return refuse(cb, 'marks.get', 'view must be part or score');
      ok(cb, view ? marks.get(me.token, view) : { marks: marks.get(me.token) });
    });

    // ---- the display's zoom, from the remote (AR-31, 32) ----------------------------------
    socket.on('display.show', (msg, cb) => {
      if (!requireHello(cb, 'display.show')) return;
      if (me.role !== 'gatekeeper') return refuse(cb, 'display.show', 'gatekeeper only');
      const partIndex = msg && msg.partIndex != null && Number.isFinite(Number(msg.partIndex)) ? Number(msg.partIndex) : null;
      // 9i: the choice is kept with the ensemble, so a display opened later (the
      // remote's "show the score here" loads a fresh page) starts on that part
      const ens = ensOf();
      ens.displayPart = partIndex; registry.save();
      io.to(ensKey(me.ensId)).emit('display', { partIndex });
      ok(cb, { partIndex });
    });

    // ---- the ensemble page (DESIGN §8): the gatekeeper's edits -------------------------
    const gatekeeperOnly = (cb, what) => { if (me.role !== 'gatekeeper') { refuse(cb, what, 'gatekeeper only'); return false; } return true; };
    socket.on('parts.set', (msg, cb) => {
      if (!requireHello(cb, 'parts.set') || !gatekeeperOnly(cb, 'parts.set')) return;
      try { registry.setParts(me.ensId, msg && msg.rows); } catch (e) { return refuse(cb, 'parts.set', e.message); }
      broadcastRoster(me.ensId);
      ok(cb, registry.gatekeeperView(ensOf(), ctx.originOf(socket.handshake.headers)));
    });
    socket.on('row.add', (msg, cb) => {
      if (!requireHello(cb, 'row.add') || !gatekeeperOnly(cb, 'row.add')) return;
      try { registry.addRow(me.ensId, msg && msg.partIndex); } catch (e) { return refuse(cb, 'row.add', e.message); }
      ok(cb, registry.gatekeeperView(ensOf(), ctx.originOf(socket.handshake.headers)));
    });
    socket.on('token.reissue', (msg, cb) => {
      if (!requireHello(cb, 'token.reissue') || !gatekeeperOnly(cb, 'token.reissue')) return;
      const which = msg && (msg.rowId || msg.which);
      try { registry.reissue(me.ensId, String(which)); } catch (e) { return refuse(cb, 'token.reissue', e.message); }
      // the old link dies at once: any stand holding it is told and dropped
      for (const [sid, m] of rooms.allSockets(me.ensId).map(sid => [sid, rooms.memberOf(me.ensId, sid)])) {
        if (m && m.rowId === which && sid !== socket.id) {
          const s = io.sockets.sockets.get(sid);
          if (s) { s.emit('refused', { ok: false, what: 'token', error: 'revoked', message: 'this link was replaced — ask your leader for a new link' }); s.disconnect(true); }
        }
      }
      if (which === 'gatekeeper') me.token = ensOf().gatekeeper;
      ok(cb, registry.gatekeeperView(ensOf(), ctx.originOf(socket.handshake.headers)));
    });
    socket.on('snapshot', (_msg, cb) => {
      if (!requireHello(cb, 'snapshot') || !gatekeeperOnly(cb, 'snapshot')) return;
      ok(cb, { snapshot: registry.snapshot() });
    });

    // ---- leaving -----------------------------------------------------------------------
    function leaveAll() {
      if (!me) return;
      const ensId = me.ensId;
      const { sectionalDied } = rooms.leave(ensId, socket.id);
      for (const r of socket.rooms) if (r !== socket.id) socket.leave(r);
      me = null;
      broadcastRoster(ensId);
      if (sectionalDied) broadcastRooms(ensId);
    }
    socket.on('disconnect', () => leaveAll());
  });
}

module.exports = { attachProtocol };
