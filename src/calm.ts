// @ts-nocheck
/* eslint-disable */
// Calm. Three quiet systems for behind text, in the spirit of Phase and Automata: each is the real
// thing running. Contours are the isolines of a landform that slowly reshapes itself, traced by
// marching squares. Harmonograph is two damped pendulums driving a pen, the way the Victorian
// machine drew; when the swing dies out the drawing fades and a new pair of frequencies starts.
// Moiré is two sets of rings whose centres drift, so their interference fringes wander.
// All three are dark-native and drawn in the theme's tones.

type C = any;
const TAU = Math.PI * 2;
const rgba = (p: number[], a: number) => `rgba(${p[0] | 0},${p[1] | 0},${p[2] | 0},${a})`;
const bgFill = (g: any, c: C, w: number, h: number, a = 1) => { g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.fillStyle = `rgba(${c.br | 0},${c.bg2 | 0},${c.bb | 0},${a})`; g.fillRect(0, 0, w, h); };

// ── Contours ────────────────────────────────────────────────────────────────
// A height field made of a few broad waves at odd angles, each drifting at its own slow rate;
// ten levels are traced with marching squares on a coarse grid and drawn as fine lines.
function height(s: any, x: number, y: number, t: number) {
  let v = 0;
  for (const k of s.waves) v += k.a * Math.sin((x * k.cx + y * k.cy) * k.f + t * k.s + k.p);
  return v;
}
const Contours = {
  name: "Contours", flav: "Calm",
  reset: (w: number, h: number) => {
    const R = Math.random;
    const waves = Array.from({ length: 5 }, (_, i) => { const a = R() * TAU; return { cx: Math.cos(a), cy: Math.sin(a), f: (0.6 + R() * 1.6) / Math.min(w, h) * 6, s: (R() - 0.5) * 0.00012, p: R() * TAU, a: 1 / (i + 1.4) }; });
    return { waves, cell: Math.max(14, Math.round(Math.min(w, h) / 46)) };
  },
  frame: (g: any, w: number, h: number, t: number, c: C, s: any) => {
    bgFill(g, c, w, h);
    const S = s.cell, nx = Math.ceil(w / S) + 1, ny = Math.ceil(h / S) + 1;
    const F = new Float32Array(nx * ny);
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const v = height(s, i * S, j * S, t); F[j * nx + i] = v; if (v < lo) lo = v; if (v > hi) hi = v; }
    const LEVELS = 11;
    g.lineWidth = 1;
    g.lineCap = "round";
    for (let L = 1; L < LEVELS; L++) {
      const iso = lo + ((hi - lo) * L) / LEVELS;
      const major = L % 5 === 0;
      g.strokeStyle = rgba(major ? c.pal[0] : c.pal[L % 3], major ? 0.75 : 0.38);
      g.lineWidth = major ? 1.4 : 1;
      g.beginPath();
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = F[j * nx + i], b = F[j * nx + i + 1], d = F[(j + 1) * nx + i], e = F[(j + 1) * nx + i + 1];
        const code = (a > iso ? 8 : 0) | (b > iso ? 4 : 0) | (e > iso ? 2 : 0) | (d > iso ? 1 : 0);
        if (code === 0 || code === 15) continue;
        const x = i * S, y = j * S;
        const top = [x + (S * (iso - a)) / (b - a), y], right = [x + S, y + (S * (iso - b)) / (e - b)];
        const bottom = [x + (S * (iso - d)) / (e - d), y + S], left = [x, y + (S * (iso - a)) / (d - a)];
        const seg = (p: number[], q: number[]) => { g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); };
        switch (code) {
          case 1: case 14: seg(left, bottom); break;
          case 2: case 13: seg(bottom, right); break;
          case 3: case 12: seg(left, right); break;
          case 4: case 11: seg(top, right); break;
          case 5: seg(left, top); seg(bottom, right); break;
          case 6: case 9: seg(top, bottom); break;
          case 7: case 8: seg(left, top); break;
          case 10: seg(left, bottom); seg(top, right); break;
        }
      }
      g.stroke();
    }
  },
};

// ── Harmonograph ────────────────────────────────────────────────────────────
// x and y are each the sum of two damped pendulums with near-whole frequency ratios. The pen
// advances a little every frame, so the figure draws itself; when the swing has died to a few
// percent the paper fades and a new figure starts.
// a small canvas (a preview card) swings down four times faster and keeps its whole trace, so its few seconds show the spiral
function figure(R: () => number, damp = 1) {
  const base = [2, 3, 3, 4, 5][Math.floor(R() * 5)];
  const f = () => base * (1 + Math.floor(R() * 2)) / 2 + (R() - 0.5) * 0.012;
  return { f: [f(), f(), f(), f()], p: [R() * TAU, R() * TAU, R() * TAU, R() * TAU], d: (0.000007 + R() * 0.000005) * damp, u: 0, born: -1 };
}
const Harmonograph = {
  name: "Harmonograph", flav: "Calm",
  reset: (w: number) => ({ fig: figure(Math.random, w < 400 ? 4 : 1), damp: w < 400 ? 4 : 1, cleared: false, fade: 0 }),
  frame: (g: any, w: number, h: number, t: number, c: C, s: any) => {
    if (!s.cleared) { bgFill(g, c, w, h); s.cleared = true; }
    const F = s.fig, A = Math.min(w, h) * 0.36, cx = w / 2, cy = h / 2;
    const at = (u: number) => {
      const k = Math.exp(-F.d * u);
      return [cx + A * k * 0.5 * (Math.sin(F.f[0] * u * 0.01 + F.p[0]) + Math.sin(F.f[1] * u * 0.01 + F.p[1])),
              cy + A * k * 0.5 * (Math.sin(F.f[2] * u * 0.01 + F.p[2]) + Math.sin(F.f[3] * u * 0.01 + F.p[3]))];
    };
    if (Math.exp(-F.d * F.u) < 0.06) {
      // the paper fades over a couple of seconds, then a new figure
      bgFill(g, c, w, h, 0.05);
      if (++s.fade > 60) { s.fig = figure(Math.random, s.damp); s.fade = 0; bgFill(g, c, w, h); }
      return;
    }
    // the paper keeps a soft memory: older strokes fade slowly under the new ones
    const card = s.damp > 1;
    if (!card) bgFill(g, c, w, h, 0.012);
    g.globalCompositeOperation = "source-over";
    g.lineWidth = card ? 1.1 : 0.9;
    const steps = 60, du = 0.9;
    g.beginPath();
    let p = at(F.u);
    g.moveTo(p[0], p[1]);
    for (let i = 0; i < steps; i++) { F.u += du; p = at(F.u); g.lineTo(p[0], p[1]); }
    const k = Math.exp(-F.d * F.u);
    g.strokeStyle = rgba(k > 0.5 ? c.pal[0] : c.pal[1], (card ? 0.3 : 0.22) + 0.25 * k);
    g.stroke();
  },
};

// ── Moiré ───────────────────────────────────────────────────────────────────
// Two families of evenly spaced rings with centres on slow Lissajous paths. Where they overlap,
// the fringes of their interference appear and move far faster than either set of rings.
const Moire = {
  name: "Moiré", flav: "Calm",
  reset: () => ({ ph: [Math.random() * TAU, Math.random() * TAU, Math.random() * TAU, Math.random() * TAU] }),
  frame: (g: any, w: number, h: number, t: number, c: C, s: any) => {
    bgFill(g, c, w, h);
    const m = Math.min(w, h), gap = Math.max(10, m / 55), R = Math.hypot(w, h);
    const ctr = (k: number) => [w / 2 + w * 0.22 * Math.sin(t * 0.00004 * (k ? 1.3 : 1) + s.ph[k * 2]), h / 2 + h * 0.22 * Math.cos(t * 0.00005 * (k ? 0.8 : 1) + s.ph[k * 2 + 1])];
    g.lineWidth = Math.max(1, gap * 0.18);
    for (let k = 0; k < 2; k++) {
      const [x, y] = ctr(k);
      g.strokeStyle = rgba(c.pal[k], 0.16);
      g.beginPath();
      for (let r = gap; r < R; r += gap) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); }
      g.stroke();
    }
  },
};

export const SCENES_CALM = [Contours, Harmonograph, Moire];
