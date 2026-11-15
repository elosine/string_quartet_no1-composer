// servo.js — THE FRAME SERVO (B1, docs/ENGINE_BRIEF.md §2 "C's sync risk &
// backstops"): the concert stand's video is never trusted to keep its own time.
// Every presented frame (requestVideoFrameCallback) is compared with where the
// piece clock says the video should be at that frame's display instant, and
// playbackRate is adjusted — never seeked (a seek hitches) — to close the gap.
//
// THE QUANTIZATION LAW (found while building the kit, day 42): a display shows
// whole frames at vsync instants, so the error a stand can SHOW is quantized:
// err = (PTS of the shown frame) − (piece time at that vsync) takes values one
// frame apart. Consequences, each one met in the Node battery first:
//   1. the best a video stand can SHOW is |err| ≤ half a frame (8.3 ms at 60
//      fps); a servo aiming tighter on `err` HUNTS between two frames.
//   2. a rate change is realized on screen as ONE repeated (or skipped) frame
//      per frame-duration of correction; gentleness only spreads it out.
//   3. a servo that stops AT a frame boundary is pushed back over it by any
//      steady drift — it pays frame events in bursts (measured: 73/min at
//      300 ppm against a floor of ~1).
//   4. when the piece clock runs faster or slower than the display refreshes,
//      the display MUST skip or repeat now and then; a servo on `err` sees each
//      of those as an error and undoes it — fighting the display.
// THE DESIGN, by what each part can know:
//   feed-forward  the piece clock's rate against the local clock is KNOWN (the
//                 SyncClock's calibrated rate and slews) — targetRate, never guessed
//   FLL           the player's own drift against the LOCAL clock, learned from
//                 (media clock − ∫commanded rate); nothing the piece clock does
//                 can disturb it
//   PLL           with a continuous media clock (video.currentTime) it steers
//                 the continuous LEAD (media − piece) to the centre of the frame
//                 band — so no boundary is ever sat on and inherent skips are
//                 left alone; without one, it falls back to the quantized error,
//                 outside the quantum only, following through past the boundary
// Pure: no DOM, no clock reads — the browser feeds it rVFC metadata, the Node
// battery (testkit/test_servo.js) feeds it a simulated player and display.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.TK = root.TK || {}; root.TK.Servo = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULTS = {
    fps: 60,
    // continuous-lead PLL
    leadEngageMs: 3, leadReleaseMs: 1, nearestDetectMs: 1.5, nearestDetectFrames: 3,
    // quantized fallback PLL
    engageMarginMs: 2, releaseMarginMs: 0.5, followThroughMs: 800,
    gainPerMs: 0.0006,       // 10 ms of error -> 0.6 % trim
    maxTrim: 0.02,           // never more than ±2 % away from the base rate
    emaFrames: 12,
    minUpdateMs: 200, minDelta: 0.0002,
    // FLL
    fllWindowMs: 30000, fllMinMs: 10000, fllEveryMs: 5000,
    fllWindowQMs: 300000, fllMinQMs: 60000, fllEveryQMs: 10000,
    fllMaxPpm: 2000, fllDeadPpm: 5,
    seekMs: 1000,            // rehearsal posture only: beyond this, seek instead of trim
    posture: 'performance',
  };

  function fitSlope(h) {
    const n = h.length;
    let tm = 0, dm = 0;
    for (const x of h) { tm += x.t; dm += x.d; }
    tm /= n; dm /= n;
    let sxx = 0, sxy = 0;
    for (const x of h) { const dt = x.t - tm; sxx += dt * dt; sxy += dt * (x.d - dm); }
    return sxx > 0 ? sxy / sxx : 0;
  }

  class Servo {
    constructor(opts) {
      this.p = Object.assign({}, DEFAULTS, opts || {});
      this.frame = 1000 / this.p.fps; this.half = this.frame / 2;
      this.motor = 0; this.rate = 1; this.lastSet = -Infinity;
      this.leadStar = this.half;     // where the continuous lead is steered (the band centre)
      this.policy = 'previous';      // how the browser picks a frame for a vsync — until shown otherwise
      this.qAhead = 0;
      this.errF = null; this.leadF = null;
      this.engaged = false; this.inBandSince = null; this.episodeSign = 0;
      this.intR = 0; this.lastNow = null; this.hist = []; this.lastFll = -Infinity; this.mode = null;
      this.stats = { frames: 0, rateChanges: 0, engagedFrames: 0, episodes: 0, seeks: 0, fllUpdates: 0 };
    }
    // a seek or a jump: the phase history is void; the learned motor drift is not
    reset() { this.errF = null; this.leadF = null; this.engaged = false; this.inBandSince = null; this.hist = []; this.intR = 0; this.lastNow = null; }
    motorPpm() { return this.motor * 1e6; }

    // f = { mediaMs    PTS of the presented frame
    //       targetMs   where the piece clock puts the media at its display instant
    //       nowMs      that instant, local clock
    //       targetRate the piece clock's rate against the local clock (known)
    //       clockMs    the continuous media clock AT that instant, if the browser has one }
    update(f) {
      const targetRate = f.targetRate || 1;
      const cont = f.clockMs != null;
      this.mode = cont ? 'lead' : 'quantized';
      const dtMs = this.lastNow !== null ? f.nowMs - this.lastNow : 0;
      if (this.lastNow !== null) this.intR += this.rate * dtMs;
      this.lastNow = f.nowMs;
      const err = f.mediaMs - f.targetMs;          // what the stand SHOWS (+ = ahead)
      const a = 2 / (this.p.emaFrames + 1);
      this.errF = this.errF === null ? err : this.errF + a * (err - this.errF);
      this.stats.frames++;

      if (this.p.posture === 'rehearsal' && Math.abs(this.errF) > this.p.seekMs) {
        this.reset(); this.stats.seeks++;
        this._command(targetRate / (1 + this.motor), f.nowMs, true);
        return { action: 'seek', to: f.targetMs, err, errF: err, rate: this.rate, engaged: false, mode: this.mode };
      }

      // FLL — media advances R·(1+motor) per local ms, so (media − ∫R) has slope motor
      this.hist.push({ t: f.nowMs, d: (cont ? f.clockMs : f.mediaMs) - this.intR });
      const win = cont ? this.p.fllWindowMs : this.p.fllWindowQMs;
      while (this.hist.length && this.hist[0].t < f.nowMs - win) this.hist.shift();
      const minSpan = cont ? this.p.fllMinMs : this.p.fllMinQMs, every = cont ? this.p.fllEveryMs : this.p.fllEveryQMs;
      if (f.nowMs - this.lastFll >= every && this.hist.length > 30 && f.nowMs - this.hist[0].t >= minSpan) {
        this.lastFll = f.nowMs;
        const m = Math.max(-this.p.fllMaxPpm, Math.min(this.p.fllMaxPpm, fitSlope(this.hist) * 1e6)) * 1e-6;
        if (Math.abs(m - this.motor) * 1e6 > this.p.fllDeadPpm) { this.motor = m; this.stats.fllUpdates++; }
      }
      const base = targetRate / (1 + this.motor);

      let want = base, ctl;
      if (cont) {
        // PLL on the continuous lead. Where the band's centre sits depends on
        // how the browser picks a frame for a vsync: the PREVIOUS frame (then
        // the frame's PTS is never ahead of the media clock, and the lead that
        // centres the shown error is +half a frame) or the NEAREST (the PTS can
        // be up to half a frame ahead; the centring lead is 0). One clear sign
        // decides it — no averaging loop that could chase a transient or fight
        // an inherent skip. (Edge, measured day 42: nearest.)
        const lead = f.clockMs - f.targetMs;
        if (this.policy === 'previous' && !this.engaged) {
          const q = f.mediaMs - f.clockMs;
          if (q > this.p.nearestDetectMs) { if (++this.qAhead >= this.p.nearestDetectFrames) { this.policy = 'nearest'; this.leadStar = 0; } }
          else this.qAhead = 0;
        }
        this.leadF = this.leadF === null ? lead : this.leadF + a * (lead - this.leadF);
        ctl = this.leadF - this.leadStar;
        if (!this.engaged && Math.abs(ctl) > this.p.leadEngageMs) { this.engaged = true; this.stats.episodes++; }
        else if (this.engaged && Math.abs(ctl) <= this.p.leadReleaseMs) this.engaged = false;
        if (this.engaged) want = base * (1 - Math.max(-this.p.maxTrim, Math.min(this.p.maxTrim, this.p.gainPerMs * ctl)));
      } else {
        // fallback: the quantized error, outside the quantum, with follow-through
        const e = this.errF;
        ctl = e;
        const engageAt = this.half + this.p.engageMarginMs, releaseAt = this.half + this.p.releaseMarginMs;
        if (!this.engaged && Math.abs(e) > engageAt) { this.engaged = true; this.inBandSince = null; this.episodeSign = Math.sign(e); this.stats.episodes++; }
        else if (this.engaged) {
          if (Math.abs(e) <= releaseAt) {
            if (this.inBandSince === null) this.inBandSince = f.nowMs;
            if (f.nowMs - this.inBandSince >= this.p.followThroughMs) { this.engaged = false; this.inBandSince = null; }
          } else { this.inBandSince = null; this.episodeSign = Math.sign(e); }
        }
        if (this.engaged) {
          const eUse = this.inBandSince !== null ? this.episodeSign * this.half : e;
          want = base * (1 - Math.max(-this.p.maxTrim, Math.min(this.p.maxTrim, this.p.gainPerMs * eUse)));
        }
      }
      if (this.engaged) this.stats.engagedFrames++;
      const changed = this._command(want, f.nowMs, !this.engaged);
      return { action: changed ? 'rate' : 'hold', rate: this.rate, base, err, errF: this.errF, ctl, engaged: this.engaged, mode: this.mode, leadStar: this.leadStar, policy: this.policy };
    }
    _command(want, nowMs, force) {
      if (Math.abs(want - this.rate) < (force ? 1e-9 : this.p.minDelta)) return false;
      if (!force && nowMs - this.lastSet < this.p.minUpdateMs) return false;
      this.rate = want; this.lastSet = nowMs; this.stats.rateChanges++;
      return true;
    }
  }

  Servo.DEFAULTS = DEFAULTS;
  Servo.fitSlope = fitSlope;
  return Servo;
});
