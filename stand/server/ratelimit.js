// ratelimit.js — server-side rate limiting from day one (AR-5; DESIGN §8).
//
// One token bucket per key (an IP, or an IP + a message name). `allow` spends a
// token and says whether there was one. Buckets refill continuously at `perMin`
// and hold at most `burst`. Idle buckets are swept so the map cannot grow.

function makeLimiter(opts) {
  const burst = (opts && opts.burst) || 10;
  const perMin = (opts && opts.perMin) || 30;
  const buckets = new Map();   // key -> { tokens, at }
  let sweepAt = Date.now();

  function allow(key, nowMs) {
    const t = nowMs == null ? Date.now() : nowMs;
    let b = buckets.get(key);
    if (!b) { b = { tokens: burst, at: t }; buckets.set(key, b); }
    b.tokens = Math.min(burst, b.tokens + (t - b.at) * perMin / 60000);
    b.at = t;
    if (t - sweepAt > 60000) {
      sweepAt = t;
      for (const [k, v] of buckets) if (t - v.at > 120000) buckets.delete(k);
    }
    if (b.tokens < 1) return false;
    b.tokens -= 1;
    return true;
  }

  return { allow, size: () => buckets.size };
}

module.exports = { makeLimiter };
