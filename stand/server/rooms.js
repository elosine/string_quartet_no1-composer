// rooms.js — the live rooms (DESIGN §2, §3, §6; AR-9, 13, 14, 15).
//
// Per ensemble: the STANDING ROOM (one, durable — its tuple and mode live in the
// registry) and SECTIONALS (live only: a member set and a tuple; gone when
// empty; nothing stored — AR-13). A stand is in exactly one room at a time
// (AR-15): the standing room on `hello`, a sectional after `sectional.start` or
// `.join`, back on `.leave`. Every stand of the ensemble, whichever room it is
// in, hears the ensemble's `mode` — that is how a stand idling under ALONE joins
// REHEARSAL by itself the moment the leader flips (AR-16; the 9f fold).
//
// REHEARSAL falls back to ALONE when the standing room has been empty for 30
// minutes (DESIGN §6's design-time answer to REQUIREMENTS §L): a leader who
// forgets costs nothing. The timer is `idleMs`, settable for the tests.

const clock = require('./clock');

const SPEEDS = [0.5, 0.7, 0.85, 1];
const LEAD_MS = 1500;   // PLAY: the anchor 1–2 s ahead, so every stand has it before T (AR-44)

function makeRooms(registry, opts) {
  const idleMs = (opts && opts.idleMs) || 30 * 60 * 1000;
  const onModeFallback = (opts && opts.onModeFallback) || (() => {});
  const live = new Map();   // ensembleId -> { members: Map<socketId, member>, sectionals: Map<id, sectional>, idleTimer, nextSectional }

  function liveOf(ensId) {
    let L = live.get(ensId);
    if (!L) { L = { members: new Map(), sectionals: new Map(), idleTimer: null, nextSectional: 1 }; live.set(ensId, L); }
    return L;
  }

  // ---- membership -------------------------------------------------------------
  function join(ensId, socketId, member) {
    const L = liveOf(ensId);
    member.room = 'ensemble';
    member.ready = member.ready || { video: false, calibrated: false };
    L.members.set(socketId, member);
    if (L.idleTimer) { clearTimeout(L.idleTimer); L.idleTimer = null; }
    return L;
  }

  function leave(ensId, socketId) {
    const L = live.get(ensId);
    if (!L) return { sectionalDied: null };
    const m = L.members.get(socketId);
    let sectionalDied = null;
    if (m && m.room !== 'ensemble') sectionalDied = dropFromSectional(L, m, socketId);
    L.members.delete(socketId);
    if (L.members.size === 0) armIdle(ensId, L);
    return { sectionalDied };
  }

  function armIdle(ensId, L) {
    if (L.idleTimer) clearTimeout(L.idleTimer);
    L.idleTimer = setTimeout(() => {
      L.idleTimer = null;
      const ens = registry.ensembles[ensId];
      if (ens && ens.mode === 'REHEARSAL' && L.members.size === 0) {
        ens.mode = 'ALONE';
        registry.save();
        onModeFallback(ensId);
      }
    }, idleMs);
    if (L.idleTimer.unref) L.idleTimer.unref();
  }

  // ---- sectionals ---------------------------------------------------------------
  function labelOf(L, sec) {
    const names = [];
    for (const sid of sec.members) { const m = L.members.get(sid); if (m) names.push(m.part); }
    names.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
    return names.join(' · ') || 'empty';
  }

  function dropFromSectional(L, m, socketId) {
    const sec = L.sectionals.get(m.room);
    m.room = 'ensemble';
    if (!sec) return null;
    sec.members.delete(socketId);
    if (sec.members.size === 0) { L.sectionals.delete(sec.id); return sec.id; }
    return null;
  }

  function startSectional(ensId, socketId) {
    const L = liveOf(ensId);
    const m = L.members.get(socketId);
    if (!m) throw new Error('not in the ensemble');
    if (m.room !== 'ensemble') dropFromSectional(L, m, socketId);
    const id = 's' + (L.nextSectional++);
    const sec = { id, members: new Set([socketId]), tuple: stoppedTuple(0) };
    L.sectionals.set(id, sec);
    m.room = id;
    return sec;
  }

  function joinSectional(ensId, socketId, id) {
    const L = liveOf(ensId);
    const m = L.members.get(socketId);
    const sec = L.sectionals.get(id);
    if (!m) throw new Error('not in the ensemble');
    if (!sec) throw new Error('no such sectional');
    if (m.room === id) return sec;
    if (m.room !== 'ensemble') dropFromSectional(L, m, socketId);
    sec.members.add(socketId);
    m.room = id;
    return sec;
  }

  function leaveSectional(ensId, socketId) {
    const L = liveOf(ensId);
    const m = L.members.get(socketId);
    if (!m) throw new Error('not in the ensemble');
    if (m.room === 'ensemble') return null;
    return dropFromSectional(L, m, socketId);
  }

  function roomsList(ensId) {
    const L = liveOf(ensId);
    const out = [];
    for (const sec of L.sectionals.values()) {
      out.push({ id: sec.id, label: labelOf(L, sec), members: [...sec.members].map(sid => memberPublic(L.members.get(sid))).filter(Boolean), playing: !!sec.tuple.playing });
    }
    return out;
  }

  function memberPublic(m) {
    if (!m) return null;
    return { rowId: m.rowId, part: m.part, partIndex: m.partIndex, name: m.name, role: m.role, room: m.room, ready: m.ready };
  }

  function roster(ensId) {
    const L = liveOf(ensId);
    const members = [...L.members.values()].map(memberPublic);
    const players = members.filter(m => m.role === 'player');
    const ready = players.filter(m => m.ready && m.ready.video && m.ready.calibrated).length;
    return { members, players: players.length, ready };
  }

  function memberOf(ensId, socketId) {
    const L = live.get(ensId);
    return L ? L.members.get(socketId) : undefined;
  }

  function socketsIn(ensId, room) {
    const L = liveOf(ensId);
    if (room === 'ensemble') return [...L.members.keys()].filter(sid => L.members.get(sid).room === 'ensemble');
    const sec = L.sectionals.get(room);
    return sec ? [...sec.members] : [];
  }

  function allSockets(ensId) {
    const L = liveOf(ensId);
    return [...L.members.keys()];
  }

  function sectionalOf(ensId, id) {
    const L = liveOf(ensId);
    return L.sectionals.get(id);
  }

  // ---- the tuple ----------------------------------------------------------------
  // (anchorServerTime, anchorScoreTime, rate, playing) — the only transport state
  // (DESIGN §5). Every command is a new tuple; the server fills the anchor when
  // the sender leaves it out (PLAY: 1.5 s ahead; a stop or jump: now).
  function stoppedTuple(scoreTime) {
    return { anchorServerTime: clock.now(), anchorScoreTime: scoreTime, rate: 1, playing: false, seq: 0 };
  }

  function positionAt(tuple, serverTime) {
    if (!tuple) return 0;
    if (!tuple.playing) return tuple.anchorScoreTime;
    // before the anchor (PLAY's 1.5 s lead) the music has not moved yet
    return tuple.anchorScoreTime + Math.max(0, serverTime - tuple.anchorServerTime) / 1000 * tuple.rate;
  }

  function makeTuple(prev, req, mode) {
    const now = clock.now();
    const playing = !!req.playing;
    let rate = Number(req.rate);
    if (!SPEEDS.includes(rate)) rate = prev ? prev.rate : 1;
    if (mode === 'CONCERT') rate = 1;                       // locked at 100 (AR-34, 62)
    let anchorScoreTime = Number(req.anchorScoreTime);
    if (!Number.isFinite(anchorScoreTime)) anchorScoreTime = prev ? positionAt(prev, now) : 0;
    let anchorServerTime = Number(req.anchorServerTime);
    if (!Number.isFinite(anchorServerTime)) anchorServerTime = playing ? now + LEAD_MS : now;
    const t = { anchorServerTime, anchorScoreTime, rate, playing, seq: ((prev && prev.seq) || 0) + 1 };
    // [sq1] who moved the room (a part's name), shown in every stand's band
    if (typeof req.by === 'string' && req.by) t.by = req.by.slice(0, 40);
    return t;
  }

  // RESYNC (AR-46): the same motion with a fresh anchor; stands slew to it.
  function resyncTuple(prev) {
    const now = clock.now();
    const pos = positionAt(prev, now);
    return { anchorServerTime: now, anchorScoreTime: pos, rate: prev.rate, playing: prev.playing, seq: (prev.seq || 0) + 1, resync: true };
  }

  return {
    join, leave, startSectional, joinSectional, leaveSectional, roomsList, roster, memberOf,
    socketsIn, allSockets, sectionalOf, stoppedTuple, makeTuple, resyncTuple, positionAt,
    SPEEDS, LEAD_MS, idleMs,
  };
}

module.exports = { makeRooms };
