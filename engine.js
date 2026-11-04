const Engine = (function () {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rnd) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // A match is [a0, a1, b0, b1] (slot indices): team A = a0+a1, team B = b0+b1
  function matchesOf4(g) {
    const [a, b, c, d] = g;
    return [[a, b, c, d], [a, c, b, d], [a, d, b, c]];
  }

  const cfgCache = {};
  // Every way to place the playing slots on the courts (court order matters for court balance)
  function configsFor(courts) {
    if (cfgCache[courts]) return cfgCache[courts];
    let out = [];
    if (courts === 1) {
      out = matchesOf4([0, 1, 2, 3]).map(m => [m]);
    } else {
      const all = [0, 1, 2, 3, 4, 5, 6, 7];
      for (let i = 1; i < 8; i++) for (let j = i + 1; j < 8; j++) for (let k = j + 1; k < 8; k++) {
        const g1 = [0, i, j, k];
        const g2 = all.filter(x => g1.indexOf(x) < 0);
        for (const m1 of matchesOf4(g1)) for (const m2 of matchesOf4(g2)) {
          out.push([m1, m2]);
          out.push([m2, m1]);
        }
      }
    }
    cfgCache[courts] = out;
    return out;
  }

  // One greedy pass over all games with random tie-breaking
  function attempt(n, courts, games, rnd, cfgs) {
    const P = courts * 4, S = n - P;
    const partner = new Int16Array(n * n), opp = new Int16Array(n * n), restPair = new Int16Array(n * n);
    const sat = new Int16Array(n), lastSat = new Int16Array(n).fill(-9);
    const courtCnt = new Int16Array(n * 2), lastPartner = new Int16Array(n).fill(-1);
    const rounds = [];
    // When half or more must rest each game, strict "no back-to-back rest" would lock the same
    // groups together, so mixing who rests together takes priority.
    const mixW = S * 2 >= n ? 140 : 0;

    for (let r = 0; r < games; r++) {
      // 1) Who rests: fewest rests so far, never twice in a row if avoidable, mix who rests together
      const rest = [];
      if (S > 0) {
        for (let k = 0; k < S; k++) {
          let bi = -1, bk = Infinity;
          for (let i = 0; i < n; i++) {
            if (rest.indexOf(i) >= 0) continue;
            let key = sat[i] * 1000 + (lastSat[i] === r - 1 ? 400 : 0) + rnd() * 10;
            for (const j of rest) { const rp = restPair[i * n + j]; key += rp * 25 + rp * rp * mixW; }
            if (key < bk) { bk = key; bi = i; }
          }
          rest.push(bi);
        }
        for (const i of rest) {
          sat[i]++; lastSat[i] = r;
          for (const j of rest) if (i !== j) restPair[i * n + j]++;
        }
      }

      // 2) Who plays with / against whom, on which court
      const playing = [];
      for (let i = 0; i < n; i++) if (rest.indexOf(i) < 0) playing.push(i);
      shuffle(playing, rnd);

      let best = null, bc = Infinity;
      for (let q = 0; q < cfgs.length; q++) {
        const cfg = cfgs[q];
        let cost = rnd() * 8;
        for (let c = 0; c < cfg.length && cost < bc; c++) {
          const m = cfg[c];
          const a0 = playing[m[0]], a1 = playing[m[1]], b0 = playing[m[2]], b1 = playing[m[3]];
          const pa = partner[a0 * n + a1], pb = partner[b0 * n + b1];
          cost += 100 * (pa * pa + pb * pb) + 60 * (pa + pb);
          if (lastPartner[a0] === a1) cost += 300;
          if (lastPartner[b0] === b1) cost += 300;
          const o1 = opp[a0 * n + b0], o2 = opp[a0 * n + b1], o3 = opp[a1 * n + b0], o4 = opp[a1 * n + b1];
          cost += 12 * (o1 * o1 + o2 * o2 + o3 * o3 + o4 * o4);
          if (courts === 2) {
            const oc = 1 - c;
            let d;
            d = courtCnt[a0 * 2 + c] - courtCnt[a0 * 2 + oc]; if (d > 0) cost += 45 * d;
            d = courtCnt[a1 * 2 + c] - courtCnt[a1 * 2 + oc]; if (d > 0) cost += 45 * d;
            d = courtCnt[b0 * 2 + c] - courtCnt[b0 * 2 + oc]; if (d > 0) cost += 45 * d;
            d = courtCnt[b1 * 2 + c] - courtCnt[b1 * 2 + oc]; if (d > 0) cost += 45 * d;
          }
        }
        if (cost < bc) { bc = cost; best = cfg; }
      }

      const matches = [];
      for (let c = 0; c < best.length; c++) {
        const m = best[c];
        const A = [playing[m[0]], playing[m[1]]], B = [playing[m[2]], playing[m[3]]];
        partner[A[0] * n + A[1]]++; partner[A[1] * n + A[0]]++;
        partner[B[0] * n + B[1]]++; partner[B[1] * n + B[0]]++;
        lastPartner[A[0]] = A[1]; lastPartner[A[1]] = A[0];
        lastPartner[B[0]] = B[1]; lastPartner[B[1]] = B[0];
        for (const x of A) for (const y of B) { opp[x * n + y]++; opp[y * n + x]++; }
        for (const x of A.concat(B)) courtCnt[x * 2 + c]++;
        matches.push({ A, B });
      }
      rounds.push({ courts: matches, rest });
    }
    return rounds;
  }

  function analyze(sch, n) {
    const games = sch.rounds.length;
    const played = new Array(n).fill(0), rested = new Array(n).fill(0), court = new Array(n * 2).fill(0);
    const partner = new Int16Array(n * n), opp = new Int16Array(n * n);
    const lastRest = new Array(n).fill(-9), lastPlay = new Array(n).fill(-9), lastPartner = new Array(n).fill(-1);
    let consecRests = 0, b2bPartners = 0;

    sch.rounds.forEach((r, ri) => {
      r.rest.forEach(i => { rested[i]++; if (lastRest[i] === ri - 1) consecRests++; lastRest[i] = ri; });
      r.courts.forEach((m, ci) => {
        [m.A, m.B].forEach(([x, y]) => {
          partner[x * n + y]++; partner[y * n + x]++;
          if (lastPartner[x] === y && lastPlay[x] === ri - 1 && lastPlay[y] === ri - 1) b2bPartners++;
          lastPartner[x] = y; lastPartner[y] = x;
        });
        m.A.forEach(x => m.B.forEach(y => { opp[x * n + y]++; opp[y * n + x]++; }));
        m.A.concat(m.B).forEach(x => { played[x]++; court[x * 2 + ci]++; lastPlay[x] = ri; });
      });
    });

    let maxPartner = 0, pairsUsed = 0, courtSpread = 0;
    const distinct = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) if (i !== j && partner[i * n + j] > 0) distinct[i]++;
      for (let j = i + 1; j < n; j++) {
        const p = partner[i * n + j];
        if (p > 0) pairsUsed++;
        if (p > maxPartner) maxPartner = p;
      }
      if (sch.courts === 2) courtSpread = Math.max(courtSpread, Math.abs(court[i * 2] - court[i * 2 + 1]));
    }
    return {
      games, played, rested, court, partner, opp, distinct,
      playMin: Math.min.apply(null, played), playMax: Math.max.apply(null, played),
      restMin: Math.min.apply(null, rested), restMax: Math.max.apply(null, rested),
      consecRests, b2bPartners, maxPartner, pairsUsed, pairsTotal: n * (n - 1) / 2, courtSpread
    };
  }

  function score(sch, n) {
    const a = analyze(sch, n);
    let s = Math.max(0, (a.playMax - a.playMin) - 1) * 10000;
    s += a.consecRests * 400 + a.b2bPartners * 120 + a.maxPartner * 40;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const p = a.partner[i * n + j], o = a.opp[i * n + j];
      s += 10 * p * p + 2 * o * o;
    }
    if (sch.courts === 2) for (let i = 0; i < n; i++) s += 30 * Math.abs(a.court[i * 2] - a.court[i * 2 + 1]);
    return s;
  }

  function signature(rounds) {
    return rounds.map(r => r.courts.map(m => {
      const a = m.A.slice().sort((x, y) => x - y).join('+');
      const b = m.B.slice().sort((x, y) => x - y).join('+');
      return [a, b].sort().join('v');
    }).join('|')).join(';');
  }

  function seedNow() {
    let s = Date.now() >>> 0;
    try {
      const u = new Uint32Array(2);
      globalThis.crypto.getRandomValues(u);
      s = (s ^ u[0] ^ (u[1] << 7)) >>> 0;
    } catch (e) {
      s = (s ^ Math.floor(Math.random() * 4294967296)) >>> 0;
    }
    return s;
  }

  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  // Many randomized passes, keep the fairest, then pick at random among the near-best
  // so the same group never gets a "standard" draw twice.
  function build(n, courts, games, prevSig, budgetMs) {
    const seed = seedNow();
    const rnd = mulberry32(seed);
    const cfgs = configsFor(courts);
    const budget = budgetMs || 240;
    const t0 = now();
    const pool = [];
    let k = 0;
    while (k < 24 || (k < 400 && now() - t0 < budget)) {
      const rounds = attempt(n, courts, games, rnd, cfgs);
      pool.push({ rounds, score: score({ courts, rounds }, n), sig: signature(rounds) });
      k++;
    }
    pool.sort((a, b) => a.score - b.score);
    const best = pool[0].score;
    const tol = Math.max(4, best * 0.02);
    const seen = new Set();
    let cands = pool.filter(p => {
      if (p.score > best + tol || p.sig === prevSig || seen.has(p.sig)) return false;
      seen.add(p.sig); return true;
    });
    if (!cands.length) cands = pool.filter(p => p.sig !== prevSig).slice(0, 1);
    if (!cands.length) cands = [pool[0]];
    const pick = cands[Math.floor(rnd() * cands.length)];

    // Random display order: who is listed first in a team, which team is on the left, rest order
    const rounds = pick.rounds.map(r => ({
      rest: shuffle(r.rest.slice(), rnd),
      courts: r.courts.map(m => {
        const A = shuffle(m.A.slice(), rnd), B = shuffle(m.B.slice(), rnd);
        return rnd() < 0.5 ? { A, B } : { A: B, B: A };
      })
    }));

    return {
      n, courts, games, rounds,
      rest: n > courts * 4,
      sig: pick.sig,
      draw: ('000' + seed.toString(36).toUpperCase()).slice(-4),
      createdAt: Date.now(),
      tries: k,
      choices: cands.length
    };
  }

  return { build, analyze, configsFor };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
