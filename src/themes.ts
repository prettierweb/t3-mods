// @ts-nocheck
/* eslint-disable */
// Themes (Nov 14): three full looks, each a scene with its own fixed palette plus a colour look
// for T3's surfaces, picked together from the Look panel. Each scene bakes its still parts once
// (sky, ring, ridges) at reset and per frame draws only what moves, so a frame stays near 1 ms.
//   Ring:  Halo 3's mood. A ringworld over a dark planet, ray-cast once; sunlight goes round its
//          inner face, the stars breathe. Comes with a UI skin (RING_CSS).
//   Reach: Reach's last evening. Ridges in silhouette against a burning horizon; embers and ash
//          rise on the wind.
//   Glass: Apple's liquid-glass wallpapers. Soft fields of colour drift slowly behind frosted
//          panels (the theme turns T3's glass fully on).
import type { Look } from "./looks";

const TAU = Math.PI * 2;
const R = Math.random;
const off = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ── Ring ────────────────────────────────────────────────────────────────────
// A ringworld over a dark ocean planet, ray-cast once per size into a still picture: the planet's
// limb with its thin lit atmosphere, the ring as a real cylinder band in perspective (inner face
// of sea, land and cloud between two metal rims; outer face of dark plating), stars in three
// depths and a faint nebula band. The one motion is sunlight travelling round the ring's inner
// face. For that the lit-minus-night picture of the inner face is cut into 72 soft angular
// wedges at bake time (weights overlap to a partition of unity), and each frame adds the wedges
// back with a brightness that depends on where the sun is. A frame is one picture, a few dozen
// small adds and ~100 breathing stars.
const SEED = (Math.random() * 1e6) | 0;
const hash2 = (x: number, y: number) => { let n = Math.imul(x + SEED, 374761393) ^ Math.imul(y, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const vnoise = (x: number, y: number, per: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const x0 = ((xi % per) + per) % per, x1 = (x0 + 1) % per;
  const a = hash2(x0, yi), b = hash2(x1, yi), c = hash2(x0, yi + 1), d = hash2(x1, yi + 1);
  return a + (b - a) * u + (c - a + (a - b - c + d) * u) * v;
};
const fbm = (x: number, y: number, per: number, oct: number) => {
  let a = 0.5, s = 0, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x, y, per); n += a; x *= 2; y *= 2; per *= 2; a *= 0.5; }
  return s / n;
};
const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const norm3 = (v: number[]) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
const cross3 = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

const RING_K = 72;          // angular wedges of the lit layer
const RING_TURN = 140000;   // ms for the sunlight to go once round
const RING = { F: 1.15, P: [2.3, -6.75, -6.6], Rp: 5.9, L: norm3([0.5, -0.2, -1.15]), cs: [0.56, 0.1], dist: 8, Rr: 3.6, Wd: 0.25, el: 0.27, roll: 0.26 };

const bakeRing = (w: number, h: number) => {
  const { F, P, Rp, L, Rr, Wd } = RING;
  // sky: gradient, a wide wash of teal where the sun sits behind the planet, nebula, stars
  const skyC = off(w, h), sg = skyC.getContext("2d", { willReadFrequently: true });
  const grad = sg.createLinearGradient(0, 0, w * 0.6, h);
  grad.addColorStop(0, "#02040a"); grad.addColorStop(0.5, "#040b18"); grad.addColorStop(1, "#061727");
  sg.fillStyle = grad; sg.fillRect(0, 0, w, h);
  const wash = sg.createRadialGradient(w * 0.86, h * 0.8, 0, w * 0.86, h * 0.8, h * 1.1);
  wash.addColorStop(0, "rgba(26,110,140,0.30)"); wash.addColorStop(0.45, "rgba(14,60,96,0.12)"); wash.addColorStop(1, "rgba(0,0,0,0)");
  sg.fillStyle = wash; sg.fillRect(0, 0, w, h);
  const bx = 0.92, by = 0.39, bn = Math.hypot(bx, by);
  const band = (x: number, y: number) => { const d = ((x - w * 0.6) * by - (y - h * 0.2) * bx) / bn / (h * 0.13); return Math.exp(-d * d); };
  const nw = Math.max(8, w >> 3), nh = Math.max(8, h >> 3), neb = off(nw, nh), ng = neb.getContext("2d"), nd = ng.createImageData(nw, nh);
  for (let y = 0, i = 0; y < nh; y++) for (let x = 0; x < nw; x++, i += 4) {
    const n1 = fbm(x * 9 / nh + 3, y * 9 / nh + 11, 4096, 5), n2 = fbm(x * 5 / nh + 40, y * 5 / nh + 7, 4096, 4), bd = band(x * 8, y * 8);
    const a = sstep(0.42, 0.78, n1) * (0.1 + 0.3 * bd), k = sstep(0.35, 0.65, n2);
    nd.data[i] = 30 + 22 * k; nd.data[i + 1] = 62 + 60 * (1 - k); nd.data[i + 2] = 150 - 20 * (1 - k); nd.data[i + 3] = a * 255;
  }
  ng.putImageData(nd, 0, 0);
  sg.imageSmoothingEnabled = true; sg.imageSmoothingQuality = "high"; sg.drawImage(neb, 0, 0, w, h);
  const area = w * h;
  const place = () => { for (let i = 0; i < 6; i++) { const x = R() * w, y = R() * h; if (R() < 0.3 + 0.7 * band(x, y)) return [x, y]; } return [R() * w, R() * h]; };
  for (let i = 0, n = area / 900; i < n; i++) { const [x, y] = place(); sg.fillStyle = `rgba(190,210,240,${(0.1 + R() * 0.28).toFixed(2)})`; sg.fillRect(x, y, 0.8, 0.8); }
  for (let i = 0, n = area / 5200; i < n; i++) { const [x, y] = place(), r = 0.9 + R() * 0.5; sg.fillStyle = `rgba(${R() < 0.2 ? "255,232,205" : "205,226,255"},${(0.35 + R() * 0.4).toFixed(2)})`; sg.fillRect(x, y, r, r); }
  for (let i = 0, n = area / 110000; i < n; i++) {
    const [x, y] = place(), r = 3 + R() * 3.5, hg = sg.createRadialGradient(x, y, 0, x, y, r), col = R() < 0.25 ? "255,226,196" : "190,220,255";
    hg.addColorStop(0, `rgba(${col},0.9)`); hg.addColorStop(0.22, `rgba(${col},0.22)`); hg.addColorStop(1, `rgba(${col},0)`);
    sg.fillStyle = hg; sg.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const img = sg.getImageData(0, 0, w, h), px = img.data, skyPx = new Uint8ClampedArray(px);

  // the ring's frame
  const Cr = norm3([RING.cs[0], RING.cs[1], -F]).map((v) => v * RING.dist);
  const A = [-Math.sin(RING.roll) * Math.cos(RING.el), Math.cos(RING.roll) * Math.cos(RING.el), Math.sin(RING.el)];
  const e1 = norm3(cross3(A, [0, 0, 1])), e2 = cross3(A, e1);
  const q0 = [-Cr[0], -Cr[1], -Cr[2]], qa = q0[0] * A[0] + q0[1] * A[1] + q0[2] * A[2];
  const qr = [q0[0] - qa * A[0], q0[1] - qa * A[1], q0[2] - qa * A[2]], cq = qr[0] * qr[0] + qr[1] * qr[1] + qr[2] * qr[2] - Rr * Rr;
  const PP = P[0] * P[0] + P[1] * P[1] + P[2] * P[2], tN = RING.dist - Rr, tF = RING.dist + Rr;
  const PER = 420, VS = (Wd * PER) / (TAU * Rr);
  // o: 0-2 colour, 3 cover, 4-6 glow (added), 7-9 lit-minus-night, 10 lit cover, 11 angle, 12 id
  const o = new Float64Array(13);
  const trace = (sx: number, sy: number) => {
    let dx = (sx - w / 2) / h, dy = (h / 2 - sy) / h, dz = -F;
    const dl = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz); dx *= dl; dy *= dl; dz *= dl;
    o[3] = 0; o[4] = o[5] = o[6] = 0; o[10] = 0; o[12] = 0;
    const pc = P[0] * dx + P[1] * dy + P[2] * dz, b2 = PP - pc * pc;
    let tP = Infinity;
    if (pc > 0 && b2 < Rp * Rp) tP = pc - Math.sqrt(Rp * Rp - b2);
    // ring
    const da = dx * A[0] + dy * A[1] + dz * A[2], rx = dx - da * A[0], ry = dy - da * A[1], rz = dz - da * A[2];
    const aa = rx * rx + ry * ry + rz * rz, bb = qr[0] * rx + qr[1] * ry + qr[2] * rz, disc = bb * bb - aa * cq;
    let tR = Infinity, inner = false, hv = 0;
    if (disc > 0) {
      const sq = Math.sqrt(disc), t1 = (-bb - sq) / aa, t2 = (-bb + sq) / aa, h1 = qa + t1 * da, h2 = qa + t2 * da;
      if (t1 > 0 && Math.abs(h1) <= Wd) { tR = t1; hv = h1 / Wd; }
      else if (t2 > 0 && Math.abs(h2) <= Wd) { tR = t2; hv = h2 / Wd; inner = true; }
    }
    // atmosphere outside the limb
    let gl = 0;
    if (tP === Infinity && pc > 0) {
      const b = Math.sqrt(b2), x = (b - Rp) / Rp;
      if (x < 0.3) {
        // forward scatter: brightest where the line of sight passes nearest the sun hidden behind the limb
        const near = dx * L[0] + dy * L[1] + dz * L[2], glSun = 0.16 + 0.84 * sstep(0.8, 0.995, near);
        gl = glSun * (0.95 * Math.exp(-x / 0.0035) + 0.46 * Math.exp(-x / 0.02) + 0.3 * sstep(0.9, 1, near) * Math.exp(-x / 0.1));
      }
    }
    if (tR < tP) {
      const hx = q0[0] + dx * tR, hy = q0[1] + dy * tR, hz = q0[2] + dz * tR;
      const th = Math.atan2(hx * e2[0] + hy * e2[1] + hz * e2[2], hx * e1[0] + hy * e1[1] + hz * e1[2]);
      const u = ((th / TAU + 1) % 1) * PER, vv = hv * VS, av = Math.abs(hv);
      const fog = sstep(tN, tF, tR) * 0.5;
      let r, gg, b, lr = 0, lg = 0, lb = 0;
      if (inner) {
        const wx = (fbm(u * 0.5, vv * 0.5 + 200, PER / 2, 3) - 0.5) * 5, wy = (fbm(u * 0.5 + 0.5, vv * 0.5 + 300, PER / 2, 3) - 0.5) * 5;
        const land = fbm(u * 0.25 + wx * 0.5, vv * 0.25 + wy * 0.5 + 9, PER / 4, 6) + 0.04 * (1 - av * av), coast = sstep(0.5, 0.52, land);
        const dry = fbm(u + wy, vv + 50, PER, 4), cl = sstep(0.5, 0.82, fbm(u * 0.125 + wy * 0.35, vv * 0.8 + wx * 0.5 + 90, PER / 8, 5));
        const shallow = sstep(0.4, 0.5, land);
        let ar = lerp(lerp(7, 16, shallow), lerp(40, 112, dry), coast), ag = lerp(lerp(34, 86, shallow), lerp(86, 106, dry), coast), ab = lerp(lerp(74, 116, shallow), lerp(60, 78, dry), coast);
        ar = lerp(ar, 214, cl * 0.82); ag = lerp(ag, 228, cl * 0.82); ab = lerp(ab, 242, cl * 0.82);
        // the walls: a band of metal along each edge, a bright lip on the very edge
        const wall = sstep(0.86, 0.9, av), lip = sstep(0.955, 0.975, av);
        ar = lerp(ar, lerp(84, 205, lip), wall); ag = lerp(ag, lerp(104, 226, lip), wall); ab = lerp(ab, lerp(128, 244, lip), wall);
        const air = 0.18 * sstep(0.5, 0.9, av) * (1 - wall);
        ar = lerp(ar, 120, air); ag = lerp(ag, 190, air); ab = lerp(ab, 230, air);
        const night = 0.1 + 0.26 * lip;
        r = ar * night + 2; gg = ag * night + 5; b = ab * night + 10;
        const day = (0.92 - night) * (1 - fog * 0.6);
        lr = ar * day; lg = ag * day; lb = ab * day;
        o[10] = 1; o[11] = th;
      } else {
        // outer face: plating in long courses, cross seams, a trench down the middle, lit from the sun
        const nl = Math.max(0, Math.cos(th) * (e1[0] * L[0] + e1[1] * L[1] + e1[2] * L[2]) + Math.sin(th) * (e2[0] * L[0] + e2[1] * L[1] + e2[2] * L[2]));
        const course = av < 0.16 ? 0 : av < 0.5 ? 1 : av < 0.8 ? 2 : 3, side = hv < 0 ? 0 : 4, ku = [0.09, 0.05, 0.14, 0.03][course];
        const cu = u * ku + (course + side) * 0.37, cell = Math.floor(cu), fu = (cu - cell) / ku, edge = [0.16, 0.5, 0.8, 1][course];
        let m = 0.8 + 0.32 * hash2(cell, course + side + 77) + 0.25 * (fbm(u * 0.3, hv * 3, PER, 3) - 0.5);
        m *= 1 - 0.5 * (1 - sstep(0, 0.18, Math.min(fu, 1 / ku - fu))) - 0.5 * (1 - sstep(0, 0.02, Math.abs(av - edge))) * (course < 3 ? 1 : 0);
        if (course === 0) m *= 0.5; if (course === 2) m *= 0.82;
        const lip = sstep(0.95, 0.98, av), lit = (0.62 + 1.4 * nl) * (1 + 0.35 * hv);
        r = lerp(34 * m * lit, 150, lip); gg = lerp(46 * m * lit, 176, lip); b = lerp(66 * m * lit, 205, lip);
      }
      r = lerp(r, 9, fog); gg = lerp(gg, 24, fog); b = lerp(b, 42, fog);
      if (gl > 0 && tR > pc) { const k = Math.min(1, gl * 1.6); r *= 1 - k; gg *= 1 - k; b *= 1 - k; lr *= 1 - k; lg *= 1 - k; lb *= 1 - k; }
      else gl = 0;
      o[0] = r; o[1] = gg; o[2] = b; o[3] = 1; o[7] = lr; o[8] = lg; o[9] = lb; o[12] = inner ? 2 : 3;
    } else if (tP < Infinity) {
      const nx = (dx * tP - P[0]) / Rp, ny = (dy * tP - P[1]) / Rp, nz = (dz * tP - P[2]) / Rp;
      const ndl = nx * L[0] + ny * L[1] + nz * L[2], ndv = -(nx * dx + ny * dy + nz * dz);
      const day = sstep(-0.08, 0.32, ndl), cl = sstep(0.4, 0.75, fbm(nx * 26 + nz * 9, ny * 60 + nz * 34, 8192, 5)), sea = fbm(nx * 60, nz * 60 + ny * 40, 8192, 3);
      const atm = Math.pow(1 - ndv, 5), wrap = 0.14 + 0.86 * sstep(0.8, 0.995, dx * L[0] + dy * L[1] + dz * L[2]);
      o[0] = 2 + day * (10 + 12 * sea + 120 * cl) + atm * wrap * 80 + cl * 3;
      o[1] = 5 + day * (40 + 26 * sea + 128 * cl) + atm * wrap * 190 + cl * 6;
      o[2] = 11 + day * (70 + 30 * sea + 124 * cl) + atm * wrap * 235 + cl * 9;
      o[3] = 1; o[12] = 1; gl = 0;
    }
    if (gl > 0) { const m = Math.min(1, gl); o[4] = gl * (60 + 150 * m); o[5] = gl * (150 + 80 * m); o[6] = gl * (200 + 50 * m); }
  };
  const ids = new Uint8Array(w * h), lit = new Uint8ClampedArray(w * h * 4), ang = new Float32Array(w * h);
  const put = (i: number, c0: number, c1: number, c2: number, cov: number, g0: number, g1: number, g2: number, l0: number, l1: number, l2: number, lc: number, th: number) => {
    const j = i * 4;
    px[j] = skyPx[j] * (1 - cov) + c0 + g0; px[j + 1] = skyPx[j + 1] * (1 - cov) + c1 + g1; px[j + 2] = skyPx[j + 2] * (1 - cov) + c2 + g2; px[j + 3] = 255;
    if (lc > 0) { lit[j] = l0 / lc; lit[j + 1] = l1 / lc; lit[j + 2] = l2 / lc; lit[j + 3] = lc * 255; ang[i] = th; }
  };
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) {
    trace(x + 0.5, y + 0.5); ids[i] = o[12];
    put(i, o[0] * o[3], o[1] * o[3], o[2] * o[3], o[3], o[4], o[5], o[6], o[7] * o[10], o[8] * o[10], o[9] * o[10], o[10], o[11]);
  }
  // edges again, nine samples each
  const acc = new Float64Array(12);
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) {
    const id = ids[i];
    if (!((x > 0 && ids[i - 1] !== id) || (x < w - 1 && ids[i + 1] !== id) || (y > 0 && ids[i - w] !== id) || (y < h - 1 && ids[i + w] !== id))) continue;
    acc.fill(0);
    for (let s = 0; s < 9; s++) {
      trace(x + ((s % 3) + 0.5) / 3, y + (((s / 3) | 0) + 0.5) / 3);
      acc[0] += o[0] * o[3]; acc[1] += o[1] * o[3]; acc[2] += o[2] * o[3]; acc[3] += o[3]; acc[4] += o[4]; acc[5] += o[5]; acc[6] += o[6];
      if (o[10]) { acc[7] += o[7]; acc[8] += o[8]; acc[9] += o[9]; acc[10] += 1; acc[11] = o[11]; }
    }
    lit[i * 4 + 3] = 0;
    put(i, acc[0] / 9, acc[1] / 9, acc[2] / 9, acc[3] / 9, acc[4] / 9, acc[5] / 9, acc[6] / 9, acc[7] / 9, acc[8] / 9, acc[9] / 9, acc[10] / 9, acc[11]);
  }
  const bake = off(w, h); bake.getContext("2d").putImageData(img, 0, 0);

  // the lit layer in wedges: each pixel is shared between the two wedges nearest its angle
  const box = Array.from({ length: RING_K }, () => [w, h, -1, -1]);
  const grow = (k: number, x: number, y: number) => { const b = box[k]; if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; };
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) if (lit[i * 4 + 3]) { const f = ((ang[i] / TAU + 1) % 1) * RING_K, k = Math.floor(f) % RING_K; grow(k, x, y); grow((k + 1) % RING_K, x, y); }
  const datas = box.map((b) => (b[2] < 0 ? null : new ImageData(b[2] - b[0] + 1, b[3] - b[1] + 1)));
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) {
    const j = i * 4, a = lit[j + 3]; if (!a) continue;
    const f = ((ang[i] / TAU + 1) % 1) * RING_K, k = Math.floor(f) % RING_K, fr = f - Math.floor(f);
    for (let n = 0; n < 2; n++) {
      const kk = (k + n) % RING_K, d = datas[kk], b = box[kk], q = ((y - b[1]) * d.width + (x - b[0])) * 4;
      d.data[q] = lit[j]; d.data[q + 1] = lit[j + 1]; d.data[q + 2] = lit[j + 2]; d.data[q + 3] = a * (n ? fr : 1 - fr);
    }
  }
  const segs = [];
  datas.forEach((d, k) => { if (!d) return; const c = off(d.width, d.height); c.getContext("2d").putImageData(d, 0, 0); segs.push({ c, x: box[k][0], y: box[k][1], th: (k / RING_K) * TAU }); });
  // the stars that breathe sit on open sky only
  const stars = [];
  for (let n = 0, want = Math.round(area / 26000); stars.length < want && n < want * 8; n++) {
    const x = (R() * w) | 0, y = (R() * h) | 0;
    if (!ids[y * w + x]) stars.push({ x, y, r: 1 + R() * 0.7, ph: R() * TAU, sp: 0.0003 + R() * 0.0007 });
  }
  return { bake, segs, stars, w, h, sx: 1, sy: 1 };
};

let ringKept: any = null, ringTimer = 0;
const Ring = {
  name: "Ring", flav: "Theme",
  reset: (w: number, h: number) => {
    if (ringKept && ringKept.w === w && ringKept.h === h) return ringKept;
    const big = w * h > 250000;
    if (big && ringKept) {
      // mid-resize: show the last picture stretched now, bake the new size once the size settles
      const s = { ...ringKept, sx: w / ringKept.w, sy: h / ringKept.h };
      clearTimeout(ringTimer);
      ringTimer = window.setTimeout(() => { Object.assign(s, bakeRing(w, h)); ringKept = s; }, 350);
      return s;
    }
    const s = bakeRing(w, h);
    if (big) ringKept = s;
    return s;
  },
  frame: (g: any, w: number, h: number, t: number, c: any, s: any) => {
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    g.setTransform(s.sx, 0, 0, s.sy, 0, 0);
    g.drawImage(s.bake, 0, 0);
    g.globalCompositeOperation = "lighter";
    g.fillStyle = "rgb(205,228,255)";
    for (const st of s.stars) { g.globalAlpha = 0.3 + 0.3 * Math.sin(st.ph + t * st.sp); g.fillRect(st.x, st.y, st.r, st.r); }
    // sunlight goes round the inner face: full on one side, a long soft edge into night on the other
    const sun = RING_SUN0 + (t / RING_TURN) * TAU;
    for (const sg of s.segs) {
      const k = Math.cos(sg.th - sun), a = sstep(-0.5, 0.35, k);
      if (a < 0.01) continue;
      g.globalAlpha = a * (0.8 + 0.2 * sstep(0.6, 1, k));
      g.drawImage(sg.c, sg.x, sg.y);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    g.setTransform(1, 0, 0, 1, 0, 0);
  },
};
const RING_SUN0 = 2.2;

/** the skin: T3 surfaces under the Ring theme. Dark glass panels with a hairline cool rim, visor
 *  blue for what is selected or working, shield green for done. */
export const RING_CSS = `
  html[data-t3-theme="Ring"] {
    --rg-visor: oklch(0.88 0.07 236); --rg-blue: oklch(0.77 0.125 246); --rg-shield: oklch(0.85 0.15 158);
    --rg-deep: oklch(0.125 0.032 256);
    --rg-line: color-mix(in oklch, var(--rg-visor) 13%, transparent);
    --rg-line-2: color-mix(in oklch, var(--rg-visor) 26%, transparent);
    --rg-glass: color-mix(in oklch, var(--rg-deep) 66%, transparent);
    --primary: var(--rg-visor) !important; --ring: var(--rg-blue) !important;
    --info: var(--rg-blue) !important; --info-foreground: var(--rg-blue) !important;
    --success: var(--rg-shield) !important; --success-foreground: var(--rg-shield) !important;
    --border: var(--rg-line) !important; --sidebar-border: var(--rg-line) !important;
  }
  html[data-t3-theme="Ring"] ::selection { background: color-mix(in oklch, var(--rg-blue) 38%, transparent); }
  /* panels: sidebar and conversation are two sheets of dark glass with one hairline between them */
  html[data-t3-theme="Ring"] .bg-sidebar {
    background-color: color-mix(in oklch, var(--rg-deep) 74%, transparent) !important;
    backdrop-filter: blur(26px) saturate(135%);
    box-shadow: inset -1px 0 0 var(--rg-line);
  }
  html[data-t3-theme="Ring"] [data-workspace-area="conversation"] {
    background-color: color-mix(in oklch, var(--rg-deep) 58%, transparent) !important;
    backdrop-filter: blur(16px) saturate(125%);
    box-shadow: inset -1px 0 0 var(--rg-line);
  }
  /* a lane is its own see-through window: nothing to blur, so the sheet is a little denser */
  html[data-t3-theme="Ring"][data-t3-lane] [data-workspace-area="conversation"] { backdrop-filter: none; box-shadow: none; background-color: color-mix(in oklch, var(--rg-deep) 72%, transparent) !important; }
  /* the open chat: a visor-blue bar on the left edge and a wash that fades out to the right */
  html[data-t3-theme="Ring"] [data-sidebar-row][aria-current="page"] {
    background: linear-gradient(90deg, color-mix(in oklch, var(--rg-blue) 22%, transparent), color-mix(in oklch, var(--rg-blue) 5%, transparent)) !important;
    box-shadow: inset 2px 0 0 var(--rg-visor);
  }
  html[data-t3-theme="Ring"] [data-sidebar-row]:hover { background-color: color-mix(in oklch, var(--rg-visor) 7%, transparent); }
  html[data-t3-theme="Ring"] #t3s-recent .t3s-recent-row[aria-current="true"] { background: color-mix(in oklch, var(--rg-blue) 14%, transparent); }
  html[data-t3-theme="Ring"] #t3s-recent .t3s-recent-state[data-s="working"],
  html[data-t3-theme="Ring"] #t3s-lane-status[data-state="working"] b { color: var(--rg-blue); }
  html[data-t3-theme="Ring"] #t3s-lane-status[data-state="done"] b { color: var(--rg-shield); opacity: 1; }
  /* your messages: a tinted glass card, lit along its top edge */
  html[data-t3-theme="Ring"] [data-message-role="user"] .bg-message {
    background: color-mix(in oklch, var(--rg-blue) 15%, var(--rg-glass)) !important;
    border: 1px solid var(--rg-line-2);
    box-shadow: inset 0 1px 0 color-mix(in oklch, var(--rg-visor) 14%, transparent);
  }
  /* composer: deep glass, the rim turns blue while you type */
  html[data-t3-theme="Ring"] [data-slot="composer-host"] {
    background: color-mix(in oklch, var(--rg-deep) 78%, transparent);
    outline: 1px solid var(--rg-line-2); outline-offset: -1px;
    transition: outline-color 160ms ease, box-shadow 160ms ease;
  }
  html[data-t3-theme="Ring"] [data-slot="composer-host"]:focus-within {
    outline-color: color-mix(in oklch, var(--rg-blue) 70%, transparent);
    box-shadow: 0 0 0 4px color-mix(in oklch, var(--rg-blue) 13%, transparent) !important;
  }
  /* code on deep navy */
  html[data-t3-theme="Ring"] .chat-markdown-codeblock {
    background: oklch(0.105 0.03 256 / 0.9) !important;
    border: 1px solid var(--rg-line) !important;
  }
  html[data-t3-theme="Ring"] .chat-markdown :not(pre) > code {
    background: color-mix(in oklch, var(--rg-visor) 9%, transparent); color: var(--rg-visor);
    border: 1px solid var(--rg-line);
  }
  html[data-t3-theme="Ring"] .chat-markdown a { color: var(--rg-blue); }
  html[data-t3-theme="Ring"] .chat-markdown hr { border-color: var(--rg-line); }
  /* menus, popovers, tooltips: the same glass, a stronger rim, a real shadow */
  html[data-t3-theme="Ring"] [data-slot="menu-popup"], html[data-t3-theme="Ring"] [data-slot="popover-popup"] {
    background: color-mix(in oklch, var(--rg-deep) 88%, transparent) !important;
    backdrop-filter: blur(24px) saturate(140%);
    border: 1px solid var(--rg-line-2) !important;
    box-shadow: 0 18px 48px rgb(0 0 0 / 0.55), inset 0 1px 0 color-mix(in oklch, var(--rg-visor) 10%, transparent) !important;
  }
  html[data-t3-theme="Ring"] [data-slot="tooltip-popup"] {
    background: var(--rg-deep) !important; border: 1px solid var(--rg-line-2) !important; color: var(--rg-visor) !important;
  }
  html[data-t3-theme="Ring"] [data-slot="button"]:focus-visible { outline: 2px solid var(--rg-blue); outline-offset: 1px; }
  html[data-t3-theme="Ring"] *::-webkit-scrollbar-thumb { background-color: color-mix(in oklch, var(--rg-visor) 20%, transparent); }
`;

// ── Reach ───────────────────────────────────────────────────────────────────
// Three ridge lines from midpoint displacement, darkest in front, against an ash sky that burns
// orange at the horizon. Embers rise and sway; a slow breath brightens the horizon glow.
const ridge = (w: number, base: number, rough: number) => {
  let pts = [base + (R() - 0.5) * rough, base + (R() - 0.5) * rough];
  let amp = rough;
  while (pts.length < 257) {
    const n = [];
    for (let i = 0; i < pts.length - 1; i++) n.push(pts[i], (pts[i] + pts[i + 1]) / 2 + (R() - 0.5) * amp);
    n.push(pts[pts.length - 1]); pts = n; amp *= 0.55;
  }
  return pts;
};
const Reach = {
  name: "Reach", flav: "Theme",
  reset: (w: number, h: number) => {
    const bake = off(w, h), g = bake.getContext("2d");
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#0d0b0b"); sky.addColorStop(0.45, "#1d1714"); sky.addColorStop(0.72, "#4a2a18"); sky.addColorStop(0.86, "#8a4419"); sky.addColorStop(1, "#b5591c");
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    // smoke banks, low and wide
    for (let i = 0; i < 9; i++) {
      const x = R() * w, y = h * (0.35 + R() * 0.35), rx = w * (0.2 + R() * 0.3), ry = h * (0.04 + R() * 0.06);
      g.save(); g.translate(x, y); g.scale(1, ry / rx);
      const sm = g.createRadialGradient(0, 0, 0, 0, 0, rx);
      sm.addColorStop(0, "rgba(30,22,18,0.35)"); sm.addColorStop(1, "rgba(30,22,18,0)");
      g.fillStyle = sm; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore();
    }
    const layers = [
      { base: 0.66, rough: 0.16, col: "#3a2216" },
      { base: 0.76, rough: 0.12, col: "#211510" },
      { base: 0.87, rough: 0.09, col: "#0e0a08" },
    ];
    for (const L of layers) {
      const pts = ridge(w, h * L.base, h * L.rough);
      g.fillStyle = L.col; g.beginPath(); g.moveTo(0, h);
      pts.forEach((y, i) => g.lineTo((i / (pts.length - 1)) * w, y));
      g.lineTo(w, h); g.closePath(); g.fill();
    }
    const embers = Array.from({ length: Math.round((w * h) / 16000) }, () => ({ x: R() * w, y: R() * h, v: 0.012 + R() * 0.03, sw: 8 + R() * 26, ph: R() * TAU, r: 0.8 + R() * 1.6, hot: R() }));
    return { bake, embers, last: 0 };
  },
  frame: (g: any, w: number, h: number, t: number, c: any, s: any) => {
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    g.drawImage(s.bake, 0, 0, w, h);
    const dt = Math.min(100, s.last ? t - s.last : 33); s.last = t;
    // the horizon breathes, one breath every 14 s
    const br = 0.5 + 0.5 * Math.sin(t / 14000 * TAU);
    const glow = g.createLinearGradient(0, h * 0.62, 0, h);
    glow.addColorStop(0, "rgba(255,120,40,0)"); glow.addColorStop(1, `rgba(255,120,40,${(0.05 + 0.08 * br).toFixed(3)})`);
    g.globalCompositeOperation = "lighter";
    g.fillStyle = glow; g.fillRect(0, h * 0.62, w, h * 0.38);
    for (const e of s.embers) {
      e.y -= e.v * dt; e.x += 0.006 * dt;
      if (e.y < -10) { e.y = h + 10; e.x = R() * w; }
      if (e.x > w + 10) e.x = -10;
      const x = e.x + Math.sin(e.ph + t * 0.0006) * e.sw;
      const life = Math.min(1, (h - e.y) / (h * 0.15)) * Math.min(1, e.y / (h * 0.35));
      const a = Math.max(0, life) * (0.35 + 0.5 * e.hot) * (0.75 + 0.25 * Math.sin(e.ph + t * 0.004));
      g.fillStyle = e.hot > 0.7 ? `rgba(255,190,110,${a.toFixed(3)})` : `rgba(240,110,45,${(a * 0.8).toFixed(3)})`;
      g.beginPath(); g.arc(x, e.y, e.r, 0, TAU); g.fill();
    }
    g.globalCompositeOperation = "source-over";
  },
};

// ── Glass ───────────────────────────────────────────────────────────────────
// Five soft colour fields on slow Lissajous paths, drawn small (1/8 size) and scaled up, so the
// blur comes free and a frame costs almost nothing.
const GLASS_COLS = [[64, 92, 255], [150, 70, 235], [20, 190, 205], [255, 95, 160], [40, 120, 255]];
const Glass = {
  name: "Glass", flav: "Theme",
  reset: (w: number, h: number) => {
    const sw = Math.max(16, Math.round(w / 8)), sh = Math.max(10, Math.round(h / 8));
    const small = off(sw, sh);
    const blobs = GLASS_COLS.map((col, i) => ({ col, ax: 0.3 + R() * 0.25, ay: 0.25 + R() * 0.2, fx: 0.00003 + R() * 0.00004, fy: 0.00003 + R() * 0.00004, px: R() * TAU, py: R() * TAU, r: 0.42 + R() * 0.25, a: i === 3 ? 0.55 : 0.8 }));
    return { small, sw, sh, blobs };
  },
  frame: (g: any, w: number, h: number, t: number, c: any, s: any) => {
    const q = s.small.getContext("2d"), W = s.sw, H = s.sh;
    q.globalCompositeOperation = "source-over";
    q.fillStyle = "#07081a"; q.fillRect(0, 0, W, H);
    q.globalCompositeOperation = "lighter";
    for (const b of s.blobs) {
      const x = W * (0.5 + b.ax * Math.sin(b.px + t * b.fx)), y = H * (0.5 + b.ay * Math.sin(b.py + t * b.fy));
      const r = Math.max(W, H) * b.r;
      const gr = q.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${b.col[0]},${b.col[1]},${b.col[2]},${b.a * 0.55})`);
      gr.addColorStop(0.5, `rgba(${b.col[0]},${b.col[1]},${b.col[2]},${b.a * 0.18})`);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      q.fillStyle = gr; q.fillRect(0, 0, W, H);
    }
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.drawImage(s.small, 0, 0, w, h);
  },
};

export const SCENES_THEMES = [Ring, Reach, Glass];

/** a theme: its scene, the colour look T3's surfaces take, and how strongly the scene shows */
export type Theme = { name: string; scene: string; look: Look; strength: number; blurb: string };
export const THEMES: Theme[] = [
  { name: "Ring", scene: "Ring", strength: 100, blurb: "A ringworld over a dark planet, sunlight going round it",
    look: { name: "Ring", canvasHue: 256, accentHue: 240, vibrance: 0.45, canvasL: 0.15, accentL: 0.87 } },
  { name: "Reach", scene: "Reach", strength: 85, blurb: "Ridges against a burning horizon, rising embers",
    look: { name: "Reach", canvasHue: 45, accentHue: 58, vibrance: 0.5, canvasL: 0.17, accentL: 0.8 } },
  { name: "Glass", scene: "Glass", strength: 90, blurb: "Slow colour behind frosted panels",
    look: { name: "Glass", canvasHue: 270, accentHue: 250, vibrance: 0.4, canvasL: 0.16, accentL: 0.88 } },
];
