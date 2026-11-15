// syncclock.js — THE FLOOR RULE, as code (docs/ENGINE_BRIEF.md §3).
//
//   "if the drift is too much via network, it just sticks with the internal
//    video clock" — the composer, day 42.
//
// The local clock is the FLOOR. The network is a bounded adviser: its samples
// may improve the stand's estimate of room time, or be ignored — never compound
// an error. Pure and clock-free: every method takes the local time L (ms) it
// should act at, so the same code runs in the browser (L = performance.now())
// and in the Node simulation battery (testkit/test_syncclock.js).
//
// A sample is one ping: Ls (local send), Lr (local receive), S (server stamp).
//   offset = S − (Ls+Lr)/2
//
// THE MODEL: room(L) = L + offset(L), offset(L) = theta0 + rho·(L − L0).
// rho is 0 until calibrate() measures this device's drift (B3(i) — learned
// while the network is trustworthy, then applied with no live dependency).
//
// HOW MUCH A SAMPLE IS WORTH (v3, from the four real stands — RUNNING_LOG 75–76):
// v2 judged every sample's noise as RTT/2. On the iPad's slow-but-steady Wi-Fi
// that was 8.5 ms while the offsets actually scattered 0.6 ms, so its gates were
// ±40 ms wide. v3 takes the smaller of two honest bounds:
//   · the MEASURED scatter of recent good samples, plus half of any extra delay
//     this sample took over the typical round trip, and
//   · half its extra delay over the fastest path seen (the classic NTP bound),
// and every fit weights samples by 1/u², so clean fast samples count most.
//
// THE PATH OF A SAMPLE (after lock):
//   spike      round trip far above the TYPICAL one — dropped (v2 compared to
//              the single best round trip and starved on noisy Wi-Fi)
//   jump       judged against the trusted history — a step or jitter lie is
//              refused here
//   QUARANTINE a sample that passes waits 30 s before it may move the clock;
//              meanwhile the provisional window must keep a QUORUM (≥60 % agreeing)
//              and a RATE a real clock could have
//   trusted    then it joins the history the corrections are fitted to
//   rate(long) the trusted history's own slope over 2 minutes — the slow lie that
//              survived quarantine; a trip rolls it back AND reverts the
//              corrections it caused
//   correct    uncalibrated: a weighted line through the trusted history (only
//              projected when its own span supports it). CALIBRATED: the model
//              owns the rate — the network may only nudge the LEVEL, from the
//              weighted mean of the last minute of trusted samples
//   clamp      authority: at most clampMsPerMin of correction per rolling minute
// An accepted correction moves the MODEL at once and the APPLIED clock slews to
// it (slewMsPerS) — room time never jumps.
//
// A TRIP (quorum / rate) discards the provisional window and puts the stand in
// HOLDOVER: it runs on its own clock — the floor — and leaves only when a clean
// run of samples agrees with it in level (within its measured uncertainty) and rate.
//
// CALIBRATION has a quality bar: at least calMinSamples, σ ≤ calMaxSigmaPpm —
// a junk calibration (the Fire: 158 ± 169 ppm from 5 samples) is refused.
//
// POSTURE: 'performance' never re-locks (sustained disagreement = the network
// is wrong, the stand holds). 'rehearsal' re-locks (snaps) after relockAfterMs of
// consistent disagreement — rehearsal may snap, performance never (D87).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.TK = root.TK || {}; root.TK.SyncClock = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULTS = {
    rttWindow: 16, rttMinWindow: 32, spikeFactor: 2, spikeMs: 5,
    sampleFloorMs: 1, sigmaWindow: 24, sigmaMinSamples: 8,
    jumpK: 4, jumpFloorMs: 4, sCapMs: 2,
    noiseK: 3, noiseFloorMs: 2,
    quarantineMs: 30000, longWinMs: 120000, levelWinMs: 60000, minFitSpanMs: 60000,
    minRateSpanMs: 20000, minRateSamples: 8, minLongSpanMs: 60000,
    rhoMaxPpm: 150, rhoTolPpm: 25, rateSigmaK: 3, wanderPpm: 5,
    quorumN: 15, quorumMin: 8, quorum: 0.6,
    clampMsPerMin: 20, slewMsPerS: 2,
    holdoverExitSamples: 10, holdoverExitSpanMs: 20000, holdoverExitMs: 3,
    calMinSamples: 30, calMaxSigmaPpm: 5,
    posture: 'performance', relockAfterMs: 30000, filterN: 8,
    historyMs: 900000,
  };

  const median = a => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

  // weighted least squares y = ym + b·(x − xm); weights default to 1 (then plain OLS)
  function ols(pts) {
    const n = pts.length;
    if (n < 3) return null;
    let W = 0, xm = 0, ym = 0, lo = Infinity, hi = -Infinity;
    for (const p of pts) { const w = p.w == null ? 1 : p.w; W += w; xm += w * p.x; ym += w * p.y; lo = Math.min(lo, p.x); hi = Math.max(hi, p.x); }
    xm /= W; ym /= W;
    let sxx = 0, sxy = 0;
    for (const p of pts) { const w = p.w == null ? 1 : p.w, dx = p.x - xm; sxx += w * dx * dx; sxy += w * dx * (p.y - ym); }
    const b = sxx > 0 ? sxy / sxx : 0;
    let ss = 0;
    for (const p of pts) { const w = p.w == null ? 1 : p.w, r = p.y - (ym + b * (p.x - xm)); ss += w * r * r; }
    const sig2 = ss / (n - 2);                       // residual variance per unit weight
    return {
      n, xm, ym, b, sxx, W, span: hi - lo,
      s: Math.sqrt(ss / W * n / (n - 2)),           // a typical residual, in ms
      sb: sxx > 0 ? Math.sqrt(sig2 / sxx) : Infinity,
      at: x => ym + b * (x - xm),
      seAt: x => Math.sqrt(sig2 * (1 / W + (sxx > 0 ? (x - xm) * (x - xm) / sxx : 0))),
    };
  }
  // weighted mean of y, with its standard error and a typical scatter
  function wmean(pts) {
    const n = pts.length;
    if (!n) return null;
    let W = 0, m = 0;
    for (const p of pts) { const w = p.w == null ? 1 : p.w; W += w; m += w * p.y; }
    m /= W;
    let ss = 0;
    for (const p of pts) { const w = p.w == null ? 1 : p.w; ss += w * (p.y - m) * (p.y - m); }
    const sig2 = n > 1 ? ss / (n - 1) : 0;
    return { n, m, W, s: Math.sqrt(n > 1 ? ss / W * n / (n - 1) : 0), se: Math.sqrt(sig2 / W) };
  }

  class SyncClock {
    constructor(opts) {
      this.p = Object.assign({}, DEFAULTS, opts || {});
      this.state = 'unlocked';            // unlocked | locked | holdover
      this.theta0 = 0; this.L0 = 0; this.rho = 0; this.calibrated = false;
      this.pending = 0; this.pendingAt = 0;
      this.rtts = []; this.rttMins = []; this.devs = [];
      this.H = []; this.Q = []; this.verdicts = []; this.corr = []; this.dis = [];
      this.disagreeSince = null; this.holdSince = null;
      this.refuse = { spike: 0, jump: 0, holdover: 0, quorum: 0, rate: 0, clamp: 0 };
      this.count = { samples: 0, trusted: 0, steady: 0, corrections: 0, correctedMs: 0, reverted: 0, revertedMs: 0, trips: 0, relocks: 0 };
      this.log = []; this.onLog = null;
    }

    // ------------------------------------------------ reading the clock
    model(L) { return this.theta0 + this.rho * (L - this.L0); }
    _pendingAt(L) {
      if (!this.pending) return 0;
      const left = Math.abs(this.pending) - this.p.slewMsPerS * Math.max(0, L - this.pendingAt) / 1000;
      return left <= 0 ? 0 : Math.sign(this.pending) * left;
    }
    applied(L) { return this.model(L) - this._pendingAt(L); }   // the offset the stand USES
    now(L) { return L + this.applied(L); }                       // room time at local L
    _settle(L) { this.pending = this._pendingAt(L); this.pendingAt = L; }
    _bound() { return this.calibrated ? this.p.rhoTolPpm : this.p.rhoMaxPpm; }

    // ------------------------------------------------ bookkeeping
    _mk(x) {
      const rtt = x.Lr - x.Ls, mid = (x.Ls + x.Lr) / 2;
      return { mid, rtt, off: x.S - mid, u: rtt / 2 + 0.5, w: 1 };
    }
    _say(L, kind, msg, data) {
      const e = { L, kind, msg };
      if (data) e.data = data;
      this.log.push(e);
      if (this.log.length > 3000) this.log.shift();
      if (this.onLog) this.onLog(e);
    }
    _pts(list, L, win) {
      const pts = [];
      for (const h of list) if (h.mid >= L - win) pts.push({ x: h.mid, y: h.off - this.model(h.mid), w: h.w });
      return pts;
    }
    _fit(list, L, win) { return ols(this._pts(list, L, win)); }
    _prune(L) {
      while (this.H.length > 3 && this.H[0].mid < L - this.p.historyMs) this.H.shift();
      while (this.corr.length && this.corr[0].at < L - this.p.longWinMs - this.p.quarantineMs - 60000) this.corr.shift();
    }
    _ret(action, s, data) { return Object.assign({ action, state: this.state, mid: s ? s.mid : null }, data || {}); }
    // the measured scatter of recent good samples (robust: 1.4826 × MAD)
    _sigma() {
      if (this.devs.length < this.p.sigmaMinSamples) return null;
      const m = median(this.devs);
      return 1.4826 * median(this.devs.map(d => Math.abs(d - m)));
    }
    // how uncertain THIS sample is (see the header)
    _noise(s) {
      const fl = this.p.sampleFloorMs;
      const rttMin = Math.min.apply(null, this.rttMins);
      const nted = (s.rtt - rttMin) / 2 + fl;                 // the classic bound vs the fastest path
      const sig = this._sigma();
      if (sig === null) return Math.max(fl, Math.min(s.rtt / 2 + 0.5, nted));
      const typ = median(this.rtts);
      return Math.max(fl, Math.min(Math.max(fl, sig) + Math.max(0, s.rtt - typ) / 2, nted));
    }

    // THE REFERENCE: where the stand's own trusted history says the residual is at x.
    // Calibrated: the model owns the rate, so only the recent LEVEL. Uncalibrated:
    // a weighted line, its slope clamped to what a real clock can do, and projected
    // only as far as its own span supports.
    _ref(x) {
      const bound = this._bound() * 1e-6;
      const lastMid = this.H.length ? this.H[this.H.length - 1].mid : x;
      const gapMs = Math.max(0, x - lastMid);
      if (this.calibrated) {
        let pts = this._pts(this.H, lastMid, this.p.levelWinMs);
        if (pts.length < 5) pts = this._pts(this.H.slice(-10), lastMid, Infinity);
        const lv = wmean(pts);
        if (!lv) return { pred: 0, s: 0, allowance: bound * gapMs };
        return { pred: lv.m, s: lv.s, allowance: this.p.wanderPpm * 1e-6 * gapMs };
      }
      let f = this._fit(this.H, x, this.p.longWinMs);
      if (!f) f = this._fit(this.H, x, Infinity);
      if (!f) {
        const last = this.H[this.H.length - 1];
        return { pred: last ? last.off - this.model(last.mid) : 0, s: 0, allowance: bound * gapMs };
      }
      if (f.span < this.p.minFitSpanMs) {
        // too short to trust a slope: the level, with the full physical allowance
        const lv = wmean(this._pts(this.H, x, this.p.longWinMs));
        return { pred: lv ? lv.m : f.ym, s: lv ? lv.s : f.s, allowance: bound * Math.max(0, x - f.xm) };
      }
      const b = Math.max(-bound, Math.min(bound, f.b));
      const wander = (this.p.rateSigmaK * (isFinite(f.sb) ? f.sb : bound) + this.p.wanderPpm * 1e-6) * gapMs;
      return { pred: f.ym + b * (x - f.xm), s: f.s, allowance: wander };
    }

    // ------------------------------------------------ lock (pre-GO: may snap)
    lock(samples) {
      const all = samples.map(x => this._mk(x));
      const s = all.slice().sort((a, b) => a.rtt - b.rtt)[0];
      this.theta0 = s.off; this.L0 = s.mid; this.rho = 0; this.calibrated = false;
      this.pending = 0; this.pendingAt = s.mid;
      this.rtts = all.map(a => a.rtt).slice(-this.p.rttWindow); this.rttMins = all.map(a => a.rtt).slice(-this.p.rttMinWindow);
      s.u = Math.max(this.p.sampleFloorMs, s.rtt / 2 + 0.5); s.w = 1 / (s.u * s.u);
      this.H = [s]; this.Q = []; this.verdicts = []; this.devs = [];
      this.dis = []; this.corr = []; this.disagreeSince = null; this.holdSince = null;
      this.state = 'locked';
      this._say(s.mid, 'lock', 'locked on the best of ' + all.length + ' pings: offset ' + s.off.toFixed(1) + ' ms, rtt ' + s.rtt.toFixed(1) + ' ms');
      return { offset: s.off, rtt: s.rtt, u: s.u };
    }

    // ------------------------------------------------ one sample
    ingest(x) {
      const s = this._mk(x);
      this.count.samples++;
      if (this.state === 'unlocked') return this._ret('unlocked', s);
      this._settle(s.mid);
      this.rttMins.push(s.rtt);
      if (this.rttMins.length > this.p.rttMinWindow) this.rttMins.shift();
      const typ = median(this.rtts);
      this.rtts.push(s.rtt);
      if (this.rtts.length > this.p.rttWindow) this.rtts.shift();
      if (this.rtts.length >= 4 && s.rtt > typ * this.p.spikeFactor + this.p.spikeMs) {
        this.refuse.spike++;
        return this._ret('spike', s, { rtt: s.rtt, typical: typ });
      }
      s.u = this._noise(s);
      s.w = 1 / (s.u * s.u);
      const r = s.off - this.model(s.mid);
      const ref = this._ref(s.mid);
      const dev = r - ref.pred;
      const tol = this.p.jumpK * (s.u + Math.min(ref.s, this.p.sCapMs)) + this.p.jumpFloorMs + ref.allowance;
      const pass = Math.abs(dev) <= tol;
      this.verdicts.push(pass);
      if (this.verdicts.length > this.p.quorumN) this.verdicts.shift();

      if (this.state === 'holdover') return this._holdover(s, dev, tol, pass);

      if (!pass) {
        this.refuse.jump++;
        const trip = this._quorum(s);
        if (trip) return trip;
        return this._disagree(s, 'jump', 'refused: sample is ' + dev.toFixed(1) + ' ms off the stand\'s own clock (tolerance ' + tol.toFixed(1) + ' ms)', { dev, tol });
      }
      this.devs.push(dev);
      if (this.devs.length > this.p.sigmaWindow) this.devs.shift();
      this.disagreeSince = null; this.dis = [];
      this.Q.push(s);
      const trip = this._quorum(s) || this._rateShort(s);
      if (trip) return trip;
      // graduate: samples that survived quarantine join the trusted history
      while (this.Q.length && this.Q[0].mid <= s.mid - this.p.quarantineMs) { this.H.push(this.Q.shift()); this.count.trusted++; }
      this._prune(s.mid);
      const trip2 = this._rateLong(s);
      if (trip2) return trip2;
      return this._correct(s);
    }

    _quorum(s) {
      if (this.verdicts.length < this.p.quorumMin) return null;
      let ok = 0;
      for (const v of this.verdicts) if (v) ok++;
      const ratio = ok / this.verdicts.length;
      if (ratio >= this.p.quorum) return null;
      this.refuse.quorum++;
      return this._trip(s, 'quorum', 'quorum lost: only ' + Math.round(ratio * 100) + '% of recent samples agree with the stand\'s clock — the network is not trustworthy', { ratio });
    }
    _rateShort(s) {
      const f = ols(this.Q.map(q => ({ x: q.mid, y: q.off - this.model(q.mid), w: q.w })));
      if (!f || f.span < this.p.minRateSpanMs || f.n < this.p.minRateSamples) return null;
      const ppm = f.b * 1e6, sig = f.sb * 1e6, bound = this._bound();
      if (Math.abs(ppm) <= bound + this.p.rateSigmaK * sig) return null;
      this.refuse.rate++;
      return this._trip(s, 'rate', 'rate gate: the network says this clock is drifting ' + ppm.toFixed(0) + ' ppm (bound ' + bound + ' ± ' +
        (this.p.rateSigmaK * sig).toFixed(0) + ') — no real clock does', { ppm, sig });
    }
    _rateLong(s) {
      const f = this._fit(this.H, s.mid, this.p.longWinMs);
      if (!f || f.span < this.p.minLongSpanMs || f.n < 20) return null;
      const ppm = f.b * 1e6, sig = f.sb * 1e6, bound = this._bound();
      if (Math.abs(ppm) <= bound + this.p.rateSigmaK * sig) return null;
      // a slow lie survived quarantine: roll the trusted history back past it,
      // and take back every correction it caused — the network must not compound
      const cut = s.mid - this.p.longWinMs - this.p.quarantineMs;
      this.H = this.H.filter(h => h.mid < cut);
      if (!this.H.length) this.H = [{ mid: cut, off: this.model(cut), u: 1, w: 1, rtt: 0 }];
      let back = 0;
      this.corr = this.corr.filter(c => { if (c.at >= cut + this.p.quarantineMs) { back += c.c; return false; } return true; });
      if (back) {
        this.theta0 -= back; this.pending -= back;
        this.count.reverted++; this.count.revertedMs += Math.abs(back);
      }
      this.refuse.rate++;
      return this._trip(s, 'rate', 'rate gate (2 min): the trusted history drifts ' + ppm.toFixed(0) + ' ppm (bound ' + bound + ' ± ' +
        (this.p.rateSigmaK * sig).toFixed(0) + ') — a slow lie; history rolled back' + (back ? ', ' + back.toFixed(1) + ' ms of its corrections taken back' : ''), { ppm, sig, long: true, revertedMs: back });
    }
    _trip(s, why, msg, data) {
      this.Q = []; this.verdicts = [];
      this.state = 'holdover'; this.holdSince = s.mid;
      this.count.trips++;
      this._say(s.mid, 'trip', msg + ' — HOLDOVER: the stand runs on its own clock', Object.assign({ why }, data || {}));
      return this._ret('trip', s, Object.assign({ why }, data || {}));
    }

    // ------------------------------------------------ holdover: the floor
    _holdover(s, dev, tol, pass) {
      if (!pass) {
        this.Q = [];
        this.refuse.holdover++;
        return this._disagree(s, 'holdover', 'holdover: the network is still ' + dev.toFixed(1) + ' ms off the stand\'s clock — ignored', { dev, tol });
      }
      this.disagreeSince = null; this.dis = [];
      s.dev = dev;
      this.Q.push(s);
      const span = this.Q[this.Q.length - 1].mid - this.Q[0].mid;
      if (this.Q.length >= this.p.holdoverExitSamples && span >= this.p.holdoverExitSpanMs) {
        // leave only if the run agrees with the stand's own clock IN LEVEL (within
        // the run's MEASURED uncertainty, not a round-trip guess) and IN RATE
        const f = ols(this.Q.map(q => ({ x: q.mid, y: q.off - this.model(q.mid), w: q.w })));
        const lv = wmean(this.Q.map(q => ({ y: q.dev, w: q.w })));
        const lastMid = this.H.length ? this.H[this.H.length - 1].mid : s.mid;
        const drift = (this.calibrated ? this.p.wanderPpm : this.p.rhoMaxPpm) * 1e-6 * Math.max(0, s.mid - lastMid);
        const levelTol = Math.max(this.p.holdoverExitMs, this.p.noiseK * lv.se) + drift;
        const bound = this._bound();
        const rateOk = f && Math.abs(f.b * 1e6) <= bound + this.p.rateSigmaK * f.sb * 1e6;
        if (rateOk && Math.abs(lv.m) <= levelTol) {
          this.state = 'locked'; this.verdicts = []; this.holdSince = null;
          this._say(s.mid, 'resume', 'holdover ended: ' + this.Q.length + ' samples over ' + (span / 1000).toFixed(0) +
            ' s agree with the stand\'s clock (level ' + lv.m.toFixed(1) + ' ± ' + levelTol.toFixed(1) + ' ms, rate ' + (f.b * 1e6).toFixed(0) + ' ppm)');
          return this._ret('resume', s, { meanDev: lv.m });
        }
        this.Q.shift();
      }
      this.refuse.holdover++;
      return this._ret('holdover', s, { dev, tol, candidates: this.Q.length });
    }

    // sustained disagreement: performance holds; rehearsal re-locks
    _disagree(s, action, msg, data) {
      if (this.disagreeSince === null) { this.disagreeSince = s.mid; this._say(s.mid, action, msg, data); }
      this.dis.push(s);
      if (this.dis.length > 64) this.dis.shift();
      const long = s.mid - this.disagreeSince;
      if (this.p.posture === 'rehearsal' && long >= this.p.relockAfterMs) {
        const recent = this.dis.slice(-this.p.filterN);
        const best = recent.slice().sort((a, b) => a.rtt - b.rtt)[0];
        let lo = Infinity, hi = -Infinity;
        for (const d of recent) { lo = Math.min(lo, d.off); hi = Math.max(hi, d.off); }
        if (recent.length >= this.p.filterN && hi - lo <= 4 * best.u + this.p.jumpFloorMs) {
          const was = this.applied(s.mid);
          this.theta0 = best.off; this.L0 = best.mid; this.pending = 0; this.pendingAt = s.mid;
          this.H = [best]; this.Q = []; this.verdicts = []; this.dis = []; this.devs = []; this.disagreeSince = null; this.holdSince = null;
          this.state = 'locked'; this.count.relocks++;
          this._say(s.mid, 'relock', 'REHEARSAL posture: re-locked — snapped ' + (best.off - was).toFixed(1) + ' ms after ' +
            (long / 1000).toFixed(0) + ' s of consistent disagreement (performance posture never does this)');
          return this._ret('relock', s, { snapMs: best.off - was });
        }
      }
      return this._ret(action, s, data);
    }

    // ------------------------------------------------ the correction
    _correct(s) {
      let v, gate;
      if (this.calibrated) {
        // the model owns the rate; the network may only nudge the level
        const lv = wmean(this._pts(this.H, s.mid, this.p.levelWinMs + this.p.quarantineMs));
        if (!lv || lv.n < 5) { this.count.steady++; return this._ret('steady', s); }
        v = lv.m; gate = Math.max(this.p.noiseK * lv.se, this.p.noiseFloorMs);
      } else {
        const f = this._fit(this.H, s.mid, this.p.longWinMs);
        if (!f) { this.count.steady++; return this._ret('steady', s); }
        if (f.span >= this.p.minFitSpanMs) { v = f.at(s.mid); gate = Math.max(this.p.noiseK * f.seAt(s.mid), this.p.noiseFloorMs); }
        else {
          const lv = wmean(this._pts(this.H, s.mid, this.p.longWinMs));
          v = lv.m; gate = Math.max(this.p.noiseK * lv.se, this.p.noiseFloorMs);
        }
      }
      if (Math.abs(v) <= gate) { this.count.steady++; return this._ret('steady', s, { v, gate }); }
      let used = 0;
      for (const c of this.corr) if (c.at > s.mid - 60000) used += Math.abs(c.c);
      const budget = this.p.clampMsPerMin - used;
      if (budget <= 0.05) { this.refuse.clamp++; return this._ret('clamp', s, { v, used }); }
      let c = v, clamped = false;
      if (Math.abs(c) > budget) { c = Math.sign(c) * budget; clamped = true; this.refuse.clamp++; }
      this.theta0 += c;          // the model moves now
      this.pending += c;         // the applied clock slews to it
      this.corr.push({ at: s.mid, c });
      this.count.corrections++; this.count.correctedMs += Math.abs(c);
      this._say(s.mid, 'correct', 'accepted ' + c.toFixed(1) + ' ms' + (clamped ? ' (clamped from ' + v.toFixed(1) + ')' : '') +
        ' — slewing at ' + this.p.slewMsPerS + ' ms/s', { v, c, gate });
      return this._ret('correct', s, { v, c, clamped });
    }

    // ------------------------------------------------ calibration (B3(i))
    // This device's rate against the server, from the trusted history (weighted).
    // The offset's slope is the NEGATIVE of the clock's rate: a clock running fast
    // makes server − local shrink. clockPpm is the human number (+ = fast).
    // The ± is taken from the data's own spread as well as from the fit: a block
    // jackknife (refit with each eighth of the time left out). On heavy-tailed,
    // asymmetric Wi-Fi the fit's own ± was ~2× too confident (the Fire profile:
    // 15 % of calibrations beyond 3σ, RUNNING_LOG 76); the jackknife is honest there.
    drift(minSpanMs) {
      const pts = this.H.map(h => ({ x: h.mid, y: h.off, w: h.w }));
      const t = ols(pts);
      if (!t || t.span < (minSpanMs || 60000)) return null;
      let sigma = t.sb;
      const k = 8;
      if (pts.length >= 3 * k) {
        const lo = pts[0].x, step = t.span / k, bs = [];
        for (let i = 0; i < k; i++) {
          const a = lo + i * step, b = a + step;
          const fi = ols(pts.filter(p => p.x < a || p.x >= (i === k - 1 ? Infinity : b)));
          if (fi) bs.push(fi.b);
        }
        if (bs.length === k) {
          const m = bs.reduce((x, y) => x + y, 0) / k;
          const jack = Math.sqrt((k - 1) / k * bs.reduce((x, y) => x + (y - m) * (y - m), 0));
          sigma = Math.max(sigma, jack);
        }
      }
      return { clockPpm: -t.b * 1e6, sigmaPpm: sigma * 1e6, spanS: t.span / 1000, n: t.n, residualMs: t.s, line: t };
    }
    calibrate(L, minSpanMs) {
      const d = this.drift(minSpanMs);
      if (!d) return null;
      if (d.n < this.p.calMinSamples || d.sigmaPpm > this.p.calMaxSigmaPpm) {
        const reason = d.n < this.p.calMinSamples ? 'only ' + d.n + ' trusted samples (needs ' + this.p.calMinSamples + ')'
          : '± ' + d.sigmaPpm.toFixed(1) + ' ppm is too uncertain (needs ≤ ' + this.p.calMaxSigmaPpm + ')';
        this._say(L, 'calibrate-refused', 'calibration REFUSED: ' + reason + ' — measured ' + d.clockPpm.toFixed(1) + ' ± ' + d.sigmaPpm.toFixed(1) +
          ' ppm; the stand stays uncalibrated rather than follow a guess');
        return { refused: true, reason, clockPpm: d.clockPpm, sigmaPpm: d.sigmaPpm, spanS: d.spanS, n: d.n };
      }
      this._settle(L);
      const before = this.model(L);
      this.rho = d.line.b; this.L0 = L; this.theta0 = d.line.at(L);
      this.pending += this.theta0 - before;
      this.calibrated = true;
      this._say(L, 'calibrate', 'calibrated: this clock runs ' + (d.clockPpm >= 0 ? '+' : '') + d.clockPpm.toFixed(1) + ' ± ' + d.sigmaPpm.toFixed(1) +
        ' ppm against the server (' + d.n + ' samples over ' + d.spanS.toFixed(0) + ' s); rate gate now ±' + this.p.rhoTolPpm + ' ppm around it');
      return { clockPpm: d.clockPpm, sigmaPpm: d.sigmaPpm, spanS: d.spanS, n: d.n, residualMs: d.residualMs, slewMs: this.theta0 - before };
    }

    status(L) {
      const sig = this._sigma();
      return {
        state: this.state, calibrated: this.calibrated, clockPpm: -this.rho * 1e6,
        appliedMs: this.applied(L), pendingMs: this._pendingAt(L),
        sigmaMs: sig, rttTypicalMs: median(this.rtts), rttMinMs: Math.min.apply(null, this.rttMins),
        refuse: Object.assign({}, this.refuse), count: Object.assign({}, this.count),
        trusted: this.H.length, quarantined: this.Q.length,
      };
    }
  }

  SyncClock.DEFAULTS = DEFAULTS;
  SyncClock.ols = ols;
  SyncClock.wmean = wmean;
  return SyncClock;
});
