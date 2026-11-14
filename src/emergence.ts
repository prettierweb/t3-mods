// @ts-nocheck
/* eslint-disable */
// Emergence. Three systems in the spirit of Phase and Automata: each is the real thing running,
// not a picture of one. Belousov is Barkley's excitable medium seeded with spiral cores; Physarum
// is slime mould agents laying and following their own trail; Ising is a magnet held near its
// critical temperature, where domains of every size form and melt. Each runs on a reduced grid and is drawn scaled up and smooth,
// dark-native, in the theme's tones.

type C = any;
const TAU = Math.PI * 2;
function mk(w: number, h: number) {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h));
  return cv;
}
function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function tick(s: any, t: number) {
  const dt = s.lt == null || t < s.lt ? 16.7 : Math.min(100, t - s.lt);
  s.lt = t; return dt;
}
function grid(w: number, h: number, cells: number) {
  const S = Math.max(1, Math.sqrt((w * h) / cells));
  const gw = Math.max(4, Math.round(w / S)), gh = Math.max(4, Math.round(h / S));
  const cv = mk(gw, gh), x = cv.getContext("2d")!;
  const img = x.createImageData(gw, gh);
  return { gw, gh, n: gw * gh, cv, x, img, px: new Uint32Array(img.data.buffer) };
}
function blit(g: any, G: any, w: number, h: number) {
  G.x.putImageData(G.img, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  g.drawImage(G.cv, 0, 0, w, h);
}
const pack = (r: number, g: number, b: number) =>
  (0xff000000 | ((b > 255 ? 255 : b < 0 ? 0 : b) << 16) | ((g > 255 ? 255 : g < 0 ? 0 : g) << 8) | (r > 255 ? 255 : r < 0 ? 0 : r)) >>> 0;
// a deep blue tone should not read as a hole
const lift = (p: number[]) => { const m = Math.max(p[0], p[1], p[2], 1), k = m < 215 ? 215 / m : 1; return [p[0] * k, p[1] * k, p[2] * k]; };
const palKey = (c: C) => c.bg + c.pal.map((p: number[]) => p.join(",")).join(";");
// background plus tone at strength a (0..1)
const over = (c: C, p: number[], a: number) => pack(c.br + (p[0] - c.br) * a, c.bg2 + (p[1] - c.bg2) * a, c.bb + (p[2] - c.bb) * a);
const mix = (p: number[], q: number[], u: number) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];

// ── Belousov ─────────────────────────────────────────────────────────────────
// Barkley's model of an excitable medium, the maths of the Belousov-Zhabotinsky reaction:
// u is the excited chemical, v the slow inhibitor behind it. Seeded with broken wave fronts,
// which curl into spirals that turn for as long as the dish runs.
const BA = 0.75, BB = 0.06, BEPS = 0.02, BDT = 0.011, BL = 1 / (0.95 * 0.95);
function bzStep(s: any) {
  const { gw, gh } = s.G, U = s.U, V = s.V, N = s.N;
  for (let y = 0; y < gh; y++) {
    const up = (y === 0 ? 1 : y - 1) * gw, dn = (y === gh - 1 ? gh - 2 : y + 1) * gw, row = y * gw;
    for (let x = 0; x < gw; x++) {
      const i = row + x, u = U[i], v = V[i];
      const lap = U[row + (x === 0 ? 1 : x - 1)] + U[row + (x === gw - 1 ? gw - 2 : x + 1)] + U[up + x] + U[dn + x] - 4 * u;
      let nu = u + BDT * ((1 / BEPS) * u * (1 - u) * (u - (v + BB) / BA) + BL * lap);
      N[i] = nu < 0 ? 0 : nu > 1 ? 1 : nu;
      V[i] = v + BDT * (u - v);
    }
  }
  s.U = N; s.N = U;
}
const BELOUSOV = {
  name: "Belousov", flav: "Emergence",
  reset: (w: number, h: number) => {
    const G = grid(w, h, 56000), R = rng((Math.random() * 1e9) | 0);
    const U = new Float32Array(G.n), V = new Float32Array(G.n);
    const cores = Array.from({ length: 7 + ((R() * 5) | 0) }, () => ({ x: R() * G.gw, y: R() * G.gh, sp: R() < 0.5 ? 1 : -1, ph: R() * TAU }));
    for (let y = 0; y < G.gh; y++) for (let x = 0; x < G.gw; x++) {
      let best = 1e18, o = cores[0];
      for (const q of cores) { const d = (x - q.x) ** 2 + (y - q.y) ** 2; if (d < best) { best = d; o = q; } }
      const f = ((((o.sp * Math.atan2(y - o.y, x - o.x) + o.ph) / TAU) % 1) + 1) % 1, i = y * G.gw + x;
      // a front in the first slice of the turn, the inhibitor fading behind it
      U[i] = f < 0.07 ? 1 : 0;
      V[i] = f < 0.07 ? 0.1 : 0.85 * Math.exp(-(f - 0.07) * 3.2);
    }
    const s = { G, U, V, N: new Float32Array(G.n), acc: 0, lt: null };
    for (let k = 0; k < 480; k++) bzStep(s);
    return s;
  },
  frame: (g: any, w: number, h: number, t: number, c: C, s: any) => {
    const dt = tick(s, t);
    s.acc += dt;
    const per = 1000 / 100;
    for (let k = 0; s.acc >= per && k < 5; k++) { bzStep(s); s.acc -= per; }
    if (s.acc > per) s.acc = 0;
    const U = s.U, V = s.V, px = s.G.px, n = s.G.n;
    const A = lift(c.pal[0]), B = lift(c.pal[1]);
    const br = c.br, bg = c.bg2, bb = c.bb;
    for (let i = 0; i < n; i++) {
      const u = U[i], v = V[i] > 1 ? 1 : V[i];
      // the crest in the accent, the inhibitor wake in the second tone, both laid on the ground
      const au = 0.72 * u * u * u, av = 0.22 * v * (1 - u);
      px[i] = pack(br + (A[0] - br) * au + (B[0] - br) * av, bg + (A[1] - bg) * au + (B[1] - bg) * av, bb + (A[2] - bb) * au + (B[2] - bb) * av);
    }
    blit(g, s.G, w, h);
  },
};

// ── Physarum ─────────────────────────────────────────────────────────────────
// Agents sense the trail ahead, turn toward the strongest, step, and deposit. The trail
// diffuses and evaporates. The network that forms is the mould's shortest-path search.
const COS = new Float32Array(1024), SIN = new Float32Array(1024);
for (let i = 0; i < 1024; i++) { COS[i] = Math.cos((i / 1024) * TAU); SIN[i] = Math.sin((i / 1024) * TAU); }
const ang = (h: number) => (((h / TAU) * 1024) | 0) & 1023;
function physStep(s: any) {
  const { gw, gh } = s.G, T = s.T, X = s.x, Y = s.y, H = s.h, n = X.length;
  const SO = s.SO, SA = s.SA, RA = s.RA;
  let r = s.seed;
  for (let i = 0; i < n; i++) {
    const x = X[i], y = Y[i], h = H[i];
    let k = ang(h), sx = x + COS[k] * SO, sy = y + SIN[k] * SO;
    sx = sx < 0 ? sx + gw : sx >= gw ? sx - gw : sx; sy = sy < 0 ? sy + gh : sy >= gh ? sy - gh : sy;
    const F = T[(sy | 0) * gw + (sx | 0)];
    k = ang(h - SA); sx = x + COS[k] * SO; sy = y + SIN[k] * SO;
    sx = sx < 0 ? sx + gw : sx >= gw ? sx - gw : sx; sy = sy < 0 ? sy + gh : sy >= gh ? sy - gh : sy;
    const L = T[(sy | 0) * gw + (sx | 0)];
    k = ang(h + SA); sx = x + COS[k] * SO; sy = y + SIN[k] * SO;
    sx = sx < 0 ? sx + gw : sx >= gw ? sx - gw : sx; sy = sy < 0 ? sy + gh : sy >= gh ? sy - gh : sy;
    const Rr = T[(sy | 0) * gw + (sx | 0)];
    let nh = h;
    if (F >= L && F >= Rr) { /* straight on */ }
    else if (F < L && F < Rr) { r ^= r << 13; r ^= r >>> 17; r ^= r << 5; nh += (r & 1 ? RA : -RA); }
    else if (L > Rr) nh -= RA; else nh += RA;
    if (nh < 0) nh += TAU; else if (nh >= TAU) nh -= TAU;
    k = ang(nh);
    let nx = x + COS[k], ny = y + SIN[k];
    nx = nx < 0 ? nx + gw : nx >= gw ? nx - gw : nx; ny = ny < 0 ? ny + gh : ny >= gh ? ny - gh : ny;
    X[i] = nx; Y[i] = ny; H[i] = nh;
    T[(ny | 0) * gw + (nx | 0)] += 1;
  }
  s.seed = r;
  // 3x3 box blur, separable and wrapped, then evaporation
  const U = s.U, dec = s.decay;
  for (let y = 0; y < gh; y++) {
    const row = y * gw;
    for (let x = 0; x < gw; x++) U[row + x] = T[row + (x === 0 ? gw - 1 : x - 1)] + T[row + x] + T[row + (x === gw - 1 ? 0 : x + 1)];
  }
  for (let y = 0; y < gh; y++) {
    const up = (y === 0 ? gh - 1 : y - 1) * gw, dn = (y === gh - 1 ? 0 : y + 1) * gw, row = y * gw;
    for (let x = 0; x < gw; x++) { const i = row + x; T[i] = (T[i] * 0.5 + (U[up + x] + U[i] + U[dn + x]) * (0.5 / 9)) * dec; }
  }
}
const PHYSARUM = {
  name: "Physarum", flav: "Emergence",
  reset: (w: number, h: number) => {
    const G = grid(w, h, 90000), R = rng((Math.random() * 1e9) | 0);
    const n = Math.round(G.n * 0.3), x = new Float32Array(n), y = new Float32Array(n), hd = new Float32Array(n);
        for (let i = 0; i < n; i++) { x[i] = R() * G.gw; y[i] = R() * G.gh; hd[i] = R() * TAU; }
    const sc = G.gw / 330;
    const s = { G, T: new Float32Array(G.n), U: new Float32Array(G.n), x, y, h: hd, seed: (R() * 0xffffffff) | 1,
      SO: 9 * sc, SA: 0.4, RA: 0.75, decay: 0.9, acc: 0, lt: null, ref: 0, k0: R() * 1000 };
    for (let k = 0; k < 90; k++) physStep(s);
    return s;
  },
  frame: (g: any, w: number, h: number, t: number, c: C, s: any) => {
    const dt = tick(s, t);
    // the sensor angle drifts, so the network keeps re-routing: tight lace at small angles, broad veins at wide
    s.SA = 0.48 + 0.2 * Math.sin((t + s.k0 * 97) * 0.000045);
    s.acc += dt;
    const per = 1000 / 24;
    for (let k = 0; s.acc >= per && k < 2; k++) { physStep(s); s.acc -= per; }
    if (s.acc > per) s.acc = 0;
    const T = s.T, px = s.G.px, n = s.G.n;
    let sum = 0;
    for (let i = 0; i < n; i += 7) sum += T[i];
    const mean = (sum * 7) / n;
    s.ref = s.ref ? s.ref + (mean - s.ref) * 0.05 : mean;
    const kk = 1 / (Math.max(s.ref, 1e-3) * 2.2);
    const lo = lift(c.pal[2]), hi = lift(c.pal[0]);
    const lr = lo[0], lg = lo[1], lb = lo[2], hr = hi[0] - lo[0], hg = hi[1] - lo[1], hb = hi[2] - lo[2];
    const br = c.br, bg = c.bg2, bb = c.bb;
    for (let i = 0; i < n; i++) {
      let v = T[i] * kk; v = v / (1 + v);
      const a = 0.85 * v * v * (1.6 - 0.6 * v);
      const r = lr + hr * v, gg = lg + hg * v, b = lb + hb * v;
      px[i] = pack(br + (r - br) * a, bg + (gg - bg) * a, bb + (b - bb) * a);
    }
    blit(g, s.G, w, h);
  },
};

// ── Ising ────────────────────────────────────────────────────────────────────
// Metropolis on a square lattice, checkerboard sweeps. The temperature breathes around the
// critical point (2.269): below it domains coarsen into continents, above it they shatter.
// Drawn as a running average of each spin, so the flicker of single flips reads as a shimmer
// on the edges of the domains.
function isingSweep(s: any) {
  const { gw, gh } = s.G, S = s.S, P = s.P;
  let r = s.seed;
  for (let par = 0; par < 2; par++) {
    for (let y = 0; y < gh; y++) {
      const up = (y === 0 ? gh - 1 : y - 1) * gw, dn = (y === gh - 1 ? 0 : y + 1) * gw, row = y * gw;
      for (let x = (y + par) & 1; x < gw; x += 2) {
        const i = row + x, sp = S[i];
        const nb = S[row + (x === 0 ? gw - 1 : x - 1)] + S[row + (x === gw - 1 ? 0 : x + 1)] + S[up + x] + S[dn + x];
        const e = sp * nb; // 2*e is the energy cost of flipping, e in {-4,-2,0,2,4}
        if (e <= 0) { S[i] = -sp; continue; }
        r ^= r << 13; r ^= r >>> 17; r ^= r << 5;
        if ((r >>> 0) / 4294967296 < P[e >> 1]) S[i] = -sp;
      }
    }
  }
  s.seed = r;
}
const ISING = {
  name: "Ising", flav: "Emergence",
  reset: (w: number, h: number) => {
    const G = grid(w, h, 60000), R = rng((Math.random() * 1e9) | 0);
    const S = new Int8Array(G.n), M = new Float32Array(G.n);
    for (let i = 0; i < G.n; i++) S[i] = R() < 0.5 ? -1 : 1;
    const s = { G, S, M, P: new Float64Array(3), seed: (R() * 0xffffffff) | 1, acc: 0, lt: null, ph: R() * TAU, T: 2.1 };
    const setT = (T: number) => { s.T = T; s.P[1] = Math.exp(-4 / T); s.P[2] = Math.exp(-8 / T); };
    (s as any).setT = setT;
    setT(2.0);
    for (let k = 0; k < 160; k++) isingSweep(s);
    for (let i = 0; i < G.n; i++) M[i] = S[i];
    return s;
  },
  frame: (g: any, w: number, h: number, t: number, c: C, s: any) => {
    const dt = tick(s, t);
    // a slow breath across the transition, lingering just under it where the structure is richest
    const u = Math.sin(t * 0.00006 + s.ph);
    s.setT(2.15 + 0.09 * u);
    s.acc += dt;
    const per = 1000 / 14;
    for (let k = 0; s.acc >= per && k < 2; k++) { isingSweep(s); s.acc -= per; }
    if (s.acc > per) s.acc = 0;
    const S = s.S, M = s.M, px = s.G.px, n = s.G.n;
    const A = lift(c.pal[0]), B = lift(c.pal[1]);
    const ar = A[0], ag = A[1], ab = A[2], br2 = B[0], bg2 = B[1], bb2 = B[2];
    const br = c.br, bg = c.bg2, bb = c.bb;
    const kM = 1 - Math.exp(-dt / 1400);
    for (let i = 0; i < n; i++) {
      const m = (M[i] += (S[i] - M[i]) * kM);
      // each domain a quiet tone of its own; the walls between them glow in the accent
      const am = m < 0 ? -m : m, a = 0.13 * am * am, e = 1 - am, wl = 0.8 * e * e * e;
      const r = m > 0 ? br2 : ar, gg = m > 0 ? bg2 : ag, b = m > 0 ? bb2 : ab;
      px[i] = pack(br + (r - br) * a + (ar - br) * wl, bg + (gg - bg) * a + (ag - bg) * wl, bb + (b - bb) * a + (ab - bb) * wl);
    }
    blit(g, s.G, w, h);
  },
};

export const SCENES_EMERGENCE = [BELOUSOV, PHYSARUM, ISING];
