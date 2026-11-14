// Background scenes from The Grid, only the ones the T3 mods show. Generated; edit with care.
// @ts-nocheck
// from automataEngraving.ts
var AP = (c, i, a) => {
  const p = c.pal[(i % c.pal.length + c.pal.length) % c.pal.length];
  return `rgba(${p[0]},${p[1]},${p[2]},${a})`;
};
var W = (c, a, i = 0) => c.light ? AP(c, i, Math.min(1, a * 1.6)) : `rgba(255,255,255,${a})`;
var PT = (c, i) => c.pal[(i % c.pal.length + c.pal.length) % c.pal.length];
function mk(w, h) {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  return cv;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
var sstep = (a, b, v) => {
  const x = clamp01((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};
var TAU = 6.283185307;
function tick(s, t) {
  const dt = s.lt == null || t < s.lt ? 16.7 : Math.min(50, t - s.lt);
  s.lt = t;
  return dt;
}
var drift = (t, ph, ...per) => {
  let v = 0;
  for (let k = 0; k < per.length; k++) v += Math.sin(TAU * t / (per[k] * 1e3) + ph * (k + 1.7));
  return v / per.length;
};
var colKey = (c) => c.bg + "|" + c.pal.map((p) => p.join(",")).join(";");
function cellLayer(w, h, GW, GH, CS, dot = false) {
  const tile = mk(CS, CS), tx = tile.getContext("2d");
  if (dot && CS >= 3) {
    const gr = tx.createRadialGradient(CS / 2, CS / 2, 0, CS / 2, CS / 2, CS * 0.5);
    gr.addColorStop(0, "#fff");
    gr.addColorStop(0.5, "rgba(255,255,255,.85)");
    gr.addColorStop(0.85, "rgba(255,255,255,.15)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    tx.fillStyle = gr;
    tx.fillRect(0, 0, CS, CS);
  } else if (CS >= 4) {
    const gap = Math.max(1, CS * 0.14), r = CS * 0.26;
    tx.fillStyle = "#fff";
    tx.beginPath();
    if (tx.roundRect) tx.roundRect(gap / 2, gap / 2, CS - gap, CS - gap, r);
    else tx.rect(gap / 2, gap / 2, CS - gap, CS - gap);
    tx.fill();
  } else {
    tx.fillStyle = "#fff";
    tx.fillRect(0, 0, CS, CS);
  }
  const L = mk(GW * CS, GH * CS), lx = L.getContext("2d");
  const b1 = mk(Math.ceil(GW / 2), Math.ceil(GH / 2)), b2 = mk(Math.ceil(GW / 5), Math.ceil(GH / 5));
  return { L, lx, pat: lx.createPattern(tile, "repeat"), b1, b1x: b1.getContext("2d"), b2, b2x: b2.getContext("2d"), GW, GH, CS };
}
function drawCells(g, cl, src, cellA, haloA, bloomA, oy = 0) {
  const { L, lx, GW, GH, CS } = cl, PW = GW * CS, PH = GH * CS;
  lx.globalCompositeOperation = "copy";
  lx.imageSmoothingEnabled = false;
  lx.drawImage(src, 0, 0, PW, PH);
  lx.globalCompositeOperation = "destination-in";
  lx.fillStyle = cl.pat;
  lx.fillRect(0, 0, PW, PH);
  cl.b1x.globalCompositeOperation = "copy";
  cl.b1x.imageSmoothingEnabled = true;
  cl.b1x.drawImage(src, 0, 0, cl.b1.width, cl.b1.height);
  cl.b2x.globalCompositeOperation = "copy";
  cl.b2x.imageSmoothingEnabled = true;
  cl.b2x.drawImage(cl.b1, 0, 0, cl.b2.width, cl.b2.height);
  g.globalCompositeOperation = "lighter";
  g.imageSmoothingEnabled = true;
  if (bloomA > 0) {
    g.globalAlpha = bloomA;
    g.drawImage(cl.b2, 0, oy - CS * 2, PW, PH + CS * 4);
  }
  if (haloA > 0) {
    g.globalAlpha = haloA;
    g.drawImage(cl.b1, 0, oy, PW, PH);
  }
  g.globalAlpha = cellA;
  g.drawImage(L, 0, oy);
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
}
function vignette(s, w, h, c, k = 0.55) {
  const key = w + "x" + h + colKey(c) + k;
  if (s._vk === key) return s._vg;
  const cv = mk(w, h), x = cv.getContext("2d");
  const gr = x.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.2, w * 0.5, h * 0.5, Math.hypot(w, h) * 0.56);
  gr.addColorStop(0, `rgba(${c.br},${c.bg2},${c.bb},0)`);
  gr.addColorStop(1, `rgba(${c.br},${c.bg2},${c.bb},${k})`);
  x.fillStyle = gr;
  x.fillRect(0, 0, w, h);
  s._vk = key;
  s._vg = cv;
  return cv;
}
var LIFE_PAT = {
  glider: [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]],
  lwss: [[1, 0], [4, 0], [0, 1], [0, 2], [4, 2], [0, 3], [1, 3], [2, 3], [3, 3]],
  rpent: [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]],
  acorn: [[1, 0], [3, 1], [0, 2], [1, 2], [4, 2], [5, 2], [6, 2]],
  bhept: [[0, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
  gun: [[24, 0], [22, 1], [24, 1], [12, 2], [13, 2], [20, 2], [21, 2], [34, 2], [35, 2], [11, 3], [15, 3], [20, 3], [21, 3], [34, 3], [35, 3], [0, 4], [1, 4], [10, 4], [16, 4], [20, 4], [21, 4], [0, 5], [1, 5], [10, 5], [14, 5], [16, 5], [17, 5], [22, 5], [24, 5], [10, 6], [16, 6], [24, 6], [11, 7], [15, 7], [12, 8], [13, 8]]
};
function lifeStamp(s, pat, ox, oy, fx, fy, swap, ln) {
  const { GW, GH, a, age, lin } = s;
  let mx = 0, my = 0;
  for (const p of pat) {
    mx = Math.max(mx, p[0]);
    my = Math.max(my, p[1]);
  }
  for (let y = -2; y <= (swap ? mx : my) + 2; y++) for (let x = -2; x <= (swap ? my : mx) + 2; x++) {
    const i = (oy + y + GH) % GH * GW + (ox + x + GW) % GW;
    a[i] = 0;
  }
  for (const p of pat) {
    let px = fx < 0 ? mx - p[0] : p[0], py = fy < 0 ? my - p[1] : p[1];
    if (swap) {
      const q = px;
      px = py;
      py = q;
    }
    const i = (oy + py + GH) % GH * GW + (ox + px + GW) % GW;
    a[i] = 1;
    age[i] = 0;
    lin[i] = ln;
  }
}
function lifeStep(s) {
  const { GW, GH, a, b, age, lin, heat } = s;
  let births = 0;
  for (let y = 0; y < GH; y++) {
    const yp = (y - 1 + GH) % GH * GW, yn = (y + 1) % GH * GW, y0 = y * GW;
    for (let x = 0; x < GW; x++) {
      const xp = x === 0 ? GW - 1 : x - 1, xn = x === GW - 1 ? 0 : x + 1;
      const k = a[yp + xp] + a[yp + x] + a[yp + xn] + a[y0 + xp] + a[y0 + xn] + a[yn + xp] + a[yn + x] + a[yn + xn];
      const i = y0 + x, al = a[i];
      if (al) {
        if (k === 2 || k === 3) {
          b[i] = 1;
          if (age[i] < 65535) age[i]++;
        } else {
          b[i] = 0;
          heat[i] = 1;
        }
      } else if (k === 3) {
        b[i] = 1;
        age[i] = 0;
        births++;
        const n0 = [yp + xp, yp + x, yp + xn, y0 + xp, y0 + xn, yn + xp, yn + x, yn + xn];
        let l0 = -1, l1 = -1, l2 = -1;
        for (let q = 0; q < 8; q++) if (a[n0[q]]) {
          const l = lin[n0[q]];
          if (l0 < 0) l0 = l;
          else if (l1 < 0) l1 = l;
          else {
            l2 = l;
            break;
          }
        }
        lin[i] = l1 === l2 ? l1 : l0;
      } else b[i] = 0;
    }
  }
  s.prev.set(a);
  s.a = b;
  s.b = a;
  s.gen++;
  s.births = s.births * 0.9 + births * 0.1;
}
function lifeInject(s) {
  const R = s.R, { GW, GH } = s;
  let bx = 0, by = 0, best = 1e9;
  for (let k = 0; k < 7; k++) {
    const cx = R() * GW | 0, cy = R() * GH | 0;
    let n = 0;
    for (let y = -9; y <= 9; y += 2) for (let x = -9; x <= 9; x += 2) n += s.a[(cy + y + GH) % GH * GW + (cx + x + GW) % GW];
    if (n < best) {
      best = n;
      bx = cx;
      by = cy;
    }
  }
  const ln = s.win + (R() * 3 | 0) & 255;
  const fx = R() < 0.5 ? 1 : -1, fy = R() < 0.5 ? 1 : -1, sw = R() < 0.5;
  const r = R();
  if (r < 0.34) {
    const n = 3 + (R() * 4 | 0);
    for (let k = 0; k < n; k++) lifeStamp(s, LIFE_PAT.glider, bx + k * 6 * fx + (R() * 3 | 0), by + k * 4 * -fy + (R() * 3 | 0), fx, fy, false, ln);
  } else if (r < 0.5) {
    for (let k = 0; k < 3; k++) lifeStamp(s, LIFE_PAT.lwss, bx, by + k * 9, fx, 1, sw, ln);
  } else if (r < 0.7) lifeStamp(s, LIFE_PAT.rpent, bx, by, fx, fy, sw, ln);
  else if (r < 0.86) lifeStamp(s, LIFE_PAT.acorn, bx, by, fx, fy, sw, ln);
  else if (r < 0.94 && GW > 60 && GH > 30) lifeStamp(s, LIFE_PAT.gun, bx, by, fx, fy, false, ln);
  else lifeStamp(s, LIFE_PAT.bhept, bx, by, fx, fy, sw, ln);
}
var LIFE = {
  name: "Life",
  flav: "Automata",
  reset: (w, h) => {
    const CS = Math.max(2, Math.round(Math.min(w, h) / 112));
    const GW = Math.ceil(w / CS), GH = Math.ceil(h / CS), N = GW * GH;
    const R = rng(Math.random() * 1e9 | 0);
    const s = {
      CS,
      GW,
      GH,
      N,
      R,
      a: new Uint8Array(N),
      b: new Uint8Array(N),
      prev: new Uint8Array(N),
      age: new Uint16Array(N),
      lin: new Uint8Array(N),
      heat: new Float32Array(N),
      acc: 0,
      gen: 0,
      births: 50,
      win: 0,
      t0: R() * 3e6,
      nextInj: 2500,
      cv: mk(GW, GH)
    };
    s.cx = s.cv.getContext("2d");
    s.img = s.cx.createImageData(GW, GH);
    s.cl = cellLayer(w, h, GW, GH, CS);
    for (let k = 0; k < 3; k++) {
      const cx = GW * (0.2 + 0.3 * k + (R() - 0.5) * 0.12), cy = GH * (0.3 + R() * 0.4), rx = GW * (0.1 + R() * 0.07), ry = GH * (0.16 + R() * 0.1);
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d < 1 && R() < 0.38 * (1 - d * 0.6)) {
          const i = y * GW + x;
          s.a[i] = 1;
          s.lin[i] = k;
        }
      }
    }
    for (let k = 0; k < 90; k++) lifeStep(s);
    s.heat.fill(0);
    s.prev.set(s.a);
    return s;
  },
  frame: (g, w, h, t, c, s) => {
    const dt = tick(s, t);
    const GEN = 150;
    s.acc += dt;
    let n = 0;
    while (s.acc >= GEN && n < 3) {
      s.acc -= GEN;
      lifeStep(s);
      n++;
    }
    if (s.acc > GEN) s.acc = GEN;
    s.nextInj -= dt;
    const act = s.births / s.N;
    s.win = (t + s.t0) / 28e4 | 0;
    if (s.nextInj <= 0) {
      lifeInject(s);
      s.nextInj = act < 15e-4 ? 2500 + s.R() * 3e3 : act < 4e-3 ? 6e3 + s.R() * 6e3 : 14e3 + s.R() * 12e3;
    }
    const p = s.acc / GEN, e = p * p * (3 - 2 * p);
    const d = s.img.data, { a, prev, age, lin, heat, N } = s;
    const np = c.pal.length, lift2 = c.light ? 0 : 1;
    const hk = Math.exp(-dt / 900);
    const P = c.pal;
    for (let i = 0, j = 0; i < N; i++, j += 4) {
      const al = a[i], pr = prev[i];
      let hv = heat[i];
      if (hv > 4e-3) heat[i] = hv * hk;
      else hv = heat[i] = 0;
      let v = 0, wl = 0;
      if (al) {
        const ag = age[i];
        const br = ag < 2 ? 1 : ag < 24 ? 0.82 : ag < 160 ? 0.82 - (ag - 24) * 28e-4 : 0.44;
        v = (pr ? 1 : e) * br;
        wl = ag < 2 ? 0.22 * lift2 * (pr ? 1 : e) : 0;
      } else if (pr) {
        v = Math.max((1 - e) * 0.8, hv * 0.3);
        hv = 0;
      }
      const tone9 = P[lin[i] % np];
      const hh = hv * 0.3;
      d[j] = tone9[0] * (v + hh) + 255 * wl;
      d[j + 1] = tone9[1] * (v + hh) + 255 * wl;
      d[j + 2] = tone9[2] * (v + hh) + 255 * wl;
      d[j + 3] = 255;
    }
    s.cx.putImageData(s.img, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.fillStyle = c.bg;
    g.fillRect(0, 0, w, h);
    drawCells(g, s.cl, s.cv, 0.9, 0.35, 0.55);
    g.drawImage(vignette(s, w, h, c, 0.5), 0, 0);
  }
};
var KC = [[0.014, 0.045], [0.022, 0.051], [0.026, 0.0545], [0.03, 0.0568], [0.034, 0.0592], [0.038, 0.0608], [0.042, 0.062], [0.046, 0.063], [0.05, 0.0634], [0.055, 0.0634], [0.06, 0.0626], [0.066, 0.061]];
function kOf(F) {
  if (F <= KC[0][0]) return KC[0][1];
  for (let i = 1; i < KC.length; i++) if (F <= KC[i][0]) {
    const u = (F - KC[i - 1][0]) / (KC[i][0] - KC[i - 1][0]);
    return KC[i - 1][1] + (KC[i][1] - KC[i - 1][1]) * u;
  }
  return KC[KC.length - 1][1];
}
function turingParams(s, t) {
  const { W: W10, H, Wp, F, K, mix: mix2 } = s;
  const tt = t + s.t0;
  const F0 = 0.036 + 0.011 * drift(tt, 1.3, 611, 233) + 3e-3 * Math.sin(TAU * tt / 97e3);
  const dk0 = 11e-4 + 29e-4 * drift(tt, 2.1, 377, 149);
  const ph = tt / 1e3;
  const cu = s.cu || (s.cu = new Float32Array(W10 * 6)), cvv = s.cvv || (s.cvv = new Float32Array(H * 6));
  for (let x = 0; x < W10; x++) {
    const u = x / W10, a1 = u * 3.1 + ph * 0.011, a2 = -u * 1.7 - ph * 7e-3, a3 = u * 2.3 - ph * 9e-3 + 1.7;
    cu[x * 6] = Math.sin(a1);
    cu[x * 6 + 1] = Math.cos(a1);
    cu[x * 6 + 2] = Math.sin(a2);
    cu[x * 6 + 3] = Math.cos(a2);
    cu[x * 6 + 4] = Math.sin(a3);
    cu[x * 6 + 5] = Math.cos(a3);
  }
  for (let y = 0; y < H; y++) {
    const v = y / H, b1 = v * 1.3, b2 = v * 4.2, b3 = -v * 2.9;
    cvv[y * 6] = Math.sin(b1);
    cvv[y * 6 + 1] = Math.cos(b1);
    cvv[y * 6 + 2] = Math.sin(b2);
    cvv[y * 6 + 3] = Math.cos(b2);
    cvv[y * 6 + 4] = Math.sin(b3);
    cvv[y * 6 + 5] = Math.cos(b3);
  }
  for (let y = 0; y < H; y++) {
    const y6 = y * 6, sb1 = cvv[y6], cb1 = cvv[y6 + 1], sb2 = cvv[y6 + 2], cb2 = cvv[y6 + 3], sb3 = cvv[y6 + 4], cb3 = cvv[y6 + 5];
    for (let x = 0; x < W10; x++) {
      const x6 = x * 6;
      const sp = (cu[x6] * cb1 + cu[x6 + 1] * sb1) * 0.6 + (sb2 * cu[x6 + 3] + cb2 * cu[x6 + 2]) * 0.4;
      const sq3 = cu[x6 + 4] * cb3 + cu[x6 + 5] * sb3;
      const f = F0 + 5e-3 * sp;
      let dk = dk0 + 11e-4 * sq3;
      const hi = 42e-4 - (f > 0.042 ? (f - 0.042) * 0.2 : 0);
      dk = dk < -24e-4 ? -24e-4 : dk > hi ? hi : dk;
      const i = (y + 1) * Wp + x + 1;
      F[i] = f;
      K[i] = kOf(f) + dk;
      mix2[y * W10 + x] = sstep(-0.35, 0.45, sp);
    }
  }
}
function turingDrop(s, n) {
  const { W: W10, H, Wp, a, b, R } = s;
  for (let k = 0; k < n; k++) {
    const cx = R() * W10 | 0, cy = R() * H | 0, r = 2;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      if (x * x + y * y > r * r) continue;
      const i = ((cy + y + H) % H + 1) * Wp + (cx + x + W10) % W10 + 1;
      a[i] = 0.5;
      b[i] = 0.25 + R() * 0.05;
    }
  }
}
function turingIter(s, n) {
  const { W: W10, H, Wp, F, K } = s;
  const Da = 0.21, Db = 0.105;
  for (let it = 0; it < n; it++) {
    const a = s.a, b = s.b, a2 = s.a2, b2 = s.b2;
    for (let x = 1; x <= W10; x++) {
      a[x] = a[H * Wp + x];
      b[x] = b[H * Wp + x];
      a[(H + 1) * Wp + x] = a[Wp + x];
      b[(H + 1) * Wp + x] = b[Wp + x];
    }
    for (let y = 1; y <= H; y++) {
      const r = y * Wp;
      a[r] = a[r + W10];
      b[r] = b[r + W10];
      a[r + W10 + 1] = a[r + 1];
      b[r + W10 + 1] = b[r + 1];
    }
    for (let y = 1; y <= H; y++) {
      let i = y * Wp + 1;
      for (let x = 1; x <= W10; x++, i++) {
        const av = a[i], bv = b[i];
        const la = a[i - 1] + a[i + 1] + a[i - Wp] + a[i + Wp] - 4 * av;
        const lb = b[i - 1] + b[i + 1] + b[i - Wp] + b[i + Wp] - 4 * bv;
        const ab = av * bv * bv, f = F[i];
        const na = av + Da * la + 2 * (f * (1 - av) - ab);
        const nb = bv + Db * lb + 2 * (ab - (f + K[i]) * bv);
        a2[i] = na < 0 ? 0 : na > 1 ? 1 : na;
        b2[i] = nb < 0 ? 0 : nb > 1 ? 1 : nb;
      }
    }
    s.a = a2;
    s.b = b2;
    s.a2 = a;
    s.b2 = b;
  }
}
var TURING = {
  name: "Turing",
  flav: "Automata",
  reset: (w, h) => {
    const SC = Math.max(1.2, Math.min(w, h) / 150);
    const W10 = Math.max(16, Math.ceil(w / SC)), H = Math.max(10, Math.ceil(h / SC));
    const Wp = W10 + 2, Hp = H + 2, n = Wp * Hp;
    const R = rng(Math.random() * 1e9 | 0);
    const s = {
      SC,
      W: W10,
      H,
      Wp,
      R,
      a: new Float32Array(n).fill(1),
      b: new Float32Array(n),
      a2: new Float32Array(n),
      b2: new Float32Array(n),
      F: new Float32Array(n),
      K: new Float32Array(n),
      e: new Float32Array(W10 * H),
      mix: new Float32Array(W10 * H),
      t0: R() * 4e6,
      acc: 0,
      young: 12e3,
      pAcc: 0,
      dropAcc: 0
    };
    s.cv = mk(W10, H);
    s.cx = s.cv.getContext("2d");
    s.img = s.cx.createImageData(W10, H);
    turingParams(s, 0);
    turingDrop(s, Math.max(6, Math.round(W10 * H / 45)));
    const pre = Math.min(1100, Math.round(16e6 / (W10 * H)));
    turingIter(s, pre);
    for (let y = 0; y < H; y++) for (let x = 0; x < W10; x++) s.e[y * W10 + x] = s.b[(y + 1) * Wp + x + 1];
    return s;
  },
  frame: (g, w, h, t, c, s) => {
    const dt = tick(s, t);
    const { W: W10, H, Wp } = s;
    s.pAcc += dt;
    if (s.pAcc > 700) {
      s.pAcc = 0;
      turingParams(s, t);
    }
    s.acc += dt * (s.young > 0 ? 0.42 : 0.21);
    s.young -= dt;
    const n = Math.min(8, Math.floor(s.acc));
    s.acc -= n;
    if (s.acc > 2) s.acc = 2;
    turingIter(s, n);
    s.dropAcc += dt;
    if (s.dropAcc > 1800) {
      s.dropAcc = 0;
      if (s.R() < 0.5) turingDrop(s, 1);
    }
    const az = TAU * t / 233e3 + 1.2 * drift(t, 0.4, 611);
    const el = 0.62 + 0.16 * drift(t, 1.1, 377);
    const Lx = Math.cos(az) * Math.cos(el), Ly = Math.sin(az) * Math.cos(el), Lz = Math.sin(el);
    let Hx = Lx, Hy = Ly, Hz = Lz + 1;
    const hl = Math.hypot(Hx, Hy, Hz);
    Hx /= hl;
    Hy /= hl;
    Hz /= hl;
    const np1 = Math.max(1, c.pal.length - 1), ph = (t + s.t0) / 233e3, k0 = Math.floor(ph), fz = sstep(0.8, 1, ph - k0);
    const q0 = PT(c, 1 + k0 % np1), q1 = PT(c, 1 + (k0 + 1) % np1);
    const tA = PT(c, 0), tB = [q0[0] + (q1[0] - q0[0]) * fz, q0[1] + (q1[1] - q0[1]) * fz, q0[2] + (q1[2] - q0[2]) * fz];
    const mix2 = s.mix;
    const sw = c.light ? 0 : 1, hr = sw ? 255 : tA[0], hg = sw ? 255 : tA[1], hb = sw ? 255 : tA[2];
    const BR = c.br, BG2 = c.bg2, BB = c.bb;
    const d = s.img.data, b = s.b, e = s.e, S = 4.5;
    for (let y = 0; y < H; y++) {
      let i = (y + 1) * Wp + 1, j = y * W10, q = j * 4;
      for (let x = 0; x < W10; x++, i++, j++, q += 4) {
        const v = b[i];
        const ev = e[j] += (v - e[j]) * 0.012;
        const gx = (b[i + 1] - b[i - 1]) * S, gy = (b[i + Wp] - b[i - Wp]) * S;
        const nl = 1 / Math.sqrt(gx * gx + gy * gy + 1);
        const nx = -gx * nl, ny = -gy * nl, nz = nl;
        const dif = nx * Lx + ny * Ly + nz * Lz;
        let sp = nx * Hx + ny * Hy + nz * Hz;
        sp = sp > 0 ? sp * sp : 0;
        sp *= sp;
        sp *= sp;
        sp *= sp;
        const m = sstep(0.05, 0.3, v);
        const fr = mix2[j];
        const lum = m * (0.22 + 0.72 * (dif > 0 ? dif : 0)) * (1 + clamp01((v - ev) * 8) * 0.5);
        const cr = tA[0] + (tB[0] - tA[0]) * fr, cg = tA[1] + (tB[1] - tA[1]) * fr, cb = tA[2] + (tB[2] - tA[2]) * fr;
        const spv = sp * m * 0.55;
        d[q] = BR + cr * lum + hr * spv;
        d[q + 1] = BG2 + cg * lum + hg * spv;
        d[q + 2] = BB + cb * lum + hb * spv;
        d[q + 3] = 255;
      }
    }
    s.cx.putImageData(s.img, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.imageSmoothingEnabled = true;
    g.drawImage(s.cv, 0, 0, W10 * s.SC, H * s.SC);
    g.drawImage(vignette(s, w, h, c, 0.6), 0, 0);
  }
};
var ECA_RULES = [30, 110, 90, 54, 150, 22, 126, 18, 124, 182, 146, 86];
function ecaRow(s, c) {
  const { CW, run } = s, cells = s.cells, nx = s.nx, seam = s.seam, rA = s.ruleA, rB = s.ruleB;
  let on = 0;
  for (let i = 0; i < CW; i++) {
    const l = cells[i === 0 ? CW - 1 : i - 1], m = cells[i], r = cells[i === CW - 1 ? 0 : i + 1];
    const rule = i < seam ? rB : rA;
    let v = rule >> (l << 2 | m << 1 | r) & 1;
    if (v && s.R() < s.pn) v = 0;
    nx[i] = v;
    on += v;
    run[i] = v ? m ? Math.min(255, run[i] + 1) : 1 : 0;
  }
  s.cells = nx;
  s.nx = cells;
  const dens2 = on / CW;
  s.pn = Math.min(0.6, Math.max(0, s.pn + (dens2 - s.target) * 0.08));
  if (dens2 < 0.015 || dens2 > 0.985) s.flat++;
  else s.flat = 0;
  if (s.flat > 12) {
    s.flat = 0;
    const x0 = s.R() * CW | 0;
    for (let k = 0; k < 24; k++) s.cells[(x0 + k) % CW] = s.R() < 0.5 ? 1 : 0;
  }
  const d = s.img.data, RW = CW * 4;
  d.copyWithin(0, RW);
  const base = d.length - RW, np = c.pal.length;
  const ta = c.pal[s.toneA % np], tb = c.pal[s.toneB % np], lift2 = c.light ? 0 : 1;
  const cl = s.cells;
  for (let i = 0, j = base; i < CW; i++, j += 4) {
    if (!cl[i]) {
      d[j] = d[j + 1] = d[j + 2] = 0;
      d[j + 3] = 255;
      continue;
    }
    const rn = run[i], tn = i < seam ? tb : ta;
    const v = rn === 1 ? 1 : rn === 2 ? 0.8 : rn < 7 ? 0.62 : 0.42, wl = rn === 1 ? 0.14 * lift2 : 0;
    d[j] = tn[0] * v + 255 * wl;
    d[j + 1] = tn[1] * v + 255 * wl;
    d[j + 2] = tn[2] * v + 255 * wl;
    d[j + 3] = 255;
  }
}
function ecaNextRule(s) {
  let r;
  do {
    r = ECA_RULES[s.R() * ECA_RULES.length | 0];
  } while (r === s.ruleA);
  return r;
}
var AUTOMATON = {
  name: "Automaton",
  flav: "Automata",
  reset: (w, h) => {
    const CS = Math.max(2, Math.round(Math.min(w, h) / 170));
    const CW = Math.ceil(w / CS), RH = Math.ceil(h / CS) + 2;
    const R = rng(Math.random() * 1e9 | 0);
    const s = {
      CS,
      CW,
      RH,
      R,
      cells: new Uint8Array(CW),
      nx: new Uint8Array(CW),
      run: new Uint8Array(CW),
      flat: 0,
      ruleA: ECA_RULES[R() * 6 | 0],
      ruleB: 0,
      pn: 0.1,
      target: 0.14,
      seam: -1,
      toneA: R() * 9 | 0,
      toneB: 0,
      next: 3e4 + R() * 3e4,
      ray: 2e3,
      acc: 0
    };
    for (let i = 0; i < CW; i++) s.cells[i] = R() < 0.5 ? 1 : 0;
    s.cv = mk(CW, RH);
    s.cx = s.cv.getContext("2d");
    s.img = s.cx.createImageData(CW, RH);
    for (let i = 3; i < s.img.data.length; i += 4) s.img.data[i] = 255;
    s.cl = cellLayer(w, h, CW, RH, CS);
    s.toneB = s.toneA + 1;
    s.warm = true;
    return s;
  },
  frame: (g, w, h, t, c, s) => {
    const dt = tick(s, t);
    if (s.warm || s.ck !== colKey(c)) {
      s.warm = false;
      s.ck = colKey(c);
      for (let k = 0; k < s.RH; k++) ecaRow(s, c);
    }
    const ROW = 120;
    s.target = 0.13 + 0.06 * drift(t, 0.7, 233, 97);
    s.acc += dt;
    let n = 0;
    while (s.acc >= ROW && n < 3) {
      s.acc -= ROW;
      n++;
      if (s.seam >= 0) {
        s.seam += 1.25;
        if (s.seam >= s.CW) {
          s.ruleA = s.ruleB;
          s.toneA = s.toneB;
          s.seam = -1;
          s.next = 4e4 + s.R() * 4e4;
        }
      } else if ((s.next -= ROW) <= 0) {
        s.ruleB = ecaNextRule(s);
        s.toneB = s.toneA + 1;
        s.seam = 0;
      }
      if ((s.ray -= ROW) <= 0) {
        s.ray = 600 + s.R() * 2400;
        const x0 = s.R() * s.CW | 0, k = 1 + (s.R() * 3 | 0);
        for (let q = 0; q < k; q++) s.cells[(x0 + q) % s.CW] ^= 1;
      }
      ecaRow(s, c);
    }
    if (s.acc > ROW) s.acc = ROW;
    s.cx.putImageData(s.img, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.fillStyle = c.bg;
    g.fillRect(0, 0, w, h);
    const oy = h - s.RH * s.CS + s.CS * (1 - s.acc / ROW);
    drawCells(g, s.cl, s.cv, 0.78, 0.3, 0.45, oy);
    const fg = g.createLinearGradient(0, 0, 0, h);
    fg.addColorStop(0, `rgba(${c.br},${c.bg2},${c.bb},.92)`);
    fg.addColorStop(0.5, `rgba(${c.br},${c.bg2},${c.bb},.35)`);
    fg.addColorStop(0.85, `rgba(${c.br},${c.bg2},${c.bb},0)`);
    g.fillStyle = fg;
    g.fillRect(0, 0, w, h);
    g.drawImage(vignette(s, w, h, c, 0.4), 0, 0);
  }
};
var TURMITE_TABLES = [
  { t: [[[1, 3, 1], [1, 1, 0]], [[1, 2, 1], [1, 2, 2]], [[0, 0, 0], [0, 2, 0]]], max: 17e4, rate: 2.2 },
  // snowflake
  { t: [[[1, 0, 1], [1, 3, 0]], [[1, 1, 1], [0, 0, 0]]], max: 1e5, rate: 1.6 },
  // ring spiral
  { t: [[[1, 1, 1], [1, 3, 1]], [[1, 1, 1], [0, 1, 0]]], max: 6e4, rate: 1.2 }
  // chaotic bloom
];
var ANT_RULES = [
  { r: "RL", max: 10500, rate: 0.45 },
  // the classic, retired before its highway
  { r: "LLRR", max: 16e4, rate: 1.8 },
  { r: "LLRRRLRLRLLR", max: 12e4, rate: 1.8 },
  { r: "LLRRRLRRRRR", max: 9e4, rate: 1.6 },
  { r: "RRLLLRRRLL", max: 9e4, rate: 1.6 }
];
function antTable(rule) {
  const n = rule.length, t = [[]];
  for (let c = 0; c < n; c++) t[0].push([(c + 1) % n, rule[c] === "R" ? 1 : 3, 0]);
  return t;
}
function langtonSpawn(s, slot) {
  const R = s.R, { GW, GH } = s;
  const PICK = ["T0", "T0", "T0", "A1", "A1", "A2", "A2", "A0", "T2"];
  const pk = PICK[R() * PICK.length | 0];
  let tab, ncol, max, rate;
  if (pk[0] === "T") {
    const q = TURMITE_TABLES[+pk[1]];
    tab = q.t;
    ncol = 2;
    max = q.max;
    rate = q.rate;
  } else {
    const q = ANT_RULES[+pk[1]];
    tab = antTable(q.r);
    ncol = q.r.length;
    max = q.max;
    rate = q.rate;
  }
  let bx = GW >> 1, by = GH >> 1, best = -1;
  for (let k = 0; k < 10; k++) {
    const cx = GW * (0.18 + 0.64 * R()) | 0, cy = GH * (0.2 + 0.6 * R()) | 0;
    let d = 1e9;
    for (const a of s.ants) if (a) d = Math.min(d, Math.hypot(a.x0 - cx, (a.y0 - cy) * 1.4));
    if (d > best) {
      best = d;
      bx = cx;
      by = cy;
    }
  }
  const sc = Math.max(0.04, Math.min(1, s.N / 1e5));
  const W0 = new Uint8Array(tab.length * ncol), T0 = new Uint8Array(tab.length * ncol), S0 = new Uint8Array(tab.length * ncol);
  for (let q = 0; q < tab.length; q++) for (let c = 0; c < ncol; c++) {
    const e = tab[q][c];
    W0[q * ncol + c] = e[0];
    T0[q * ncol + c] = e[1];
    S0[q * ncol + c] = e[2];
  }
  s.ants[slot] = {
    x: bx,
    y: by,
    x0: bx,
    y0: by,
    d: R() * 4 | 0,
    q: 0,
    W0,
    T0,
    S0,
    ncol,
    tone: s.nextTone++,
    rate: rate * sc,
    left: Math.round(max * sc * (0.7 + 0.3 * R())),
    fade: 1,
    acc: 0
  };
  s.cnt[slot] = 0;
}
function langtonRun(s, a, n, now) {
  const { GW, GH, st, ow, heat, last } = s, k = s.ants.indexOf(a), W0 = a.W0, T0 = a.T0, S0 = a.S0, m = a.ncol;
  let x = a.x, y = a.y, d = a.d, q = a.q;
  for (let z = 0; z < n; z++) {
    const i = y * GW + x;
    const po = ow[i];
    const v = po === k ? st[i] : po === 255 ? 0 : st[i] % m;
    const e = q * m + v;
    d = d + T0[e] & 3;
    q = S0[e];
    if (po !== k) {
      if (po !== 255) s.cnt[po]--;
      s.cnt[k]++;
      ow[i] = k;
    }
    st[i] = W0[e];
    heat[i] = 1;
    last[i] = now;
    if (d === 0) {
      y = y === 0 ? GH - 1 : y - 1;
    } else if (d === 1) {
      x = x === GW - 1 ? 0 : x + 1;
    } else if (d === 2) {
      y = y === GH - 1 ? 0 : y + 1;
    } else {
      x = x === 0 ? GW - 1 : x - 1;
    }
  }
  a.x = x;
  a.y = y;
  a.d = d;
  a.q = q;
  a.left -= n;
}
var LANGTON = {
  name: "Langton",
  flav: "Automata",
  reset: (w, h) => {
    const CS = Math.max(2, Math.round(Math.min(w, h) / 220));
    const GW = Math.ceil(w / CS), GH = Math.ceil(h / CS), N = GW * GH;
    const R = rng(Math.random() * 1e9 | 0);
    const s = {
      CS,
      GW,
      GH,
      N,
      R,
      st: new Uint8Array(N),
      ow: new Uint8Array(N).fill(255),
      heat: new Float32Array(N),
      last: new Float32Array(N),
      ants: [null, null, null, null],
      cnt: [0, 0, 0, 0],
      nextTone: R() * 9 | 0,
      hatch: 3e4,
      clock: 0,
      cv: mk(GW, GH)
    };
    s.cx = s.cv.getContext("2d");
    s.img = s.cx.createImageData(GW, GH);
    s.cl = cellLayer(w, h, GW, GH, CS, true);
    for (let k = 0; k < 3; k++) {
      langtonSpawn(s, k);
      const a = s.ants[k], pre = Math.round(a.left * [0.75, 0.4, 0.08][k]);
      const steps = 12, per = Math.round(pre / steps);
      for (let q = 0; q < steps && s.cnt[k] < N * 0.04; q++) langtonRun(s, a, per, -((steps - q) / steps) * pre / a.rate / 1e3);
    }
    s.heat.fill(0);
    return s;
  },
  frame: (g, w, h, t, c, s) => {
    const dt = tick(s, t);
    s.clock += dt / 1e3;
    const now = s.clock, { ants, N, st, ow, heat, last } = s;
    let live = 0;
    for (let k = 0; k < ants.length; k++) {
      const a = ants[k];
      if (!a) continue;
      if (a.left > 0 && s.cnt[k] < N * 0.045) {
        live++;
        a.acc += dt * a.rate;
        const n = Math.min(240, a.acc | 0);
        a.acc -= n;
        langtonRun(s, a, n, now);
      } else {
        a.left = 0;
        a.fade -= dt / 45e3;
        if (a.fade <= 0) {
          for (let i = 0; i < N; i++) if (ow[i] === k) {
            ow[i] = 255;
            st[i] = 0;
          }
          ants[k] = null;
          s.cnt[k] = 0;
        }
      }
    }
    s.hatch -= dt;
    if (s.hatch <= 0 && live < 3 || live < 2) {
      const k = ants.indexOf(null);
      if (k >= 0) {
        langtonSpawn(s, k);
        s.hatch = 25e3 + s.R() * 35e3;
      }
    }
    const np = c.pal.length, lift2 = c.light ? 0 : 1;
    const lk = colKey(c) + ants.map((a) => a ? a.tone : "-").join();
    if (s.lk !== lk) {
      s.lk = lk;
      s.tn = ants.map((a) => a ? c.pal[a.tone % np] : null);
      s.tn2 = ants.map((a) => a ? c.pal[nearTone(c, hueOf(c.pal[a.tone % np]), [a.tone % np])] : null);
    }
    const tn = s.tn, tn2 = s.tn2, fades = ants.map((a) => a ? a.fade : 0), ncs = ants.map((a) => a ? a.ncol : 2);
    const d = s.img.data, hk = Math.exp(-dt / 380);
    for (let i = 0, j = 0; i < N; i++, j += 4) {
      const o = ow[i];
      let hv = heat[i];
      if (o === 255) {
        if (hv > 0) heat[i] = hv > 0.01 ? hv * hk : 0;
        d[j] = d[j + 1] = d[j + 2] = 0;
        d[j + 3] = 255;
        continue;
      }
      const A0 = tn[o], B0 = tn2[o], v = st[i];
      let r = 0, gg = 0, b = 0;
      if (A0 && v) {
        const ag = now - last[i];
        const lv = ag < 4 ? 1 : ag < 14 ? 0.66 : ag < 40 ? 0.42 : ag < 100 ? 0.27 : 0.17;
        const f = ncs[o] > 2 ? (v - 1) / (ncs[o] - 2) : 1, k = lv * (0.42 + 0.28 * f) * fades[o], mx = 0.25 + 0.5 * f;
        r = (A0[0] + (B0[0] - A0[0]) * mx) * k;
        gg = (A0[1] + (B0[1] - A0[1]) * mx) * k;
        b = (A0[2] + (B0[2] - A0[2]) * mx) * k;
      }
      if (hv > 0) {
        const e = hv * hv * 0.8, wl = 255 * e * 0.25 * lift2;
        if (A0) {
          r += A0[0] * e + wl;
          gg += A0[1] * e + wl;
          b += A0[2] * e + wl;
        }
        heat[i] = hv > 0.01 ? hv * hk : 0;
      }
      d[j] = r;
      d[j + 1] = gg;
      d[j + 2] = b;
      d[j + 3] = 255;
    }
    s.cx.putImageData(s.img, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.fillStyle = c.bg;
    g.fillRect(0, 0, w, h);
    drawCells(g, s.cl, s.cv, 1, 0.3, 0.45);
    g.globalCompositeOperation = "lighter";
    for (let k = 0; k < ants.length; k++) {
      const a = ants[k];
      if (!a || a.left <= 0) continue;
      const hs = sprite(s, c, "head" + a.tone % np, () => {
        const S = 48, cv = mk(S, S), x = cv.getContext("2d"), gr = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
        gr.addColorStop(0, W(c, 0.95, a.tone % np));
        gr.addColorStop(0.12, AP(c, a.tone, 0.8));
        gr.addColorStop(0.4, AP(c, a.tone, 0.18));
        gr.addColorStop(1, AP(c, a.tone, 0));
        x.fillStyle = gr;
        x.fillRect(0, 0, S, S);
        return cv;
      });
      const R0 = s.CS * 4.5;
      g.globalAlpha = 0.9;
      g.drawImage(hs, (a.x + 0.5) * s.CS - R0, (a.y + 0.5) * s.CS - R0, R0 * 2, R0 * 2);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.drawImage(vignette(s, w, h, c, 0.45), 0, 0);
  }
};
function hueOf(p) {
  const r = p[0] / 255, g = p[1] / 255, b = p[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let hh = 0;
  if (d > 0) {
    if (mx === r) hh = (g - b) / d % 6;
    else if (mx === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    hh *= 60;
    if (hh < 0) hh += 360;
  }
  return hh;
}
function sprite(s, c, id, make) {
  const k = colKey(c);
  if (s._spk !== k) {
    s._spk = k;
    s._sp = /* @__PURE__ */ new Map();
  }
  let cv = s._sp.get(id);
  if (!cv) {
    cv = make();
    s._sp.set(id, cv);
  }
  return cv;
}
function sandSite(s, slot, size) {
  const R = s.R, { GW, GH } = s, big = Math.min(GW, GH);
  let bx = GW >> 1, by = GH >> 1, best = -1;
  for (let k = 0; k < 18; k++) {
    const x = GW * (0.12 + 0.76 * R()), y = GH * (0.16 + 0.68 * R());
    let d = Math.min(x, GW - x, y, GH - y) * 1.15;
    for (const q of s.sites) if (q) d = Math.min(d, Math.hypot(q.x - x, q.y - y) - q.r * 1.12);
    if (d > best) {
      best = d;
      bx = x | 0;
      by = y | 0;
    }
  }
  if (best < big * 0.06) return false;
  const r = Math.min(best * 0.85, big * size);
  s.sites[slot] = { x: bx, y: by, r, i: by * GW + bx, total: Math.round(2.1 * Math.PI * r * r), e2: 4, left: Math.round(2.1 * Math.PI * r * r), tone: s.nextTone++, phase: 0, hold: 5e4 + R() * 6e4, fade: 1, pulse: 0 };
  return true;
}
function sandStep(s, dt) {
  const { GW, N, z, own, heat, edge, q, inq } = s;
  for (let k = 0; k < s.sites.length; k++) {
    const p = s.sites[k];
    if (!p) continue;
    if (p.phase === 0) {
      p.pulse -= dt;
      if (p.pulse <= 0 && s.qn < N * 0.05) {
        p.pulse = 700 + s.R() * 900;
        const n = Math.min(p.left, Math.max(4, Math.round(s.rate * 1100)));
        z[p.i] += n;
        own[p.i] = k;
        p.left -= n;
        if (z[p.i] >= 4 && !inq[p.i]) {
          inq[p.i] = 1;
          q[(s.qh + s.qn++) % N] = p.i;
        }
        if (p.left <= 0) p.phase = 1;
      }
    } else if (p.phase === 1) {
      if ((p.hold -= dt) <= 0) p.phase = 2;
    } else {
      p.fade -= dt / 55e3;
      if (p.fade <= 0) {
        for (let i = 0; i < N; i++) if (own[i] === k) {
          z[i] = 0;
          own[i] = 255;
        }
        s.sites[k] = null;
      }
    }
  }
  let budget = Math.round(s.budget * Math.min(2, dt / 16.7));
  while (s.qn > 0 && budget-- > 0) {
    const i = q[s.qh];
    s.qh = s.qh + 1 === N ? 0 : s.qh + 1;
    s.qn--;
    inq[i] = 0;
    const v = z[i];
    if (v < 4) continue;
    const k = v >> 2;
    z[i] = v & 3;
    heat[i] = 1;
    const o = own[i];
    const sp = s.sites[o];
    if (sp) {
      const ex = i % GW - sp.x, ey = (i / GW | 0) - sp.y, e2 = ex * ex + ey * ey;
      if (e2 > sp.e2) sp.e2 = e2;
    }
    const nb0 = i - 1, nb1 = i + 1, nb2 = i - GW, nb3 = i + GW;
    if (!edge[nb0]) {
      z[nb0] += k;
      own[nb0] = o;
      if (z[nb0] >= 4 && !inq[nb0]) {
        inq[nb0] = 1;
        q[(s.qh + s.qn++) % N] = nb0;
      }
    }
    if (!edge[nb1]) {
      z[nb1] += k;
      own[nb1] = o;
      if (z[nb1] >= 4 && !inq[nb1]) {
        inq[nb1] = 1;
        q[(s.qh + s.qn++) % N] = nb1;
      }
    }
    if (!edge[nb2]) {
      z[nb2] += k;
      own[nb2] = o;
      if (z[nb2] >= 4 && !inq[nb2]) {
        inq[nb2] = 1;
        q[(s.qh + s.qn++) % N] = nb2;
      }
    }
    if (!edge[nb3]) {
      z[nb3] += k;
      own[nb3] = o;
      if (z[nb3] >= 4 && !inq[nb3]) {
        inq[nb3] = 1;
        q[(s.qh + s.qn++) % N] = nb3;
      }
    }
  }
}
var SANDPILE = {
  name: "Sandpile",
  flav: "Automata",
  reset: (w, h) => {
    const CS = Math.max(1.5, Math.min(w, h) / 270);
    const GW = Math.ceil(w / CS), GH = Math.ceil(h / CS), N = GW * GH;
    const R = rng(Math.random() * 1e9 | 0);
    const s = {
      CS,
      GW,
      GH,
      N,
      R,
      z: new Int32Array(N),
      own: new Uint8Array(N).fill(255),
      heat: new Float32Array(N),
      edge: new Uint8Array(N),
      q: new Int32Array(N),
      inq: new Uint8Array(N),
      qn: 0,
      qh: 0,
      nextTone: R() * 9 | 0,
      hash: new Float32Array(N).map(() => R()),
      sites: [null, null, null, null],
      spawn: 2e4,
      rate: Math.min(GW, GH) ** 2 * 13e-6,
      budget: 3e4,
      cv: mk(GW, GH)
    };
    for (let x = 0; x < GW; x++) {
      s.edge[x] = 1;
      s.edge[(GH - 1) * GW + x] = 1;
    }
    for (let y = 0; y < GH; y++) {
      s.edge[y * GW] = 1;
      s.edge[y * GW + GW - 1] = 1;
    }
    s.cx = s.cv.getContext("2d");
    s.img = s.cx.createImageData(GW, GH);
    s.b1 = mk(Math.ceil(GW / 3), Math.ceil(GH / 3));
    s.b2 = mk(Math.ceil(GW / 9), Math.ceil(GH / 9));
    const T0 = performance.now();
    const sizes = [0.34, 0.22, 0.1], fills = [1, 0.55, 0.2];
    for (let k = 0; k < 3; k++) {
      if (!sandSite(s, k, sizes[k])) continue;
      const p = s.sites[k], n = Math.round(p.left * fills[k]);
      s.z[p.i] += n;
      s.own[p.i] = k;
      p.left -= n;
      s.inq[p.i] = 1;
      s.q[(s.qh + s.qn++) % N] = p.i;
      if (p.left <= 0) {
        p.phase = 1;
        p.hold = 2e4 + R() * 3e4;
      }
      const sv = s.budget;
      s.budget = 4e5;
      while (s.qn > 0 && performance.now() - T0 < 220 * (k + 1) / 3) sandStep(s, 16.7);
      s.budget = sv;
    }
    s.heat.fill(0);
    return s;
  },
  frame: (g, w, h, t, c, s) => {
    const dt = tick(s, t);
    sandStep(s, dt);
    let active = 0;
    for (const p of s.sites) if (p && p.phase < 2) active++;
    if (active < 2 || (s.spawn -= dt) <= 0) {
      const k = s.sites.indexOf(null);
      if (k >= 0 && active < 3) s.spawn = sandSite(s, k, 0.14 + 0.22 * s.R()) ? 3e4 + s.R() * 3e4 : 4e3;
    }
    const np = c.pal.length, lift2 = c.light ? 0 : 1;
    const lk = colKey(c) + s.sites.map((p) => p ? p.tone : "-").join();
    if (s.lk !== lk) {
      s.lk = lk;
      s.lut = s.sites.map((p) => {
        if (!p) return null;
        const A0 = c.pal[p.tone % np], B0 = c.pal[nearTone(c, hueOf(A0), [p.tone % np])], L = new Float32Array(15);
        const mixc = (u, k, wl, o) => {
          for (let ch = 0; ch < 3; ch++) L[o + ch] = (B0[ch] + (A0[ch] - B0[ch]) * u) * k + 255 * wl * lift2;
        };
        mixc(0, 0.13, 0, 3);
        mixc(0.2, 0.27, 0, 6);
        mixc(1, 0.44, 0.02, 9);
        mixc(1, 0.34, 0.08, 12);
        return L;
      });
    }
    const lut = s.lut, fades = s.sites.map((p) => p ? p.fade : 0);
    const sx = s.sites.map((p) => p ? p.x : 0), sy = s.sites.map((p) => p ? p.y : 0);
    const ir = s.sites.map((p) => p ? 1 / Math.max(2, Math.sqrt(p.e2) + 1) : 0);
    const { N, GW, GH, z, own, heat, hash: hash3 } = s, d = s.img.data, hk = Math.exp(-dt / 420);
    for (let y = 0, i = 0, j = 0; y < GH; y++) for (let x = 0; x < GW; x++, i++, j += 4) {
      const o = own[i];
      const L = o === 255 ? null : lut[o];
      if (!L) {
        d[j] = d[j + 1] = d[j + 2] = 0;
        d[j + 3] = 255;
        continue;
      }
      const v = z[i], q = (v > 3 ? 3 : v) * 3;
      const dx = (x - sx[o]) * ir[o], dy = (y - sy[o]) * ir[o], rr = Math.sqrt(dx * dx + dy * dy);
      let f = 1 - 0.95 * sstep(0.42, 0.94, rr);
      const fd = fades[o];
      if (fd < 1) {
        const th = hash3[i] * 0.55 + rr * 0.45;
        f *= sstep(th - 0.06, th + 0.06, fd * 1.08);
      }
      let r = L[q] * f, gg = L[q + 1] * f, b = L[q + 2] * f;
      const hv = heat[i];
      if (hv > 0) {
        const e = hv * hv * f * 0.75;
        r += L[12] * e;
        gg += L[13] * e;
        b += L[14] * e;
        heat[i] = hv > 0.01 ? hv * hk : 0;
      }
      d[j] = r;
      d[j + 1] = gg;
      d[j + 2] = b;
      d[j + 3] = 255;
    }
    s.cx.putImageData(s.img, 0, 0);
    const PW = s.GW * s.CS, PH = s.GH * s.CS;
    const b1x = s.b1.getContext("2d"), b2x = s.b2.getContext("2d");
    b1x.globalCompositeOperation = "copy";
    b1x.imageSmoothingEnabled = true;
    b1x.drawImage(s.cv, 0, 0, s.b1.width, s.b1.height);
    b2x.globalCompositeOperation = "copy";
    b2x.imageSmoothingEnabled = true;
    b2x.drawImage(s.b1, 0, 0, s.b2.width, s.b2.height);
    g.globalCompositeOperation = "source-over";
    g.fillStyle = c.bg;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "lighter";
    g.imageSmoothingEnabled = true;
    for (let k = 0; k < s.sites.length; k++) {
      const p = s.sites[k];
      if (!p) continue;
      const hs = sprite(s, c, "sh" + p.tone % np, () => {
        const S = 64, cv = mk(S, S), x = cv.getContext("2d"), gr = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
        gr.addColorStop(0, AP(c, p.tone, 0.5));
        gr.addColorStop(0.55, AP(c, p.tone, 0.22));
        gr.addColorStop(1, AP(c, p.tone, 0));
        x.fillStyle = gr;
        x.fillRect(0, 0, S, S);
        return cv;
      });
      const rc = s.CS / ir[k] * 1.7;
      g.globalAlpha = 0.22 * p.fade;
      g.drawImage(hs, p.x * s.CS - rc, p.y * s.CS - rc, rc * 2, rc * 2);
    }
    g.globalAlpha = 0.45;
    g.drawImage(s.b2, 0, 0, PW, PH);
    g.globalAlpha = 0.3;
    g.drawImage(s.b1, 0, 0, PW, PH);
    g.globalAlpha = 1;
    g.drawImage(s.cv, 0, 0, PW, PH);
    g.globalCompositeOperation = "source-over";
    g.drawImage(vignette(s, w, h, c, 0.5), 0, 0);
  }
};
var SCENES_AUTOMATA = [AUTOMATON, TURING, LIFE, LANGTON, SANDPILE];
var NB = 4;
function binLines(W0, H0, lw, col, build) {
  const SB = 32, P = [];
  for (let k = 0; k < SB; k++) P.push(new Path2D());
  const step = Math.PI / SB;
  build((x0, y0, x1, y1) => {
    let a = Math.atan2(y1 - y0, x1 - x0);
    if (a < 0) a += Math.PI;
    if (a >= Math.PI) a -= Math.PI;
    const sb = Math.floor(a / step) % SB;
    P[sb].moveTo(x0, y0);
    P[sb].lineTo(x1, y1);
  });
  const bins = [], ctx = [];
  for (let k = 0; k < NB; k++) {
    const cv = mk(W0, H0), x = cv.getContext("2d");
    x.lineWidth = lw;
    x.strokeStyle = col;
    x.lineCap = "round";
    bins.push(cv);
    ctx.push(x);
  }
  for (let sb = 0; sb < SB; sb++) {
    const u = (sb + 0.5) / SB * NB, k = Math.floor(u) % NB, f = u - Math.floor(u);
    if (1 - f > 0.02) {
      ctx[k].globalAlpha = 1 - f;
      ctx[k].stroke(P[sb]);
    }
    if (f > 0.02) {
      ctx[(k + 1) % NB].globalAlpha = f;
      ctx[(k + 1) % NB].stroke(P[sb]);
    }
  }
  return bins;
}
function polar(add, cx, cy, n, r) {
  let px = 0, py = 0;
  for (let k = 0; k <= n; k++) {
    const th = k / n * TAU, rr = r(th), x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr;
    if (k) add(px, py, x, y);
    px = x;
    py = y;
  }
}
function bakeGuilloche(s, w, h, c) {
  const m = Math.min(w, h), R = m * 0.43, S = Math.ceil(R * 2 + 8), o = S / 2;
  const lw = Math.max(0.6, m / 1500);
  const pts = Math.max(240, Math.round(R * 2.6));
  const ink = (i) => AP(c, i, 1);
  s.L1 = binLines(S, S, lw, ink(0), (add) => {
    for (let i = 0; i < 9; i++) polar(add, o, o, pts * 2, (th) => R * (0.94 + 0.04 * Math.sin(48 * th + i * TAU / 9)));
    for (let i = 0; i < 3; i++) polar(add, o, o, pts, () => R * (0.875 - i * 0.011));
    polar(add, o, o, pts, () => R * 0.4);
    const n = 12, N = 16;
    for (let i = 0; i < N; i++) {
      const ph = i / N * TAU / n * 0.5;
      polar(add, o, o, pts * 2, (th) => R * (0.625 + 0.16 * Math.cos(n * (th + ph)) + 0.03 * Math.cos(2 * n * (th + ph))));
    }
  });
  s.L2 = binLines(S, S, lw, ink(1), (add) => {
    const n = 13, N = 7;
    for (let i = 0; i < N; i++) {
      const ph = i / N * TAU / n;
      polar(add, o, o, pts * 2, (th) => R * (0.62 + 0.15 * Math.cos(n * (th + ph))));
    }
    for (let i = 0; i < 12; i++) {
      const ph = i / 12 * TAU / 20;
      polar(add, o, o, pts, (th) => R * (0.3 + 0.055 * Math.cos(20 * (th + ph))));
    }
    polar(add, o, o, pts, () => R * 0.225);
    polar(add, o, o, pts, () => R * 0.215);
    const NR = Math.round(pts * 0.5);
    for (let i = 0; i < NR; i++) {
      const th = i / NR * TAU, c0 = Math.cos(th), s0 = Math.sin(th);
      add(o + c0 * R * 0.035, o + s0 * R * 0.035, o + c0 * R * 0.2, o + s0 * R * 0.2);
    }
  });
  s.S = S;
  const PW = Math.max(24, Math.round(m * 0.07)), J = 6, gap = Math.max(2.5, m * 9e-3), PH = Math.round(J * gap);
  const amp = gap * 1.6;
  const tile = binLines(PW, PH, lw * 0.9, ink(2), (add) => {
    for (const sg of [0, Math.PI]) for (let j = 0; j < J; j++) for (const oy of [-PH, 0, PH]) {
      let px = 0, py = 0;
      for (let k = 0; k <= 120; k++) {
        const x = k / 120 * PW, y = j * gap + oy + amp * Math.sin(TAU * x / PW + sg);
        if (k) add(px, py, x, y);
        px = x;
        py = y;
      }
    }
  });
  s.tile = tile;
  s.pats = null;
}
var GUILLOCHE = {
  name: "Guilloche",
  flav: "Engraving",
  reset: (w, h) => ({ key: "", t0: Math.random() * 5e5 }),
  frame: (g, w, h, t, c, s) => {
    const key = w + "x" + h + colKey(c);
    if (s.key !== key) {
      s.key = key;
      bakeGuilloche(s, w, h, c);
    }
    if (!s.pats || s.pg !== g) {
      s.pg = g;
      s.pats = s.tile.map((cv) => g.createPattern(cv, "repeat"));
    }
    const tt = t + s.t0, m = Math.min(w, h);
    const lam = TAU * tt / 173e3 + 1.4 * drift(tt, 0.3, 611, 233);
    const refl = (b) => {
      const v = Math.abs(Math.sin(b - lam));
      return 0.1 + 0.9 * v * v * v;
    };
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.fillStyle = c.bg;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "lighter";
    const plA = 0.3 * clamp01((m - 120) / 500);
    for (let k = 0; k < NB && plA > 0; k++) {
      g.globalAlpha = plA * refl(k * Math.PI / NB);
      g.fillStyle = s.pats[k];
      g.fillRect(0, 0, w, h);
    }
    const cx = w * 0.5, cy = h * 0.5, o = s.S / 2;
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    const wg = g.createRadialGradient(cx, cy, m * 0.3, cx, cy, m * 0.47);
    wg.addColorStop(0, `rgba(${c.br},${c.bg2},${c.bb},.92)`);
    wg.addColorStop(1, `rgba(${c.br},${c.bg2},${c.bb},0)`);
    g.fillStyle = wg;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "lighter";
    const layers = [
      { bins: s.L1, rot: TAU * tt / 1597e3, sc: 1, a: 1 },
      { bins: s.L2, rot: -TAU * tt / 987e3 + 0.3 * drift(tt, 1.9, 377), sc: 1 + 0.012 * drift(tt, 0.8, 97, 61), a: 0.7 }
    ];
    for (const L of layers) {
      g.setTransform(L.sc * Math.cos(L.rot), L.sc * Math.sin(L.rot), -L.sc * Math.sin(L.rot), L.sc * Math.cos(L.rot), cx, cy);
      for (let k = 0; k < NB; k++) {
        g.globalAlpha = L.a * refl(k * Math.PI / NB + L.rot);
        g.drawImage(L.bins[k], -o, -o);
      }
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    const lx = cx + Math.cos(lam) * m * 0.5, ly = cy + Math.sin(lam) * m * 0.35;
    const lg = g.createRadialGradient(lx, ly, m * 0.15, lx, ly, Math.hypot(w, h) * 0.85);
    lg.addColorStop(0, `rgba(${c.br},${c.bg2},${c.bb},0)`);
    lg.addColorStop(1, `rgba(${c.br},${c.bg2},${c.bb},.72)`);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.fillStyle = lg;
    g.fillRect(0, 0, w, h);
  }
};
SCENES_AUTOMATA.push(GUILLOCHE);
function nearTone(c, hue, avoid = []) {
  let bi = 0, bd = 1e9;
  c.pal.forEach((p, i) => {
    if (avoid.includes(i) && c.pal.length > avoid.length) return;
    const r = p[0] / 255, g = p[1] / 255, b = p[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let hh = 0;
    if (d > 0) {
      if (mx === r) hh = (g - b) / d % 6;
      else if (mx === g) hh = (b - r) / d + 2;
      else hh = (r - g) / d + 4;
      hh *= 60;
      if (hh < 0) hh += 360;
    }
    const dd = Math.min(Math.abs(hh - hue), 360 - Math.abs(hh - hue)) - d * 30;
    if (dd < bd) {
      bd = dd;
      bi = i;
    }
  });
  return bi;
}

// from bungie.ts
var AP2 = (c, i, a) => {
  const p = c.pal[(i % c.pal.length + c.pal.length) % c.pal.length];
  return `rgba(${p[0]},${p[1]},${p[2]},${a})`;
};
var W2 = (c, a, i = 0) => c.light ? AP2(c, i, Math.min(1, a * 1.6)) : `rgba(255,255,255,${a})`;
function LTr(c, k, i = 0) {
  const p = c.pal[(i % c.pal.length + c.pal.length) % c.pal.length];
  if (k <= 1) {
    const q2 = Math.max(0, k);
    return [c.br + (p[0] - c.br) * q2, c.bg2 + (p[1] - c.bg2) * q2, c.bb + (p[2] - c.bb) * q2];
  }
  const q = c.light ? 0 : Math.min(1, k - 1);
  return [p[0] + (255 - p[0]) * q, p[1] + (255 - p[1]) * q, p[2] + (255 - p[2]) * q];
}
var rgba = (v, a) => `rgba(${v[0] | 0},${v[1] | 0},${v[2] | 0},${a})`;
var LT = (c, k, a = 1, i = 0) => rgba(LTr(c, k, i), a);
function mk2(w, h) {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  return cv;
}
function rng2(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var sq = (v) => v * v;
var cl01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
var sst = (a, b, v) => {
  const q = cl01((v - a) / (b - a));
  return q * q * (3 - 2 * q);
};
var TAU2 = 6.2832;
function hsOf(p) {
  const r = p[0] / 255, g = p[1] / 255, b = p[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d < 1e-6) return [0, 0];
  let hh = mx === r ? (g - b) / d % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hh *= 60;
  if (hh < 0) hh += 360;
  const l = (mx + mn) / 2;
  return [hh, d / (1 - Math.abs(2 * l - 1) || 1)];
}
var hdist = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};
var warmth = (hh) => Math.cos((hh - 35) * Math.PI / 180);
var _pn = /* @__PURE__ */ new Map();
function Pn(c) {
  const id = c.acc + "|" + c.bg + "|" + (c.light ? 1 : 0) + "|" + c.pal.map((p) => p.join(",")).join(";");
  let P = _pn.get(id);
  if (P) return P;
  const n = c.pal.length, h0 = hsOf(c.pal[0])[0], cool0 = warmth(h0) < 0.3;
  let bi = 1, bs = -1e9;
  for (let i = 1; i < n; i++) {
    const [hh, sat] = hsOf(c.pal[i]);
    const sc = hdist(hh, h0) / 180 + (cool0 ? warmth(hh) : -warmth(hh)) * 0.8 + Math.min(1, sat) * 0.25;
    if (sc > bs) {
      bs = sc;
      bi = i;
    }
  }
  const K = warmth(hsOf(c.pal[bi])[0]) > warmth(h0) ? bi : 0, F = K === 0 ? bi : 0;
  const N = 256, lf = new Float32Array(N * 3), lk = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const k = i / (N - 1) * 2, a = LTr(c, k, F), b = LTr(c, k, K);
    lf[i * 3] = a[0];
    lf[i * 3 + 1] = a[1];
    lf[i * 3 + 2] = a[2];
    lk[i * 3] = b[0];
    lk[i * 3 + 1] = b[1];
    lk[i * 3 + 2] = b[2];
  }
  const tc = (k, wm) => wm * (0.38 + 0.62 * sst(0.22, 1.05, k));
  const mix2 = (k, wm0, o) => {
    const i = Math.max(0, Math.min(255, k * 127.5 | 0)) * 3, wm = tc(k, wm0);
    o[0] = lf[i] + (lk[i] - lf[i]) * wm;
    o[1] = lf[i + 1] + (lk[i + 1] - lf[i + 1]) * wm;
    o[2] = lf[i + 2] + (lk[i + 2] - lf[i + 2]) * wm;
    return o;
  };
  const rgb7 = (k, wm0) => {
    const wm = tc(k, wm0), a = LTr(c, k, F), b = LTr(c, k, K);
    return [a[0] + (b[0] - a[0]) * wm, a[1] + (b[1] - a[1]) * wm, a[2] + (b[2] - a[2]) * wm];
  };
  P = { K, F, mix: mix2, rgb: rgb7, s: (k, wm, al = 1) => rgba(rgb7(k, wm), al) };
  if (_pn.size > 8) _pn.clear();
  _pn.set(id, P);
  return P;
}
var _spKey = "";
var _sp = /* @__PURE__ */ new Map();
function sprite2(c, id, make) {
  const k = c.acc + "|" + c.bg + "|" + (c.light ? 1 : 0) + "|" + c.pal.length + "|" + c.pal[1];
  if (k !== _spKey) {
    _spKey = k;
    _sp.clear();
  }
  let cv = _sp.get(id);
  if (!cv) {
    cv = make();
    _sp.set(id, cv);
  }
  return cv;
}
function radial(stops, S = 64) {
  const cv = mk2(S, S), x = cv.getContext("2d");
  const gr = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  x.fillStyle = gr;
  x.fillRect(0, 0, S, S);
  return cv;
}
var softStops = (v) => [[0, rgba(v, 1)], [0.22, rgba(v, 0.72)], [0.45, rgba(v, 0.34)], [0.7, rgba(v, 0.1)], [1, rgba(v, 0)]];
var softSp = (c, k, i = 0) => sprite2(c, "s" + k + "_" + i, () => radial(softStops(LTr(c, k, i)), 96));
var glowSp = (c, P, k, wm) => {
  const q = Math.round(wm * 10) / 10, kk = Math.round(k * 20) / 20;
  return sprite2(c, "g" + kk + "_" + q, () => radial(softStops(P.rgb(kk, q)), 96));
};
var beamSp = (c, P, k, wm) => sprite2(c, "beam" + k + "_" + wm, () => {
  const RW = 32, RH = 256, cv = mk2(RW, RH), x = cv.getContext("2d");
  const id = x.createImageData(RW, RH), d = id.data, col = P.rgb(k, wm);
  for (let y = 0; y < RH; y++) {
    const f = y / RH, half = 0.25 + 0.75 * f, vf = Math.min(1, f * 12) * Math.pow(1 - f, 1.3);
    for (let xx = 0; xx < RW; xx++) {
      const u = (xx / (RW - 1) - 0.5) * 2 / half, a = Math.exp(-u * u * 2.6) * vf, o = (y * RW + xx) * 4;
      d[o] = col[0];
      d[o + 1] = col[1];
      d[o + 2] = col[2];
      d[o + 3] = a * 255 | 0;
    }
  }
  x.putImageData(id, 0, 0);
  return cv;
});
var keyOf = (w, h, c) => w + "x" + h + "|" + c.acc + "|" + c.bg + "|" + c.pal.length + "|" + c.pal[1] + "|" + c.pal[c.pal.length - 1];
function tick2(s, t) {
  const dt = s.lt == null || t < s.lt ? 16 : Math.min(64, t - s.lt);
  s.lt = t;
  return dt;
}
function frac(R, rough) {
  const N = 257, v = new Float32Array(N);
  v[0] = R();
  v[N - 1] = R();
  for (let step = N - 1, amp = 1; step > 1; step >>= 1, amp *= rough)
    for (let i = step >> 1; i < N; i += step) v[i] = (v[i - (step >> 1)] + v[i + (step >> 1)]) / 2 + (R() - 0.5) * amp;
  let lo = 1e9, hi = -1e9;
  for (const q of v) {
    lo = Math.min(lo, q);
    hi = Math.max(hi, q);
  }
  for (let i = 0; i < N; i++) v[i] = (v[i] - lo) / (hi - lo || 1);
  return (u) => {
    const f = cl01(u) * (N - 1), i = Math.min(N - 2, f | 0), e = f - i;
    return v[i] * (1 - e) + v[i + 1] * e;
  };
}
function dither(cv, R, amp = 3) {
  const x = cv.getContext("2d"), id = x.getImageData(0, 0, cv.width, cv.height), d = id.data;
  let a = R() * 4294967296 >>> 0;
  for (let i = 0; i < d.length; i += 4) {
    a = Math.imul(a, 1664525) + 1013904223 >>> 0;
    const n = ((a >>> 24) / 255 - 0.5) * amp;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  x.putImageData(id, 0, 0);
}
function stars(x, c, R, w, y0, y1, n) {
  const NB2 = 10, bk = Array.from({ length: NB2 * 2 }, () => []);
  for (let i = 0; i < n; i++) {
    const f = Math.pow(R(), 1.25), y = y0 + f * (y1 - y0);
    const a = (0.1 + Math.pow(R(), 3) * 0.8) * (1 - 0.7 * f);
    bk[Math.min(NB2 - 1, a * NB2 | 0) + (R() < 0.85 ? 0 : NB2)].push(R() * w, y, R() < 0.05 ? 1.6 : 1);
  }
  for (let b = 0; b < NB2 * 2; b++) {
    const L = bk[b];
    if (!L.length) continue;
    const a = (b % NB2 + 0.5) / NB2;
    x.fillStyle = b < NB2 ? W2(c, a) : LT(c, 1.3, a);
    for (let i = 0; i < L.length; i += 3) x.fillRect(L[i], L[i + 1], L[i + 2], L[i + 2]);
  }
}
var wrap = (g, cv, w, off, y) => {
  const o = (off % w + w) % w;
  g.drawImage(cv, o - w, y);
  g.drawImage(cv, o, y);
};
function birds(g, list, col, lw) {
  g.strokeStyle = col;
  g.lineWidth = lw;
  g.lineCap = "round";
  g.beginPath();
  for (const b of list) {
    const f = Math.sin(b.ph), s = b.s;
    g.moveTo(b.x - s, b.y - s * 0.55 * f);
    g.quadraticCurveTo(b.x - s * 0.45, b.y - s * 0.35 * f - s * 0.2, b.x, b.y);
    g.quadraticCurveTo(b.x + s * 0.45, b.y - s * 0.35 * f - s * 0.2, b.x + s, b.y - s * 0.55 * f);
  }
  g.stroke();
}
function vnoise(seed) {
  const S = Math.imul((seed | 0) ^ 1540483477, 1442695041) | 0;
  const hs = (a, b) => {
    let t = Math.imul(a, 374761393) + Math.imul(b, 668265263) ^ S;
    t = Math.imul(t ^ t >>> 13, 1274126177);
    t ^= t >>> 16;
    return (t >>> 0) / 4294967296;
  };
  return (x, y, P = 0, Q = 0) => {
    let x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    let x1 = x0 + 1, y1 = y0 + 1;
    if (P) {
      x0 = (x0 % P + P) % P;
      x1 = (x1 % P + P) % P;
    }
    if (Q) {
      y0 = (y0 % Q + Q) % Q;
      y1 = (y1 % Q + Q) % Q;
    }
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hs(x0, y0), b = hs(x1, y0), cc = hs(x0, y1), d = hs(x1, y1);
    return a + (b - a) * u + (cc - a) * v + (a - b - cc + d) * u * v;
  };
}
function fbm(n, x, y, oct, P = 0, Q = 0) {
  let s = 0, a = 0.5, f = 1, t = 0;
  for (let o = 0; o < oct; o++) {
    s += a * n(x * f + o * 5.3, y * f + o * 13.7, P * f, Q * f);
    t += a;
    a *= 0.5;
    f *= 2;
  }
  return s / t;
}
function cloudTex(P, seed, gw, gh, o) {
  const n = vnoise(seed), nw = vnoise(seed + 911);
  const cv = mk2(gw, gh), x = cv.getContext("2d"), id = x.createImageData(cv.width, cv.height), d = id.data;
  const Px = o.Px, Py = o.Py, rgb7 = [0, 0, 0], soft = o.soft ?? 0.08, oct = o.oct ?? 5, warp = o.warp ?? 1, gain = o.gain ?? 6;
  for (let py = 0; py < gh; py++) {
    const v = py / gh, Y = v * Py, cov = o.cov(v);
    if (cov >= 0.97) continue;
    for (let px = 0; px < gw; px++) {
      const U = px / gw * Px;
      const wx = (fbm(nw, U, Y, 2, Px) - 0.5) * warp, wy = (fbm(nw, U + 7.1, Y + 3.3, 2, Px) - 0.5) * warp;
      const den = fbm(n, U + wx, Y + wy, oct, Px);
      const sh = den - cov;
      if (sh <= 0) continue;
      const dl = fbm(n, U + wx + o.lx, Y + wy + o.ly, 3, Px);
      const lit = cl01(0.5 + (den - dl) * gain);
      const al = Math.pow(cl01(sh / soft), 0.8) * o.a;
      const thick = cl01(sh / (soft * 4));
      const k = (o.kSh + (o.kLit - o.kSh) * lit) * (1 - (o.dense ?? 0) * thick), wm = o.wSh + (o.wLit - o.wSh) * lit;
      P.mix(k, wm, rgb7);
      const i = (py * cv.width + px) * 4;
      d[i] = rgb7[0];
      d[i + 1] = rgb7[1];
      d[i + 2] = rgb7[2];
      d[i + 3] = al * 255;
    }
  }
  x.putImageData(id, 0, 0);
  return cv;
}
function up(src, W22, H2) {
  const cv = mk2(W22, H2), x = cv.getContext("2d");
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = "high";
  x.drawImage(src, 0, 0, cv.width, cv.height);
  return cv;
}
function mottleTile(c, P, seed, k, wm, S = 192) {
  const n = vnoise(seed), cv = mk2(S, S), x = cv.getContext("2d"), id = x.createImageData(S, S), d = id.data, col = P.rgb(k, wm);
  for (let y = 0; y < S; y++) for (let xx = 0; xx < S; xx++) {
    const v = fbm(n, xx / S * 6, y / S * 6, 5, 6, 6), i = (y * S + xx) * 4;
    d[i] = col[0];
    d[i + 1] = col[1];
    d[i + 2] = col[2];
    d[i + 3] = cl01((v - 0.42) * 3.2) * 255;
  }
  x.putImageData(id, 0, 0);
  return cv;
}
function mottle(x, tile, w, h, a, sc) {
  const pat = x.createPattern(tile, "repeat");
  if (pat.setTransform && typeof DOMMatrix !== "undefined") pat.setTransform(new DOMMatrix([sc, 0, 0, sc, 0, 0]));
  x.save();
  x.globalCompositeOperation = "source-atop";
  x.globalAlpha = a;
  x.fillStyle = pat;
  x.fillRect(0, 0, w, h);
  x.restore();
}
var poly = (x, pts) => {
  x.beginPath();
  pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]));
  x.closePath();
};
function bakeGate(w, h, c, s) {
  const R = rng2(s.seed), m = Math.min(w, h), P = Pn(c);
  const Hy = h * 0.64, sx = w * 0.29;
  s.m = m;
  s.Hy = Hy;
  s.sx = sx;
  s.sr = Math.max(1.2, m * 0.024);
  s.P = P;
  const sunK = c.light ? 0.3 : 1;
  s.sunK = sunK;
  const VP = [w * 0.8, Hy];
  const base = mk2(w, h), x = base.getContext("2d");
  const gr = x.createLinearGradient(0, 0, 0, Hy);
  gr.addColorStop(0, P.s(0.025, 0));
  gr.addColorStop(0.32, P.s(0.07, 0.08));
  gr.addColorStop(0.62, P.s(0.19, 0.4));
  gr.addColorStop(0.87, P.s(0.42, 0.8));
  gr.addColorStop(1, P.s(0.6, 0.95));
  x.fillStyle = gr;
  x.fillRect(0, 0, w, Hy + 2);
  x.globalCompositeOperation = "screen";
  x.globalAlpha = 0.5 * sunK;
  x.drawImage(glowSp(c, P, 0.85, 1), sx - w * 0.75, Hy - h * 0.6, w * 1.5, h * 1.1);
  x.globalAlpha = 1;
  x.globalCompositeOperation = "source-over";
  const sg = x.createLinearGradient(0, Hy, 0, h);
  sg.addColorStop(0, P.s(0.5, 0.9));
  sg.addColorStop(0.04, P.s(0.3, 0.72));
  sg.addColorStop(0.25, P.s(0.11, 0.38));
  sg.addColorStop(0.6, P.s(0.035, 0.12));
  sg.addColorStop(1, P.s(0.01, 0));
  x.fillStyle = sg;
  x.fillRect(0, Hy, w, h - Hy);
  x.save();
  x.beginPath();
  x.rect(0, Hy, w, h - Hy);
  x.clip();
  x.globalCompositeOperation = "screen";
  x.globalAlpha = 0.5 * sunK;
  x.drawImage(glowSp(c, P, 0.9, 1), sx - w * 0.08, Hy - h * 0.03, w * 0.16, (h - Hy) * 1.2);
  x.globalAlpha = 0.3 * sunK;
  x.drawImage(glowSp(c, P, 0.8, 1), sx - w * 0.32, Hy - h * 0.06, w * 0.64, h * 0.15);
  x.restore();
  x.globalAlpha = 1;
  x.globalCompositeOperation = "source-over";
  const F1 = Hy / h + 0.11, F2 = Hy / h + 0.05;
  const G1 = [[0.02, 0.18, 0.44, F1], [0.034, 0.166, 0.225, 0.44], [0.046, 0.154, 0.085, 0.225], [0.038, 0.162, 0.062, 0.085]];
  const G2 = [[0.388, 0.462, 0.42, F2], [0.395, 0.455, 0.29, 0.42], [0.401, 0.449, 0.19, 0.29], [0.396, 0.454, 0.176, 0.19]];
  const T = (fx, fy, sc) => [VP[0] + (fx * w - VP[0]) * sc, Hy + (fy * h - Hy) * sc];
  const kH = 0.44, wH = 0.85;
  const hzk = (k, hz) => k + (kH - k) * hz, hzw = (wm, hz) => wm + (wH - wm) * hz;
  const glyphs = [];
  const pylon = (q, tiers, depth, lit, sc, hz, detail) => {
    for (let ti = 0; ti < tiers.length; ti++) {
      const [x0, x1, y0, y1] = tiers[ti];
      const TL = T(x0, y0, sc), TR = T(x1, y0, sc), BR = T(x1, y1, sc), BL = T(x0, y1, sc);
      const rec = (p) => [p[0] + (VP[0] - p[0]) * depth, p[1] + (VP[1] - p[1]) * depth];
      const TR2 = rec(TR), BR2 = rec(BR);
      const sgr = q.createLinearGradient(TR[0], 0, TR2[0], 0);
      if (lit) {
        sgr.addColorStop(0, P.s(hzk(0.4, hz), hzw(1, hz)));
        sgr.addColorStop(0.3, P.s(hzk(0.24, hz), hzw(0.85, hz)));
        sgr.addColorStop(1, P.s(hzk(0.12, hz), hzw(0.6, hz)));
      } else {
        sgr.addColorStop(0, P.s(hzk(0.06, hz), hzw(0.12, hz)));
        sgr.addColorStop(1, P.s(hzk(0.035, hz), hzw(0.08, hz)));
      }
      q.fillStyle = sgr;
      poly(q, [TR, BR, BR2, TR2]);
      q.fill();
      const fgr = q.createLinearGradient(0, TL[1], 0, BL[1]);
      fgr.addColorStop(0, P.s(hzk(0.075, hz), hzw(0.22, hz)));
      fgr.addColorStop(1, P.s(hzk(0.022, hz), hzw(0.05, hz)));
      q.fillStyle = fgr;
      poly(q, [TL, TR, BR, BL]);
      q.fill();
      q.fillStyle = P.s(hzk(0.22, hz), hzw(0.55, hz), 0.8);
      q.fillRect(TL[0], TL[1], TR[0] - TL[0], Math.max(1, h * 3e-3 * sc));
      q.fillStyle = P.s(hzk(1, hz), 1, lit ? 0.85 : 0.6);
      const rw = Math.max(1, m * 22e-4 * sc);
      if (lit) q.fillRect(TR[0] - rw, TR[1], rw, BR[1] - TR[1]);
      else q.fillRect(TL[0], TL[1], rw, BL[1] - TL[1]);
      if (detail) {
        const fw = TR[0] - TL[0], fh = BL[1] - TL[1];
        q.fillStyle = P.s(0.01, 0, 0.45);
        for (let j = 1; j < 6; j++) q.fillRect(TL[0], TL[1] + fh * (j / 6 + (R() - 0.5) * 0.04), fw, Math.max(1, m * 12e-4));
        for (const gx of [0.22, 0.5, 0.78]) q.fillRect(TL[0] + fw * gx, TL[1], Math.max(1, m * 11e-4), fh);
        for (let j = 0; j < 10; j++) {
          const rx = TL[0] + fw * (0.05 + R() * 0.8), ry = TL[1] + fh * (0.05 + R() * 0.85), rw2 = fw * (0.04 + R() * 0.1), rh = fh * (0.02 + R() * 0.05);
          q.fillStyle = P.s(0.012, 0, 0.5);
          q.fillRect(rx, ry, rw2, rh);
          q.fillStyle = P.s(0.16, 0.4, 0.35);
          q.fillRect(rx, ry + rh, rw2, Math.max(1, m * 8e-4));
        }
        for (let j = 0; j < 2; j++) {
          const gx = TL[0] + fw * (0.32 + j * 0.36), gy0 = TL[1] + fh * 0.12, gy1 = TL[1] + fh * (0.55 + R() * 0.35);
          q.fillStyle = P.s(0.55, 0, 0.5);
          q.fillRect(gx, gy0, Math.max(1, m * 14e-4), gy1 - gy0);
          glyphs.push([gx, gy0, gy1]);
        }
      }
    }
  };
  const lintelBroken = (q, sc, hz) => {
    const s1 = [T(0.16, 0.066, sc), T(0.232, 0.07, sc), T(0.218, 0.082, sc), T(0.226, 0.09, sc), T(0.212, 0.1, sc), T(0.16, 0.098, sc)];
    q.fillStyle = P.s(hzk(0.05, hz), hzw(0.15, hz));
    poly(q, s1);
    q.fill();
    q.fillStyle = P.s(hzk(0.95, hz), 1, 0.75);
    q.fillRect(s1[0][0], s1[0][1], s1[1][0] - s1[0][0], Math.max(1, m * 2e-3 * sc));
    const s2 = [T(0.352, 0.18, sc), T(0.396, 0.178, sc), T(0.396, 0.2, sc), T(0.36, 0.202, sc), T(0.366, 0.193, sc)];
    q.fillStyle = P.s(hzk(0.05, hz), hzw(0.12, hz));
    poly(q, s2);
    q.fill();
    const A2 = T(0.2, F1 - 4e-3, sc), B = T(0.388, 0.5, sc), t = h * 0.068 * sc;
    const fr = [A2, B, [B[0], B[1] + t], [A2[0], A2[1] + t]];
    const lg = q.createLinearGradient(A2[0], A2[1], B[0], B[1]);
    lg.addColorStop(0, P.s(0.02, 0.05));
    lg.addColorStop(1, P.s(0.07, 0.2));
    q.fillStyle = lg;
    poly(q, fr);
    q.fill();
    q.fillStyle = P.s(0.04, 0.1);
    poly(q, [B, [B[0] + t * 0.25, B[1] + t * 0.35], [B[0] + t * 0.1, B[1] + t * 0.7], [B[0], B[1] + t]]);
    q.fill();
    q.strokeStyle = P.s(0.01, 0, 0.5);
    q.lineWidth = Math.max(1, m * 12e-4);
    for (let j = 1; j < 7; j++) {
      const e = j / 7, X = A2[0] + (B[0] - A2[0]) * e, Y = A2[1] + (B[1] - A2[1]) * e;
      q.beginPath();
      q.moveTo(X, Y);
      q.lineTo(X, Y + t);
      q.stroke();
    }
    q.strokeStyle = P.s(1.05, 1, 0.85);
    q.lineWidth = Math.max(1, m * 26e-4);
    q.beginPath();
    q.moveTo(A2[0], A2[1]);
    q.lineTo(B[0], B[1]);
    q.stroke();
    return { A: A2, B };
  };
  const lintelWhole = (q, sc, hz) => {
    const L = [T(0.152, 0.06, sc), T(0.408, 0.17, sc), T(0.408, 0.2, sc), T(0.152, 0.092, sc)];
    q.fillStyle = P.s(hzk(0.06, hz), hzw(0.18, hz));
    poly(q, L);
    q.fill();
    q.strokeStyle = P.s(hzk(0.9, hz), 1, 0.6);
    q.lineWidth = Math.max(1, m * 2e-3 * sc);
    q.beginPath();
    q.moveTo(L[0][0], L[0][1]);
    q.lineTo(L[1][0], L[1][1]);
    q.stroke();
  };
  const farH = mk2(w / 2, h / 2), fq = farH.getContext("2d");
  fq.scale(0.5, 0.5);
  for (const [sc, hz] of [[0.18, 0.72], [0.3, 0.55], [0.5, 0.36]]) {
    pylon(fq, G2, 0.07, 0, sc, hz, false);
    lintelWhole(fq, sc, hz);
    pylon(fq, G1, 0.09, 1, sc, hz, false);
    const g0 = T(0.1, 0.2, sc);
    fq.fillStyle = P.s(0.7, 0, 0.7);
    fq.fillRect(g0[0], g0[1], Math.max(1, m * 2e-3 * sc), h * 0.2 * sc);
  }
  const far = up(farH, w, h);
  const near = mk2(w, h), nq = near.getContext("2d");
  pylon(nq, G2, 0.07, 0, 1, 0.12, true);
  const ln = lintelBroken(nq, 1, 0);
  pylon(nq, G1, 0.09, 1, 1, 0, true);
  mottle(nq, mottleTile(c, P, s.seed + 21, 0.01, 0), w, h, 0.55, Math.max(0.6, m / 700));
  mottle(nq, mottleTile(c, P, s.seed + 22, 0.2, 0.3), w, h, 0.05, Math.max(1, m / 400));
  {
    const e = 0.24, X = ln.A[0] + (ln.B[0] - ln.A[0]) * e, Y = ln.A[1] + (ln.B[1] - ln.A[1]) * e, fh = Math.max(5, h * 0.018), fw = fh * 0.22;
    nq.fillStyle = P.s(0.012, 0);
    nq.beginPath();
    nq.moveTo(X - fw * 0.5, Y);
    nq.lineTo(X - fw * 0.35, Y - fh * 0.78);
    nq.lineTo(X + fw * 0.35, Y - fh * 0.78);
    nq.lineTo(X + fw * 0.7, Y);
    nq.closePath();
    nq.fill();
    nq.beginPath();
    nq.arc(X, Y - fh * 0.86, fw * 0.32, 0, TAU2);
    nq.fill();
    nq.fillStyle = P.s(1, 1, 0.7);
    nq.fillRect(X + fw * 0.32, Y - fh * 0.8, Math.max(0.8, fw * 0.14), fh * 0.78);
  }
  nq.clearRect(0, F1 * h, w * 0.36, h);
  nq.clearRect(w * 0.34, F2 * h, w * 0.2, h);
  x.save();
  x.beginPath();
  x.rect(0, F1 * h, w * 0.34, h);
  x.clip();
  x.translate(0, F1 * h * 2);
  x.scale(1, -1);
  x.globalAlpha = 0.45;
  x.drawImage(near, 0, 0);
  x.restore();
  x.save();
  x.beginPath();
  x.rect(w * 0.34, F2 * h, w * 0.2, h);
  x.clip();
  x.translate(0, F2 * h * 2);
  x.scale(1, -1);
  x.globalAlpha = 0.4;
  x.drawImage(near, 0, 0);
  x.restore();
  x.save();
  x.beginPath();
  x.rect(w * 0.45, Hy + 1, w * 0.55, h);
  x.clip();
  x.translate(0, (Hy + h * 0.02) * 2);
  x.scale(1, -1);
  x.globalAlpha = 0.3;
  x.drawImage(far, 0, 0);
  x.restore();
  x.globalAlpha = 1;
  s.near = near;
  s.far = far;
  s.glyphs = glyphs;
  {
    const ww = Math.ceil(w / 2), wh = Math.ceil((h - Hy) / 2), wc = mk2(ww, wh), wq = wc.getContext("2d"), id = wq.createImageData(ww, wh), d = id.data;
    const nW = vnoise(s.seed + 5), col = [0, 0, 0], sxF = sx / w;
    for (let py = 0; py < wh; py++) {
      const q = (py + 0.5) / wh, Z = 1 / (q + 0.012), amp = sst(0, 0.12, q);
      const sw = 0.015 + 0.12 * q;
      for (let px = 0; px < ww; px++) {
        const fx = px / ww, Xn = (fx - 0.5) * Z * 3;
        const r = fbm(nW, Xn * 1.6, Z * 5, 3);
        const i = (py * ww + px) * 4;
        const sun = Math.exp(-sq((fx - sxF) / sw));
        if (r > 0.53) {
          P.mix(0.45 + 0.7 * sun, 0.45 + 0.55 * sun, col);
          d[i] = col[0];
          d[i + 1] = col[1];
          d[i + 2] = col[2];
          d[i + 3] = cl01((r - 0.53) * 4) * amp * (0.18 + 0.7 * sun * sunK) * 255;
        } else if (r < 0.47) {
          d[i] = c.br;
          d[i + 1] = c.bg2;
          d[i + 2] = c.bb;
          d[i + 3] = cl01((0.47 - r) * 3) * amp * 0.55 * 255;
        }
      }
    }
    wq.putImageData(id, 0, 0);
    x.imageSmoothingQuality = "high";
    x.drawImage(wc, 0, Hy, w, h - Hy);
  }
  dither(base, R, 3);
  s.base = base;
  const ch = Math.ceil(h * 0.52);
  s.cl = up(cloudTex(P, s.seed + 31, Math.ceil(w / 3), Math.ceil(ch / 3), {
    Px: 6,
    Py: 3.2,
    cov: (v) => 0.56 + 0.42 * sq((v - 0.38) / 0.55) + 0.2 * sq(Math.max(0, 0.12 - v) / 0.12),
    lx: 0.03,
    ly: 0.12,
    gain: 4.2,
    kSh: 0.06,
    kLit: 0.62,
    wSh: 0.1,
    wLit: 1,
    a: 0.95,
    soft: 0.1,
    dense: 0.25,
    warp: 0.7
  }), w, ch);
  const hb = Math.ceil(h * 0.12);
  s.hb = up(cloudTex(P, s.seed + 32, Math.ceil(w / 3), Math.ceil(hb / 3), {
    Px: 10,
    Py: 1.6,
    cov: (v) => 0.66 - 0.2 * v,
    lx: 0,
    ly: -0.12,
    gain: 6,
    kSh: 0.22,
    kLit: 0.72,
    wSh: 0.45,
    wLit: 1,
    a: 0.85,
    soft: 0.09
  }), w, hb);
  s.hbY = Hy - hb + 2;
  const mh = Math.ceil(h * 0.12);
  s.mist = up(cloudTex(P, s.seed + 33, Math.ceil(w / 4), Math.ceil(mh / 4), {
    Px: 6,
    Py: 1.5,
    cov: (v) => 0.52 + 0.45 * sq((v - 0.55) / 0.5),
    lx: 0,
    ly: -0.1,
    gain: 3,
    kSh: 0.26,
    kLit: 0.44,
    wSh: 0.5,
    wLit: 0.9,
    a: 0.6,
    soft: 0.14,
    oct: 4
  }), w, mh);
  s.mY = Hy - h * 0.01;
  s.gl = [];
  for (let i = 0; i < 200; i++) s.gl.push({ u: (R() + R() + R() - 1.5) * 1.2, v: Math.pow(R(), 1.4), ph: R() * 9, sp: 15e-4 + R() * 3e-3, len: 0.6 + R() });
  s.rays = [];
  for (let i = 0; i < 7; i++) s.rays.push({ a: (i / 6 - 0.5) * 2.2 + (R() - 0.5) * 0.15, wd: 0.04 + R() * 0.07, ph: R() * 9, sp: 4e-5 + R() * 6e-5 });
}
var keystone = {
  name: "Keystone",
  flav: "Artscape",
  reset: () => ({ seed: Math.random() * 1e9 | 0, key: "", fl: null, nf: 0, bt: null, nb: 0 }),
  frame: (g, w, h, t, c, s) => {
    const key = keyOf(w, h, c);
    if (s.key !== key) {
      s.key = key;
      bakeGate(w, h, c, s);
    }
    if (s.lt == null || t < s.lt - 1e3) {
      s.nf = t + 9e3;
      s.fl = null;
      s.nb = t + 15e3;
      s.bt = null;
    }
    const dt = tick2(s, t), m = s.m, Hy = s.Hy, sx = s.sx, sunK = s.sunK, P = s.P;
    const rise = 0.5 - 0.5 * Math.cos((t / 36e5 + 0.12) * TAU2);
    const sy = Hy + s.sr * 0.3 - rise * h * 0.15, br = (0.7 + 0.3 * rise) * sunK;
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.drawImage(s.base, 0, 0);
    g.save();
    g.beginPath();
    g.rect(0, 0, w, Hy);
    g.clip();
    g.globalCompositeOperation = "screen";
    g.globalAlpha = 0.32 * br;
    g.drawImage(glowSp(c, P, 0.9, 1), sx - w * 0.5, sy - h * 0.45, w, h * 0.8);
    g.globalAlpha = 0.5 * br;
    g.drawImage(glowSp(c, P, 1.2, 1), sx - m * 0.28, sy - m * 0.26, m * 0.56, m * 0.52);
    const bs = beamSp(c, P, 1.05, 1);
    for (const r of s.rays) {
      const b = 0.5 + 0.5 * Math.sin(t * r.sp + r.ph);
      g.save();
      g.translate(sx, sy);
      g.rotate(Math.PI + r.a);
      g.globalAlpha = (0.03 + 0.08 * b) * br;
      const wd = w * r.wd;
      g.drawImage(bs, -wd / 2, 0, wd, h * 1.1);
      g.restore();
    }
    if (!c.light) {
      g.globalAlpha = 0.9;
      g.drawImage(glowSp(c, P, 1.6, 1), sx - s.sr * 3.4, sy - s.sr * 3.4, s.sr * 6.8, s.sr * 6.8);
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
      g.fillStyle = P.s(1.8, 1);
      g.beginPath();
      g.arc(sx, sy, s.sr, 0, TAU2);
      g.fill();
    }
    g.restore();
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    wrap(g, s.cl, w, t * 16e-4 * Math.max(0.2, w / 1440), 0);
    wrap(g, s.hb, w, t * 6e-4 * Math.max(0.2, w / 1440), s.hbY);
    g.drawImage(s.far, 0, 0);
    if (!s.bt && t >= s.nb) s.bt = { t0: t, dur: 3e5 + Math.random() * 12e4 };
    if (s.bt) {
      const e = (t - s.bt.t0) / s.bt.dur;
      if (e >= 1) {
        s.bt = null;
        s.nb = t + 2e5 + Math.random() * 3e5;
      } else {
        const X = w * (0.72 - 0.62 * e), Y = Hy + h * 0.03, L = Math.max(3, m * 0.014), Tt = Math.max(1, m * 3e-3);
        g.fillStyle = P.s(0.02, 0);
        g.fillRect(X - L / 2, Y - Tt, L, Tt);
        g.fillRect(X - L * 0.05, Y - Tt * 3.2, Math.max(1, L * 0.06), Tt * 2.3);
        const a = Math.min(1, e * 20) * Math.min(1, (1 - e) * 20);
        g.globalCompositeOperation = "screen";
        g.globalAlpha = 0.6 * a;
        const r = Math.max(2, m * 7e-3);
        g.drawImage(glowSp(c, P, 1.1, 1), X + L * 0.3 - r, Y - Tt * 2.5 - r, r * 2, r * 2);
        g.globalAlpha = 0.35 * a;
        g.drawImage(glowSp(c, P, 0.9, 1), X + L * 0.3 - r * 0.5, Y, r, r * 4);
        g.globalAlpha = 1;
        g.globalCompositeOperation = "source-over";
      }
    }
    g.drawImage(s.near, 0, 0);
    g.globalCompositeOperation = "screen";
    for (let i = 0; i < s.glyphs.length; i++) {
      const [gx, y0, y1] = s.glyphs[i], a = 0.12 + 0.25 * Math.max(0, Math.sin(t * 12e-5 + i * 1.9));
      g.globalAlpha = a;
      g.drawImage(glowSp(c, P, 0.7, 0), gx - m * 0.012, y0, m * 0.024, y1 - y0);
    }
    g.globalAlpha = 0.85;
    g.globalCompositeOperation = "source-over";
    wrap(g, s.mist, w, -t * 4e-3 * Math.max(0.2, w / 1440), s.mY);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "screen";
    const gw = 0.5 + 0.5 * rise;
    for (const p of s.gl) {
      const y = Hy + 2 + p.v * (h - Hy) * 0.85, X = sx + p.u * w * (8e-3 + p.v * 0.07) * gw;
      const a = Math.pow(Math.max(0, Math.sin(t * p.sp + p.ph)), 6) * (1 - p.v * 0.7) * br;
      if (a < 0.02) continue;
      g.fillStyle = P.s(1.6, 1, a * 0.9);
      g.fillRect(X, y, Math.max(1, p.len * (1 + p.v * 6) * m / 900), Math.max(1, p.v * 2));
    }
    g.globalCompositeOperation = "source-over";
    if (!s.fl && t >= s.nf) {
      const n = 5 + (Math.random() * 6 | 0), dir = Math.random() < 0.5 ? 1 : -1, bl = [];
      for (let i = 0; i < n; i++) bl.push({ dx: -i * 0.012 * w * dir + (Math.random() - 0.5) * w * 0.01, dy: (Math.random() - 0.5) * h * 0.03 + (i % 2 ? 1 : -1) * i * h * 4e-3, ph: Math.random() * 9, sp: 9e-3 + Math.random() * 4e-3 });
      s.fl = { t0: t, dur: 7e4 + Math.random() * 4e4, dir, y: h * (0.28 + Math.random() * 0.16), bl, s: m * (5e-3 + Math.random() * 3e-3) };
    }
    if (s.fl) {
      const F = s.fl, e = (t - F.t0) / F.dur;
      if (e >= 1.25) {
        s.fl = null;
        s.nf = t + 6e4 + Math.random() * 12e4;
      } else {
        const X0 = F.dir > 0 ? -w * 0.05 + e * w * 1.1 : w * 1.05 - e * w * 1.1, list = [];
        for (const b of F.bl) {
          b.ph += b.sp * dt;
          list.push({ x: X0 + b.dx, y: F.y + b.dy + Math.sin(t * 7e-4 + b.dx) * h * 6e-3, s: F.s, ph: b.ph });
        }
        birds(g, list, P.s(0.02, 0, 0.85), Math.max(0.8, F.s * 0.22));
      }
    }
  }
};
function moonTex(P, seed, r, k0, wm) {
  const D = Math.ceil(r * 2 + 4), cv = mk2(D, D), x = cv.getContext("2d"), id = x.createImageData(D, D), d = id.data;
  const n = vnoise(seed), n2 = vnoise(seed + 9), col = [0, 0, 0], c0 = D / 2;
  for (let y = 0; y < D; y++) for (let xx = 0; xx < D; xx++) {
    const dx = xx + 0.5 - c0, dy = y + 0.5 - c0, dd = Math.hypot(dx, dy);
    if (dd > r + 1) continue;
    const u = dx / r, v = dy / r, rr = dd / r;
    const mare = sst(0.47, 0.6, fbm(n, u * 2.2 + 3, v * 2.2 + 3, 5)), crat = fbm(n2, u * 9, v * 9, 3);
    const k = k0 * (1 - 0.22 * Math.pow(rr, 3)) - 0.3 * mare - 0.12 * sst(0.55, 0.7, crat) + 0.06 * sst(0.6, 0.75, crat);
    P.mix(k, wm, col);
    const i = (y * D + xx) * 4;
    d[i] = col[0];
    d[i + 1] = col[1];
    d[i + 2] = col[2];
    d[i + 3] = cl01(r - dd + 0.5) * 255;
  }
  x.putImageData(id, 0, 0);
  return cv;
}
function bakeKeep(w, h, c, s) {
  const R = rng2(s.seed), m = Math.min(w, h), P = Pn(c);
  s.P = P;
  const Hy = h * 0.6;
  s.Hy = Hy;
  s.m = m;
  const mr = m * 0.15;
  s.mr = mr;
  const sky = mk2(w, h), x = sky.getContext("2d");
  const gr = x.createLinearGradient(0, 0, 0, Hy);
  gr.addColorStop(0, P.s(0.012, 0));
  gr.addColorStop(0.45, P.s(0.04, 0.04));
  gr.addColorStop(0.82, P.s(0.1, 0.2));
  gr.addColorStop(1, P.s(0.17, 0.42));
  x.fillStyle = gr;
  x.fillRect(0, 0, w, h);
  stars(x, c, R, w, 0, Hy * 0.9, Math.round(w * h / 1600));
  dither(sky, R, 2.5);
  s.sky = sky;
  s.moonW = moonTex(P, s.seed + 1, mr, 1.42, 1);
  s.moonP = moonTex(P, s.seed + 1, mr, 1.7, 0.45);
  const wh = Math.ceil(h * 0.26);
  s.wi = up(cloudTex(P, s.seed + 2, Math.ceil(w / 4), Math.ceil(wh / 7), {
    Px: 5,
    Py: 1.6,
    cov: (v) => 0.6 + 0.4 * sq((v - 0.5) / 0.5),
    lx: 0.05,
    ly: 0.1,
    gain: 4,
    kSh: 0.1,
    kLit: 0.3,
    wSh: 0.1,
    wLit: 0.8,
    a: 0.55,
    soft: 0.1,
    oct: 4
  }), w, wh);
  s.wY = h * 0.12;
  const fr = [0, 0.12, 0.32, 0.62], cell = [0.03, 0.055, 0.1, 0.17], bh = [0.12, 0.16, 0.24, 0.36], hz = [1, 0.7, 0.4, 0.1], vv = [1.2, 2.6, 5, 9];
  s.layers = [];
  for (let k = 0; k < 4; k++) {
    const yk = Hy + (h - Hy) * fr[k], top = Math.floor(yk - h * bh[k] * 0.35), H2 = Math.ceil(h * bh[k]);
    const ds = k < 3 ? 3 : 4, cp = m * cell[k], Px = Math.max(2, Math.round(w / cp));
    const kSh = 0.035 + 0.12 * hz[k], kLit = 0.2 + 0.22 * (1 - hz[k] * 0.5);
    const tex = up(cloudTex(P, s.seed + 40 + k, Math.ceil(w / ds), Math.ceil(H2 / ds), {
      Px,
      Py: H2 / cp,
      cov: (v) => 0.64 - 0.46 * sst(0.04, 0.55, v) + 0.45 * (1 - sst(0, 0.14, v)),
      lx: -0.04,
      ly: -0.16,
      gain: 3.4,
      kSh,
      kLit,
      wSh: 0.04,
      wLit: 0.75 - 0.4 * hz[k],
      a: 1,
      soft: 0.12,
      dense: 0.2,
      oct: 4,
      warp: 0.6
    }), w, H2);
    const cv = mk2(w, h - top), o = cv.getContext("2d");
    o.drawImage(tex, 0, 0);
    const row = tex.getContext("2d").getImageData(0, Math.max(0, H2 - 3), w, 1).data;
    let ar = 0, ag = 0, ab = 0, nn = 0;
    for (let i = 0; i < row.length; i += 16) {
      if (row[i + 3] < 200) continue;
      ar += row[i];
      ag += row[i + 1];
      ab += row[i + 2];
      nn++;
    }
    const body = nn ? [ar / nn, ag / nn, ab / nn] : P.rgb(kSh, 0.03);
    const bg2 = o.createLinearGradient(0, H2 * 0.55, 0, H2);
    bg2.addColorStop(0, rgba(body, 0));
    bg2.addColorStop(1, rgba(body, 1));
    o.fillStyle = bg2;
    o.fillRect(0, H2 * 0.55, w, H2 * 0.45);
    o.fillStyle = rgba(body, 1);
    o.fillRect(0, H2 - 1, w, h);
    s.layers.push({ cv, top, v: vv[k] * Math.max(0.2, w / 1440) });
  }
  const farH = mk2(w / 2, Hy / 2 + h * 0.02), fq = farH.getContext("2d");
  fq.scale(0.5, 0.5);
  for (const [fx, sc, k] of [[0.54, 0.05, 0.14], [0.67, 0.085, 0.12], [0.88, 0.06, 0.135], [0.77, 0.035, 0.15]]) {
    const X0 = w * fx;
    for (let i = 0; i < 4; i++) {
      const tw = h * sc * (0.12 + R() * 0.1), th = h * sc * (0.5 + R() * 0.9) * (i === 1 ? 1.4 : 1), X = X0 + (i - 1.5) * h * sc * 0.35;
      fq.fillStyle = P.s(k, 0.15);
      fq.fillRect(X - tw / 2, Hy + h * 0.01 - th, tw, th);
      fq.fillStyle = P.s(0.5, 1, 0.5);
      fq.fillRect(X + tw / 2 - 1, Hy + h * 0.01 - th, 1, th);
      if (R() < 0.7) {
        fq.fillStyle = P.s(0.8, 1, 0.7);
        fq.fillRect(X - 1, Hy + h * 0.01 - th * (0.3 + R() * 0.5), 2, th * 0.2);
      }
    }
  }
  s.far = up(farH, w, Hy + h * 0.02);
  const topY = h * 0.43, rx = w * 0.255, fnR = frac(R, 0.62), fnT = frac(R, 0.5), fnR2 = frac(R, 0.7);
  const cliff = new Path2D();
  cliff.moveTo(-2, h);
  cliff.lineTo(-2, topY + h * 0.01);
  for (let xx = 0; xx <= rx; xx += 4) cliff.lineTo(xx, topY - h * 0.01 * fnT(xx / rx));
  const edge = [];
  for (let yy = topY; yy <= h; yy += 3) {
    const f = (yy - topY) / (h - topY), step = Math.floor(f * 9) / 9;
    const X = rx - w * 0.025 * Math.sin(Math.min(1, f * 4) * Math.PI) * 0.5 + w * 0.05 * (fnR(f) - 0.5) + w * 0.012 * (fnR2(step + f * 0.2) - 0.5) + w * 0.04 * f;
    cliff.lineTo(X, yy);
    edge.push([X, yy]);
  }
  cliff.closePath();
  const keep = mk2(w * 0.4, h), kq = keep.getContext("2d");
  const rim = Math.max(1, m * 22e-4);
  kq.fillStyle = P.s(0.55, 1);
  kq.fill(cliff);
  kq.save();
  kq.globalCompositeOperation = "source-atop";
  kq.translate(-rim * 1.5, 0);
  const cg = kq.createLinearGradient(0, topY, 0, h);
  cg.addColorStop(0, P.s(0.06, 0.2));
  cg.addColorStop(0.5, P.s(0.035, 0.08));
  cg.addColorStop(1, P.s(0.02, 0.02));
  kq.fillStyle = cg;
  kq.fill(cliff);
  kq.restore();
  {
    kq.save();
    kq.clip(cliff);
    const lg = kq.createLinearGradient(rx * 0.55, 0, rx * 1.15, 0);
    lg.addColorStop(0, P.s(0.1, 0.6, 0));
    lg.addColorStop(1, P.s(0.14, 0.8, 0.55));
    kq.fillStyle = lg;
    kq.fillRect(0, topY, w * 0.4, h);
    for (let i = 0; i < 34; i++) {
      const X = rx * (0.4 + R() * 0.65), y0 = topY + R() * (h - topY) * 0.8, L = h * (0.04 + R() * 0.16);
      kq.strokeStyle = R() < 0.6 ? P.s(0.01, 0, 0.5) : P.s(0.2, 0.8, 0.3);
      kq.lineWidth = Math.max(0.8, m * (1e-3 + R() * 2e-3));
      kq.beginPath();
      kq.moveTo(X, y0);
      kq.quadraticCurveTo(X + (R() - 0.5) * w * 0.01, y0 + L / 2, X + (R() - 0.5) * w * 0.012, y0 + L);
      kq.stroke();
    }
    kq.restore();
  }
  const VP = [w * 0.62, Hy];
  s.lights = [];
  const towers = [
    [0.03, 0.026, 0.21, 1],
    [0.1, 0.03, 0.16, 1],
    [0.205, 0.026, 0.22, 1],
    [0.25, 0.02, 0.3, 1],
    [0.062, 0.044, 0.1, 0],
    [0.145, 0.052, 0.035, 0],
    [0.218, 0.036, 0.13, 0]
  ];
  const tops = [];
  for (const [fx, fw, ft, back] of towers) {
    const cx = w * fx, base = topY - h * (back ? 0.035 : 0.02), top = h * ft, H = base - top, hzT = back ? 0.35 : 0;
    const segs = [];
    let wd = w * fw, y = base;
    const sb = [0.55 + R() * 0.2, 0.25 + R() * 0.12];
    segs.push([wd, top + H * (1 - sb[0]), base]);
    wd *= 0.82;
    segs.push([wd, top + H * (1 - sb[1]), top + H * (1 - sb[0])]);
    wd *= 0.8;
    segs.push([wd, top, top + H * (1 - sb[1])]);
    for (const [sw, y0, y1] of segs) {
      const L = cx - sw / 2, Rr = cx + sw / 2, d = 0.045;
      const R2 = Rr + (VP[0] - Rr) * d, y0b = y0 + (VP[1] - y0) * d, y1b = y1 + (VP[1] - y1) * d;
      const sgr = kq.createLinearGradient(Rr, 0, R2, 0);
      sgr.addColorStop(0, P.s(0.17 + hzT * 0.05, 0.95));
      sgr.addColorStop(1, P.s(0.08 + hzT * 0.05, 0.7));
      kq.fillStyle = sgr;
      poly(kq, [[Rr, y0], [R2, y0b], [R2, y1b], [Rr, y1]]);
      kq.fill();
      const fgr = kq.createLinearGradient(0, y0, 0, y1);
      fgr.addColorStop(0, P.s(0.06 + hzT * 0.07, 0.15));
      fgr.addColorStop(1, P.s(0.03 + hzT * 0.06, 0.06));
      kq.fillStyle = fgr;
      kq.fillRect(L, y0, sw, y1 - y0 + 1);
      kq.fillStyle = P.s(0.75, 1, 0.75 - hzT);
      kq.fillRect(Rr - rim, y0, rim, y1 - y0);
      kq.fillStyle = P.s(0.01, 0, 0.35 - hzT * 0.5);
      for (let yy = y0 + h * 0.018; yy < y1; yy += h * 0.018) kq.fillRect(L, yy, sw, Math.max(1, m * 9e-4));
    }
    const tw = segs[2][0];
    kq.fillStyle = P.s(0.05 + hzT * 0.07, 0.12);
    kq.fillRect(cx - tw * 0.62, top - h * 8e-3, tw * 1.24, h * 8e-3);
    kq.fillRect(cx - tw * 0.22, top - h * 0.02, tw * 0.44, h * 0.012);
    kq.fillStyle = P.s(0.8, 1, 0.7 - hzT);
    kq.fillRect(cx - tw * 0.62, top - h * 8e-3, tw * 1.24, Math.max(1, rim * 0.6));
    tops.push({ cx, top, base, wd: w * fw, back });
    const nl = 1 + (R() * 3 | 0);
    for (let j = 0; j < nl; j++) {
      const lx = cx + (j - (nl - 1) / 2) * w * fw * 0.28, y0 = top + H * (0.05 + R() * 0.1), y1 = top + H * (0.45 + R() * 0.5);
      const lw = Math.max(1, m * 17e-4 * (back ? 0.8 : 1));
      kq.fillStyle = P.s(0.55, 1, 0.55 - hzT * 0.4);
      kq.fillRect(lx - lw / 2, y0, lw, y1 - y0);
      s.lights.push({ x: lx, y0, y1, lw, ph: R() * TAU2, sp: TAU2 / (4e4 + R() * 16e4), back });
    }
  }
  s.dots = [];
  for (let i = 0; i < tops.length; i++) for (let j = i + 1; j < tops.length; j++) {
    const A2 = tops[i], B = tops[j];
    if (A2.back !== B.back || Math.abs(A2.cx - B.cx) > w * 0.1 || R() < 0.25) continue;
    const yb = Math.max(A2.top, B.top) + (Math.min(A2.base, B.base) - Math.max(A2.top, B.top)) * (0.2 + R() * 0.6), th = Math.max(2, h * 6e-3);
    const x0 = Math.min(A2.cx, B.cx), x1 = Math.max(A2.cx, B.cx);
    kq.fillStyle = P.s(A2.back ? 0.08 : 0.04, 0.1);
    kq.fillRect(x0, yb, x1 - x0, th);
    kq.fillStyle = P.s(0.5, 1, 0.45);
    kq.fillRect(x0, yb, x1 - x0, Math.max(1, rim * 0.5));
    for (let X = x0 + 4; X < x1 - 2; X += Math.max(4, w * 6e-3)) s.dots.push([X, yb + th + 1]);
  }
  mottle(kq, mottleTile(c, P, s.seed + 23, 0.01, 0), w * 0.4, h, 0.32, Math.max(0.6, m / 800));
  kq.fillStyle = P.s(0.9, 1, 0.8);
  for (const [X, Y] of s.dots) kq.fillRect(X, Y, Math.max(1, m * 12e-4), Math.max(1, m * 12e-4));
  s.keep = keep;
  s.port = [w * 0.21, h * 0.3];
  const px0 = Math.floor(w * 0.19), pw = Math.ceil(w * 0.15), py0 = Math.floor(topY - h * 0.01), ph = Math.ceil(Hy + h * 0.08 - py0);
  {
    const gw = Math.ceil(pw / 3), gh = Math.ceil(ph / 3), cv = mk2(gw, gh), q = cv.getContext("2d"), id = q.createImageData(gw, gh), d = id.data;
    const n = vnoise(s.seed + 50), col = [0, 0, 0];
    for (let y = 0; y < gh; y++) for (let xx = 0; xx < gw; xx++) {
      const U = xx / gw * 3, V = y / gh * 4;
      const dn = fbm(n, U * 1.4, V, 5, 0, 4), dl = fbm(n, U * 1.4 + 0.12, V, 3, 0, 4);
      const lit = cl01(0.5 + (dn - dl) * 5);
      P.mix(0.3 + 0.4 * lit, 0.55 + 0.4 * lit, col);
      const i = (y * gw + xx) * 4;
      d[i] = col[0];
      d[i + 1] = col[1];
      d[i + 2] = col[2];
      d[i + 3] = sst(0.36, 0.62, dn) * 255;
    }
    q.putImageData(id, 0, 0);
    s.plume = up(cv, pw, ph);
    const mask = mk2(pw / 4, ph / 4), mq = mask.getContext("2d");
    mq.scale(0.25, 0.25);
    const e0 = edge.find((p) => p[1] > py0 + h * 0.02) || [rx, py0];
    for (let i = 0; i < 40; i++) {
      const f = i / 39, Y = f * ph, ex = (edge.find((p) => p[1] >= py0 + Y) || e0)[0] - px0;
      const wdt = pw * (0.14 + 0.6 * f), a = (0.35 + 0.65 * Math.sin(Math.min(1, f * 1.2) * Math.PI)) * (1 - 0.3 * f);
      mq.globalAlpha = a * 0.45;
      mq.drawImage(radial([[0, "rgba(0,0,0,1)"], [0.5, "rgba(0,0,0,.8)"], [1, "rgba(0,0,0,0)"]], 64), ex - wdt * 0.62, Y - ph * 0.07, wdt, ph * 0.14);
    }
    s.pmask = up(mask, pw, ph);
    s.ptmp = mk2(pw, ph);
    s.pl = [px0, py0, pw, ph];
  }
}
var highKeep = {
  name: "High Keep",
  flav: "Artscape",
  reset: () => ({ seed: Math.random() * 1e9 | 0, key: "", cr: null, nc: 0, me: null, nm: 0 }),
  frame: (g, w, h, t, c, s) => {
    const key = keyOf(w, h, c);
    if (s.key !== key) {
      s.key = key;
      bakeKeep(w, h, c, s);
    }
    if (s.lt == null || t < s.lt - 1e3) {
      s.nc = t + 25e3;
      s.cr = null;
      s.nm = t + 3e4 + Math.random() * 3e4;
      s.me = null;
    }
    tick2(s, t);
    const m = s.m, Hy = s.Hy, mr = s.mr, P = s.P;
    const rise = 0.5 - 0.5 * Math.cos((t / 36e5 + 0.17) * TAU2);
    const mx = w * (0.215 + 0.1 * rise), my = Hy + mr * 0.35 - rise * (Hy - h * 0.14);
    const mk_ = c.light ? 0.55 : 1;
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.drawImage(s.sky, 0, 0);
    g.globalCompositeOperation = "screen";
    g.globalAlpha = 0.4 * mk_;
    g.drawImage(glowSp(c, P, 0.7, 1 - 0.4 * rise), mx - mr * 6, my - mr * 4.5, mr * 12, mr * 9);
    g.globalAlpha = 0.45 * mk_;
    g.drawImage(glowSp(c, P, 1, 1 - 0.4 * rise), mx - mr * 1.9, my - mr * 1.9, mr * 3.8, mr * 3.8);
    g.globalCompositeOperation = "source-over";
    const D = s.moonW.width;
    g.globalAlpha = mk_;
    g.drawImage(s.moonW, mx - D / 2, my - D / 2);
    g.globalAlpha = mk_ * sst(0.2, 0.9, rise);
    g.drawImage(s.moonP, mx - D / 2, my - D / 2);
    g.globalAlpha = 1;
    wrap(g, s.wi, w, t * 35e-4 * Math.max(0.2, w / 1440), s.wY);
    if (!s.me && t >= s.nm) {
      const a0 = 0.4 + Math.random() * 0.5;
      s.me = { t0: t, x: w * (0.35 + Math.random() * 0.6), y: h * (0.04 + Math.random() * 0.2), dx: -Math.cos(a0) * m * 0.22, dy: Math.sin(a0) * m * 0.12 };
    }
    if (s.me) {
      const e = (t - s.me.t0) / 900;
      if (e >= 1) {
        s.me = null;
        s.nm = t + 6e4 + Math.random() * 9e4;
      } else {
        const hx = s.me.x + s.me.dx * e, hy = s.me.y + s.me.dy * e, tx = s.me.x + s.me.dx * Math.max(0, e - 0.35), ty = s.me.y + s.me.dy * Math.max(0, e - 0.35);
        const lg = g.createLinearGradient(tx, ty, hx, hy);
        lg.addColorStop(0, W2(c, 0));
        lg.addColorStop(1, W2(c, Math.sin(e * 3.14) * 0.5));
        g.strokeStyle = lg;
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(tx, ty);
        g.lineTo(hx, hy);
        g.stroke();
      }
    }
    g.drawImage(s.far, 0, 0);
    const L = s.layers;
    for (let i = 0; i < 2; i++) wrap(g, L[i].cv, w, t * L[i].v / 1e3, L[i].top);
    g.globalCompositeOperation = "screen";
    g.globalAlpha = 0.28 * mk_ * (0.6 + 0.4 * rise);
    g.drawImage(glowSp(c, P, 0.9, 0.9), mx - w * 0.3, Hy - h * 0.05, w * 0.6, (h - Hy) * 0.6);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.drawImage(s.keep, 0, 0);
    g.globalCompositeOperation = "screen";
    for (const l of s.lights) {
      const a = sst(0.3, 0.8, 0.5 + 0.5 * Math.sin(t * l.sp + l.ph)) * (l.back ? 0.6 : 1);
      if (a < 0.02) continue;
      g.globalAlpha = a;
      g.fillStyle = P.s(1.3, 1);
      g.fillRect(l.x - l.lw / 2, l.y0, l.lw, l.y1 - l.y0);
      g.globalAlpha = a * 0.35;
      g.drawImage(glowSp(c, P, 1, 1), l.x - l.lw * 7, l.y0, l.lw * 14, l.y1 - l.y0);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    {
      const [px0, py0, pw, ph] = s.pl, q = s.ptmp.getContext("2d"), H2 = s.plume.height;
      q.globalCompositeOperation = "source-over";
      q.clearRect(0, 0, pw, ph);
      const off = t * 0.012 * Math.max(0.2, h / 900) % H2;
      q.drawImage(s.plume, 0, off - H2);
      q.drawImage(s.plume, 0, off);
      q.globalCompositeOperation = "destination-in";
      q.drawImage(s.pmask, 0, 0);
      g.drawImage(s.ptmp, px0, py0);
    }
    g.globalCompositeOperation = "screen";
    if (!s.cr && t >= s.nc) s.cr = { t0: t, dur: 9e4 + Math.random() * 5e4, ex: w * (0.55 + Math.random() * 0.4), ey: Hy - h * (0.02 + Math.random() * 0.06) };
    if (s.cr) {
      const e = (t - s.cr.t0) / s.cr.dur;
      if (e >= 1) {
        s.cr = null;
        s.nc = t + 15e4 + Math.random() * 2e5;
      } else {
        const q = 1 - Math.pow(1 - e, 1.6), X = s.port[0] + (s.cr.ex - s.port[0]) * q, Y = s.port[1] + (s.cr.ey - s.port[1]) * q - Math.sin(q * 3.14) * h * 0.04;
        const a = Math.min(1, e * 12) * (1 - sst(0.75, 1, e)), r = Math.max(1.5, m * 0.01 * (1 - q * 0.8));
        g.globalAlpha = 0.5 * a;
        g.drawImage(glowSp(c, P, 1.2, 1), X - r * 2, Y - r * 2, r * 4, r * 4);
        g.globalAlpha = a;
        g.fillStyle = P.s(1.8, 1);
        g.fillRect(X - 0.75, Y - 0.75, 1.5, 1.5);
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    for (let i = 2; i < L.length; i++) wrap(g, L[i].cv, w, t * L[i].v / 1e3, L[i].top);
  }
};
function bakeVigil(w, h, c, s) {
  const R = rng2(s.seed), m = Math.min(w, h), P = Pn(c);
  s.P = P;
  const Hy = h * 0.66;
  s.Hy = Hy;
  s.m = m;
  const sky = mk2(w, h), x = sky.getContext("2d");
  const gr = x.createLinearGradient(0, 0, 0, Hy);
  gr.addColorStop(0, P.s(0.012, 0));
  gr.addColorStop(0.35, P.s(0.04, 0));
  gr.addColorStop(0.7, P.s(0.09, 0.04));
  gr.addColorStop(1, P.s(0.17, 0.12));
  x.fillStyle = gr;
  x.fillRect(0, 0, w, Hy + 2);
  stars(x, c, R, w, 0, Hy * 0.95, Math.round(w * h / 1300));
  const ig = x.createLinearGradient(0, Hy, 0, h);
  ig.addColorStop(0, P.s(0.1, 0.02));
  ig.addColorStop(0.3, P.s(0.05, 0));
  ig.addColorStop(1, P.s(0.02, 0));
  x.fillStyle = ig;
  x.fillRect(0, Hy, w, h - Hy);
  dither(sky, R, 2.5);
  s.sky = sky;
  {
    const mh = Math.ceil(h * 0.1), gw = Math.ceil(w / 2), gh = Math.ceil(mh / 2), cv = mk2(gw, gh), q = cv.getContext("2d"), id = q.createImageData(gw, gh), d = id.data;
    const n = vnoise(s.seed + 61), col = [0, 0, 0];
    const rng22 = [[0.075, 0.13, frac(R, 0.55), 0], [0.04, 0.085, frac(R, 0.5), 4e-3]];
    for (let px = 0; px < gw; px++) {
      const u = px / gw;
      for (const [amp, k, fn, off] of rng22) {
        const ry = (mh - h * off - h * amp * Math.pow(fn(u), 1.6)) / 2;
        for (let py = Math.max(0, Math.ceil(ry)); py < gh; py++) {
          const dep = (py - ry) / (gh - ry + 1), sn = fbm(n, u * 26, py / gh * 3 + k * 50, 4);
          const snow = sst(0.48, 0.6, sn) * Math.pow(1 - dep, 2.5);
          P.mix(k * 0.75 * (1 - 0.3 * dep) + snow * 0.08, 0.02, col);
          const i = (py * gw + px) * 4;
          d[i] = col[0];
          d[i + 1] = col[1];
          d[i + 2] = col[2];
          d[i + 3] = 255;
        }
      }
    }
    q.putImageData(id, 0, 0);
    const mt = mk2(w, mh), mq = mt.getContext("2d");
    mq.drawImage(cv, 0, 0, w, mh);
    const hz = mq.createLinearGradient(0, mh - h * 0.03, 0, mh);
    hz.addColorStop(0, P.s(0.12, 0.05, 0));
    hz.addColorStop(1, P.s(0.13, 0.05, 0.8));
    mq.fillStyle = hz;
    mq.fillRect(0, mh - h * 0.03, w, h * 0.03);
    s.mt = mt;
    s.mtY = Hy - mh + 1;
  }
  {
    const SH = Math.ceil(h - Hy), gw = Math.ceil(w / 2), gh = Math.ceil(SH / 2), cv = mk2(gw, gh), q = cv.getContext("2d"), id = q.createImageData(gw, gh), d = id.data;
    const n = vnoise(s.seed + 62), n2 = vnoise(s.seed + 63), col = [0, 0, 0];
    for (let py = 0; py < gh; py++) {
      const qq = (py + 0.5) / gh, Z = 1 / (qq + 0.01), near = sst(0.1, 1, qq);
      for (let px = 0; px < gw; px++) {
        const Xn = (px / gw - 0.5) * Z;
        const dr = fbm(n, Xn * 3.2, Z * 3.6, 4), ice = fbm(n2, Xn * 1.4, Z * 1.6, 3);
        const sas = near > 0 ? Math.sin(Xn * 14 + Z * 9 + dr * 8) * 0.5 + 0.5 : 0.5;
        const k = (0.22 - 0.12 * qq) * (0.78 + 0.5 * (dr - 0.5) * 2) * (1 + 0.15 * near * (sas - 0.5));
        P.mix(k, 0.02, col);
        const i = (py * gw + px) * 4;
        d[i] = col[0];
        d[i + 1] = col[1];
        d[i + 2] = col[2];
        d[i + 3] = (1 - 0.82 * sst(0.56, 0.64, ice) * (0.4 + 0.6 * (1 - near))) * 255;
      }
    }
    q.putImageData(id, 0, 0);
    s.snow = up(cv, w, SH);
  }
  const F = P.F;
  const ray = sprite2(c, "ar" + F, () => {
    const cv = mk2(4, 256), rq = cv.getContext("2d"), lg = rq.createLinearGradient(0, 0, 0, 256);
    lg.addColorStop(0, LT(c, 1, 0, F));
    lg.addColorStop(0.35, LT(c, 1, 0.015, F));
    lg.addColorStop(0.78, LT(c, 1.05, 0.12, F));
    lg.addColorStop(0.935, LT(c, 1.35, 1, F));
    lg.addColorStop(1, LT(c, 1, 0, F));
    rq.fillStyle = lg;
    rq.fillRect(0, 0, 4, 256);
    return cv;
  });
  const fringe = sprite2(c, "af" + F, () => {
    const cv = mk2(4, 256), rq = cv.getContext("2d"), lg = rq.createLinearGradient(0, 0, 0, 256);
    lg.addColorStop(0, LT(c, 1, 0, F));
    lg.addColorStop(0.5, LT(c, 1, 0.7, F));
    lg.addColorStop(1, LT(c, 1, 0, F));
    rq.fillStyle = lg;
    rq.fillRect(0, 0, 4, 256);
    return cv;
  });
  const W22 = Math.ceil(w * 1.5), H2 = Math.ceil(Hy * 0.95);
  s.cur = [];
  for (const cfg of [{ y: 0.34, S: 0.24, T: 0, A: 0.05, a: 0.8, len: 0.6 }, { y: 0.14, S: 0.12, T: 0.1, A: 0.03, a: 0.38, len: 0.45 }]) {
    const cv = mk2(W22, H2), aq = cv.getContext("2d");
    aq.globalCompositeOperation = "lighter";
    const p = [R() * 9, R() * 9, R() * 9, R() * 9, R() * 9];
    const foot = (u) => H2 * (cfg.y + cfg.S * Math.sin(u * Math.PI) + cfg.T * u + cfg.A * (Math.sin(u * TAU2 * 3.3 + p[1]) * 0.4 + Math.sin(u * TAU2 * 7 + p[4]) * 0.35));
    const step = Math.max(1, Math.round(w / 900));
    for (let xx = 0; xx < W22; xx += step) {
      const u = xx / W22, yb = foot(u);
      const patch = Math.pow(cl01(0.58 + 0.45 * Math.sin(u * TAU2 * 2.7 + p[2]) + 0.3 * Math.sin(u * TAU2 * 6.1 + p[3]) + 0.25 * Math.sin(u * TAU2 * 15 + p[0])), 1.4);
      const L = H2 * cfg.len * (0.5 + 0.4 * Math.sin(u * TAU2 * 4.3 + p[1])) * (0.5 + 0.5 * Math.pow(R(), 0.5));
      const fold = 1 + 0.9 * Math.exp(-sq(Math.sin(u * TAU2 * 4.5 + p[3]) * 3));
      const a = Math.min(0.6, cfg.a * patch * fold * (0.8 + 0.2 * R()) * (0.75 + 0.25 * Math.sin(u * TAU2 * 40 + p[3])));
      if (a < 0.01) continue;
      aq.globalAlpha = a;
      aq.drawImage(ray, xx - step * 0.5, yb - L, step * 2, L * 1.04);
      aq.globalAlpha = a * 0.12;
      aq.drawImage(fringe, xx - step * 0.5, yb - L * 1.7, step * 2, L * 0.9);
    }
    aq.globalAlpha = 1;
    for (let i = 0; i < 60; i++) {
      const u = R(), yb = foot(u);
      const patch = Math.pow(cl01(0.3 + 0.5 * Math.sin(u * TAU2 * 2.7 + p[2]) + 0.4 * Math.sin(u * TAU2 * 6.1 + p[3]) + 0.25 * Math.sin(u * TAU2 * 15 + p[0])), 1.5);
      aq.globalAlpha = 0.22 * cfg.a * patch;
      aq.drawImage(softSp(c, 0.8, F), u * W22 - w * 0.12, yb - H2 * 0.16, w * 0.24, H2 * 0.34);
      aq.globalAlpha = 0.035 * cfg.a;
      aq.drawImage(softSp(c, 0.6, F), u * W22 - w * 0.15, yb - H2 * 0.05, w * 0.3, H2 * 0.3);
    }
    s.cur.push({ cv, W2: W22, H2, ph: R() * TAU2, dr: R() * TAU2 });
  }
  const V = [w * 0.43, Hy - h * 2e-3], N0 = [w * 0.065, h * 0.985];
  s.V = V;
  s.N0 = N0;
  s.ob = [];
  const ob = mk2(w * 0.5, h), oq = ob.getContext("2d");
  for (let i = 11; i >= 0; i--) {
    const z = 1 / (1 + i * 0.62);
    const bx = V[0] + (N0[0] - V[0]) * z, by = V[1] + (N0[1] - V[1]) * z;
    const H = h * 0.6 * z, bw = Math.max(1, m * 0.052 * z), tw = bw * 0.72, side = bw * 0.32;
    const hzz = 1 - z;
    const kF = 0.03 + 0.08 * hzz, kS = 0.018 + 0.07 * hzz, kE = 0.34 * (1 - hzz * 0.6);
    const ty = by - H, pt = ty - tw * 0.7;
    oq.fillStyle = P.s(kS, 0.05);
    oq.beginPath();
    oq.moveTo(bx + bw / 2, by);
    oq.lineTo(bx + bw / 2 + side, by - side * 0.25);
    oq.lineTo(bx + tw / 2 + side * 0.75, ty - side * 0.2);
    oq.lineTo(bx + tw / 2, ty);
    oq.closePath();
    oq.fill();
    const fg = oq.createLinearGradient(0, ty, 0, by);
    fg.addColorStop(0, P.s(kF + 0.03, 0.04));
    fg.addColorStop(1, P.s(kF * 0.7, 0));
    oq.fillStyle = fg;
    oq.beginPath();
    oq.moveTo(bx - bw / 2, by);
    oq.lineTo(bx - tw / 2, ty);
    oq.lineTo(bx + tw / 2, ty);
    oq.lineTo(bx + bw / 2, by);
    oq.closePath();
    oq.fill();
    oq.fillStyle = P.s(kF + 0.07, 0);
    oq.beginPath();
    oq.moveTo(bx - tw / 2, ty);
    oq.lineTo(bx + side * 0.3, pt);
    oq.lineTo(bx + tw / 2, ty);
    oq.closePath();
    oq.fill();
    oq.fillStyle = P.s(kS, 0);
    oq.beginPath();
    oq.moveTo(bx + tw / 2, ty);
    oq.lineTo(bx + side * 0.3, pt);
    oq.lineTo(bx + tw / 2 + side * 0.75, ty - side * 0.2);
    oq.closePath();
    oq.fill();
    oq.strokeStyle = P.s(kE, 0, 0.75);
    oq.lineWidth = Math.max(0.6, bw * 0.03);
    oq.beginPath();
    oq.moveTo(bx - bw / 2, by);
    oq.lineTo(bx - tw / 2, ty);
    oq.lineTo(bx + side * 0.3, pt);
    oq.stroke();
    if (z > 0.2) {
      oq.strokeStyle = P.s(0.01, 0, 0.5 * z + 0.1);
      oq.lineWidth = Math.max(0.5, bw * 0.015);
      for (let j = 1; j < 9; j++) {
        const fj = j / 9 + (R() - 0.5) * 0.03, y = by - H * fj, hw2 = (bw + (tw - bw) * fj) / 2;
        oq.beginPath();
        oq.moveTo(bx - hw2, y);
        oq.lineTo(bx + hw2, y);
        oq.stroke();
      }
      for (let j = 0; j < 6; j++) {
        const fj = 0.1 + R() * 0.75, y = by - H * fj, hw2 = (bw + (tw - bw) * fj) / 2;
        oq.fillStyle = P.s(8e-3, 0, 0.55);
        oq.fillRect(bx - hw2 * 0.8, y, hw2 * (0.4 + R() * 0.4), H * 0.025);
      }
    }
    const seam = { x: bx, y0: ty + H * 0.08, y1: by - H * 0.06, wd: Math.max(0.8, bw * 0.035), z, i, by, bw };
    oq.fillStyle = P.s(0.35, 1, 0.55);
    oq.fillRect(bx - seam.wd / 2, seam.y0, seam.wd, seam.y1 - seam.y0);
    for (let j = 0; j < 9; j++) {
      const y = seam.y0 + (seam.y1 - seam.y0) * (j + 0.5) / 9, gw = bw * (0.08 + R() * 0.14);
      oq.fillRect(R() < 0.5 ? bx - gw : bx, y, gw, Math.max(0.6, seam.wd * 0.7));
    }
    oq.globalAlpha = 0.9;
    oq.drawImage(glowSp(c, P, 0.26, 0), bx - bw * 1.4, by - bw * 0.25, bw * 3, bw * 0.5);
    oq.globalAlpha = 1;
    s.ob.push(seam);
  }
  mottle(oq, mottleTile(c, P, s.seed + 24, 8e-3, 0), w * 0.5, h, 0.45, Math.max(0.5, m / 900));
  s.obc = ob;
  s.sp = [];
  for (let i = 0; i < 180; i++) {
    const fq = Math.pow(Math.random(), 0.6);
    s.sp.push({ x: Math.random() * w, f: fq, ph: Math.random() * 9 });
  }
  const gmh = Math.ceil(h * 0.1);
  s.gm = up(cloudTex(P, s.seed + 64, Math.ceil(w / 4), Math.ceil(gmh / 4), {
    Px: 6,
    Py: 1.2,
    cov: (v) => 0.52 + 0.45 * sq((v - 0.55) / 0.5),
    lx: 0,
    ly: -0.1,
    gain: 3,
    kSh: 0.16,
    kLit: 0.3,
    wSh: 0,
    wLit: 0.1,
    a: 0.55,
    soft: 0.14,
    oct: 4
  }), w, gmh);
}
function vigilAt(s, w, h, i) {
  const z = 1 / (1 + i * 0.62), V = s.V, N0 = s.N0;
  return { z, x: V[0] + (N0[0] - V[0]) * z, y: V[1] + (N0[1] - V[1]) * z, bw: Math.max(1, Math.min(w, h) * 0.052 * z), H: h * 0.6 * z };
}
var vigil = {
  name: "Vigil",
  flav: "Artscape",
  reset: () => ({ seed: Math.random() * 1e9 | 0, key: "", wave: null, nw: 0, me: null, nm: 0 }),
  frame: (g, w, h, t, c, s) => {
    const key = keyOf(w, h, c);
    if (s.key !== key) {
      s.key = key;
      bakeVigil(w, h, c, s);
    }
    if (s.lt == null || t < s.lt - 1e3) {
      s.nw = t + 8e3;
      s.wave = null;
      s.nm = t + 4e4;
      s.me = null;
    }
    const dt = tick2(s, t), m = s.m, Hy = s.Hy, P = s.P;
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.drawImage(s.sky, 0, 0);
    const breath = (0.6 + 0.4 * Math.sin(t * 7e-5) * Math.sin(t * 23e-6 + 1)) * (c.light ? 0.5 : 1);
    g.globalCompositeOperation = "lighter";
    const NS = 120;
    for (let ci = 0; ci < s.cur.length; ci++) {
      const C2 = s.cur[ci], sw2 = Math.ceil(C2.W2 / NS);
      const drift2 = (C2.W2 - w) * (0.5 + 0.45 * Math.sin(t / (9e5 + ci * 37e4) * TAU2 + C2.dr));
      const ba = breath * (ci ? 0.8 + 0.2 * Math.sin(t * 11e-5) : 1);
      for (let i = 0; i < NS; i++) {
        const sx0 = i * sw2, dx = Math.round(sx0 - drift2);
        if (dx > w || dx + sw2 < 0) continue;
        const u = i / NS;
        const dy = h * 5e-3 * Math.sin(u * 13 + t * 19e-5 + C2.ph) + h * 2e-3 * Math.sin(u * 31 - t * 31e-5);
        const a = ba * (0.72 + 0.28 * Math.sin(u * 9 - t * 13e-5 + C2.ph * 2)) * (0.85 + 0.15 * Math.sin(u * 23 + t * 41e-5));
        if (a < 0.03) continue;
        g.globalAlpha = Math.min(1, a);
        g.drawImage(C2.cv, sx0, 0, sw2, C2.H2, dx, dy, sw2, C2.H2);
      }
    }
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    if (!s.me && t >= s.nm) {
      const a0 = 0.4 + Math.random() * 0.5;
      s.me = { t0: t, x: w * (0.2 + Math.random() * 0.7), y: h * (0.04 + Math.random() * 0.2), dx: Math.cos(a0 + 1.6) * m * 0.22, dy: Math.sin(a0) * m * 0.12 };
    }
    if (s.me) {
      const e = (t - s.me.t0) / 900;
      if (e >= 1) {
        s.me = null;
        s.nm = t + 5e4 + Math.random() * 8e4;
      } else {
        const hx = s.me.x + s.me.dx * e, hy = s.me.y + s.me.dy * e, tx = s.me.x + s.me.dx * Math.max(0, e - 0.35), ty = s.me.y + s.me.dy * Math.max(0, e - 0.35);
        const lg = g.createLinearGradient(tx, ty, hx, hy);
        lg.addColorStop(0, W2(c, 0));
        lg.addColorStop(1, W2(c, Math.sin(e * 3.14) * 0.5));
        g.strokeStyle = lg;
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(tx, ty);
        g.lineTo(hx, hy);
        g.stroke();
      }
    }
    g.drawImage(s.mt, 0, s.mtY);
    g.save();
    g.beginPath();
    g.rect(0, Hy, w, h - Hy);
    g.clip();
    g.globalCompositeOperation = "lighter";
    g.setTransform(1, 0, 0, -0.45, 0, Hy * 1.45);
    for (let ci = 0; ci < s.cur.length; ci++) {
      const C2 = s.cur[ci], drift2 = (C2.W2 - w) * (0.5 + 0.45 * Math.sin(t / (9e5 + ci * 37e4) * TAU2 + C2.dr));
      g.globalAlpha = 0.8 * breath;
      g.drawImage(C2.cv, -drift2, 0);
    }
    g.restore();
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.drawImage(s.snow, 0, Hy);
    g.globalAlpha = 0.7;
    wrap(g, s.gm, w, t * 0.012 * Math.max(0.2, w / 1440), Hy - h * 0.03);
    g.globalAlpha = 1;
    const cyc = 108e4, ph = t % cyc / cyc, walk = ph < 0.82 ? ph / 0.82 : -1;
    let lant = null;
    if (walk >= 0) {
      const i = 1.25 + 7 * walk, A2 = vigilAt(s, w, h, i), fh = A2.H * 0.085;
      const X = A2.x + A2.bw * 1.4, Y = A2.y + Math.abs(Math.sin(t * 4e-3)) * fh * 0.015;
      lant = { X, Y, fh, A: A2 };
    }
    g.drawImage(s.obc, 0, 0);
    if (!s.wave && t >= s.nw) s.wave = { t0: t, dur: 26e3 + Math.random() * 1e4 };
    let wf = -1;
    if (s.wave) {
      wf = (t - s.wave.t0) / s.wave.dur;
      if (wf > 1.3) {
        s.wave = null;
        s.nw = t + 7e4 + Math.random() * 11e4;
        wf = -1;
      }
    }
    g.globalCompositeOperation = "screen";
    for (const o of s.ob) {
      const pos = 1 - o.z;
      const pulse = wf < 0 ? 0 : Math.exp(-sq((wf * 1.1 - pos) / 0.07));
      const a = 0.3 + 0.15 * (0.5 + 0.5 * Math.sin(t * 23e-5 + o.i * 1.7)) + 0.7 * pulse;
      const H = o.y1 - o.y0;
      g.globalAlpha = Math.min(1, a);
      g.fillStyle = P.s(1.15, 1);
      g.fillRect(o.x - o.wd / 2, o.y0, o.wd, H);
      g.globalAlpha = a * 0.5;
      g.drawImage(glowSp(c, P, 1, 1), o.x - o.wd * 8, o.y0 - H * 0.05, o.wd * 16, H * 1.1);
      g.globalAlpha = a * 0.4;
      const pw = H * 0.5;
      g.drawImage(glowSp(c, P, 0.9, 1), o.x - pw, o.y1 + H * 0.02, pw * 2, pw * 0.22);
    }
    if (lant) {
      const { X, Y, fh } = lant, sw2 = 0.9 + 0.1 * Math.sin(t * 31e-4);
      g.globalAlpha = 0.45 * sw2;
      g.drawImage(glowSp(c, P, 0.9, 1), X - fh * 3, Y - fh * 0.35, fh * 6, fh * 0.7);
      g.globalAlpha = 0.7 * sw2;
      g.drawImage(glowSp(c, P, 1.3, 1), X + fh * 0.25 - fh * 0.5, Y - fh * 0.55 - fh * 0.5, fh, fh);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    if (lant) {
      const { X, Y, fh } = lant;
      g.fillStyle = P.s(0.01, 0);
      g.beginPath();
      g.moveTo(X - fh * 0.16, Y);
      g.lineTo(X - fh * 0.1, Y - fh * 0.8);
      g.lineTo(X + fh * 0.1, Y - fh * 0.8);
      g.lineTo(X + fh * 0.18, Y);
      g.closePath();
      g.fill();
      g.beginPath();
      g.arc(X, Y - fh * 0.9, fh * 0.1, 0, TAU2);
      g.fill();
      g.fillStyle = P.s(1.6, 1);
      g.fillRect(X + fh * 0.2, Y - fh * 0.6, Math.max(1, fh * 0.07), Math.max(1, fh * 0.09));
    }
    const sw = Math.max(0.2, w / 1440);
    for (const p of s.sp) {
      p.x += (0.03 + 0.12 * p.f) * dt * sw;
      if (p.x > w + 20) {
        p.x = -20;
        p.f = Math.pow(Math.random(), 0.6);
      }
      const y = Hy + p.f * (h - Hy) * 0.98 - Math.abs(Math.sin(p.x * 0.01 + p.ph)) * h * 6e-3 * p.f;
      g.fillStyle = P.s(0.45, 0, 0.1 + 0.22 * p.f);
      g.fillRect(p.x, y, Math.max(1, (2 + 10 * p.f) * sw), Math.max(0.8, p.f * 1.5));
    }
  }
};
var SCENES_BUNGIE = [keystone, highKeep, vigil];

// from cozyScenes.ts
var A = (c, a) => `rgba(${c.r},${c.g},${c.b},${a})`;
var AP3 = (c, i, a) => {
  const p = c.pal[(i % c.pal.length + c.pal.length) % c.pal.length];
  return `rgba(${p[0]},${p[1]},${p[2]},${a})`;
};
var BG = (c, a) => `rgba(${c.br},${c.bg2},${c.bb},${a})`;
var W3 = (c, a, i = 0) => c.light ? AP3(c, i, Math.min(1, a * 1.6)) : `rgba(255,255,255,${a})`;
var tone = (c, i = 0) => c.pal[(i % c.pal.length + c.pal.length) % c.pal.length];
var pale = (c, i = 0, lift2 = 0.5) => {
  const p = tone(c, i);
  if (c.light) return p;
  return [p[0] + (255 - p[0]) * lift2, p[1] + (255 - p[1]) * lift2, p[2] + (255 - p[2]) * lift2];
};
var mix = (c, rgb7, k, a = 1) => `rgba(${Math.round(c.br + (rgb7[0] - c.br) * k)},${Math.round(c.bg2 + (rgb7[1] - c.bg2) * k)},${Math.round(c.bb + (rgb7[2] - c.bb) * k)},${a})`;
var rgba2 = (rgb7, a) => `rgba(${rgb7[0] | 0},${rgb7[1] | 0},${rgb7[2] | 0},${a})`;
var clamp = (v, a, b) => v < a ? a : v > b ? b : v;
var sstep2 = (a, b, v) => {
  const x = clamp((v - a) / (b - a || 1), 0, 1);
  return x * x * (3 - 2 * x);
};
var TAU3 = Math.PI * 2;
var rng3 = (seed) => () => {
  seed |= 0;
  seed = seed + 1831565813 | 0;
  let q = Math.imul(seed ^ seed >>> 15, 1 | seed);
  q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q;
  return ((q ^ q >>> 14) >>> 0) / 4294967296;
};
var canvas = (w, h) => {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  return cv;
};
var keyOf2 = (w, h, c) => `${w}x${h}|${c.acc}|${c.bg}`;
var _spr = /* @__PURE__ */ new Map();
function sprite3(rgb7, kind = "glow", S = 64) {
  const key = `${rgb7[0] | 0},${rgb7[1] | 0},${rgb7[2] | 0}|${kind}|${S}`;
  let cv = _spr.get(key);
  if (cv) return cv;
  if (_spr.size > 64) _spr.clear();
  cv = canvas(S, S);
  const x = cv.getContext("2d"), hc = S / 2;
  const gr = x.createRadialGradient(hc, hc, 0, hc, hc, hc);
  const st = {
    glow: [[0, 1], [0.25, 0.5], [1, 0]],
    wide: [[0, 1], [0.08, 0.6], [0.22, 0.28], [0.45, 0.1], [0.7, 0.03], [1, 0]],
    flake: [[0, 1], [0.35, 0.8], [0.7, 0.25], [1, 0]],
    bokeh: [[0, 0.5], [0.7, 0.56], [0.86, 0.62], [0.95, 0.25], [1, 0]],
    puff: [[0, 0.6], [0.4, 0.35], [1, 0]]
  }[kind];
  for (const [o, a] of st) gr.addColorStop(o, rgba2(rgb7, a));
  x.fillStyle = gr;
  x.fillRect(0, 0, S, S);
  _spr.set(key, cv);
  return cv;
}
var _dith = null;
function dither2(x, w, h, amt = 0.035) {
  if (w * h < 6e4) return;
  if (!_dith) {
    _dith = canvas(128, 128);
    const d = _dith.getContext("2d"), id = d.createImageData(128, 128);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = Math.random() < 0.5 ? 0 : 255;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = Math.random() * 255 | 0;
    }
    d.putImageData(id, 0, 0);
  }
  x.save();
  x.globalAlpha = amt;
  x.fillStyle = x.createPattern(_dith, "repeat");
  x.fillRect(0, 0, w, h);
  x.restore();
}
function fir(x, cx, base, ht, wd, R, body, snow, snowW) {
  const n = clamp(Math.round(ht / 11), 6, 46);
  x.fillStyle = body;
  x.fillRect(cx - wd * 0.035, base - ht * 0.08, wd * 0.07, ht * 0.1);
  const boughs = [];
  for (let i = 0; i < n; i++) {
    const f = (i + R() * 0.6) / n;
    for (const side of [1, -1]) {
      const env = 0.06 + 0.94 * Math.pow(f, 0.9);
      boughs.push({ y: base - ht + ht * 0.97 * f, side, L: wd * env * (0.62 + R() * 0.5), dr: 0.28 + R() * 0.3 + f * 0.15, sn: snow && R() < 0.62, lump: 0.6 + R() * 0.7, s0: 0.25 + R() * 0.2 });
    }
  }
  x.beginPath();
  x.moveTo(cx, base - ht - ht * 0.025);
  x.lineTo(cx + wd * 0.045, base - ht + ht * 0.07);
  x.lineTo(cx - wd * 0.045, base - ht + ht * 0.07);
  x.closePath();
  x.fill();
  for (let i = boughs.length - 1; i >= 0; i--) {
    const B = boughs[i], L = B.L, sd = B.side, y = B.y, t0 = Math.max(0.8, L * 0.16);
    const tip = [cx + sd * L, y + L * B.dr];
    const ctl = [cx + sd * L * 0.55, y + L * B.dr * 0.12];
    x.fillStyle = body;
    x.beginPath();
    x.moveTo(cx, y - t0 * 0.25);
    x.quadraticCurveTo(ctl[0], ctl[1] - t0 * 0.2, tip[0], tip[1]);
    x.quadraticCurveTo(cx + sd * L * 0.7, y + L * B.dr * 0.55 + t0 * 1.3, cx + sd * L * 0.4, y + L * B.dr * 0.3 + t0 * 1.1);
    x.quadraticCurveTo(cx + sd * L * 0.2, y + t0 * 1.4, cx, y + t0 * 1.2);
    x.closePath();
    x.fill();
    if (B.sn && L > 2) {
      const q = (u) => {
        const a = 1 - u;
        return [a * a * cx + 2 * a * u * ctl[0] + u * u * tip[0], a * a * (y - t0 * 0.25) + 2 * a * u * (ctl[1] - t0 * 0.2) + u * u * tip[1]];
      };
      const u0 = B.s0, u1 = Math.min(0.95, u0 + 0.45 + B.lump * 0.2), st = 7;
      x.fillStyle = snow;
      x.beginPath();
      for (let j = 0; j <= st; j++) {
        const u = u0 + (u1 - u0) * j / st, p = q(u), th = snowW * B.lump * Math.pow(Math.sin(Math.PI * j / st), 0.6);
        j ? x.lineTo(p[0], p[1] - th) : x.moveTo(p[0], p[1] - th);
      }
      for (let j = st; j >= 0; j--) {
        const u = u0 + (u1 - u0) * j / st, p = q(u);
        x.lineTo(p[0], p[1] + snowW * 0.25);
      }
      x.closePath();
      x.fill();
    }
  }
}
function bakeSnow(w, h, c, s) {
  const R = rng3(s.seed);
  const m = Math.min(w, h), port = h > w;
  const sp = pale(c, 0, 0.55);
  const back = canvas(w, h), bx = back.getContext("2d");
  const front = canvas(w, h), fx = front.getContext("2d");
  const yH = h * (port ? 0.64 : 0.6);
  const sky = bx.createLinearGradient(0, 0, 0, yH);
  sky.addColorStop(0, mix(c, sp, 0.04));
  sky.addColorStop(0.45, mix(c, sp, 0.08));
  sky.addColorStop(0.8, mix(c, sp, 0.14));
  sky.addColorStop(1, mix(c, sp, 0.2));
  bx.fillStyle = sky;
  bx.fillRect(0, 0, w, h);
  const ridge2 = (x) => yH - h * 0.07 + Math.sin(x / w * 4.6 + 1.3) * h * 0.02 + Math.sin(x / w * 12.7 + 0.4) * h * 6e-3;
  bx.fillStyle = mix(c, sp, 0.165);
  bx.beginPath();
  bx.moveTo(0, h);
  for (let x = 0; x <= w + 4; x += Math.max(2, w / 160)) bx.lineTo(x, ridge2(x));
  bx.lineTo(w, h);
  bx.closePath();
  bx.fill();
  const farBody = mix(c, sp, 0.125);
  for (let x = -4; x < w + 4; ) {
    const dens2 = 0.5 + 0.5 * Math.sin(x / w * 7.3 + 2) * Math.sin(x / w * 3.1 + 0.7);
    const th = h * (0.012 + 0.02 * R()) * (0.5 + dens2);
    if (dens2 > 0.3) fir(bx, x, ridge2(x) + 2, th, th * 0.3, R, farBody, null, 0);
    x += Math.max(1.5, th * (0.2 + R() * 0.25));
  }
  const hz = bx.createLinearGradient(0, yH - h * 0.07, 0, yH + h * 0.01);
  hz.addColorStop(0, mix(c, sp, 0.17, 0));
  hz.addColorStop(1, mix(c, sp, 0.2, 0.9));
  bx.fillStyle = hz;
  bx.fillRect(0, yH - h * 0.07, w, h * 0.08);
  const gy = (x) => yH + Math.sin(x / w * 3.3 + 0.8) * h * 6e-3;
  const gr = bx.createLinearGradient(0, yH, 0, h);
  gr.addColorStop(0, mix(c, sp, 0.22));
  gr.addColorStop(0.45, mix(c, sp, 0.17));
  gr.addColorStop(1, mix(c, sp, 0.1));
  bx.fillStyle = gr;
  bx.beginPath();
  bx.moveTo(0, h);
  for (let x = 0; x <= w + 4; x += Math.max(2, w / 120)) bx.lineTo(x, gy(x));
  bx.lineTo(w, h);
  bx.closePath();
  bx.fill();
  const cw = m * (port ? 0.1 : 0.075), chh = cw * 0.52;
  const cx = w * (port ? 0.64 : 0.67), cb = yH + h * 0.045;
  const midBody = mix(c, sp, 0.055), midSnow = mix(c, sp, 0.2);
  for (let x = -6; x < w + 6; ) {
    const u = x / w;
    const dens2 = 0.5 + 0.5 * Math.sin(u * 4.2 + 4.1) * Math.cos(u * 9.3 + 1.2) + 0.25 * Math.sin(u * 23 + 2) + sstep2(0.72, 0.9, u) * 0.45;
    const near = Math.abs(x - cx) < cw * 2.4;
    const th = h * (0.028 + 0.05 * R() * R() + 0.02 * dens2) * (near ? 0.7 : 1);
    if (dens2 > 0.18) fir(bx, x, gy(x) + 1 + R() * 3, th, th * (0.26 + R() * 0.08), R, midBody, th > h * 0.05 ? midSnow : null, Math.max(0.7, th * 0.025));
    x += Math.max(2, th * (0.16 + R() * 0.22)) * (dens2 > 0.18 ? 1 : 2);
  }
  for (let k = 0; k < 4; k++) {
    const y0 = yH + (h - yH) * (0.14 + k * 0.22), amp = h * (0.01 + k * 6e-3), ph = R() * 9, fq = 1.6 + R() * 1.4;
    const crest = (x) => y0 + Math.sin(x / w * fq * Math.PI + ph) * amp;
    const sh = bx.createLinearGradient(0, y0 - amp, 0, y0 + amp + h * 0.07);
    sh.addColorStop(0, BG(c, 0.14));
    sh.addColorStop(1, BG(c, 0));
    bx.fillStyle = sh;
    bx.beginPath();
    bx.moveTo(0, h);
    for (let x = 0; x <= w + 4; x += Math.max(2, w / 90)) bx.lineTo(x, crest(x));
    bx.lineTo(w, h);
    bx.closePath();
    bx.fill();
    bx.strokeStyle = mix(c, sp, 0.26, 0.5);
    bx.lineWidth = Math.max(0.6, m * 15e-4);
    bx.beginPath();
    for (let x = 0; x <= w + 4; x += Math.max(2, w / 90)) x ? bx.lineTo(x, crest(x) + 0.5) : bx.moveTo(x, crest(x) + 0.5);
    bx.stroke();
  }
  const body = mix(c, sp, 0.04);
  bx.fillStyle = body;
  bx.fillRect(cx - cw / 2, cb - chh, cw, chh);
  const chx = cx + cw * 0.22;
  bx.fillRect(chx - cw * 0.045, cb - chh - cw * 0.42, cw * 0.09, cw * 0.3);
  bx.fillStyle = mix(c, sp, 0.3);
  bx.fillRect(chx - cw * 0.06, cb - chh - cw * 0.43, cw * 0.12, Math.max(1, cw * 0.035));
  bx.fillStyle = body;
  bx.beginPath();
  bx.moveTo(cx - cw * 0.6, cb - chh + 1);
  bx.lineTo(cx, cb - chh - cw * 0.38);
  bx.lineTo(cx + cw * 0.6, cb - chh + 1);
  bx.closePath();
  bx.fill();
  bx.fillStyle = mix(c, sp, 0.34);
  bx.beginPath();
  bx.moveTo(cx - cw * 0.64, cb - chh + cw * 0.02);
  bx.lineTo(cx, cb - chh - cw * 0.43);
  bx.lineTo(cx + cw * 0.64, cb - chh + cw * 0.02);
  bx.lineTo(cx + cw * 0.6, cb - chh + cw * 0.045);
  bx.lineTo(cx, cb - chh - cw * 0.36);
  bx.lineTo(cx - cw * 0.6, cb - chh + cw * 0.045);
  bx.closePath();
  bx.fill();
  bx.fillStyle = mix(c, sp, 0.23);
  bx.beginPath();
  bx.ellipse(cx, cb + 1, cw * 0.72, chh * 0.18, 0, Math.PI, TAU3);
  bx.fill();
  const ww = cw * 0.17, wh = chh * 0.38, wx = cx - cw * 0.2, wy = cb - chh * 0.72;
  bx.fillStyle = mix(c, tone(c, 0), 0.6);
  bx.fillRect(wx - ww / 2, wy, ww, wh);
  bx.fillStyle = body;
  bx.fillRect(wx - Math.max(0.5, ww * 0.06), wy, Math.max(1, ww * 0.12), wh);
  bx.fillRect(wx - ww / 2, wy + wh * 0.45, ww, Math.max(1, wh * 0.1));
  bx.fillStyle = mix(c, sp, 0.015);
  bx.fillRect(cx + cw * 0.12, cb - chh * 0.78, cw * 0.15, chh * 0.78);
  const fp = [];
  const fEnd = w * (port ? 0.2 : 0.3);
  for (let i = 0; i < 9; i++) {
    const f = Math.pow(i / 8, 1.7);
    fp.push({ x: cx - cw * 0.9 + (fEnd - (cx - cw * 0.9)) * f, y: cb + h * 0.012 + (h * 1.02 - cb) * f, s: 0.12 + 0.88 * f });
  }
  const postH = m * 0.1;
  bx.strokeStyle = mix(c, sp, 0.05);
  bx.lineWidth = Math.max(0.6, m * 16e-4);
  for (const lift2 of [0.72, 0.4]) {
    bx.beginPath();
    fp.forEach((p, i) => {
      const y = p.y - postH * p.s * lift2 + (i ? postH * p.s * 0.03 : 0);
      i ? bx.lineTo(p.x, y) : bx.moveTo(p.x, y);
    });
    bx.stroke();
  }
  for (const p of fp) {
    const pw = Math.max(1, m * 0.011 * p.s), ph = postH * p.s;
    bx.fillStyle = mix(c, sp, 0.035);
    bx.fillRect(p.x - pw / 2, p.y - ph, pw, ph);
    bx.fillStyle = mix(c, sp, 0.34);
    bx.beginPath();
    bx.ellipse(p.x, p.y - ph, pw * 0.8, Math.max(0.6, pw * 0.45), 0, Math.PI, TAU3);
    bx.fill();
    bx.fillStyle = mix(c, sp, 0.22);
    bx.beginPath();
    bx.ellipse(p.x, p.y, pw * 2.2, Math.max(0.5, pw * 0.5), 0, Math.PI, TAU3);
    bx.fill();
  }
  dither2(bx, w, h, 0.03);
  const nb = mix(c, sp, 0.016), ns = mix(c, sp, 0.27);
  const htA = Math.min(h * 0.84, w * 1.25), htB = htA * 0.6;
  fir(fx, w * 0.04, h * 1.03, htA, htA * 0.25, R, nb, ns, Math.max(1, m * 9e-3));
  fir(fx, w * (port ? 0.26 : 0.155), h * 1.04, htB, htB * 0.25, R, nb, ns, Math.max(0.8, m * 7e-3));
  if (!port) fir(fx, w * 0.99, h * 1.05, htA * 0.7, Math.min(htA * 0.7 * 0.25, w * 0.12), R, nb, ns, Math.max(1, m * 8e-3));
  return { back, front, win: { x: wx, y: wy + wh / 2, w: ww, h: wh }, cab: { x: cx, b: cb, w: cw }, chim: { x: chx, y: cb - chh - cw * 0.43 } };
}
var FirstSnow = {
  name: "First Snow",
  flav: "Artscape",
  reset: (w, h) => {
    const R = Math.random;
    const area = Math.max(1, w * h), sc = Math.max(0.35, Math.min(w, h) / 900);
    const mk12 = (n, r0, r1, v0, v1, sw) => Array.from({ length: n }, () => ({
      x: R(),
      y: R(),
      r: (r0 + R() * (r1 - r0)) * sc,
      v: (v0 + R() * (v1 - v0)) * Math.max(0.25, sc),
      sw: sw * (0.5 + R()) * sc,
      f: 25e-5 + R() * 4e-4,
      ph: R() * TAU3,
      a: 0.55 + R() * 0.45
    }));
    return {
      seed: R() * 1e9 | 0,
      key: "",
      L: null,
      far: mk12(Math.max(20, Math.round(area / 2400)), 0.45, 0.9, 8, 14, 5),
      mid: mk12(Math.max(8, Math.round(area / 9e3)), 1.2, 2.1, 18, 30, 14),
      near: mk12(Math.max(2, Math.round(area / 1e5)), 5, 11, 38, 58, 34)
    };
  },
  frame: (g, w, h, t, c, s) => {
    const k = keyOf2(w, h, c);
    if (s.key !== k) {
      s.key = k;
      s.L = bakeSnow(w, h, c, s);
    }
    const L = s.L, m = Math.min(w, h), sec = t / 1e3;
    g.globalCompositeOperation = "source-over";
    g.drawImage(L.back, 0, 0);
    g.globalCompositeOperation = "screen";
    const I = 0.86 + 0.07 * Math.sin(t * 11e-4) + 0.05 * Math.sin(t * 27e-4 + 1.7) + 0.03 * Math.sin(t * 49e-4 + 0.4);
    const W0 = L.win, warm = tone(c, 0);
    const gs = m * 0.065;
    g.globalAlpha = 0.55 * I;
    g.drawImage(sprite3(warm), W0.x - gs, W0.y - gs, gs * 2, gs * 2);
    g.globalAlpha = 0.26 * I;
    g.drawImage(sprite3(warm), W0.x - m * 0.08, L.cab.b - m * 8e-3, m * 0.16, m * 0.03);
    g.globalAlpha = 1;
    g.fillStyle = W3(c, 0.3 * I);
    g.fillRect(W0.x - W0.w * 0.4, W0.y - W0.h * 0.45, W0.w * 0.8, W0.h * 0.9);
    const puff6 = sprite3(pale(c, 0, 0.4), "puff");
    for (let i = 0; i < 6; i++) {
      const a = (sec * 0.045 + i / 6) % 1;
      const sz = m * (8e-3 + 0.045 * a);
      g.globalAlpha = 0.08 * Math.sin(Math.PI * a) * (1 - a * 0.5);
      g.drawImage(puff6, L.chim.x + a * a * m * 0.16 + Math.sin(a * 5 + i) * m * 6e-3 - sz, L.chim.y - a * m * 0.17 - sz, sz * 2, sz * 2);
    }
    g.globalAlpha = 1;
    const span2 = h + 20;
    g.fillStyle = W3(c, 0.24);
    g.beginPath();
    for (const p of s.far) {
      const y = (p.y * span2 + sec * p.v) % span2 - 10;
      const x = ((p.x * w + Math.sin(sec * p.f * 900 + p.ph) * p.sw + sec * 3) % w + w) % w;
      g.moveTo(x + p.r, y);
      g.arc(x, y, p.r, 0, TAU3);
    }
    g.fill();
    g.globalCompositeOperation = "source-over";
    g.drawImage(L.front, 0, 0);
    g.globalCompositeOperation = "screen";
    const fl = sprite3(pale(c, 0, 0.75), "flake");
    for (const p of s.mid) {
      const y = (p.y * span2 + sec * p.v) % span2 - 10;
      const x = ((p.x * w + Math.sin(sec * p.f * 1e3 + p.ph) * p.sw + sec * 6) % w + w) % w;
      g.globalAlpha = 0.75 * p.a;
      g.drawImage(fl, x - p.r * 1.6, y - p.r * 1.6, p.r * 3.2, p.r * 3.2);
    }
    const spanN = h + 60;
    for (const p of s.near) {
      const y = (p.y * spanN + sec * p.v) % spanN - 30;
      const x = ((p.x * w + Math.sin(sec * p.f * 800 + p.ph) * p.sw + sec * 10) % (w + 40) + w + 40) % (w + 40) - 20;
      g.globalAlpha = 0.3 * p.a;
      g.drawImage(fl, x - p.r, y - p.r, p.r * 2, p.r * 2);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }
};
function candleGeo(w, h, v) {
  const m = Math.min(w, h), port = h > w;
  const cw = m * (port ? 0.17 : 0.11) * v.k;
  const px = (port ? 0.2 : 0.105) * v.p, fx = w * (v.r ? 1 - px : px);
  const table = h * ((port ? 0.94 : 0.925) - v.tb);
  const top = table - cw * 1.25;
  const fb = top - cw * 0.09;
  const fh = cw * 0.9;
  return { m, cw, fx, table, top, fb, fh };
}
function bakeCandle(w, h, c, v) {
  const G2 = candleGeo(w, h, v), { m, cw, fx, table, top, fb, fh } = G2;
  const warm = tone(c, 0), wp = pale(c, 0, 0.22);
  const cv = canvas(w, h), x = cv.getContext("2d");
  x.fillStyle = c.bg;
  x.fillRect(0, 0, w, h);
  const ly = fb - fh * 0.5, R = Math.hypot(Math.max(fx, w - fx), Math.max(ly, h - ly));
  const room = x.createRadialGradient(fx, ly, 0, fx, ly, R);
  room.addColorStop(0, mix(c, warm, 0.3));
  room.addColorStop(0.05, mix(c, warm, 0.2));
  room.addColorStop(0.14, mix(c, warm, 0.12));
  room.addColorStop(0.3, mix(c, warm, 0.07));
  room.addColorStop(0.55, mix(c, warm, 0.03));
  room.addColorStop(0.8, mix(c, warm, 6e-3));
  room.addColorStop(1, c.bg);
  x.fillStyle = room;
  x.fillRect(0, 0, w, h);
  x.fillStyle = mix(c, warm, 0.015);
  x.fillRect(0, table, w, h - table);
  x.save();
  x.beginPath();
  x.rect(0, table, w, h - table);
  x.clip();
  x.translate(fx, table + cw * 0.12);
  x.scale(1, 0.14);
  const pool = x.createRadialGradient(0, 0, 0, 0, 0, w * 0.8);
  pool.addColorStop(0, mix(c, warm, 0.4));
  pool.addColorStop(0.1, mix(c, warm, 0.22));
  pool.addColorStop(0.3, mix(c, warm, 0.08));
  pool.addColorStop(0.6, mix(c, warm, 0.03));
  pool.addColorStop(1, mix(c, warm, 0.012));
  x.fillStyle = pool;
  x.fillRect(-w * 2, -h * 8, w * 4, h * 16);
  x.restore();
  const edge = v.r ? x.createLinearGradient(w, 0, 0, 0) : x.createLinearGradient(0, 0, w, 0);
  edge.addColorStop(0, mix(c, warm, 0.16));
  edge.addColorStop(clamp((v.r ? 1 - fx / w : fx / w) * 2.5, 0.05, 0.9), mix(c, warm, 0.1));
  edge.addColorStop(1, mix(c, warm, 0.02));
  x.fillStyle = edge;
  x.fillRect(0, table, w, Math.max(1, m * 2e-3));
  {
    const rf = x.createLinearGradient(0, table, 0, table + cw * 0.55);
    rf.addColorStop(0, mix(c, warm, 0.14, 0.9));
    rf.addColorStop(1, mix(c, warm, 0.03, 0));
    x.fillStyle = rf;
    x.fillRect(fx - cw / 2, table, cw, cw * 0.55);
  }
  x.fillStyle = BG(c, 0.5);
  x.beginPath();
  x.ellipse(fx, table + cw * 0.1, cw * 0.62, cw * 0.07, 0, 0, TAU3);
  x.fill();
  const hw = cw / 2, ey = cw * 0.11;
  x.save();
  x.beginPath();
  x.moveTo(fx - hw, top);
  x.lineTo(fx - hw, table);
  x.ellipse(fx, table, hw, ey, 0, Math.PI, 0, true);
  x.lineTo(fx + hw, top);
  x.ellipse(fx, top, hw, ey, 0, 0, Math.PI, false);
  x.closePath();
  x.clip();
  const wax = x.createLinearGradient(0, top, 0, table);
  wax.addColorStop(0, mix(c, wp, 0.72));
  wax.addColorStop(0.12, mix(c, wp, 0.5));
  wax.addColorStop(0.4, mix(c, warm, 0.26));
  wax.addColorStop(1, mix(c, warm, 0.1));
  x.fillStyle = wax;
  x.fillRect(fx - hw - 2, top - ey - 2, cw + 4, table - top + ey * 2 + 4);
  const cyl = x.createLinearGradient(fx - hw, 0, fx + hw, 0);
  cyl.addColorStop(0, BG(c, 0.5));
  cyl.addColorStop(0.25, BG(c, 0.08));
  cyl.addColorStop(0.55, BG(c, 0));
  cyl.addColorStop(0.8, BG(c, 0.15));
  cyl.addColorStop(1, BG(c, 0.6));
  x.fillStyle = cyl;
  x.fillRect(fx - hw - 2, top - ey - 2, cw + 4, table - top + ey * 2 + 4);
  x.globalCompositeOperation = "screen";
  x.globalAlpha = 0.45;
  x.drawImage(sprite3(pale(c, 0, 0.3)), fx - cw * 0.7, top - cw * 0.2, cw * 1.4, cw * 0.8);
  x.globalAlpha = 1;
  x.globalCompositeOperation = "source-over";
  x.restore();
  x.fillStyle = mix(c, wp, 0.55);
  x.beginPath();
  x.moveTo(fx + hw * 0.12, top + ey * 0.7);
  x.quadraticCurveTo(fx + hw * 0.28, top + cw * 0.28, fx + hw * 0.22, top + cw * 0.44);
  x.quadraticCurveTo(fx + hw * 0.14, top + cw * 0.5, fx + hw * 0.08, top + cw * 0.3);
  x.closePath();
  x.fill();
  x.fillStyle = mix(c, wp, 0.78);
  x.beginPath();
  x.ellipse(fx, top, hw, ey, 0, 0, TAU3);
  x.fill();
  x.fillStyle = mix(c, wp, 0.5);
  x.beginPath();
  x.ellipse(fx, top + ey * 0.15, hw * 0.8, ey * 0.62, 0, 0, TAU3);
  x.fill();
  x.strokeStyle = mix(c, wp, 0.9);
  x.lineWidth = Math.max(1, cw * 0.028);
  x.beginPath();
  x.ellipse(fx, top, hw * 0.985, ey * 0.96, 0, 0.08, Math.PI - 0.08);
  x.stroke();
  dither2(x, w, h, 0.035);
  return { cv, G: G2 };
}
var Candlelight = {
  name: "Candlelight",
  flav: "Calm",
  reset: (w, h) => {
    const R = Math.random, m = Math.max(1, Math.min(w, h));
    return {
      key: "",
      L: null,
      v: { r: R() < 0.5, p: 0.85 + R() * 1.9, k: 0.82 + R() * 0.4, tb: R() * 0.035, o: R() * 6e4, ln: 0.65 + R() * 0.75 },
      mote: Array.from({ length: 6 + (R() * 6 | 0) }, (_, i) => ({
        x: R() * 0.8,
        y: R(),
        r: m * (6e-3 + R() * R() * 0.022),
        v: 3 + R() * 6,
        sw: m * (0.01 + R() * 0.03),
        f: 12e-5 + R() * 2e-4,
        ph: R() * TAU3,
        ti: i % 4 === 3 ? 1 : 0
      }))
    };
  },
  frame: (g, w, h, t, c, s) => {
    const k = keyOf2(w, h, c);
    const v = s.v;
    if (s.key !== k) {
      s.key = k;
      s.L = bakeCandle(w, h, c, v);
    }
    const { cv, G: G2 } = s.L, { m, cw, fx, top, fb, fh } = G2;
    const sec = t / 1e3;
    t += v.o;
    g.globalCompositeOperation = "source-over";
    g.drawImage(cv, 0, 0);
    const I = 1 + 0.045 * Math.sin(t * 93e-5) + 0.03 * Math.sin(t * 21e-4 + 1.1) + 0.018 * Math.sin(t * 37e-4 + 2.3);
    const lean = v.ln * (0.09 * Math.sin(t * 61e-5 + 0.3) + 0.045 * Math.sin(t * 157e-5 + 1.9) + 0.018 * Math.sin(t * 31e-4));
    const H = fh * (1 + 0.05 * Math.sin(t * 13e-4 + 0.5) + 0.035 * Math.sin(t * 29e-4 + 2) + 0.015 * Math.sin(t * 53e-4));
    const rw = fh * 0.17, tx = fx + lean * H, ty = fb - H;
    const warm = tone(c, 0);
    g.globalCompositeOperation = "screen";
    const RR = Math.max(w, h) * 0.8;
    g.globalAlpha = 0.05 + 0.25 * (I - 0.93);
    g.drawImage(sprite3(warm, "wide", 256), fx - RR, fb - H * 0.5 - RR, RR * 2, RR * 2);
    const hs = H * 2.6;
    g.globalAlpha = 0.5 * I;
    g.drawImage(sprite3(warm), fx + lean * H * 0.35 - hs / 2, fb - H * 0.45 - hs / 2, hs, hs);
    g.globalAlpha = 0.14 * I;
    g.drawImage(sprite3(pale(c, 0, 0.4)), fx - cw * 0.45, top - cw * 0.08, cw * 0.9, cw * 0.16);
    g.globalAlpha = 1;
    const flame = (sc) => {
      const r = rw * sc, bx = fx, by = fb - (1 - sc) * H * 0.08;
      const Tx = bx + (tx - fx) * sc, Ty = by - H * sc;
      g.beginPath();
      g.moveTo(Tx, Ty);
      g.bezierCurveTo(bx + lean * H * sc * 0.25 + r * 1.05, by - H * sc * 0.5, bx + r * 1.3, by - r * 0.2, bx, by + r * 0.35);
      g.bezierCurveTo(bx - r * 1.3, by - r * 0.2, bx + lean * H * sc * 0.25 - r * 1.05, by - H * sc * 0.5, Tx, Ty);
      g.closePath();
    };
    const body = g.createLinearGradient(0, ty, 0, fb + rw * 0.4);
    body.addColorStop(0, A(c, 0));
    body.addColorStop(0.22, A(c, 0.55));
    body.addColorStop(0.7, A(c, 0.9));
    body.addColorStop(1, AP3(c, 2, 0.35));
    g.fillStyle = body;
    flame(1);
    g.fill();
    const core = g.createLinearGradient(0, fb - H * 0.8, 0, fb);
    core.addColorStop(0, W3(c, 0));
    core.addColorStop(0.4, W3(c, 0.75));
    core.addColorStop(0.85, W3(c, 0.9));
    core.addColorStop(1, W3(c, 0.2));
    g.fillStyle = core;
    flame(0.62);
    g.fill();
    g.fillStyle = AP3(c, 2, 0.16);
    g.beginPath();
    g.ellipse(fx, fb + rw * 0.05, rw * 0.75, rw * 0.5, 0, 0, TAU3);
    g.fill();
    g.globalCompositeOperation = "source-over";
    g.strokeStyle = BG(c, 0.8);
    g.lineWidth = Math.max(1, cw * 0.025);
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(fx, top);
    g.quadraticCurveTo(fx, fb - rw * 0.1, fx + lean * rw * 1.5 + rw * 0.15, fb - rw * 0.45);
    g.stroke();
    g.globalCompositeOperation = "screen";
    for (const p of s.mote) {
      const span2 = h + p.r * 4;
      const y = h + p.r * 2 - (p.y * span2 + sec * p.v) % span2;
      const x = (v.r ? 1 - p.x : p.x) * w + Math.sin(sec * p.f * 1e3 + p.ph) * p.sw;
      const d = Math.hypot(x - fx, y - fb) / Math.max(w, h);
      g.globalAlpha = (0.22 * Math.exp(-d * d * 5) + 0.02) * I;
      g.drawImage(sprite3(p.ti ? pale(c, 0, 0.4) : warm, "bokeh"), x - p.r, y - p.r, p.r * 2, p.r * 2);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }
};
var SCENES_COZY = [FirstSnow, Candlelight];

// from deepSpace.ts
var TAU4 = Math.PI * 2;
var AP4 = (c, i, a) => {
  const p = c.pal[(i % c.pal.length + c.pal.length) % c.pal.length];
  return `rgba(${p[0]},${p[1]},${p[2]},${a})`;
};
var W4 = (c, a, i = 0) => c.light ? AP4(c, i, Math.min(1, a * 1.6)) : `rgba(255,255,255,${a})`;
var clamp2 = (v, a, b) => v < a ? a : v > b ? b : v;
var sstep3 = (a, b, v) => {
  const u = clamp2((v - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
};
var rgb = (v, a = 1) => `rgba(${v[0] | 0},${v[1] | 0},${v[2] | 0},${a})`;
var tone2 = (c, i) => c.pal[(i % c.pal.length + c.pal.length) % c.pal.length];
var haze = (c, k = 0.38, i = 0) => {
  const p = tone2(c, i);
  return c.light ? p : [p[0] + (255 - p[0]) * k, p[1] + (255 - p[1]) * k, p[2] + (255 - p[2]) * k];
};
var mixv = (c, p, k, d = 1) => [(c.br + (p[0] - c.br) * k) * d, (c.bg2 + (p[1] - c.bg2) * k) * d, (c.bb + (p[2] - c.bb) * k) * d];
var MX = (c, p, k, d = 1, a = 1) => rgb(mixv(c, p, k, d), a);
var BGA = (c, a) => `rgba(${c.br},${c.bg2},${c.bb},${a})`;
var lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
var small = (w) => w < 200;
function mk3(w, h) {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  return cv;
}
var rng4 = (a) => () => {
  a |= 0;
  a = a + 1831565813 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
function noise1(n, cells, R) {
  const cp = Array.from({ length: cells + 2 }, () => R() * 2 - 1), out = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const x = i / n * cells, i0 = Math.floor(x), f = x - i0, u = f * f * (3 - 2 * f);
    out[i] = cp[i0] * (1 - u) + cp[i0 + 1] * u;
  }
  return out;
}
function fbm2(n, cells, oct, pers, R) {
  const out = new Float32Array(n + 1);
  let amp = 1, tot = 0, cl = cells;
  for (let o = 0; o < oct; o++) {
    const a = noise1(n, cl, R);
    for (let i = 0; i <= n; i++) out[i] += a[i] * amp;
    tot += amp;
    amp *= pers;
    cl *= 2;
  }
  for (let i = 0; i <= n; i++) out[i] /= tot;
  return out;
}
var norm01 = (a) => {
  let lo = 1e9, hi = -1e9;
  for (const v of a) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const d = hi - lo || 1;
  for (let i = 0; i < a.length; i++) a[i] = (a[i] - lo) / d;
  return a;
};
var hsh = (x, y, s) => {
  let k = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041) | 0;
  k = Math.imul(k ^ k >>> 13, 1274126177);
  k ^= k >>> 16;
  return (k & 65535) / 32767.5 - 1;
};
function vn2(x, y, s) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hsh(ix, iy, s), b = hsh(ix + 1, iy, s), d = hsh(ix, iy + 1, s), e = hsh(ix + 1, iy + 1, s);
  return a + (b - a) * u + (d - a) * v + (a - b - d + e) * u * v;
}
function fbm22(x, y, oct, s) {
  let v = 0, amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    v += vn2(x, y, s + o * 101) * amp;
    tot += amp;
    amp *= 0.5;
    const nx = 1.6 * x - 1.2 * y, ny = 1.2 * x + 1.6 * y;
    x = nx + 3.1;
    y = ny + 1.7;
  }
  return v / tot;
}
function ngrid(n, fn) {
  const a = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) a[j * n + i] = fn(i / (n - 1), j / (n - 1));
  return a;
}
function nsamp(a, n, u, v) {
  const x = clamp2(u, 0, 1) * (n - 1), y = clamp2(v, 0, 1) * (n - 1), i = Math.min(n - 2, x | 0), j = Math.min(n - 2, y | 0), fx = x - i, fy = y - j, k = j * n + i;
  return a[k] + (a[k + 1] - a[k]) * fx + (a[k + n] - a[k]) * fy + (a[k] - a[k + 1] - a[k + n] + a[k + n + 1]) * fx * fy;
}
var _sp2 = /* @__PURE__ */ new Map();
function sprite4(key, build) {
  let s = _sp2.get(key);
  if (!s) {
    if (_sp2.size > 64) _sp2.clear();
    s = build();
    _sp2.set(key, s);
  }
  return s;
}
function puff(c, p, name) {
  return sprite4("dpuff" + name + c.acc + c.bg + p.join(), () => {
    const S = 64, hc = S / 2, cv = mk3(S, S), x = cv.getContext("2d");
    const gr = x.createRadialGradient(hc, hc, 0, hc, hc, hc);
    gr.addColorStop(0, rgb(p, 1));
    gr.addColorStop(0.3, rgb(p, 0.78));
    gr.addColorStop(0.55, rgb(p, 0.42));
    gr.addColorStop(0.8, rgb(p, 0.12));
    gr.addColorStop(1, rgb(p, 0));
    x.fillStyle = gr;
    x.fillRect(0, 0, S, S);
    return cv;
  });
}
function spark(c, p, name) {
  return sprite4("dspark" + name + c.acc + c.bg + p.join(), () => {
    const S = 64, hc = S / 2, cv = mk3(S, S), x = cv.getContext("2d");
    const gr = x.createRadialGradient(hc, hc, 0, hc, hc, hc);
    gr.addColorStop(0, rgb(p, 1));
    gr.addColorStop(0.12, rgb(p, 0.6));
    gr.addColorStop(0.35, rgb(p, 0.16));
    gr.addColorStop(1, rgb(p, 0));
    x.fillStyle = gr;
    x.fillRect(0, 0, S, S);
    return cv;
  });
}
function spikes(c, p) {
  return sprite4("dspk" + c.acc + c.bg + p.join(), () => {
    const S = 128, hc = S / 2, cv = mk3(S, S), x = cv.getContext("2d");
    for (const hz of [true, false]) {
      const gr = hz ? x.createLinearGradient(0, 0, S, 0) : x.createLinearGradient(0, 0, 0, S);
      gr.addColorStop(0, rgb(p, 0));
      gr.addColorStop(0.36, rgb(p, 0.12));
      gr.addColorStop(0.47, rgb(p, 0.55));
      gr.addColorStop(0.5, rgb(p, 1));
      gr.addColorStop(0.53, rgb(p, 0.55));
      gr.addColorStop(0.64, rgb(p, 0.12));
      gr.addColorStop(1, rgb(p, 0));
      x.fillStyle = gr;
      hz ? x.fillRect(0, hc - 0.6, S, 1.2) : x.fillRect(hc - 0.6, 0, 1.2, S);
    }
    return cv;
  });
}
var _dith2 = null;
function dither3(x, w, h) {
  if (!_dith2) {
    _dith2 = mk3(64, 64);
    const d = _dith2.getContext("2d"), id = d.createImageData(64, 64);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = Math.random() < 0.5 ? 0 : 255;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = 255;
    }
    d.putImageData(id, 0, 0);
  }
  if (w < 200) return;
  x.save();
  x.globalCompositeOperation = "source-atop";
  x.globalAlpha = 0.012;
  x.fillStyle = x.createPattern(_dith2, "repeat");
  x.fillRect(0, 0, w, h);
  x.restore();
}
function wash(w, h, stops) {
  const cv = mk3(w, h), x = cv.getContext("2d"), gr = x.createLinearGradient(0, 0, 0, cv.height);
  for (const [o, col] of stops) gr.addColorStop(clamp2(o, 0, 1), col);
  x.fillStyle = gr;
  x.fillRect(0, 0, cv.width, cv.height);
  dither3(x, cv.width, cv.height);
  return cv;
}
function sprinkle(x, c, w, h, R, n, fade) {
  const sr = clamp2(Math.min(w, h) / 700, 0.6, 1), gl = spark(c, haze(c, 0.6), "dsf");
  x.globalCompositeOperation = "screen";
  for (let i = 0; i < n; i++) {
    const sx = R() * w, sy = R() * h, b = Math.pow(R(), 3), f = fade ? fade(sx / w, sy / h) : 1, ti = R();
    if (f < 0.02) continue;
    x.fillStyle = ti < 0.14 ? rgb(haze(c, 0.55, 1 + (i & 1)), (0.1 + 0.6 * b) * f) : W4(c, (0.08 + 0.62 * b) * f);
    const r = Math.max(0.6, (0.55 + b * 1.1) * sr);
    x.fillRect(sx, sy, r, r);
    if (b > 0.8 && !small(w)) {
      const q = Math.min(w, h) * 9e-3 * (0.6 + b);
      x.globalAlpha = 0.3 * f;
      x.drawImage(gl, sx + r / 2 - q, sy + r / 2 - q, q * 2, q * 2);
      x.globalAlpha = 1;
    }
  }
  x.globalCompositeOperation = "source-over";
}
var makeStars = (R, n, ymax) => Array.from({ length: n }, () => ({ x: R(), y: Math.pow(R(), 1.4) * ymax, r: 0.6 + R() * 1.1, a: 0.12 + R() * 0.5, ph: R() * 9, sp: 0.4 + R() }));
function drawStars(g, c, stars2, w, h, t, fade) {
  const sr = Math.min(1, w / 1e3);
  for (const st of small(w) ? stars2.slice(0, 12) : stars2) {
    const a = st.a * (0.62 + 0.38 * Math.sin(t * 45e-5 * st.sp + st.ph)) * (fade ? fade(st.y) : 1);
    if (a < 0.02) continue;
    g.fillStyle = W4(c, a);
    const r = Math.max(0.6, st.r * sr);
    g.fillRect(st.x * w, st.y * h, r, r);
  }
}
var fresh = (g, c, w, h) => {
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
  g.fillStyle = c.bg;
  g.fillRect(0, 0, w, h);
};
var done = (g) => {
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
};
var keyOf3 = (w, h, c) => w + "x" + h + c.acc + c.bg;
function bakeNursery(s, w, h, c) {
  const p0 = tone2(c, 0), p1 = tone2(c, 1), p2 = tone2(c, 2), R = rng4(s.seed + 11), S = Math.max(w, h), few = small(w);
  s.base = wash(w, h, [[0, MX(c, p1, 0.04, 0.55)], [0.55, MX(c, p0, 0.05, 0.68)], [1, MX(c, p2, 0.04, 0.55)]]);
  sprinkle(s.base.getContext("2d"), c, w, h, R, few ? 30 : clamp2(Math.round(w * h / 1700), 80, 800));
  const M = 0.1, cell = Math.max(1.5, S / (few ? 120 : 300));
  const gw = Math.ceil(w * (1 + 2 * M) / cell) + 1, gh = Math.ceil(h * (1 + 2 * M) / cell) + 1;
  const cvs = [mk3(gw, gh), mk3(gw, gh), mk3(gw, gh)], ctxs = cvs.map((v) => v.getContext("2d")), ids = ctxs.map((x) => x.createImageData(gw, gh));
  const dA = ids[0].data, dB = ids[1].data, dD = ids[2].data;
  const a0 = mixv(c, p0, 0.6, 0.8), a1 = haze(c, 0.3, 0), b0 = mixv(c, p1, 0.6, 0.8), b1 = haze(c, 0.25, 1), rimc = haze(c, 0.5, 0), dk = mixv(c, p2, 0.05, 0.3);
  const sd = s.seed & 1048575, f = s.freq, nx = Math.cos(s.ang), ny = Math.sin(s.ang), ox = s.ox * w, oy = s.oy * h;
  const o1 = few ? 3 : 5, o2 = few ? 3 : 4;
  let best = -1, bx = w / 2, by = h / 2;
  const hot = [];
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const px = -M * w + i * cell, py = -M * h + j * cell, u = px / S * f, v = py / S * f;
    const qx = fbm22(u, v, 3, sd), qy = fbm22(u + 5.2, v + 1.3, 3, sd + 7);
    const n1 = fbm22(u + 1.05 * qx, v + 1.05 * qy, o1, sd + 13);
    const n2 = fbm22(u * 1.4 - 0.9 * qy + 9.1, v * 1.4 + 0.9 * qx + 2.7, o2, sd + 31);
    const nd = fbm22(u * 1.3 + 1.2 * qy + 3.3, v * 1.3 - 1.2 * qx + 8.8, o1, sd + 53);
    const dn = ((px - ox) * nx + (py - oy) * ny) / S, env = 0.2 + 0.8 * Math.exp(-dn * dn / 0.07);
    const a = Math.pow(sstep3(-0.1, 0.45, n1), 1.8) * env, b = Math.pow(sstep3(0, 0.5, n2), 2) * env;
    const k = (j * gw + i) * 4, ta = a * a, tb = b * b;
    dA[k] = a0[0] + (a1[0] - a0[0]) * ta;
    dA[k + 1] = a0[1] + (a1[1] - a0[1]) * ta;
    dA[k + 2] = a0[2] + (a1[2] - a0[2]) * ta;
    dA[k + 3] = 255 * Math.min(1, a * 0.62);
    dB[k] = b0[0] + (b1[0] - b0[0]) * tb;
    dB[k + 1] = b0[1] + (b1[1] - b0[1]) * tb;
    dB[k + 2] = b0[2] + (b1[2] - b0[2]) * tb;
    dB[k + 3] = 255 * Math.min(1, b * 0.55);
    const dark = sstep3(0.2, 0.42, nd) * (0.4 + 0.6 * env) * 0.88, rim = Math.exp(-(((nd - 0.17) / 0.06) ** 2)) * Math.min(1, (a + b) * 1.2) * 0.2;
    const wr = rim / (dark + rim + 1e-4);
    dD[k] = dk[0] + (rimc[0] - dk[0]) * wr;
    dD[k + 1] = dk[1] + (rimc[1] - dk[1]) * wr;
    dD[k + 2] = dk[2] + (rimc[2] - dk[2]) * wr;
    dD[k + 3] = 255 * Math.max(dark, rim);
    if (a + b > best && px > w * 0.14 && px < w * 0.86 && py > h * 0.14 && py < h * 0.84 && dark < 0.2) {
      best = a + b;
      bx = px;
      by = py;
    }
    if (a > 0.45 && dark < 0.1 && (i * 7 + j * 13) % 29 === 0) hot.push([px, py]);
  }
  ctxs.forEach((x, i) => x.putImageData(ids[i], 0, 0));
  Object.assign(s, { lay: cvs, gx0: -M * w - cell / 2, gy0: -M * h - cell / 2, gW: gw * cell, gH: gh * cell, cl: { x: bx, y: by } });
  const st = [], nB = few ? 3 : 5 + (R() * 5 | 0);
  for (let i = 0; i < nB; i++) {
    const rr = S * 0.045 * Math.sqrt(R()), an = R() * TAU4;
    st.push({ x: bx + Math.cos(an) * rr, y: by + Math.sin(an) * rr * 0.8, m: 0.65 + R() * 0.35, ph: R() * 6.3, ti: R() < 0.3 ? 1 : 0, sp: true });
  }
  for (let i = 0; i < (few ? 4 : 34); i++) {
    const hp = hot.length ? hot[R() * hot.length | 0] : [R() * w, R() * h];
    st.push({ x: hp[0] + (R() - 0.5) * cell * 4, y: hp[1] + (R() - 0.5) * cell * 4, m: 0.2 + R() * 0.45, ph: R() * 6.3, ti: R() < 0.4 ? 1 : 0, sp: R() < 0.22 });
  }
  s.ys = st;
}
function bakeWhirl(s, w, h, c) {
  const p0 = tone2(c, 0), p1 = tone2(c, 1), R = rng4(s.seed + 21), S = Math.max(w, h), few = small(w);
  s.pa = (w >= h ? 0 : Math.PI / 2) + s.paJ;
  s.Rx = s.sz * S;
  const gx = s.gx * w, gy = s.gy * h;
  s.base = wash(w, h, [[0, MX(c, p0, 0.03, 0.55)], [0.5, MX(c, p1, 0.04, 0.66)], [1, MX(c, p0, 0.03, 0.55)]]);
  {
    const x2 = s.base.getContext("2d");
    sprinkle(x2, c, w, h, R, few ? 30 : clamp2(Math.round(w * h / 2e3), 70, 650));
    x2.globalCompositeOperation = "screen";
    for (let i = 0; i < (few ? 2 : 14); i++) {
      const r2 = S * (4e-3 + R() * 8e-3);
      x2.save();
      x2.translate(R() * w, R() * h);
      x2.rotate(R() * TAU4);
      x2.scale(1, 0.3 + R() * 0.6);
      x2.globalAlpha = 0.3 + R() * 0.3;
      x2.drawImage(puff(c, haze(c, 0.5, i % 3), "wdg"), -r2, -r2, r2 * 2, r2 * 2);
      x2.restore();
    }
    x2.save();
    x2.translate(gx, gy);
    x2.rotate(s.pa);
    x2.scale(1, s.inc);
    let r = s.Rx * 1.35;
    x2.globalAlpha = 0.16;
    x2.drawImage(puff(c, haze(c, 0.35, 0), "wph"), -r, -r, r * 2, r * 2);
    r = s.Rx * 0.45;
    x2.globalAlpha = 0.2;
    x2.drawImage(puff(c, haze(c, 0.5, 2), "wpb"), -r, -r, r * 2, r * 2);
    x2.restore();
    x2.globalAlpha = 1;
    x2.globalCompositeOperation = "source-over";
  }
  const G2 = few ? 96 : clamp2(Math.round(S * 0.38), 128, 560), n = Math.max(24, G2 / 4 | 0), sd = s.seed & 1048575, m = s.arms, b = s.b;
  const warp = ngrid(n, (u, v) => fbm22(u * 6 + 11, v * 6 + 7, 4, sd));
  const floc = ngrid(n, (u, v) => fbm22(u * 16 + 3, v * 16 + 5, 3, sd + 17));
  const lm = ngrid(n, (u, v) => fbm22(u * 10, v * 10, 2, sd + 29));
  const tex = mk3(G2, G2), x = tex.getContext("2d"), id = x.createImageData(G2, G2), d = id.data;
  const ac = haze(c, 0.3, 0), cc = haze(c, 0.62, 2), hot = c.light ? tone2(c, 0) : [255, 255, 255];
  for (let j = 0; j < G2; j++) {
    const Y = (j + 0.5) / G2 * 2 - 1;
    for (let i = 0; i < G2; i++) {
      const X = (i + 0.5) / G2 * 2 - 1, r = Math.sqrt(X * X + Y * Y);
      if (r >= 1) continue;
      const u = (X + 1) / 2, v = (Y + 1) / 2;
      const ph = m * (Math.atan2(Y, X) - b * Math.log(r + 0.012)) + 1.5 * nsamp(warp, n, u, v);
      const arm = Math.pow(0.5 + 0.5 * Math.cos(ph), 2.2);
      const clump = 0.45 + 1.1 * clamp2(vn2(X * 26, Y * 26, sd + 41) * 0.6 + vn2(X * 55, Y * 55, sd + 43) * 0.4 + 0.25, 0, 1);
      const env = sstep3(0.03, 0.2, r) * Math.exp(-r / 0.34) * (1 - sstep3(0.72, 1, r));
      const disc = 0.55 * Math.exp(-r / 0.2) * (1 - sstep3(0.7, 1, r));
      const bul = 1.25 * Math.exp(-Math.pow(r / 0.07, 1.25));
      const lane = Math.pow(0.5 + 0.5 * Math.cos(ph - s.lag), 18) * sstep3(0.04, 0.16, r) * (1 - sstep3(0.55, 0.9, r)) * (0.55 + 0.9 * clamp2(nsamp(lm, n, u, v) + 0.35, 0, 1));
      const dust = clamp2(lane * 0.72 + 0.35 * clamp2(nsamp(floc, n, u, v), 0, 1) * (1 - sstep3(0.5, 0.9, r)) * sstep3(0.05, 0.2, r), 0, 0.93);
      const armL = arm * env * clump * 1.35;
      const L = (disc + armL) * (1 - dust) + bul * (1 - dust * 0.45);
      const kb = bul / (bul + armL + disc * 0.5 + 1e-4), kh = sstep3(0.9, 1.6, L) * 0.6, k = (j * G2 + i) * 4;
      for (let q = 0; q < 3; q++) {
        const bs = ac[q] + (cc[q] - ac[q]) * kb;
        d[k + q] = bs + (hot[q] - bs) * kh;
      }
      d[k + 3] = 255 * clamp2(L * 0.85, 0, 1);
    }
  }
  x.putImageData(id, 0, 0);
  x.globalCompositeOperation = "screen";
  const kn = spark(c, haze(c, 0.4, 1), "wkn"), bl = spark(c, haze(c, 0.55, 0), "wbl");
  for (let i = 0; i < (few ? 10 : 150); i++) {
    const r = 0.1 + Math.pow(R(), 0.8) * 0.62, ai = R() * m | 0;
    let th = b * Math.log(r + 0.012) + ai * TAU4 / m + (R() - 0.5) * 0.25;
    th -= 1.5 * nsamp(warp, n, (Math.cos(th) * r + 1) / 2, (Math.sin(th) * r + 1) / 2) / m;
    const X = Math.cos(th) * r, Y = Math.sin(th) * r, q = G2 * (4e-3 + R() * 0.01) * (1 - r * 0.5);
    x.globalAlpha = 0.35 + R() * 0.5;
    x.drawImage(R() < 0.55 ? kn : bl, (X + 1) / 2 * G2 - q, (Y + 1) / 2 * G2 - q, q * 2, q * 2);
  }
  {
    x.globalAlpha = 0.9;
    const q = G2 * 0.03;
    x.drawImage(spark(c, haze(c, 0.7, 2), "wnu"), G2 / 2 - q, G2 / 2 - q, q * 2, q * 2);
  }
  x.globalAlpha = 1;
  x.globalCompositeOperation = "source-over";
  s.tex = tex;
}
function ringProfile(s) {
  const n = s.ring.length - 1, cs = s.cass;
  return (ra) => {
    if (ra < 1.28 || ra > 2.27) return 0;
    let d;
    if (ra < 1.52) d = 0.16 + 0.1 * sstep3(1.28, 1.52, ra);
    else if (ra < cs) d = 0.72 + 0.28 * sstep3(1.52, 1.75, ra);
    else if (ra < cs + 0.07) d = 0.05;
    else d = 0.55 * (1 - 0.9 * Math.exp(-(((ra - 2.2) / 6e-3) ** 2)));
    return d * (0.6 + 0.65 * s.ring[Math.round((ra - 1.28) / 0.99 * n)]) * sstep3(2.27, 2.24, ra);
  };
}
function strokeRings(x, cx, cy, Rp, rot, k, prof, col, N) {
  x.save();
  x.translate(cx, cy);
  x.rotate(rot);
  x.scale(1, k);
  const step = 0.99 / N;
  for (let i = 0; i < N; i++) {
    const ra = 1.28 + (i + 0.5) * step, d = prof(ra);
    if (d < 0.01) continue;
    x.strokeStyle = col(ra, d);
    x.lineWidth = Rp * step * 1.25;
    x.beginPath();
    x.arc(0, 0, ra * Rp, 0, TAU4);
    x.stroke();
  }
  x.restore();
}
function bakeRing(s, w, h, c) {
  const p0 = tone2(c, 0), p1 = tone2(c, 1), p2 = tone2(c, 2), R = rng4(s.seed + 31), S = Math.max(w, h), port = h > w * 1.1, few = small(w), side = s.side;
  const Rp = S * 0.5, cx = w * (0.5 + side * (port ? 0.2 : 0.24)), cy = h * (port ? 0.97 : 0.95), rise = h * 0.14, kk = s.k;
  const rot = side * clamp2(Math.atan2(cy - h * 0.28, side > 0 ? cx : w - cx), 0.3, 1.15);
  const lx = -side * Math.cos(s.sunE), ly = -Math.sin(s.sunE), H2 = Math.ceil(h + rise), Y = cy + rise;
  s.rise = rise;
  s.base = wash(w, h, [[0, MX(c, p0, 0.03, 0.5)], [0.6, MX(c, p1, 0.04, 0.62)], [1, MX(c, p0, 0.04, 0.55)]]);
  {
    const x2 = s.base.getContext("2d"), r = S * 0.7;
    sprinkle(x2, c, w, h, R, few ? 20 : clamp2(Math.round(w * h / 2600), 50, 480));
    x2.globalCompositeOperation = "screen";
    x2.globalAlpha = 0.12;
    x2.drawImage(puff(c, haze(c, 0.5, 2), "rgl"), cx + lx * S * 0.9 - r, cy + ly * S * 0.9 - r, r * 2, r * 2);
    x2.globalAlpha = 1;
    x2.globalCompositeOperation = "source-over";
  }
  const prof = ringProfile(s), NR = few ? 40 : 200;
  const pc = mk3(w, H2), x = pc.getContext("2d");
  x.save();
  x.beginPath();
  x.arc(cx, Y, Rp, 0, TAU4);
  x.clip();
  x.fillStyle = MX(c, p0, 0.2, 0.7);
  x.fillRect(0, 0, w, H2);
  x.save();
  x.translate(cx, Y);
  x.rotate(rot);
  const NB2 = s.bands.length - 1, cb = Math.sqrt(1 - kk * kk), bc = [];
  const zone = haze(c, 0.3, 0), belt = mixv(c, p2, 0.3, 0.85);
  for (let i = 0; i < NB2; i++) bc.push(mixv(c, lerp3(belt, zone, s.bands[i]), 0.55 + 0.4 * s.bands2[i]));
  const yc = (la) => -Math.sin(la) * Rp * cb, ry = (la) => Math.cos(la) * Rp * kk;
  for (let i = 0; i < NB2; i++) {
    const la = -Math.PI / 2 + i / NB2 * Math.PI, y0 = yc(la);
    x.fillStyle = rgb(bc[i]);
    x.beginPath();
    x.rect(-Rp * 1.1, -Rp * 1.1, Rp * 2.2, y0 + Rp * 1.1);
    x.ellipse(0, y0, Rp * Math.cos(la) + 0.5, ry(la) + 0.5, 0, 0, TAU4);
    x.fill();
  }
  for (let i = 0; i < (few ? 30 : 520); i++) {
    const la = (R() - 0.5) * Math.PI * 0.9, rx = Rp * Math.cos(la), px = (R() * 2 - 1) * rx * 0.95, py = yc(la) + ry(la) * Math.sqrt(Math.max(0, 1 - (px / rx) ** 2));
    const bi = clamp2(Math.round((la / Math.PI + 0.5) * NB2), 0, NB2 - 1);
    x.fillStyle = rgb(bc[(bi + (R() < 0.5 ? 2 : -2) + NB2) % NB2], 0.3);
    x.beginPath();
    x.ellipse(px, py, Rp * (0.03 + R() * 0.22), Math.max(0.5, Rp * (2e-3 + R() * 4e-3)), 0, 0, TAU4);
    x.fill();
  }
  {
    const la = s.storm.lat, rx = Rp * Math.cos(la), px = s.storm.lon * rx, py = yc(la) + ry(la) * Math.sqrt(1 - s.storm.lon ** 2), sz = Rp * s.storm.sz;
    x.fillStyle = rgb(mixv(c, haze(c, 0.3, 1), 0.7), 0.55);
    x.beginPath();
    x.ellipse(px, py, sz * 1.3, sz * 0.55, 0, 0, TAU4);
    x.fill();
    x.fillStyle = rgb(mixv(c, haze(c, 0.5, 1), 0.8), 0.5);
    x.beginPath();
    x.ellipse(px, py, sz * 0.75, sz * 0.3, 0, 0, TAU4);
    x.fill();
  }
  x.restore();
  strokeRings(x, cx - lx * Rp * 0.22, Y - ly * Rp * 0.22, Rp, rot, kk, prof, (ra, d) => MX(c, p0, 0.02, 0.25, d * 0.7), NR);
  {
    const tg = x.createLinearGradient(cx + lx * Rp, Y + ly * Rp, cx - lx * Rp, Y - ly * Rp);
    tg.addColorStop(0, BGA(c, 0));
    tg.addColorStop(0.36, BGA(c, 0.08));
    tg.addColorStop(0.6, BGA(c, 0.7));
    tg.addColorStop(0.74, BGA(c, 0.93));
    tg.addColorStop(1, BGA(c, 0.97));
    x.fillStyle = tg;
    x.fillRect(0, 0, w, H2);
    const lg = x.createRadialGradient(cx, Y, Rp * 0.55, cx, Y, Rp);
    lg.addColorStop(0, BGA(c, 0));
    lg.addColorStop(0.8, BGA(c, 0.18));
    lg.addColorStop(1, BGA(c, 0.55));
    x.fillStyle = lg;
    x.fillRect(0, 0, w, H2);
  }
  x.restore();
  {
    x.globalCompositeOperation = "screen";
    const ag = x.createLinearGradient(cx + lx * Rp, Y + ly * Rp, cx - lx * Rp, Y - ly * Rp), ac = haze(c, 0.55, 0);
    ag.addColorStop(0, rgb(ac, 0.9));
    ag.addColorStop(0.4, rgb(ac, 0.3));
    ag.addColorStop(0.58, rgb(ac, 0));
    ag.addColorStop(1, rgb(ac, 0));
    x.strokeStyle = ag;
    for (const [lw, rr, al] of [[Math.max(1, Rp * 3e-3), 1, 0.9], [Rp * 0.012, 1.004, 0.22]]) {
      x.lineWidth = lw;
      x.globalAlpha = al;
      x.beginPath();
      x.arc(cx, Y, Rp * rr, 0, TAU4);
      x.stroke();
    }
    x.globalAlpha = 1;
    x.globalCompositeOperation = "source-over";
  }
  dither3(x, w, H2);
  s.pc = pc;
  const rc = mk3(w, H2), y = rc.getContext("2d"), rA = haze(c, 0.55, 0), rB = haze(c, 0.45, 2);
  strokeRings(y, cx, Y, Rp, rot, kk, prof, (ra, d) => rgb(lerp3(rB, rA, sstep3(1.4, 2.2, ra)), d * 0.85), NR);
  y.save();
  y.translate(cx, Y);
  y.rotate(rot);
  y.beginPath();
  y.rect(-S * 4, -S * 4, S * 8, S * 4);
  y.clip();
  y.globalCompositeOperation = "destination-out";
  y.beginPath();
  y.arc(0, 0, Rp * 1.002, 0, TAU4);
  y.fill();
  y.restore();
  y.globalCompositeOperation = "destination-out";
  {
    const dg = y.createLinearGradient(cx + lx * Rp * 2.3, Y + ly * Rp * 2.3, cx - lx * Rp * 2.3, Y - ly * Rp * 2.3);
    dg.addColorStop(0, "rgba(0,0,0,0)");
    dg.addColorStop(0.5, "rgba(0,0,0,.15)");
    dg.addColorStop(1, "rgba(0,0,0,.7)");
    y.fillStyle = dg;
    y.fillRect(0, 0, w, H2);
  }
  y.globalCompositeOperation = "source-over";
  s.rc = rc;
}
function bakeTotal(s, w, h, c) {
  const p0 = tone2(c, 0), p1 = tone2(c, 1), p2 = tone2(c, 2), R = rng4(s.seed + 41), S = Math.max(w, h), m = Math.min(w, h), few = small(w);
  const sx = s.sx * w, sy = s.sy * h, Rs = m * 0.1 + S * 0.02, HY = h * s.hz;
  Object.assign(s, { sxp: sx, syp: sy, Rs, Rm: Rs * 1.032 });
  const sky = wash(w, h, [[0, MX(c, p0, 0.02, 0.42)], [0.4, MX(c, p0, 0.05, 0.6)], [s.hz - 0.1, MX(c, p1, 0.12, 0.78)], [s.hz - 0.01, MX(c, p2, 0.42)], [1, MX(c, p0, 0.05, 0.4)]]);
  const x = sky.getContext("2d");
  x.globalCompositeOperation = "screen";
  x.globalAlpha = 0.35;
  x.drawImage(puff(c, haze(c, 0.4, 2), "tth"), -w * 0.3, HY - h * 0.14, w * 1.6, h * 0.26);
  x.globalAlpha = 0.16;
  x.drawImage(puff(c, haze(c, 0.5, 1), "tti"), -w * 0.2, HY - h * 0.32, w * 1.4, h * 0.5);
  x.globalAlpha = 1;
  sprinkle(x, c, w, h, R, few ? 10 : clamp2(Math.round(w * h / 5e3), 30, 260), (u, v) => v < s.hz ? 0.9 - v / s.hz * 0.6 : 0);
  x.globalCompositeOperation = "screen";
  {
    const vd = Rs * s.venus.d, vx = clamp2(sx + Math.cos(s.venus.a) * vd, w * 0.06, w * 0.94), vy = clamp2(sy + Math.sin(s.venus.a) * vd * 0.7, h * 0.06, HY - h * 0.08), r = Rs * 0.22;
    x.globalAlpha = 0.7;
    x.drawImage(spark(c, haze(c, 0.6), "tve"), vx - r, vy - r, r * 2, r * 2);
    x.globalAlpha = 1;
    x.fillStyle = W4(c, 0.95);
    x.fillRect(vx - 1, vy - 1, 2, 2);
  }
  const cw = haze(c, 0.75, 0), cw2 = haze(c, 0.55, 0), P = (r, an) => [sx + Math.cos(an) * r, sy + Math.sin(an) * r];
  x.save();
  x.translate(sx, sy);
  x.rotate(s.eq);
  for (const [r, a, k] of [[Rs * 2.2, 0.55, 1.08], [Rs * 4.5, 0.22, 1.3], [Rs * 9, 0.08, 1.5]]) {
    x.save();
    x.scale(k, 1);
    const gr = x.createRadialGradient(0, 0, Rs * 0.95, 0, 0, r);
    gr.addColorStop(0, rgb(cw, a));
    gr.addColorStop(0.25, rgb(cw, a * 0.4));
    gr.addColorStop(1, rgb(cw, 0));
    x.fillStyle = gr;
    x.beginPath();
    x.arc(0, 0, r, 0, TAU4);
    x.fill();
    x.restore();
  }
  x.restore();
  const Lmax = S * 0.75;
  for (let i = 0; i < (few ? 6 : 26); i++) {
    const off = (R() + R() + R() - 1.5) * 0.55, a = s.eq + (i % 2 ? Math.PI : 0) + off;
    const da = (0.12 + R() * 0.3) * (1 - Math.abs(off) * 0.6), L = Math.min(Lmax, Rs * (2.2 + R() * 7 * Math.exp(-off * off / 0.12))), bend = (R() - 0.5) * 0.12 + off * 0.2;
    const gr = x.createRadialGradient(sx, sy, Rs, sx, sy, L), al = (0.1 + R() * 0.14) * 0.4;
    gr.addColorStop(0, rgb(cw, al * 2.2));
    gr.addColorStop(0.08, rgb(cw, al));
    gr.addColorStop(0.3, rgb(cw2, al * 0.35));
    gr.addColorStop(0.7, rgb(cw2, al * 0.08));
    gr.addColorStop(1, rgb(cw2, 0));
    x.fillStyle = gr;
    for (const f of [1.15, 0.8, 0.5, 0.25]) {
      const d2 = da * f, [b1x, b1y] = P(Rs * 0.98, a - d2), [b2x, b2y] = P(Rs * 0.98, a + d2), [c1x, c1y] = P(Rs * 1.9, a - d2 * 1.25), [c2x, c2y] = P(L * 0.38, a + bend * 0.4 - d2 * 0.12);
      const [tx, ty] = P(L * (0.75 + f * 0.22), a + bend), [c3x, c3y] = P(L * 0.38, a + bend * 0.4 + d2 * 0.12), [c4x, c4y] = P(Rs * 1.9, a + d2 * 1.25);
      x.beginPath();
      x.moveTo(b1x, b1y);
      x.bezierCurveTo(c1x, c1y, c2x, c2y, tx, ty);
      x.bezierCurveTo(c3x, c3y, c4x, c4y, b2x, b2y);
      x.closePath();
      x.fill();
    }
  }
  x.lineCap = "round";
  for (let i = 0; i < (few ? 6 : 40); i++) {
    const off = (R() - 0.5) * 1.1, a = s.eq + (i % 2 ? -1 : 1) * Math.PI / 2 + off, L = Rs * (1.5 + R() * 1.4);
    const gr = x.createRadialGradient(sx, sy, Rs, sx, sy, L);
    gr.addColorStop(0, rgb(cw, 0.32));
    gr.addColorStop(1, rgb(cw, 0));
    const [ax, ay] = P(Rs, a), [qx, qy] = P(L * 0.6, a + off * 0.25), [ex, ey] = P(L, a + off * 0.5);
    x.strokeStyle = gr;
    x.lineWidth = Rs * (0.015 + R() * 0.03);
    x.beginPath();
    x.moveTo(ax, ay);
    x.quadraticCurveTo(qx, qy, ex, ey);
    x.stroke();
  }
  {
    const rg = x.createRadialGradient(sx, sy, Rs, sx, sy, Rs * 6);
    rg.addColorStop(0, rgb(cw, 1));
    rg.addColorStop(0.2, rgb(cw, 0.3));
    rg.addColorStop(1, rgb(cw, 0));
    x.strokeStyle = rg;
    x.lineWidth = Math.max(0.5, Rs * 0.01);
    for (let i = 0; i < (few ? 30 : 320); i++) {
      const a = R() * TAU4, L = Rs * (1.3 + R() * R() * 4.5) * (0.6 + 0.8 * Math.cos(a - s.eq) ** 2), [ax, ay] = P(Rs, a), [ex, ey] = P(L, a + (R() - 0.5) * 0.08);
      x.globalAlpha = 0.04 + R() * 0.08;
      x.beginPath();
      x.moveTo(ax, ay);
      x.lineTo(ex, ey);
      x.stroke();
    }
    x.globalAlpha = 1;
  }
  x.globalCompositeOperation = "source-over";
  x.fillStyle = MX(c, p0, 0.04, 0.28);
  x.beginPath();
  x.moveTo(0, h);
  for (let i = 0; i <= 200; i++) x.lineTo(i / 200 * w, HY + h * 5e-3 - h * 0.05 * s.ridge[i] * (0.4 + 0.6 * Math.sin(i / 200 * 3.1 + 0.4)));
  x.lineTo(w, h);
  x.closePath();
  x.fill();
  dither3(x, w, h);
  s.sky = sky;
  const D = Math.ceil(Rs * 2.6), sun = mk3(D, D), z = sun.getContext("2d"), o = D / 2, pr = haze(c, 0.3, 1);
  z.fillStyle = W4(c, 1);
  z.beginPath();
  z.arc(o, o, Rs, 0, TAU4);
  z.fill();
  z.globalCompositeOperation = "screen";
  z.strokeStyle = rgb(pr, 0.9);
  z.lineWidth = Math.max(1, Rs * 0.014);
  z.beginPath();
  z.arc(o, o, Rs * 1.006, 0, TAU4);
  z.stroke();
  z.lineCap = "round";
  for (let i = 0; i < (few ? 2 : 6 + (R() * 4 | 0)); i++) {
    const a = R() * TAU4, sp = 0.04 + R() * 0.08, hg = Rs * (0.04 + R() * 0.1);
    const ax = o + Math.cos(a - sp) * Rs, ay = o + Math.sin(a - sp) * Rs, bx = o + Math.cos(a + sp) * Rs, by = o + Math.sin(a + sp) * Rs, qx = o + Math.cos(a) * (Rs + hg * 2), qy = o + Math.sin(a) * (Rs + hg * 2);
    const r = hg * 2.2, mx = o + Math.cos(a) * (Rs + hg * 0.6), my = o + Math.sin(a) * (Rs + hg * 0.6);
    z.globalAlpha = 0.45;
    z.drawImage(spark(c, pr, "tpr"), mx - r, my - r, r * 2, r * 2);
    z.globalAlpha = 1;
    z.strokeStyle = rgb(pr, 0.55 + R() * 0.35);
    z.lineWidth = Math.max(0.8, Rs * (0.01 + R() * 0.02));
    z.beginPath();
    z.moveTo(ax, ay);
    z.quadraticCurveTo(qx, qy, bx, by);
    z.stroke();
  }
  s.sun = sun;
  s.sunO = o;
  s.moonCol = MX(c, p0, 0.015, 0.16);
}
var SCENES_DEEPSPACE = [
  {
    name: "Star Nursery",
    flav: "Cosmic",
    reset: (w, h) => {
      const seed = Math.random() * 1e9 | 0, R = rng4(seed);
      const L = [0, 1, 2].map((i) => ({ amp: 0.03 + R() * 0.02 + (i === 2 ? 0.01 : 0), sp: 0.045 + R() * 0.03, ph: R() * 6.3, rot: 6e-3 + R() * 8e-3, dsp: 0.015 + R() * 0.012, px: 0.3 + R() * 0.4, py: 0.3 + R() * 0.4 }));
      return { seed, freq: 2.2 + R() * 1.2, ang: R() * Math.PI, ox: 0.3 + R() * 0.4, oy: 0.3 + R() * 0.4, L, key: "" };
    },
    frame: (g, w, h, t, c, s) => {
      const key = keyOf3(w, h, c);
      if (s.key !== key) {
        bakeNursery(s, w, h, c);
        s.key = key;
      }
      const tt = t * 1e-3, few = small(w);
      fresh(g, c, w, h);
      g.drawImage(s.base, 0, 0);
      const lay = (cv, L, op) => {
        const sc = 1 + L.amp * Math.sin(tt * L.sp + L.ph), rot = L.rot * Math.sin(tt * L.sp * 0.7 + L.ph * 1.3);
        const px = L.px * w, py = L.py * h, dx = Math.sin(tt * L.dsp + L.ph) * w * 0.016, dy = Math.cos(tt * L.dsp * 0.8 + L.ph) * h * 0.014;
        g.globalCompositeOperation = op;
        g.globalAlpha = 1;
        g.save();
        g.translate(px + dx, py + dy);
        g.rotate(rot);
        g.scale(sc, sc);
        g.translate(-px, -py);
        g.drawImage(cv, s.gx0, s.gy0, s.gW, s.gH);
        g.restore();
      };
      lay(s.lay[1], s.L[1], "screen");
      {
        const r = Math.max(w, h) * 0.3 * (1 + 0.04 * Math.sin(tt * 0.07));
        g.globalAlpha = 0.12;
        g.drawImage(puff(c, haze(c, 0.5), "snc"), s.cl.x - r, s.cl.y - r, r * 2, r * 2);
      }
      lay(s.lay[0], s.L[0], "screen");
      lay(s.lay[2], s.L[2], "source-over");
      g.globalCompositeOperation = "screen";
      const sr = Math.max(w, h) / 1440;
      for (const y of few ? s.ys.slice(0, 5) : s.ys) {
        const tw = 0.85 + 0.15 * Math.sin(tt * 0.9 + y.ph), col = y.ti ? haze(c, 0.45, 1) : haze(c, 0.7, 0), r = (6 + 26 * y.m * y.m) * sr * tw;
        g.globalAlpha = 0.55 * y.m + 0.2;
        g.drawImage(spark(c, col, "sny"), y.x - r, y.y - r, r * 2, r * 2);
        if (y.sp && !few) {
          const L = r * 3.2;
          g.globalAlpha = 0.5 * y.m * tw;
          g.drawImage(spikes(c, col), y.x - L, y.y - L, L * 2, L * 2);
        }
        g.globalAlpha = 1;
        g.fillStyle = W4(c, 0.9 * y.m);
        const q = Math.max(1, 1.6 * y.m * sr + 0.6);
        g.fillRect(y.x - q / 2, y.y - q / 2, q, q);
      }
      done(g);
    }
  },
  {
    name: "Whirlpool",
    flav: "Cosmic",
    reset: (w, h) => {
      const seed = Math.random() * 1e9 | 0, R = rng4(seed);
      return {
        seed,
        arms: R() < 0.8 ? 2 : 3,
        b: 1 / Math.tan((13 + R() * 9) * Math.PI / 180),
        inc: 0.5 + R() * 0.16,
        paJ: (R() - 0.5) * 0.5,
        gx: 0.5 + (R() - 0.5) * 0.12,
        gy: 0.5 + (R() - 0.5) * 0.1,
        sz: 0.58 + R() * 0.1,
        dir: R() < 0.5 ? -1 : 1,
        sp0: R() * TAU4,
        lag: 0.45 + R() * 0.25,
        fg: Array.from({ length: 10 }, () => ({ x: R(), y: R(), m: 0.3 + R() * 0.7, ph: R() * 6.3 })),
        key: ""
      };
    },
    frame: (g, w, h, t, c, s) => {
      const key = keyOf3(w, h, c);
      if (s.key !== key) {
        bakeWhirl(s, w, h, c);
        s.key = key;
      }
      const tt = t * 1e-3, few = small(w);
      fresh(g, c, w, h);
      g.drawImage(s.base, 0, 0);
      g.globalCompositeOperation = "screen";
      g.save();
      g.translate(s.gx * w, s.gy * h);
      g.rotate(s.pa);
      g.scale(s.Rx, s.Rx * s.inc);
      g.scale(s.dir, 1);
      g.rotate(s.sp0 - tt * 55e-4);
      g.drawImage(s.tex, -1, -1, 2, 2);
      g.restore();
      const sr = Math.min(w, h) / 900, col = haze(c, 0.7);
      for (const f of few ? s.fg.slice(0, 3) : s.fg) {
        const xx = f.x * w, yy = f.y * h, r = (4 + 10 * f.m) * sr;
        g.globalAlpha = 0.45 + 0.35 * f.m;
        g.drawImage(spark(c, col, "wfg"), xx - r, yy - r, r * 2, r * 2);
        if (f.m > 0.75 && !few) {
          const L = r * 3;
          g.globalAlpha = 0.45 * f.m;
          g.drawImage(spikes(c, col), xx - L, yy - L, L * 2, L * 2);
        }
        g.globalAlpha = 1;
        g.fillStyle = W4(c, 0.85);
        g.fillRect(xx - 0.8, yy - 0.8, 1.6, 1.6);
      }
      done(g);
    }
  },
  {
    name: "Ringrise",
    flav: "Cinematic",
    reset: (w, h) => {
      const seed = Math.random() * 1e9 | 0, R = rng4(seed);
      return {
        seed,
        side: R() < 0.5 ? 1 : -1,
        k: 0.13 + R() * 0.1,
        sunE: 0.5 + R() * 0.55,
        bands: norm01(fbm2(180, 9, 4, 0.55, R)),
        bands2: norm01(fbm2(180, 23, 3, 0.5, R)),
        ring: norm01(fbm2(400, 70, 3, 0.6, R)),
        cass: 1.92 + R() * 0.04,
        storm: { lat: (R() - 0.5) * 0.8, lon: (R() - 0.5) * 0.9, sz: 0.035 + R() * 0.035 },
        stars: makeStars(R, 110, 1),
        t0: null,
        key: ""
      };
    },
    frame: (g, w, h, t, c, s) => {
      const key = keyOf3(w, h, c);
      if (s.key !== key) {
        bakeRing(s, w, h, c);
        s.key = key;
      }
      if (s.t0 == null) s.t0 = t;
      const u = clamp2((t - s.t0) / 17e4, 0, 1), off = s.rise * (1 - u) * (1 - u);
      fresh(g, c, w, h);
      g.drawImage(s.base, 0, 0);
      g.globalCompositeOperation = "screen";
      drawStars(g, c, s.stars, w, h, t);
      g.globalCompositeOperation = "source-over";
      g.drawImage(s.pc, 0, off - s.rise);
      g.drawImage(s.rc, 0, off - s.rise);
      done(g);
    }
  },
  {
    name: "Totality",
    flav: "Cinematic",
    reset: (w, h) => {
      const seed = Math.random() * 1e9 | 0, R = rng4(seed);
      return {
        seed,
        sx: 0.5 + (R() - 0.5) * 0.16,
        sy: 0.36 + R() * 0.06,
        hz: 0.8 + R() * 0.05,
        eq: (R() - 0.5) * 0.7,
        dir: R() * TAU4,
        per: 120 + R() * 60,
        ph: R() * TAU4,
        venus: { a: R() * TAU4, d: 2.4 + R() * 2 },
        ridge: norm01(fbm2(200, 5, 5, 0.5, R)),
        stars: makeStars(R, 50, 0.6),
        t0: null,
        key: ""
      };
    },
    frame: (g, w, h, t, c, s) => {
      const key = keyOf3(w, h, c);
      if (s.key !== key) {
        bakeTotal(s, w, h, c);
        s.key = key;
      }
      if (s.t0 == null) s.t0 = t;
      const el = (t - s.t0) / 1e3, Rs = s.Rs, sn = Math.sin(el * TAU4 / s.per + s.ph), o = Rs * 0.04 * sn * sn * sn, dx = Math.cos(s.dir), dy = Math.sin(s.dir);
      fresh(g, c, w, h);
      g.drawImage(s.sky, 0, 0);
      g.globalCompositeOperation = "screen";
      drawStars(g, c, s.stars, w, h, t, (y) => clamp2(1 - y / 0.6, 0, 1) * 0.6);
      g.globalCompositeOperation = "source-over";
      g.drawImage(s.sun, s.sxp - s.sunO, s.syp - s.sunO);
      g.fillStyle = s.moonCol;
      g.beginPath();
      g.arc(s.sxp + dx * o, s.syp + dy * o, s.Rm, 0, TAU4);
      g.fill();
      const ex = Math.abs(o) - (s.Rm - Rs * 1.006);
      if (ex > -Rs * 0.012) {
        const e = clamp2((ex + Rs * 0.012) / (Rs * 0.02), 0, 1), sg = o >= 0 ? -1 : 1, px = s.sxp + dx * sg * Rs, py = s.syp + dy * sg * Rs;
        g.globalCompositeOperation = "screen";
        let r = Rs * (0.12 + 0.5 * e);
        g.globalAlpha = 0.7 * e + 0.15;
        g.drawImage(spark(c, haze(c, 0.35, 1), "tch"), px - r, py - r, r * 2, r * 2);
        const bead = Math.abs(o) - (s.Rm - Rs);
        if (bead > 0) {
          const k = clamp2(bead / (Rs * 8e-3), 0, 1);
          r = Rs * (0.15 + 0.85 * k * k);
          g.globalAlpha = Math.min(1, k * 1.1);
          g.drawImage(spark(c, haze(c, 0.8), "tdr"), px - r, py - r, r * 2, r * 2);
        }
      }
      done(g);
    }
  }
];

// from fluidInk.ts
var TAU5 = Math.PI * 2;
var clamp3 = (v, a, b) => v < a ? a : v > b ? b : v;
var rgb2 = (v, a = 1) => `rgba(${v[0] | 0},${v[1] | 0},${v[2] | 0},${a})`;
var tone3 = (c, i) => c.pal[(i % c.pal.length + c.pal.length) % c.pal.length];
var haze2 = (c, k = 0.38, i = 0) => {
  const p = tone3(c, i);
  return c.light ? p : [p[0] + (255 - p[0]) * k, p[1] + (255 - p[1]) * k, p[2] + (255 - p[2]) * k];
};
var mixv2 = (c, p, k, d = 1) => [(c.br + (p[0] - c.br) * k) * d, (c.bg2 + (p[1] - c.bg2) * k) * d, (c.bb + (p[2] - c.bb) * k) * d];
var MX2 = (c, p, k, d = 1, a = 1) => rgb2(mixv2(c, p, k, d), a);
var lerp32 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
var small2 = (w) => w < 200;
function mk4(w, h) {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  return cv;
}
var rng5 = (a) => () => {
  a |= 0;
  a = a + 1831565813 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
var _dith3 = null;
function dither4(x, w, h, al = 0.012) {
  if (!_dith3) {
    _dith3 = mk4(64, 64);
    const d = _dith3.getContext("2d"), id = d.createImageData(64, 64);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = Math.random() < 0.5 ? 0 : 255;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = 255;
    }
    d.putImageData(id, 0, 0);
  }
  if (w < 200) return;
  x.save();
  x.globalCompositeOperation = "source-atop";
  x.globalAlpha = al;
  x.fillStyle = x.createPattern(_dith3, "repeat");
  x.fillRect(0, 0, w, h);
  x.restore();
}
function wash2(w, h, stops) {
  const cv = mk4(w, h), x = cv.getContext("2d"), gr = x.createLinearGradient(0, 0, 0, cv.height);
  for (const [o, col] of stops) gr.addColorStop(clamp3(o, 0, 1), col);
  x.fillStyle = gr;
  x.fillRect(0, 0, cv.width, cv.height);
  dither4(x, cv.width, cv.height);
  return cv;
}
var fresh2 = (g, c, w, h) => {
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
  g.fillStyle = c.bg;
  g.fillRect(0, 0, w, h);
};
var done2 = (g) => {
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
};
var keyOf4 = (w, h, c) => w + "x" + h + c.acc + c.bg;
var seedOf = () => Math.random() * 1e9 | 0;
function bakeSilk(s, w, h, c) {
  const p0 = tone3(c, 0), p1 = tone3(c, 1);
  s.back = wash2(w, h, [[0, MX2(c, p0, 0.05, 0.72)], [0.5, MX2(c, p1, 0.07, 0.9)], [1, MX2(c, p0, 0.05, 0.74)]]);
  s.cols = s.sheets.map((sh) => {
    const a = tone3(c, sh.ti), b = haze2(c, 0.6, sh.ti);
    return (e) => lerp32(a, b, e);
  });
  s.fills = s.sheets.map((sh) => tone3(c, sh.ti));
}
var RIM = new Float32Array(4e4);
var SCENES_FLUIDINK = [
  {
    name: "Silk Wind",
    flav: "Light",
    reset: (w, h) => {
      const seed = seedOf(), R = rng5(seed), K = h > w * 1.25 ? 4 : 3, sheets = [];
      for (let k = 0; k < K; k++) sheets.push({
        yc: (k + 0.5) / K + (R() - 0.5) * 0.1 / K,
        th: (0.85 + R() * 0.35) / K,
        tilt: (R() - 0.5) * 0.28,
        ti: k + (R() * 3 | 0),
        f1: 0.45 + R() * 0.45,
        w1: TAU5 / (24 + R() * 14),
        p1: R() * TAU5,
        A1: 0.045 + R() * 0.035,
        f2: 1.3 + R() * 0.9,
        w2: TAU5 / (13 + R() * 8),
        p2: R() * TAU5,
        A2: 0.012 + R() * 0.016,
        ft: 0.5 + R() * 0.6,
        wt: TAU5 / (19 + R() * 12),
        pt: R() * TAU5,
        T0: R() * TAU5,
        Ta: 1.2 + R() * 1.3,
        ff: 3 + R() * 2.5,
        wf: TAU5 / (6 + R() * 4),
        Af: 3e-3 + R() * 4e-3,
        sp: R() * TAU5
      });
      return { seed, sheets, key: "" };
    },
    frame: (g, w, h, t, c, s) => {
      const key = keyOf4(w, h, c);
      if (s.key !== key) {
        bakeSilk(s, w, h, c);
        s.key = key;
      }
      const tt = t * 1e-3, few = small2(w), n = few ? 20 : clamp3(Math.round(w / 18), 34, 90), S = few ? 9 : 30;
      fresh2(g, c, w, h);
      g.drawImage(s.back, 0, 0);
      if (!s.base || s.base.length !== n + 1) {
        s.base = new Float32Array(n + 1);
        s.ct = new Float32Array(n + 1);
        s.fl = new Float32Array(n + 1);
        s.X = new Float32Array(n + 1);
      }
      const base = s.base, ct = s.ct, fl = s.fl, X = s.X;
      g.globalCompositeOperation = "lighter";
      g.lineJoin = "round";
      g.lineWidth = Math.max(0.6, Math.min(1.25, h / 820));
      for (let k = 0; k < s.sheets.length; k++) {
        const sh = s.sheets[k], col = s.cols[k];
        for (let i = 0; i <= n; i++) {
          const xn = -0.04 + 1.08 * i / n;
          X[i] = xn * w;
          base[i] = h * (sh.yc + sh.tilt * (xn - 0.5) + sh.A1 * Math.sin(TAU5 * xn * sh.f1 - tt * sh.w1 + sh.p1) + sh.A2 * Math.sin(TAU5 * xn * sh.f2 - tt * sh.w2 + sh.p2));
          ct[i] = h * sh.th * Math.cos(sh.T0 + sh.Ta * Math.sin(TAU5 * xn * sh.ft - tt * sh.wt + sh.pt));
          fl[i] = TAU5 * xn * sh.ff - tt * sh.wf + sh.sp;
        }
        const af = h * sh.Af, fc = s.fills[k], hth = 1 / (h * sh.th);
        const gr = g.createLinearGradient(X[0], 0, X[n], 0), tc = fc;
        for (let i = 0; i <= n; i += 2) gr.addColorStop(i / n, rgb2(tc, 0.025 + 0.11 * Math.abs(ct[i]) * hth));
        g.fillStyle = gr;
        g.beginPath();
        for (let i = 0; i <= n; i++) {
          const y = base[i] - 0.5 * ct[i] - af * Math.sin(fl[i] - 2.5);
          i ? g.lineTo(X[i], y) : g.moveTo(X[i], y);
        }
        for (let i = n; i >= 0; i--) g.lineTo(X[i], base[i] + 0.5 * ct[i] + af * Math.sin(fl[i] + 2.5));
        g.closePath();
        g.fill();
        for (let j = 0; j < S; j++) {
          const v = j / (S - 1) - 0.5, e = Math.abs(v) * 2, e4 = e * e * e * e;
          g.strokeStyle = rgb2(col(e4 * 0.8), 0.07 + 0.16 * e4);
          g.beginPath();
          for (let i = 0; i <= n; i++) {
            const y = base[i] + v * ct[i] + af * Math.sin(fl[i] + v * 5);
            i ? g.lineTo(X[i], y) : g.moveTo(X[i], y);
          }
          g.stroke();
        }
      }
      done2(g);
    }
  }
];

// from growth.ts
var TAU6 = 6.283185307179586;
var PAL = (c, i) => c.pal[(i % c.pal.length + c.pal.length) % c.pal.length];
function TWr(c, i, k) {
  const p = PAL(c, i), q = c.light ? 0 : k;
  return [p[0] + (255 - p[0]) * q, p[1] + (255 - p[1]) * q, p[2] + (255 - p[2]) * q];
}
function TBr(c, i, k) {
  const p = PAL(c, i);
  return [p[0] + (c.br - p[0]) * k, p[1] + (c.bg2 - p[1]) * k, p[2] + (c.bb - p[2]) * k];
}
var rgba3 = (v, a) => `rgba(${v[0] | 0},${v[1] | 0},${v[2] | 0},${a})`;
var clamp012 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
var sstep4 = (a, b, x) => {
  const q = clamp012((x - a) / (b - a));
  return q * q * (3 - 2 * q);
};
var frac2 = (v) => v - Math.floor(v);
function mk5(w, h) {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  return cv;
}
function rng6(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hash(n) {
  let x = (n | 0) ^ 2654435769;
  x = Math.imul(x ^ x >>> 16, 2246822507);
  x = Math.imul(x ^ x >>> 13, 3266489909);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
var angDiff = (a, b) => {
  let d = (a - b) % TAU6;
  if (d > Math.PI) d -= TAU6;
  if (d < -Math.PI) d += TAU6;
  return d;
};
var _spKey2 = "";
var _sp3 = /* @__PURE__ */ new Map();
function sprite5(c, id, make) {
  const k = c.pal.map((p) => p.join(",")).join(";") + "|" + c.bg + "|" + (c.light ? 1 : 0);
  if (k !== _spKey2) {
    _spKey2 = k;
    _sp3.clear();
  }
  let cv = _sp3.get(id);
  if (!cv) {
    cv = make();
    _sp3.set(id, cv);
  }
  return cv;
}
function radial2(stops, S = 64) {
  const cv = mk5(S, S), x = cv.getContext("2d");
  const gr = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  x.fillStyle = gr;
  x.fillRect(0, 0, S, S);
  return cv;
}
var glowSp2 = (c, i, k = 0) => sprite5(c, "g" + i + "_" + k, () => {
  const v = TWr(c, i, k);
  return radial2([[0, rgba3(v, 1)], [0.18, rgba3(v, 0.6)], [0.42, rgba3(v, 0.2)], [0.7, rgba3(v, 0.05)], [1, rgba3(v, 0)]], 64);
});
var washSp = (c, i, k = 0) => sprite5(c, "w" + i + "_" + k, () => {
  const v = TWr(c, i, k);
  return radial2([[0, rgba3(v, 1)], [0.3, rgba3(v, 0.55)], [0.6, rgba3(v, 0.18)], [1, rgba3(v, 0)]], 128);
});
function sortByArr(arr, n) {
  const k = new Float64Array(n);
  for (let i = 0; i < n; i++) k[i] = Math.round(arr[i] * 1e3) * 65536 + i;
  k.sort();
  const o = new Array(n);
  for (let i = 0; i < n; i++) o[i] = k[i] % 65536;
  return o;
}
var sceneKey = (w, h, c) => w + "x" + h + "|" + c.pal.map((p) => p.join(",")).join(";") + "|" + c.bg;
var _grain = null;
function grainTile() {
  if (_grain) return _grain;
  const S = 128, cv = mk5(S, S), x = cv.getContext("2d"), id = x.createImageData(S, S), R = rng6(77);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = R() * 255 | 0;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
    id.data[i + 3] = 255;
  }
  x.putImageData(id, 0, 0);
  _grain = cv;
  return cv;
}
function addGrain(x, w, h, a) {
  const gt = grainTile();
  x.save();
  x.globalAlpha = a;
  x.globalCompositeOperation = "overlay";
  x.fillStyle = x.createPattern(gt, "repeat");
  x.fillRect(0, 0, w, h);
  x.restore();
}
var RF_SPAN = 30;
var RF_BASE = [0.6, 0.71, 0.84];
var RF_HAZE = [0.8, 0.58, 0.3];
function rfWaterRGB(c, y01) {
  return TBr(c, 0, 0.78 + 0.17 * y01);
}
var mixv3 = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];
function rfFamily(c) {
  const hue = (p) => {
    const r = p[0] / 255, g = p[1] / 255, b = p[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (!d) return 0;
    let hh = mx === r ? (g - b) / d % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hh *= 60;
    return hh < 0 ? hh + 360 : hh;
  };
  const h0 = hue(c.pal[0]), gap = (a) => {
    const d = Math.abs(a - h0) % 360;
    return Math.min(d, 360 - d);
  };
  const idx = c.pal.map((p, i) => i).sort((a, b) => gap(hue(c.pal[a])) - gap(hue(c.pal[b])));
  let warm = 0, wb = -1e9;
  c.pal.forEach((p, i) => {
    const v = p[0] * 1.1 + p[1] * 0.45 - p[2] * 1.2;
    if (v > wb) {
      wb = v;
      warm = i;
    }
  });
  return { near: idx, warm };
}
function rfRidge(s, z, x) {
  const r = s.ridge[z], u = Math.max(0, Math.min(r.length - 1.001, x / s.w * (r.length - 1))), i = u | 0, f = u - i;
  return r[i] * (1 - f) + r[i + 1] * f;
}
function rfColony(k, w, h, c, s) {
  const R = rng6(7717 + k * 50021), D = Math.sqrt(w * h);
  const zr = hash(k * 11 + 2), z = zr < 0.3 ? 0 : zr < 0.64 ? 1 : 2;
  const sc = [0.42, 0.66, 1][z];
  const kr = R();
  const type = kr < 0.14 ? "table" : kr < 0.36 ? "dome" : "finger";
  const fan = type === "fan";
  const x0 = (0.02 + 0.96 * frac2(0.17 + k * 0.618034)) * w, y0 = rfRidge(s, z, x0) + h * 6e-3;
  const H = h * (fan ? 0.17 + 0.1 * R() : 0.09 + 0.1 * R()) * sc;
  const SL = Math.max(1.2, D * 45e-4 * sc);
  const N = 4e3;
  const xs = new Float32Array(N), ys = new Float32Array(N), par = new Int32Array(N), arr = new Float32Array(N), wd = new Float32Array(N), dep = new Float32Array(N), tip = new Uint8Array(N);
  let n = 1;
  xs[0] = x0;
  ys[0] = y0;
  wd[0] = 1;
  const grow = 200 + 140 * R(), v = H / grow * 1.15;
  const w0 = D * (fan ? 32e-4 : 0.016) * sc * (0.8 + 0.4 * R());
  const seg = (pi, a, len, wi, t0, d0, lvl) => {
    let x = xs[pi], y = ys[pi], cur = pi;
    const steps = Math.max(1, Math.round(len / SL));
    for (let st = 1; st <= steps && n < N - 1; st++) {
      a += (R() - 0.5) * (fan ? 0.12 : 0.16) - (fan ? 0.025 : 0.07) * angDiff(a, -Math.PI / 2);
      x += Math.cos(a) * SL;
      y += Math.sin(a) * SL;
      const i = n++;
      xs[i] = x;
      ys[i] = y;
      par[i] = cur;
      arr[i] = t0 + st * SL / v;
      wd[i] = wi * (1 - 0.12 * st / steps);
      dep[i] = d0 + st * SL;
      cur = i;
    }
    if (y < y0 - H || lvl >= (fan ? 8 : 4) || n >= N - 2) {
      tip[cur] = 1;
      return;
    }
    const t1 = arr[cur], d1 = dep[cur];
    const spr = fan ? 0.38 + R() * 0.3 : 0.28 + R() * 0.3;
    const nb = fan ? 2 : R() < 0.72 ? 2 : R() < 0.6 ? 1 : 3;
    for (let b = 0; b < nb; b++) {
      const aa = a + (nb === 1 ? (R() - 0.5) * 0.3 : nb === 2 ? (b ? 1 : -1) * spr : (b - 1) * spr * 1.1);
      seg(cur, aa, len * (fan ? 0.74 + R() * 0.3 : 0.85 + R() * 0.4), wi * (fan ? 0.84 : 0.9), t1 + R() * 5, d1, lvl + 1);
    }
  };
  if (type === "finger" || fan) {
    const trunks = fan ? 1 : 2 + (R() * 3 | 0);
    for (let q = 0; q < trunks; q++) seg(0, -Math.PI / 2 + (q - (trunks - 1) / 2) * 0.55 + (R() - 0.5) * 0.3, H * (fan ? 0.14 : 0.2), 1, q * 6, 0, 0);
  }
  const bleach = grow + 200 + 220 * R(), crumble = bleach + 70 + 40 * R();
  let maxDep = 1;
  for (let i = 0; i < n; i++) if (dep[i] > maxDep) maxDep = dep[i];
  const ord = sortByArr(arr, n);
  const inv = new Int32Array(n);
  ord.forEach((o, i) => {
    inv[o] = i;
  });
  const fam = s.fam, k3 = (k % 3 + 3) % 3, fi = z === 0 ? fam.near[k & 1] : z === 1 ? fam.near[k3] : hash(k * 41) < 0.14 ? fam.warm : fam.near[k3];
  const col = { k, z, sc, type, fan, x0, y0, H, n, D, w0, grow, bleach, crumble, end: crumble + 80, ti: fi, sway: fan ? 0.05 : 0.01, ph: R() * TAU6, lastRedraw: -1e9, drawn: 1 };
  for (const nm of ["x", "y", "arr", "wd", "dep"]) col[nm] = new Float32Array(n);
  col.par = new Int32Array(n);
  col.tip = new Uint8Array(n);
  col.die = new Float32Array(n);
  ord.forEach((o, i) => {
    col.x[i] = xs[o];
    col.y[i] = ys[o];
    col.par[i] = inv[par[o]];
    col.arr[i] = arr[o];
    col.wd[i] = wd[o];
    col.dep[i] = dep[o];
    col.tip[i] = tip[o];
    col.die[i] = crumble + 70 * (1 - dep[o] / maxDep) + 8 * R();
  });
  col.die[0] = 1e9;
  if (type === "dome") {
    col.mr = h * (0.035 + 0.035 * R()) * sc * 1.5;
    col.mw = 1.15 + 0.45 * R();
    col.mh = 0.6 + 0.25 * R();
  }
  if (type === "table") {
    col.tb = [{ dx: 0, hs: H * (0.35 + 0.25 * R()), r: h * (0.04 + 0.03 * R()) * sc, tilt: (R() - 0.5) * 0.08 }];
    if (R() < 0.5) col.tb.push({ dx: (R() < 0.5 ? -1 : 1) * col.tb[0].r * (0.8 + 0.4 * R()), hs: H * (0.18 + 0.15 * R()), r: col.tb[0].r * (0.5 + 0.25 * R()), tilt: (R() - 0.5) * 0.1 });
  }
  let bx0 = x0, bx1 = x0, by0 = y0;
  if (col.mr) {
    bx0 = x0 - col.mr * col.mw;
    bx1 = x0 + col.mr * col.mw;
    by0 = y0 - col.mr * col.mh;
  }
  if (col.tb) for (const p of col.tb) {
    bx0 = Math.min(bx0, x0 + p.dx - p.r * 1.05);
    bx1 = Math.max(bx1, x0 + p.dx + p.r * 1.05);
    by0 = Math.min(by0, y0 - p.hs - p.r * 0.4);
  }
  for (let i = 0; i < n; i++) {
    if (col.x[i] < bx0) bx0 = col.x[i];
    if (col.x[i] > bx1) bx1 = col.x[i];
    if (col.y[i] < by0) by0 = col.y[i];
  }
  const pad = w0 * 2 + 6 + H * col.sway;
  col.ox = Math.floor(bx0 - pad);
  col.oy = Math.floor(by0 - pad);
  col.cw = Math.ceil(bx1 - bx0 + pad * 2);
  col.ch = Math.ceil(y0 - by0 + pad * 2);
  col.cv = mk5(col.cw, col.ch);
  col.o = col.cv.getContext("2d");
  col.pol = [];
  if (z === 2 && type === "finger") {
    for (let i = 0; i < n; i++) if (col.tip[i] && col.pol.length < 40) col.pol.push(i);
  }
  return col;
}
var RF_WB = 10;
function rfLook(col, A2, c, s) {
  const bl = sstep4(col.bleach, col.bleach + 60, A2);
  const haze7 = RF_HAZE[col.z];
  const bgc = [c.br, c.bg2, c.bb];
  const water = rfWaterRGB(c, (col.y0 / s.h - 0.5) * 1.5);
  const bone = c.light ? mixv3(PAL(c, 0), bgc, 0.3) : [222, 218, 206];
  const tone9 = mixv3(PAL(c, col.ti), bone, bl * 0.8);
  const toneH = mixv3(tone9, water, haze7);
  const lit = mixv3(mixv3(bgc, toneH, 0.72 + 0.15 * bl), c.light ? toneH : [255, 255, 255], 0.06 + 0.08 * (1 - haze7));
  const mid = mixv3(mixv3(bgc, toneH, 0.45 + 0.15 * bl), water, haze7 * 0.3);
  const shade = mixv3(mixv3(bgc, toneH, 0.16), water, haze7 * 0.5);
  return { bl, haze: haze7, lit, mid, shade, fade: 1 - sstep4(col.crumble + 60, col.end, A2) };
}
function rfRedraw(col, A2, c, s) {
  const { x, y, par, arr, wd, die, n, o, ox, oy, w0 } = col;
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.clearRect(0, 0, col.cw, col.ch);
  o.lineCap = "round";
  o.lineJoin = "round";
  const L = rfLook(col, A2, c, s), cx = col.x0 - ox, cy = col.y0 - oy;
  const vgrad = (y1, y2) => {
    const g = o.createLinearGradient(0, y1, 0, y2);
    g.addColorStop(0, rgba3(L.shade, 1));
    g.addColorStop(0.55, rgba3(L.mid, 1));
    g.addColorStop(1, rgba3(L.lit, 1));
    return g;
  };
  o.globalAlpha = L.fade;
  const gro = sstep4(0, col.grow * 1.3, A2);
  if (col.mr) {
    const r = col.mr * Math.pow(gro, 0.6) * (1 - 0.25 * sstep4(col.crumble, col.end, A2));
    if (r > 1) {
      const rx = r * col.mw, ry = r * col.mh;
      const gr = o.createRadialGradient(cx - rx * 0.12, cy - ry * 1.05, ry * 0.1, cx, cy - ry * 0.3, Math.max(rx, ry) * 1.25);
      gr.addColorStop(0, rgba3(L.lit, 1));
      gr.addColorStop(0.45, rgba3(L.mid, 1));
      gr.addColorStop(1, rgba3(L.shade, 1));
      o.fillStyle = gr;
      o.beginPath();
      o.ellipse(cx, cy, rx, ry, 0, Math.PI, TAU6);
      o.closePath();
      o.fill();
      o.strokeStyle = rgba3(L.shade, 0.14);
      o.lineWidth = Math.max(0.6, r * 0.01);
      for (let q = 1; q < 6; q++) {
        o.beginPath();
        o.ellipse(cx, cy, rx * q / 6, ry * (q / 6) * 0.95, 0, Math.PI * 1.04, Math.PI * 1.96);
        o.stroke();
      }
    }
  } else if (col.tb) {
    for (const p of col.tb) {
      const r = p.r * Math.pow(gro, 0.7) * (1 - 0.3 * sstep4(col.crumble, col.end, A2)), hs = p.hs * Math.min(1, gro * 1.6);
      if (r < 1) continue;
      const px = cx + p.dx * gro, py = cy - hs, ry = r * 0.2;
      o.strokeStyle = rgba3(L.shade, 1);
      o.lineWidth = Math.max(1, r * 0.14);
      o.beginPath();
      o.moveTo(cx + p.dx * gro * 0.4, cy);
      o.quadraticCurveTo(px, cy - hs * 0.4, px, py);
      o.stroke();
      o.save();
      o.translate(px, py);
      o.rotate(p.tilt);
      o.fillStyle = rgba3(L.shade, 1);
      o.beginPath();
      o.ellipse(0, ry * 0.45, r, ry * 1.05, 0, 0, TAU6);
      o.fill();
      const tg = o.createLinearGradient(0, -ry, 0, ry);
      tg.addColorStop(0, rgba3(L.lit, 1));
      tg.addColorStop(1, rgba3(L.mid, 1));
      o.fillStyle = tg;
      o.beginPath();
      o.ellipse(0, 0, r, ry, 0, 0, TAU6);
      o.fill();
      o.strokeStyle = rgba3(L.lit, 0.6);
      o.lineWidth = Math.max(0.6, r * 0.02);
      o.beginPath();
      o.ellipse(0, 0, r * 0.98, ry * 0.95, 0, Math.PI * 1.05, Math.PI * 1.95);
      o.stroke();
      o.restore();
    }
  } else {
    const paths = [];
    for (let i = 0; i < RF_WB; i++) paths.push(new Path2D());
    let last = 1;
    for (let i = 1; i < n; i++) {
      if (arr[i] > A2) break;
      last = i + 1;
      if (A2 > die[i]) continue;
      const j = par[i], wb = Math.min(RF_WB - 1, Math.max(0, Math.round(wd[i] * RF_WB) - 1));
      paths[wb].moveTo(x[j] - ox, y[j] - oy);
      paths[wb].lineTo(x[i] - ox, y[i] - oy);
    }
    col.sty = { g: vgrad(cy, cy - col.H * 1.1), L };
    rfStroke(col, paths);
    col.drawn = last;
  }
  o.globalAlpha = 1;
  col.lastRedraw = A2;
  col.bl = L.bl;
}
function rfStroke(col, paths) {
  const o = col.o, w0 = col.w0, { g, L } = col.sty;
  o.lineCap = "round";
  o.lineJoin = "round";
  const lwOf = (wb) => Math.max(0.7, w0 * (wb + 1) / RF_WB);
  o.save();
  o.translate(Math.max(0.2, w0 * 0.03), Math.max(0.3, w0 * 0.06));
  for (let wb = RF_WB - 1; wb >= 0; wb--) {
    o.lineWidth = lwOf(wb) * 1.04;
    o.strokeStyle = rgba3(L.shade, 1);
    o.stroke(paths[wb]);
  }
  o.restore();
  o.save();
  o.translate(-Math.max(0.1, w0 * 0.03), -Math.max(0.2, w0 * 0.05));
  for (let wb = RF_WB - 1; wb >= 0; wb--) {
    o.lineWidth = lwOf(wb) * 0.86;
    o.strokeStyle = g;
    o.stroke(paths[wb]);
  }
  o.restore();
  o.save();
  o.translate(-Math.max(0.3, w0 * 0.12), -Math.max(0.4, w0 * 0.16));
  for (let wb = RF_WB - 1; wb >= 0; wb--) {
    const lw = lwOf(wb);
    if (lw < 2.4) continue;
    o.lineWidth = Math.max(0.6, lw * 0.2);
    o.strokeStyle = rgba3(L.lit, 0.35 + 0.3 * (1 - L.haze));
    o.stroke(paths[wb]);
  }
  o.restore();
}
function rfFresh(col, A2) {
  const { x, y, par, arr, wd, n, ox, oy } = col;
  if (!col.sty || col.drawn >= n || arr[col.drawn] > A2) return;
  const paths = [];
  for (let i2 = 0; i2 < RF_WB; i2++) paths.push(new Path2D());
  let i = col.drawn;
  for (; i < n && arr[i] <= A2; i++) {
    const j = par[i], wb = Math.min(RF_WB - 1, Math.max(0, Math.round(wd[i] * RF_WB) - 1));
    paths[wb].moveTo(x[j] - ox, y[j] - oy);
    paths[wb].lineTo(x[i] - ox, y[i] - oy);
  }
  rfStroke(col, paths);
  col.drawn = i;
}
function rfCaustic(c) {
  const CELL = 24, G2 = 10, TS = CELL * G2, R = rng6(99);
  const px = new Float32Array(G2 * G2), py = new Float32Array(G2 * G2);
  for (let j = 0; j < G2; j++) for (let i = 0; i < G2; i++) {
    px[j * G2 + i] = (i + 0.15 + R() * 0.7) * CELL;
    py[j * G2 + i] = (j + 0.15 + R() * 0.7) * CELL;
  }
  const cv = mk5(TS, TS), x = cv.getContext("2d"), id = x.createImageData(TS, TS), d = id.data;
  const col = TWr(c, 0, 0.55), p1 = R() * 9, p2 = R() * 9;
  for (let yy = 0; yy < TS; yy++) for (let xx = 0; xx < TS; xx++) {
    const wx = xx + 8 * Math.sin(TAU6 * yy / TS * 2 + p1) + 4 * Math.sin(TAU6 * (xx + yy) / TS * 3 + p2), wy = yy + 8 * Math.sin(TAU6 * xx / TS * 2 + p2) + 4 * Math.sin(TAU6 * (xx - yy) / TS * 3 + p1);
    const fx = (wx % TS + TS) % TS, fy = (wy % TS + TS) % TS, cx = fx / CELL | 0, cy = fy / CELL | 0;
    let f1 = 1e9, f2 = 1e9;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      let gi = cx + di, gj = cy + dj, ox = 0, oy = 0;
      if (gi < 0) {
        gi += G2;
        ox = -TS;
      } else if (gi >= G2) {
        gi -= G2;
        ox = TS;
      }
      if (gj < 0) {
        gj += G2;
        oy = -TS;
      } else if (gj >= G2) {
        gj -= G2;
        oy = TS;
      }
      const k = gj * G2 + gi, dx = px[k] + ox - fx, dy = py[k] + oy - fy, dd = dx * dx + dy * dy;
      if (dd < f1) {
        f2 = f1;
        f1 = dd;
      } else if (dd < f2) f2 = dd;
    }
    const e = Math.sqrt(f2) - Math.sqrt(f1);
    let v = Math.max(0, 1 - e / 3.6);
    v = v * v * (3 - 2 * v);
    v = v * 0.8 + 0.2 * Math.max(0, 1 - e / 10);
    const o = (yy * TS + xx) * 4;
    d[o] = col[0];
    d[o + 1] = col[1];
    d[o + 2] = col[2];
    d[o + 3] = v * 255 | 0;
  }
  x.putImageData(id, 0, 0);
  return cv;
}
function rfBake(w, h, c, s) {
  const D = Math.sqrt(w * h), R = rng6(2024 + s.v.sd);
  s.w = w;
  s.h = h;
  s.fam = rfFamily(c);
  s.ridge = [];
  for (let z = 0; z < 3; z++) {
    const NS = 160, r2 = new Float32Array(NS + 1), p = [R() * 9, R() * 9, R() * 9, R() * 9];
    for (let i = 0; i <= NS; i++) {
      const u = i / NS;
      r2[i] = h * (RF_BASE[z] - (0.035 + 0.02 * z) * (Math.sin(u * (2.2 + z) + p[0]) * 0.6 + Math.sin(u * (5.3 + z * 1.7) + p[1]) * 0.3 + Math.max(0, Math.sin(u * 9.7 + p[2])) ** 3 * 0.7 + Math.sin(u * 23 + p[3]) * 0.05));
    }
    s.ridge.push(r2);
  }
  const cv = mk5(w, h), x = cv.getContext("2d");
  const gr = x.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, rgba3(TBr(c, 0, 0.5), 1));
  gr.addColorStop(0.18, rgba3(TBr(c, 0, 0.7), 1));
  gr.addColorStop(0.55, rgba3(TBr(c, 0, 0.84), 1));
  gr.addColorStop(1, rgba3(TBr(c, 0, 0.95), 1));
  x.fillStyle = gr;
  x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = "lighter";
  x.globalAlpha = 0.28;
  x.drawImage(washSp(c, 0, 0.3), w * 0.15, -h * 0.5, w * 0.8, h * 0.85);
  x.globalAlpha = 1;
  x.globalCompositeOperation = "source-over";
  addGrain(x, w, h, 0.05);
  s.bg = cv;
  s.band = [];
  for (let z = 0; z < 3; z++) {
    let top = h;
    for (let i = 0; i < s.ridge[z].length; i++) top = Math.min(top, s.ridge[z][i]);
    top = Math.floor(top - 2);
    const bs = [4, 2, 1][z];
    const bc = mk5(w / bs, (h - top) / bs), y = bc.getContext("2d");
    y.scale(1 / bs, 1 / bs);
    const water = rfWaterRGB(c, (RF_BASE[z] - 0.5) * 1.5), bgc = [c.br, c.bg2, c.bb];
    const rock = mixv3(mixv3(bgc, PAL(c, s.fam.near[1]), 0.16), water, Math.min(0.92, RF_HAZE[z] + 0.12));
    const rockLit = mixv3(rock, mixv3(water, c.light ? water : [255, 255, 255], 0.2), 0.45 - 0.15 * z);
    s.litSp = radial2([[0, rgba3(rockLit, 1)], [0.5, rgba3(rockLit, 0.4)], [1, rgba3(rockLit, 0)]], 64);
    s.shSp = radial2([[0, rgba3(mixv3(rock, bgc, 0.5), 1)], [0.5, rgba3(mixv3(rock, bgc, 0.5), 0.4)], [1, rgba3(mixv3(rock, bgc, 0.5), 0)]], 64);
    const rg = y.createLinearGradient(0, 0, 0, h - top);
    rg.addColorStop(0, rgba3(rockLit, 1));
    rg.addColorStop(0.06, rgba3(rock, 1));
    rg.addColorStop(1, rgba3(mixv3(rock, bgc, 0.35 + 0.2 * z), 1));
    y.fillStyle = rg;
    y.beginPath();
    y.moveTo(0, h - top);
    for (let i = 0; i < s.ridge[z].length; i++) y.lineTo(i / (s.ridge[z].length - 1) * w, s.ridge[z][i] - top);
    y.lineTo(w, h - top);
    y.closePath();
    y.fill();
    y.strokeStyle = rgba3(rockLit, 0.5);
    y.lineWidth = Math.max(1, D * 12e-4 * (1 + z));
    y.beginPath();
    for (let i = 0; i < s.ridge[z].length; i++) {
      const px = i / (s.ridge[z].length - 1) * w, py = s.ridge[z][i] - top + 1;
      i ? y.lineTo(px, py) : y.moveTo(px, py);
    }
    y.stroke();
    y.globalCompositeOperation = "source-atop";
    for (let i = 0; i < 40; i++) {
      const px = R() * w, py = rfRidge(s, z, px) - top + R() * (h - top) * 0.6, r2 = D * (0.03 + 0.08 * R()) / (1 + (2 - z) * 0.4);
      y.globalAlpha = 0.12 + 0.14 * R();
      y.drawImage(R() < 0.5 ? s.litSp : s.shSp, px - r2 * 1.8, py - r2 * 0.6, r2 * 3.6, r2 * 1.2);
    }
    y.globalAlpha = 1;
    y.globalCompositeOperation = "source-over";
    if (z === 2) {
      for (let i = 0; i < 120; i++) {
        const px = R() * w, py0 = rfRidge(s, 2, px) - top, py = py0 + R() * (h - top - py0) * 0.9, r2 = D * (2e-3 + 6e-3 * R()) * (0.5 + py / (h - top));
        y.globalAlpha = 0.25 + 0.25 * R();
        y.drawImage(R() < 0.6 ? s.shSp : s.litSp, px - r2 * 2, py - r2 * 0.7, r2 * 4, r2 * 1.4);
      }
    }
    s.band.push({ cv: bc, top });
  }
  s.caus = rfCaustic(c);
  s.cs = 3;
  s.cw2 = Math.ceil(w / s.cs);
  s.ch2 = Math.ceil(h / s.cs);
  s.cb = mk5(s.cw2, s.ch2);
  s.cbo = s.cb.getContext("2d");
  s.mask = mk5(s.cw2, s.ch2);
  s.mo = s.mask.getContext("2d");
  s.maskAt = -1e9;
  const ray = mk5(64, 256), r = ray.getContext("2d");
  const hg = r.createLinearGradient(0, 0, 64, 0), lt = TWr(c, 0, 0.35);
  hg.addColorStop(0, rgba3(lt, 0));
  hg.addColorStop(0.5, rgba3(lt, 1));
  hg.addColorStop(1, rgba3(lt, 0));
  r.fillStyle = hg;
  r.fillRect(0, 0, 64, 256);
  r.globalCompositeOperation = "destination-in";
  const vg = r.createLinearGradient(0, 0, 0, 256);
  vg.addColorStop(0, "rgba(0,0,0,1)");
  vg.addColorStop(0.6, "rgba(0,0,0,.4)");
  vg.addColorStop(1, "rgba(0,0,0,0)");
  r.fillStyle = vg;
  r.fillRect(0, 0, 64, 256);
  s.ray = ray;
  s.rays = [];
  for (let i = 0; i < 6; i++) s.rays.push({ x: R(), wd: 0.03 + R() * 0.08, a: 0.06 + R() * 0.07, p1: 37 + R() * 40, p2: 89 + R() * 70, ph: R() * TAU6 });
  s.snow = [];
  const ns = Math.min(110, Math.round(w * h / 32e3));
  for (let i = 0; i < ns; i++) s.snow.push({ x: R(), y: R(), z: R(), ph: R() * TAU6, sp: 4e-3 + R() * 6e-3 });
}
function rfSchool(k) {
  const R = rng6(31337 + k * 7907);
  const dir = R() < 0.5 ? 1 : -1, n = 5 + (R() * 10 | 0), z = 0.45 + R() * 0.7;
  const f = [];
  for (let i = 0; i < n; i++) f.push({ dx: (R() - 0.5) * 2, dy: (R() - 0.5) * 0.8, ph: R() * TAU6, s: 0.8 + R() * 0.4 });
  return { dir, n, z, f, y: 0.16 + R() * 0.4, sp: 0.018 + R() * 0.014, dur: 0, wob: R() * TAU6, spread: 0.035 + R() * 0.03 };
}
var reef = {
  name: "Reef",
  flav: "Growth",
  reset: () => ({ key: "", cols: /* @__PURE__ */ new Map(), schools: /* @__PURE__ */ new Map(), v: { o: Math.random() * 5e4, sd: Math.random() * 1e6 | 0 } }),
  frame: (g, w, h, t, c, s) => {
    const T = t / 1e3 + s.v.o, key = sceneKey(w, h, c);
    if (s.key !== key) {
      s.key = key;
      rfBake(w, h, c, s);
      s.cols.clear();
      s.schools.clear();
    }
    const D = Math.sqrt(w * h);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.drawImage(s.bg, 0, 0);
    const kmin = Math.floor(T / RF_SPAN) - 34, kmax = Math.floor(T / RF_SPAN) + 1;
    const live = [];
    for (let k = kmin; k <= kmax; k++) {
      const B = (k + (hash(k * 3 + 1) - 0.5) * 0.7) * RF_SPAN;
      if (T < B) continue;
      let col = s.cols.get(k);
      const A2 = T - B;
      if (A2 > 990) {
        if (col) s.cols.delete(k);
        continue;
      }
      if (col === 0) continue;
      if (!col) {
        col = rfColony(k, w, h, c, s);
        s.cols.set(k, col);
      }
      if (A2 > col.end) {
        s.cols.set(k, 0);
        continue;
      }
      col.A = A2;
      live.push(col);
    }
    for (const k of s.cols.keys()) if (k < kmin) s.cols.delete(k);
    live.sort((p, q) => p.z - q.z || p.y0 - q.y0);
    const surge = Math.sin(T / 7.3 * TAU6) * 0.7 + Math.sin(T / 11.9 * TAU6 + 1) * 0.3;
    const drawCol = (col, gg, sx) => {
      const sh = col.sway * (surge + 0.3 * Math.sin(T / 3.1 + col.ph)) * (col.fan ? 1 : 0.4);
      gg.setTransform(sx, 0, sh * sx, sx, (col.ox + sh * (col.oy - col.y0)) * sx, col.oy * sx);
      gg.drawImage(col.cv, 0, 0);
      gg.setTransform(1, 0, 0, 1, 0, 0);
      return sh;
    };
    let li = 0;
    for (let z = 0; z < 3; z++) {
      const b = s.band[z];
      g.drawImage(b.cv, 0, b.top, w, h - b.top);
      for (; li < live.length && live[li].z === z; li++) {
        const col = live[li], A2 = col.A;
        const busy = A2 > col.bleach - 4 || (col.mr || col.tb) && A2 < col.grow * 1.4;
        if (col.lastRedraw < -1e8 || busy && A2 - col.lastRedraw > 3 + (col.k & 3) * 0.4) rfRedraw(col, A2, c, s);
        else rfFresh(col, A2);
        const sh = drawCol(col, g, 1);
        if (col.pol.length && A2 < col.bleach + 20) {
          g.globalCompositeOperation = "lighter";
          const sp = glowSp2(c, col.ti, 0.35), alive = 1 - sstep4(col.bleach - 20, col.bleach + 20, A2);
          for (const i of col.pol) {
            if (col.arr[i] > A2 || A2 > col.die[i]) continue;
            const open = sstep4(-0.2, 0.8, Math.sin(T / 47 * TAU6 - col.x[i] / w * 4.2 + col.ph * 0.3) + 0.35 * Math.sin(T / 13 + i));
            const r = D * 5e-3 * (0.35 + 0.65 * open);
            g.globalAlpha = (0.08 + 0.26 * open) * alive * sstep4(0, 15, A2 - col.arr[i]);
            g.drawImage(sp, col.x[i] + sh * (col.y[i] - col.y0) - r, col.y[i] - r, r * 2, r * 2);
          }
          g.globalCompositeOperation = "source-over";
          g.globalAlpha = 1;
        }
      }
      if (z === 1) {
        const sk0 = Math.floor(T / 47) - 3;
        for (let k = sk0; k <= sk0 + 4; k++) {
          let sc = s.schools.get(k);
          if (!sc) {
            sc = rfSchool(k);
            s.schools.set(k, sc);
          }
          const t0 = k * 47 + hash(k * 9) * 20, u = (T - t0) * sc.sp;
          if (u < 0 || u > 1.5) continue;
          const cxs = sc.dir > 0 ? (u - 0.25) * w : (1.25 - u) * w, cys = (sc.y + 0.03 * Math.sin(T / 9 + sc.wob)) * h;
          const fl = D * 9e-3 * sc.z, wat = rfWaterRGB(c, sc.y), bgc = [c.br, c.bg2, c.bb];
          const body = mixv3(mixv3(bgc, wat, 0.55), wat, 0.5 * (1.15 - sc.z));
          const glint = mixv3(wat, c.light ? wat : [255, 255, 255], 0.4);
          for (const f of sc.f) {
            const fx = cxs + f.dx * w * sc.spread + Math.sin(T * 0.7 + f.ph) * fl * 1.5, fy = cys + f.dy * w * sc.spread * 0.6 + Math.sin(T * 0.9 + f.ph * 2) * fl;
            const L = fl * f.s, wig = Math.sin(T * 6 + f.ph) * 0.25;
            g.save();
            g.translate(fx, fy);
            g.scale(sc.dir, 1);
            g.fillStyle = rgba3(body, 1);
            g.beginPath();
            g.ellipse(0, 0, L, L * 0.32, 0, 0, TAU6);
            g.fill();
            g.beginPath();
            g.moveTo(-L * 0.85, 0);
            g.lineTo(-L * 1.45, -L * (0.35 + wig));
            g.lineTo(-L * 1.45, L * (0.35 - wig));
            g.closePath();
            g.fill();
            const gl = Math.max(0, Math.sin(T * 0.5 + f.ph * 3)) ** 4;
            g.strokeStyle = rgba3(glint, 0.25 + 0.5 * gl);
            g.lineWidth = Math.max(0.6, L * 0.1);
            g.beginPath();
            g.ellipse(0, 0, L * 0.85, L * 0.22, 0, Math.PI * 1.15, Math.PI * 1.85);
            g.stroke();
            g.restore();
          }
        }
        for (const k of s.schools.keys()) if (k < sk0) s.schools.delete(k);
      }
    }
    const cs = s.cs, top2 = s.band[2].top, ct = Math.floor(top2 / cs) - Math.ceil(h * 0.25 / cs);
    if (T - s.maskAt > 2 || T < s.maskAt) {
      s.maskAt = T;
      const mo = s.mo;
      mo.setTransform(1, 0, 0, 1, 0, 0);
      mo.clearRect(0, 0, s.cw2, s.ch2);
      mo.drawImage(s.band[2].cv, 0, top2 / cs, s.cw2, (h - top2) / cs);
      for (const col of live) if (col.z === 2) mo.drawImage(col.cv, col.ox / cs, col.oy / cs, col.cw / cs, col.ch / cs);
      mo.globalCompositeOperation = "destination-out";
      const fg = mo.createLinearGradient(0, top2 / cs, 0, s.ch2);
      fg.addColorStop(0, "rgba(0,0,0,0)");
      fg.addColorStop(0.6, "rgba(0,0,0,.8)");
      fg.addColorStop(1, "rgba(0,0,0,1)");
      mo.fillStyle = fg;
      mo.fillRect(0, 0, s.cw2, s.ch2);
      mo.globalCompositeOperation = "source-over";
    }
    const cbo = s.cbo, y0c = Math.max(0, ct);
    cbo.setTransform(1, 0, 0, 1, 0, 0);
    cbo.globalCompositeOperation = "source-over";
    cbo.clearRect(0, y0c, s.cw2, s.ch2 - y0c);
    const pat = cbo.createPattern(s.caus, "repeat"), TS = s.caus.width;
    const sz = D / cs * 0.42 / TS;
    for (let q = 0; q < 2; q++) {
      const m = new DOMMatrix();
      m.translateSelf(q ? -T * 3.1 : T * 2.3, q ? T * 1.3 : T * 1.7);
      m.scaleSelf(sz * (q ? 1.37 : 1), sz * (q ? 1.37 : 1) * 0.55);
      m.rotateSelf(q ? 23 : -11);
      pat.setTransform(m);
      cbo.globalAlpha = q ? 0.6 : 0.8;
      cbo.globalCompositeOperation = q ? "lighter" : "source-over";
      cbo.fillStyle = pat;
      cbo.fillRect(0, y0c, s.cw2, s.ch2 - y0c);
    }
    cbo.globalAlpha = 1;
    cbo.globalCompositeOperation = "destination-in";
    cbo.drawImage(s.mask, 0, 0);
    cbo.globalCompositeOperation = "source-over";
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = 0.15;
    g.drawImage(s.cb, 0, y0c, s.cw2, s.ch2 - y0c, 0, y0c * cs, w, (s.ch2 - y0c) * cs);
    for (const r of s.rays) {
      const k = 0.55 + 0.45 * Math.sin(T / r.p1 * TAU6 + r.ph) * Math.sin(T / r.p2 * TAU6 + r.ph * 2);
      const rw = r.wd * w * (0.7 + 0.3 * Math.sin(T / r.p2 * TAU6)), rx = (r.x + 0.04 * Math.sin(T / r.p2 * TAU6 + r.ph)) * w;
      g.globalAlpha = r.a * k;
      g.setTransform(1, 0, -0.28, 1, rx, 0);
      g.drawImage(s.ray, -rw / 2, 0, rw, h * 0.95);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    const ms = glowSp2(c, 0, 0.5);
    for (const p of s.snow) {
      const y = frac2(p.y + T * p.sp * (0.4 + p.z)) * h * 1.05 - h * 0.02, x = (p.x + 0.01 * Math.sin(T / 9 + p.ph) + 4e-3 * surge * p.z) * w;
      const r = Math.max(1, D * (12e-4 + 3e-3 * p.z * p.z));
      g.globalAlpha = (0.1 + 0.22 * (1 - p.z)) * (1 - y / h * 0.6);
      g.drawImage(ms, x - r, y - r, r * 2, r * 2);
    }
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
  }
};
var MD_YEAR = 1530;
var MD_DAY = 347;
function mdSeason(T) {
  return frac2(T / MD_YEAR + 0.18 + 0.03 * Math.sin(T / 3517 * TAU6));
}
function mdGlow(T) {
  const u = 0.5 + 0.5 * Math.cos(T / MD_DAY * TAU6 + 0.4);
  return 0.08 + 0.92 * sstep4(0.15, 0.85, u);
}
function mdWind(s, x, p, T, w) {
  let v = 0.1 * Math.sin(T * 0.9 + x / w * 5 + p * 3) + 0.04 * Math.sin(T * 2.3 + x / w * 13);
  for (const gu of s.gusts) {
    const span2 = w * 2.6, cx = (T * gu.v * w + gu.o * span2) % span2 - w * 0.8 + (1 - p) * w * gu.sk;
    const d = (x - cx) / (w * gu.wd);
    v += gu.a * (0.6 + 0.4 * Math.sin(T / gu.p + gu.o * 9)) * Math.exp(-d * d) * (d < 0 ? 1 : 0.6);
  }
  return v;
}
function mdBake(w, h, c, s) {
  const D = Math.sqrt(w * h), R = rng6(1789 + s.v.sd);
  const HY = h * 0.6;
  s.HY = HY;
  const bgc = [c.br, c.bg2, c.bb];
  const warm = (() => {
    let b = PAL(c, 1), wb = -1e9;
    for (const p of c.pal) {
      const v = p[0] * 1.1 + p[1] * 0.5 - p[2] * 1.2;
      if (v > wb) {
        wb = v;
        b = p;
      }
    }
    return b;
  })();
  s.warm = warm;
  const sky = mk5(w, Math.ceil(HY) + 2), x = sky.getContext("2d");
  const sk = x.createLinearGradient(0, 0, 0, HY);
  sk.addColorStop(0, rgba3(TBr(c, 0, 0.975), 1));
  sk.addColorStop(0.6, rgba3(TBr(c, 0, 0.93), 1));
  sk.addColorStop(1, rgba3(TBr(c, 0, 0.84), 1));
  x.fillStyle = sk;
  x.fillRect(0, 0, w, HY + 2);
  addGrain(x, w, HY + 2, 0.05);
  s.sky = sky;
  const gl = mk5(w, Math.ceil(HY) + 2), y = gl.getContext("2d");
  const gg = y.createLinearGradient(0, 0, 0, HY);
  const glowc = mixv3(PAL(c, 0), warm, 0.45);
  gg.addColorStop(0, rgba3(TBr(c, 0, 0.9), 0));
  gg.addColorStop(0.45, rgba3(mixv3(bgc, glowc, 0.22), 0.7));
  gg.addColorStop(1, rgba3(mixv3(bgc, glowc, 0.7), 1));
  y.fillStyle = gg;
  y.fillRect(0, 0, w, HY + 2);
  y.globalCompositeOperation = "lighter";
  s.sunX = w * (0.55 + 0.2 * R());
  y.globalAlpha = 0.7;
  y.drawImage(washSp(c, 0, 0.4), s.sunX - w * 0.45, HY - h * 0.32, w * 0.9, h * 0.6);
  y.globalAlpha = 0.3;
  y.drawImage(glowSp2(c, 0, 0.6), s.sunX - w * 0.12, HY - h * 0.09, w * 0.24, h * 0.18);
  s.glowL = gl;
  const st = mk5(w, Math.ceil(HY)), z = st.getContext("2d");
  for (let i = 0; i < Math.min(500, w * h / 5e3); i++) {
    const sy = Math.pow(R(), 1.6) * HY * 0.85, r = Math.max(0.5, D * (3e-4 + 8e-4 * Math.pow(R(), 3)));
    z.globalAlpha = (0.25 + 0.75 * R()) * (1 - sy / HY);
    z.fillStyle = rgba3(R() < 0.2 ? TWr(c, R() * 4 | 0, 0.6) : TWr(c, 0, 0.9), 1);
    z.beginPath();
    z.arc(R() * w, sy, r, 0, TAU6);
    z.fill();
  }
  s.stars = st;
  const MS = 128, mc = mk5(MS, MS), m = mc.getContext("2d");
  m.fillStyle = rgba3(TWr(c, 0, 0.88), 1);
  m.beginPath();
  m.arc(MS / 2, MS / 2, MS * 0.2, 0, TAU6);
  m.fill();
  m.globalCompositeOperation = "destination-out";
  m.globalAlpha = 1;
  m.beginPath();
  m.arc(MS / 2 - MS * 0.12, MS / 2 - MS * 0.03, MS * 0.19, 0, TAU6);
  m.fill();
  m.globalCompositeOperation = "destination-over";
  m.globalAlpha = 0.35;
  m.drawImage(glowSp2(c, 0, 0.5), 0, 0, MS, MS);
  s.moon = mc;
  s.clouds = [];
  for (let L = 0; L < 2; L++) {
    const CW = Math.ceil(w * 1.6), CH = Math.ceil(HY * 0.7);
    const dark = mk5(CW, CH), lit = mk5(CW, CH), dx = dark.getContext("2d"), lx = lit.getContext("2d");
    const cy0 = CH * (L ? 0.78 : 0.5), dk = mixv3(bgc, TBr(c, 0, 0.9), 0.5);
    const puffD = radial2([[0, rgba3(dk, 1)], [0.55, rgba3(dk, 0.75)], [1, rgba3(dk, 0)]], 64);
    const lc = mixv3(glowc, c.light ? glowc : [255, 255, 255], 0.4);
    const puffL = radial2([[0, rgba3(lc, 1)], [0.5, rgba3(lc, 0.55)], [1, rgba3(lc, 0)]], 64);
    for (let b = 0; b < 7; b++) {
      const bx = R() * CW, bw = CW * (0.12 + 0.2 * R()), by = cy0 + (R() - 0.5) * CH * 0.35;
      for (let q = 0; q < 26; q++) {
        const px = bx + (R() - 0.5) * bw, py = by + (R() - 0.5) * CH * 0.07, rw = bw * (0.12 + 0.2 * R()), rh = rw * (0.18 + 0.1 * R());
        for (const ox of [-CW, 0, CW]) {
          dx.globalAlpha = 0.4;
          dx.drawImage(puffD, px + ox - rw, py - rh, rw * 2, rh * 2);
          lx.globalAlpha = 0.55;
          lx.drawImage(puffL, px + ox - rw * 0.85, py + rh * 0.15, rw * 1.7, rh * 1.05);
        }
      }
    }
    lx.globalCompositeOperation = "destination-in";
    lx.drawImage(dark, 0, 0);
    s.clouds.push({ dark, lit, CW, top: HY * (L ? 0.3 : 0.02), v: (L ? 1.4 : 0.7) * Math.max(0.2, w / 1440) });
  }
  const fd = mk5(w, h - Math.floor(HY)), f = fd.getContext("2d"), FH = h - Math.floor(HY);
  const fg = f.createLinearGradient(0, 0, 0, FH);
  fg.addColorStop(0, rgba3(TBr(c, 0, 0.84), 1));
  fg.addColorStop(0.25, rgba3(TBr(c, 0, 0.92), 1));
  fg.addColorStop(1, rgba3(TBr(c, 0, 0.98), 1));
  f.fillStyle = fg;
  f.fillRect(0, 0, w, FH);
  f.fillStyle = rgba3(TBr(c, 0, 0.86), 1);
  const NV = 140, nv = Array.from({ length: NV + 1 }, () => R());
  const vn = (u) => {
    const q = u * NV, i = Math.min(NV - 1, q | 0), r2 = q - i, s2 = r2 * r2 * (3 - 2 * r2);
    return nv[i] * (1 - s2) + nv[i + 1] * s2;
  };
  s.hedge = mk5(w, Math.ceil(h * 0.05));
  const hx = s.hedge.getContext("2d"), HH = s.hedge.height;
  hx.fillStyle = rgba3(TBr(c, 0, 0.82), 1);
  hx.beginPath();
  hx.moveTo(0, HH);
  for (let px = 0; px <= w; px += 2) {
    const u = px / w;
    hx.lineTo(px, HH - h * (4e-3 + 0.012 * vn(u) * (0.3 + 0.7 * Math.max(0, Math.sin(u * 4.7 + 1))) + 6e-3 * vn(frac2(u * 0.37 + 0.5))));
  }
  hx.lineTo(w, HH);
  hx.closePath();
  hx.fill();
  f.lineCap = "round";
  for (let i = 0; i < Math.min(9e3, w * h / 300); i++) {
    const p = Math.pow(R(), 1.5) * 0.35, yy = FH * p, L = h * (6e-3 + 0.02 * p) * (0.6 + R() * 0.8);
    f.strokeStyle = rgba3(TBr(c, 0, 0.72 + 0.2 * p / 0.35), 0.5);
    f.lineWidth = Math.max(0.5, D * 5e-4 * (1 + p * 3));
    const xx = R() * w;
    f.beginPath();
    f.moveTo(xx, yy);
    f.lineTo(xx + (R() - 0.5) * L * 0.5, yy - L);
    f.stroke();
  }
  addGrain(f, w, FH, 0.05);
  s.field = fd;
  s.FY = Math.floor(HY);
  s.kinds = [];
  for (let q = 0; q < 4; q++) s.kinds.push({ form: q, ti: q === 0 ? s.warmI ?? 1 : q + 1, at: (q * 0.22 + R() * 0.08) % 1, len: 0.24 + R() * 0.12, clock: q === 3, size: 0.8 + R() * 0.5, tall: 1.05 + R() * 0.5, drifts: Array.from({ length: 5 }, () => ({ x: R(), p: 0.1 + 0.9 * R(), r: 0.06 + 0.12 * R() })) });
  for (const kd of s.kinds) {
    if (kd.clock) continue;
    const lay = mk5(w, FH), lx2 = lay.getContext("2d"), sp = glowSp2(c, kd.ti, 0.1);
    for (const dr of kd.drifts) for (let i = 0; i < 140; i++) {
      const an = R() * TAU6, rr = Math.sqrt(-Math.log(1 - R() * 0.95)) * 0.55;
      const p = Math.max(0.02, Math.min(0.42, dr.p * 0.42 + Math.sin(an) * rr * 0.06)), yy = FH * Math.max(5e-3, p * p * 1.6 + 0.01);
      const xx = (dr.x + Math.cos(an) * rr * dr.r) * w, r = Math.max(1, D * 4e-3 * (0.3 + p * 3));
      lx2.globalAlpha = 0.12 + 0.2 * R();
      lx2.drawImage(sp, xx - r * 2, yy - r, r * 4, r * 2);
    }
    kd.far = lay;
  }
  s.rows = [];
  const NR = 13;
  for (let r = 0; r < NR; r++) {
    const p = 0.3 + 0.7 * Math.pow(r / (NR - 1), 1.25);
    const yy = HY + (h - HY) * p + h * 0.02 * p, scl = 0.25 + 1.1 * p;
    const nb = Math.round(Math.min(130, w / (D * 8e-3 * scl) * 0.5));
    const bl = [];
    for (let i = 0; i < nb; i++) bl.push({ x: (i + R()) / nb * w * 1.04 - w * 0.02, y: yy + (R() - 0.5) * h * 0.02 * scl, L: h * (0.05 + 0.07 * R()) * scl, wd: D * (16e-4 + 12e-4 * R()) * scl, fx: 0.6 + 0.6 * R(), ph: R() * TAU6, k: R() });
    s.rows.push({ y: yy, scl, p, bl, fl: [] });
  }
  const nf = Math.max(24, Math.min(420, Math.round(w * h / 8e3)));
  for (let i = 0; i < nf; i++) {
    const kd = s.kinds[R() * 4 | 0], dr = kd.drifts[R() * kd.drifts.length | 0];
    const r = Math.max(2, Math.min(NR - 1, Math.round(dr.p * (NR - 1) + (R() - 0.5) * 4))), row = s.rows[r];
    row.fl.push({ x: (dr.x + (R() - 0.5) * dr.r * 2 * (1.4 - row.p)) * w, y: row.y + (R() - 0.5) * h * 0.015 * row.scl, kd, L: h * 0.1 * row.scl * kd.tall * (0.8 + R() * 0.4), off: (R() - 0.5) * 0.08, ph: R() * TAU6 });
  }
  s.fore = [];
  const nfg = Math.max(8, Math.min(46, Math.round(w / D * 26)));
  for (let i = 0; i < nfg; i++) {
    const kind = R() < 0.45 ? 0 : R() < 0.6 ? 1 : 2;
    s.fore.push({ x: (i + R()) / nfg * w, L: h * (0.32 + 0.3 * R()), kind, wd: D * (18e-4 + 12e-4 * R()), fx: 0.5 + 0.4 * R(), ph: R() * TAU6, lean: (R() - 0.5) * 0.25 });
  }
  s.gusts = [];
  for (let i = 0; i < 3; i++) s.gusts.push({ v: 0.03 + R() * 0.02, o: i / 3 + R() * 0.2, wd: 0.14 + R() * 0.12, a: 0.45 + R() * 0.3, p: 30 + R() * 50, sk: 0.1 + R() * 0.25 });
  s.seeds = [];
  s.flies = [];
  for (let i = 0; i < 16; i++) s.flies.push({ x: R(), y: 0.1 + R() * 0.3, ph: R() * TAU6, p1: 17 + R() * 20, p2: 23 + R() * 30, bl: 3 + R() * 5 });
}
var meadow = {
  name: "Meadow",
  flav: "Growth",
  reset: () => ({ key: "", v: { o: Math.random() * 5e4, sd: Math.random() * 1e6 | 0 } }),
  frame: (g, w, h, t, c, s) => {
    const T = t / 1e3 + s.v.o, key = sceneKey(w, h, c);
    if (s.key !== key) {
      s.key = key;
      mdBake(w, h, c, s);
    }
    const D = Math.sqrt(w * h), HY = s.HY, Y = mdSeason(T), GL = mdGlow(T), NI = 1 - GL;
    const dt = s.lt == null || T < s.lt ? 0 : Math.min(0.1, T - s.lt);
    s.lt = T;
    const bgc = [c.br, c.bg2, c.bb];
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.drawImage(s.sky, 0, 0);
    g.globalAlpha = GL;
    g.drawImage(s.glowL, 0, 0);
    g.globalAlpha = 1;
    if (NI > 0.05) {
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = sstep4(0.25, 0.8, NI) * (c.light ? 0.6 : 1);
      g.drawImage(s.stars, 0, 0);
      const mu = frac2(T / MD_DAY + 0.4 / TAU6);
      const ma = sstep4(0.22, 0.34, mu) * (1 - sstep4(0.66, 0.78, mu)) * sstep4(0.3, 0.6, NI);
      if (ma > 0.01) {
        const mx = (0.08 + 0.84 * (mu - 0.18) / 0.64) * w, my = HY * (0.75 - 0.6 * Math.sin(Math.PI * (mu - 0.18) / 0.64)), mr = D * 0.065;
        g.globalAlpha = ma;
        g.drawImage(s.moon, mx - mr, my - mr, mr * 2, mr * 2);
      }
      g.globalCompositeOperation = "source-over";
    }
    for (const cl of s.clouds) {
      const off = T * cl.v % cl.CW;
      for (const ox of [-off, cl.CW - off]) {
        if (ox > w || ox + cl.CW < 0) continue;
        g.globalAlpha = 0.6;
        g.drawImage(cl.dark, ox, cl.top);
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = 0.12 + 0.88 * GL;
        g.drawImage(cl.lit, ox, cl.top);
        g.globalCompositeOperation = "source-over";
      }
    }
    g.globalAlpha = 1;
    g.drawImage(s.hedge, 0, HY - s.hedge.height + 1);
    g.drawImage(s.field, 0, s.FY);
    const dry = sstep4(0.35, 0.85, Y), lush = 0.75 + 0.25 * sstep4(0, 0.3, Y) * (1 - 0.3 * sstep4(0.8, 1, Y));
    const gt = mixv3(PAL(c, 0), s.warm, dry * 0.65);
    const light = 0.45 + 0.55 * GL;
    const bloomOf = (kd, off = 0) => {
      const u = frac2(Y - kd.at + 1 + off) / kd.len;
      return u > 1.15 ? 0 : sstep4(0.2, 0.4, u) * (1 - sstep4(0.75, 0.95, u));
    };
    for (const kd of s.kinds) {
      if (!kd.far) continue;
      const b = bloomOf(kd);
      if (b < 0.02) continue;
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = b * (0.5 + 0.5 * light);
      g.drawImage(kd.far, 0, s.FY);
    }
    g.globalCompositeOperation = "lighter";
    const sheen = washSp(c, 0, 0.4);
    for (const gu of s.gusts) {
      const span2 = w * 2.6, cx = (T * gu.v * w + gu.o * span2) % span2 - w * 0.8;
      const a = gu.a * (0.6 + 0.4 * Math.sin(T / gu.p + gu.o * 9)) * light;
      for (let q = 0; q < 4; q++) {
        const p = 0.02 + q * 0.1, yy = HY + (h - HY) * p * p * 2.2, xx = cx + (1 - p) * w * gu.sk;
        g.globalAlpha = 0.34 * a;
        g.drawImage(sheen, xx - w * gu.wd * 1.4, yy - (h - HY) * 0.03, w * gu.wd * 2.8, (h - HY) * (0.06 + 0.12 * q));
      }
    }
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    const wc = [];
    for (let r = 0; r < s.rows.length; r++) {
      const row = s.rows[r], a = new Float32Array(65);
      for (let i = 0; i <= 64; i++) a[i] = mdWind(s, i / 64 * w, row.p, T, w);
      wc.push(a);
    }
    const windAt = (a, x) => {
      const u = Math.max(0, Math.min(63.999, x / w * 64)), i = u | 0, f = u - i;
      return a[i] * (1 - f) + a[i + 1] * f;
    };
    const lit = mixv3(mixv3(PAL(c, 0), s.warm, 0.5), c.light ? PAL(c, 0) : [255, 255, 255], 0.3);
    for (let r = 0; r < s.rows.length; r++) {
      const row = s.rows[r], p = row.p, wa = wc[r];
      const top = row.y - h * 0.12 * row.scl;
      const fills = [0, 0.5, 1].map((k) => {
        const gr = g.createLinearGradient(0, row.y, 0, top);
        const tip = mixv3(mixv3(bgc, gt, (0.5 + 0.15 * (1 - p)) * light), lit, k * 0.72 * light);
        gr.addColorStop(0, rgba3(mixv3(bgc, gt, 0.05), 1));
        gr.addColorStop(0.55, rgba3(mixv3(mixv3(bgc, gt, (0.2 + 0.1 * (1 - p)) * light), lit, k * 0.35 * light), 1));
        gr.addColorStop(1, rgba3(tip, 1));
        return gr;
      });
      const paths = [new Path2D(), new Path2D(), new Path2D()];
      for (const b of row.bl) {
        const wv = windAt(wa, b.x) * b.fx + 0.04 * Math.sin(T * 3.1 * b.fx + b.ph);
        const L = b.L * lush, bend = Math.max(-1.1, Math.min(1.1, wv * 1.6 + (b.k - 0.5) * 0.35));
        const tx = b.x + Math.sin(bend) * L, ty = b.y - Math.cos(bend) * L * 0.95;
        const cx = b.x + Math.sin(bend) * L * 0.25, cy = b.y - L * 0.6;
        const pb = paths[wv > 0.36 ? 2 : wv > 0.22 ? 1 : 0];
        pb.moveTo(b.x - b.wd, b.y);
        pb.quadraticCurveTo(cx - b.wd * 0.5, cy, tx, ty);
        pb.quadraticCurveTo(cx + b.wd * 0.5, cy, b.x + b.wd, b.y);
      }
      for (let k = 0; k < 3; k++) {
        g.fillStyle = fills[k];
        g.fill(paths[k]);
      }
      for (const f of row.fl) {
        const kd = f.kd;
        let u = frac2(Y - kd.at + 1 + f.off);
        if (u > kd.len * 1.15) continue;
        u /= kd.len;
        const stem = sstep4(0, 0.25, u), open = sstep4(0.2, 0.4, u) * (1 - sstep4(0.75, 0.95, u)), wither = sstep4(0.7, 1.05, u);
        const L = f.L * stem;
        if (L < 2) continue;
        const wv = windAt(wa, f.x) * 0.8 + 0.03 * Math.sin(T * 2.2 + f.ph);
        const bend = Math.max(-0.9, Math.min(0.9, wv * 1.2)) + wither * 0.5;
        const tx = f.x + Math.sin(bend) * L, ty = f.y - Math.cos(bend) * L;
        g.strokeStyle = rgba3(mixv3(bgc, gt, 0.3 * light), 1);
        g.lineWidth = Math.max(0.6, D * 9e-4 * row.scl);
        g.beginPath();
        g.moveTo(f.x, f.y);
        g.quadraticCurveTo(f.x + Math.sin(bend) * L * 0.2, f.y - L * 0.6, tx, ty);
        g.stroke();
        const r2 = D * 75e-4 * row.scl * kd.size;
        if (kd.clock && u > 0.55) {
          const k = 1 - sstep4(0.75, 0.95, u);
          if (k > 0.02) {
            g.globalCompositeOperation = "lighter";
            g.globalAlpha = 0.4 * k;
            g.drawImage(glowSp2(c, 0, 0.75), tx - r2 * 1.4, ty - r2 * 1.4, r2 * 2.8, r2 * 2.8);
            g.globalCompositeOperation = "source-over";
            g.globalAlpha = 1;
            if (s.seeds.length < 70 && Math.abs(wv) > 0.3 && Math.random() < 0.25 * dt * 60) s.seeds.push({ x: tx, y: ty, vx: wv * D * 0.05, vy: -D * 4e-3, life: 0, ti: 0, p: row.p });
          }
          continue;
        }
        const pr = r2 * (0.3 + 0.7 * open);
        const tone9 = mixv3(mixv3(bgc, PAL(c, kd.ti), 0.45 + 0.4 * light), bgc, wither * 0.7);
        const pale2 = mixv3(tone9, c.light ? tone9 : [255, 255, 255], 0.3);
        const ca = Math.cos(bend), sa = Math.sin(bend);
        const P = (dx, dy, rx, ry) => {
          const px = tx + dx * ca - dy * sa, py = ty + dx * sa + dy * ca;
          g.moveTo(px + rx, py);
          g.ellipse(px, py, rx, ry, bend, 0, TAU6);
        };
        if (open < 0.15) {
          g.fillStyle = rgba3(mixv3(bgc, tone9, 0.5), 1);
          g.beginPath();
          g.ellipse(tx, ty, pr * 0.35, pr * 0.55, bend, 0, TAU6);
          g.fill();
        } else if (kd.form === 0) {
          g.fillStyle = rgba3(tone9, 1);
          g.beginPath();
          for (let q = -2; q <= 2; q++) P(q * pr * 0.32, -pr * 0.35 * (1 - Math.abs(q) * 0.2), pr * 0.34, pr * 0.62);
          g.fill();
        } else if (kd.form === 1) {
          g.fillStyle = rgba3(pale2, 0.92);
          g.beginPath();
          for (let q = 0; q < 10; q++) {
            const a = q / 10 * TAU6;
            P(Math.cos(a) * pr * 0.75, Math.sin(a) * pr * 0.3, pr * 0.3, pr * 0.14);
          }
          g.fill();
          g.fillStyle = rgba3(mixv3(tone9, s.warm, 0.5), 1);
          g.beginPath();
          g.ellipse(tx, ty, pr * 0.3, pr * 0.18, bend, 0, TAU6);
          g.fill();
        } else {
          g.fillStyle = rgba3(pale2, 0.88);
          g.beginPath();
          for (let q = 0; q < 11; q++) {
            const a = q * 2.39996, rr = Math.sqrt((q + 0.5) / 11);
            P(Math.cos(a) * rr * pr, -pr * 0.2 + Math.sin(a) * rr * pr * 0.38, pr * 0.19, pr * 0.15);
          }
          g.fill();
        }
      }
    }
    g.globalCompositeOperation = "lighter";
    for (let i = s.seeds.length - 1; i >= 0; i--) {
      const sd = s.seeds[i];
      sd.life += dt;
      sd.vx += (windAt(wc[wc.length - 1], Math.max(0, Math.min(w, sd.x))) * D * 0.06 - sd.vx) * dt * 0.8;
      sd.vy += (-D * 3e-3 - sd.vy) * dt * 0.3;
      sd.x += sd.vx * dt;
      sd.y += sd.vy * dt + Math.sin(sd.life * 2 + i) * 0.2;
      if (sd.life > 14 || sd.x < -20 || sd.x > w + 20 || sd.y < -20) {
        s.seeds[i] = s.seeds[s.seeds.length - 1];
        s.seeds.pop();
        continue;
      }
      const r = Math.max(1, D * 16e-4);
      g.globalAlpha = 0.5 * (1 - sstep4(9, 14, sd.life));
      g.drawImage(glowSp2(c, 0, 0.7), sd.x - r * 2, sd.y - r * 2, r * 4, r * 4);
    }
    const fly = sstep4(0.4, 0.55, Y) * (1 - sstep4(0.78, 0.9, Y)) * sstep4(0.3, 0.7, NI);
    if (fly > 0.01) {
      const fs = glowSp2(c, 1, 0.45);
      for (const f of s.flies) {
        const x = (f.x + 0.05 * Math.sin(T / f.p1 + f.ph)) * w, y = HY + (h - HY) * (f.y + 0.04 * Math.sin(T / f.p2 + f.ph * 2));
        const blink = Math.pow(Math.max(0, Math.sin(T / f.bl * TAU6 + f.ph)), 6), r = D * 8e-3;
        g.globalAlpha = 0.65 * blink * fly;
        g.drawImage(fs, x - r, y - r, r * 2, r * 2);
      }
    }
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    const fw = wc[wc.length - 1], ink = mixv3(bgc, gt, 0.07), rim = mixv3(mixv3(bgc, s.warm, 0.6), c.light ? s.warm : [255, 255, 255], 0.15);
    const sil = new Path2D(), heads = new Path2D(), rims = new Path2D();
    for (const st of s.fore) {
      const wv = windAt(fw, st.x) * st.fx * 0.7 + 0.03 * Math.sin(T * 1.3 + st.ph);
      const bend = st.lean + Math.max(-0.6, Math.min(0.6, wv * 0.9)), L = st.L * (0.85 + 0.15 * lush);
      const bx = st.x, by = h + 4, tx = bx + Math.sin(bend) * L, ty = by - Math.cos(bend) * L;
      const cx = bx + Math.sin(bend) * L * 0.3, cy = by - L * 0.6;
      sil.moveTo(bx - st.wd, by);
      sil.quadraticCurveTo(cx, cy, tx, ty);
      sil.quadraticCurveTo(cx, cy, bx + st.wd, by);
      const ro = (s.sunX > bx ? 1 : -1) * st.wd * 0.3;
      rims.moveTo(bx + ro, by);
      rims.quadraticCurveTo(cx + ro, cy, tx + ro * 0.3, ty);
      if (st.kind === 0) {
        for (let q = 0; q < 7; q++) {
          const u = 0.78 + q * 0.032, hx = bx + Math.sin(bend) * L * u, hy = by - Math.cos(bend) * L * u, side = q % 2 ? 1 : -1;
          const ex = hx + side * D * 0.01 + Math.sin(bend) * D * 6e-3, ey = hy + D * 9e-3;
          heads.moveTo(hx, hy);
          heads.quadraticCurveTo(hx + side * D * 7e-3, hy - D * 2e-3, ex, ey);
          heads.moveTo(ex + D * 12e-4, ey + D * 3e-3);
          heads.ellipse(ex, ey + D * 3e-3, D * 12e-4, D * 4e-3, -side * 0.25 + bend, 0, TAU6);
        }
      } else if (st.kind === 1) {
        const u0 = 0.86, hx = bx + Math.sin(bend) * L * u0, hy = by - Math.cos(bend) * L * u0;
        heads.moveTo(hx, hy);
        heads.ellipse((hx + tx) / 2, (hy + ty) / 2, D * 26e-4, L * 0.07, bend, 0, TAU6);
      }
    }
    g.fillStyle = rgba3(ink, 1);
    g.fill(sil);
    g.strokeStyle = rgba3(ink, 1);
    g.lineWidth = Math.max(0.5, D * 5e-4);
    g.stroke(heads);
    g.fill(heads);
    g.strokeStyle = rgba3(rim, 0.3 * GL);
    g.lineWidth = Math.max(0.5, D * 4e-4);
    g.stroke(rims);
  }
};
var SCENES_GROWTH = [reef, meadow];

// from nightLandscapes.ts
var AP5 = (c, i, a) => {
  const p = c.pal[(i % c.pal.length + c.pal.length) % c.pal.length];
  return `rgba(${p[0]},${p[1]},${p[2]},${a})`;
};
var W5 = (c, a, i = 0) => c.light ? AP5(c, i, Math.min(1, a * 1.6)) : `rgba(255,255,255,${a})`;
var clamp4 = (v, a, b) => v < a ? a : v > b ? b : v;
var rgb3 = (v, a = 1) => `rgba(${v[0] | 0},${v[1] | 0},${v[2] | 0},${a})`;
var tone4 = (c, i) => c.pal[(i % c.pal.length + c.pal.length) % c.pal.length];
var haze3 = (c, k = 0.38) => {
  const p = c.pal[0];
  return c.light ? p : [p[0] + (255 - p[0]) * k, p[1] + (255 - p[1]) * k, p[2] + (255 - p[2]) * k];
};
var mixv4 = (c, p, k, d = 1) => [(c.br + (p[0] - c.br) * k) * d, (c.bg2 + (p[1] - c.bg2) * k) * d, (c.bb + (p[2] - c.bb) * k) * d];
var MX3 = (c, p, k, d = 1, a = 1) => rgb3(mixv4(c, p, k, d), a);
function mk6(w, h) {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  return cv;
}
var rng7 = (a) => () => {
  a |= 0;
  a = a + 1831565813 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
function noise12(n, cells, R) {
  const cp = Array.from({ length: cells + 2 }, () => R() * 2 - 1), out = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const x = i / n * cells, i0 = Math.floor(x), f = x - i0, u = f * f * (3 - 2 * f);
    out[i] = cp[i0] * (1 - u) + cp[i0 + 1] * u;
  }
  return out;
}
function fbm3(n, cells, oct, pers, R) {
  const out = new Float32Array(n + 1);
  let amp = 1, tot = 0, cl = cells;
  for (let o = 0; o < oct; o++) {
    const a = noise12(n, cl, R);
    for (let i = 0; i <= n; i++) out[i] += a[i] * amp;
    tot += amp;
    amp *= pers;
    cl *= 2;
  }
  for (let i = 0; i <= n; i++) out[i] /= tot;
  return out;
}
var norm012 = (a) => {
  let lo = 1e9, hi = -1e9;
  for (const v of a) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const d = hi - lo || 1;
  for (let i = 0; i < a.length; i++) a[i] = (a[i] - lo) / d;
  return a;
};
var _sp4 = /* @__PURE__ */ new Map();
function sprite6(key, build) {
  let s = _sp4.get(key);
  if (!s) {
    if (_sp4.size > 48) _sp4.clear();
    s = build();
    _sp4.set(key, s);
  }
  return s;
}
function puff2(c, p, name) {
  return sprite6("puff" + name + c.acc + c.bg + p.join(), () => {
    const S = 64, hc = S / 2, cv = mk6(S, S), x = cv.getContext("2d");
    const gr = x.createRadialGradient(hc, hc, 0, hc, hc, hc);
    gr.addColorStop(0, rgb3(p, 1));
    gr.addColorStop(0.3, rgb3(p, 0.78));
    gr.addColorStop(0.55, rgb3(p, 0.42));
    gr.addColorStop(0.8, rgb3(p, 0.12));
    gr.addColorStop(1, rgb3(p, 0));
    x.fillStyle = gr;
    x.fillRect(0, 0, S, S);
    return cv;
  });
}
function spark2(c, p, name) {
  return sprite6("spark" + name + c.acc + c.bg + p.join(), () => {
    const S = 64, hc = S / 2, cv = mk6(S, S), x = cv.getContext("2d");
    const gr = x.createRadialGradient(hc, hc, 0, hc, hc, hc);
    gr.addColorStop(0, rgb3(p, 1));
    gr.addColorStop(0.12, rgb3(p, 0.6));
    gr.addColorStop(0.35, rgb3(p, 0.16));
    gr.addColorStop(1, rgb3(p, 0));
    x.fillStyle = gr;
    x.fillRect(0, 0, S, S);
    return cv;
  });
}
function wash3(w, h, stops) {
  const cv = mk6(w, h), x = cv.getContext("2d");
  const gr = x.createLinearGradient(0, 0, 0, cv.height);
  for (const [o, col] of stops) gr.addColorStop(clamp4(o, 0, 1), col);
  x.fillStyle = gr;
  x.fillRect(0, 0, cv.width, cv.height);
  dither5(x, cv.width, cv.height);
  return cv;
}
var _dith4 = null;
function dither5(x, w, h) {
  if (!_dith4) {
    _dith4 = mk6(64, 64);
    const d = _dith4.getContext("2d"), id = d.createImageData(64, 64);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = Math.random() < 0.5 ? 0 : 255;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = 255;
    }
    d.putImageData(id, 0, 0);
  }
  if (w < 200) return;
  x.save();
  x.globalCompositeOperation = "source-atop";
  x.globalAlpha = 0.012;
  x.fillStyle = x.createPattern(_dith4, "repeat");
  x.fillRect(0, 0, w, h);
  x.restore();
}
function mistBand(g, spr, b, w, h, t, alpha) {
  const len = b.len * w, th = Math.max(1, b.th * h), span2 = w + len;
  const x = ((b.x * span2 + t * b.sp * (w / 1440)) % span2 + span2) % span2 - len;
  g.globalAlpha = alpha;
  g.drawImage(spr, x, b.y * h - th / 2, len, th);
}
function mistStrips(spr, bands, w, h) {
  const out = [], W22 = Math.max(1, Math.ceil(w));
  for (const k of [...new Set(bands.map((b) => b.k))]) {
    const bs = bands.filter((b) => b.k === k);
    let y0 = 1e9, y1 = -1e9, sp = 0;
    for (const b of bs) {
      const th = Math.max(1, b.th * h);
      y0 = Math.min(y0, b.y * h - th / 2);
      y1 = Math.max(y1, b.y * h + th / 2);
      sp += Math.abs(b.sp) / bs.length;
    }
    y0 = Math.floor(y0);
    const cv = mk6(W22, Math.ceil(y1) - y0 + 1), x = cv.getContext("2d");
    for (const b of bs) {
      const len = Math.min(b.len * w, W22 * 0.95), th = Math.max(1, b.th * h), bx = b.x * W22;
      x.globalAlpha = b.a;
      for (const o of [-W22, 0, W22]) x.drawImage(spr, bx + o - len / 2, b.y * h - th / 2 - y0, len, th);
    }
    out.push({ k, cv, y0, sp: sp * (k % 2 ? -1 : 1), ph: bs[0].ph });
  }
  return out;
}
function drawStrip(g, st, w, t, alpha) {
  const W22 = st.cv.width, ox = Math.round((t * st.sp * (w / 1440) % W22 + W22) % W22);
  const op = g.globalCompositeOperation;
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = alpha;
  g.drawImage(st.cv, ox - W22, st.y0);
  g.drawImage(st.cv, ox, st.y0);
  g.globalCompositeOperation = op;
}
function fir2(x, bx, by, H, Wd, R, n, canopyFrom = 0) {
  const cb = by - H * canopyFrom, span2 = cb - (by - H), side = (sg) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const f = i / n, y = cb - span2 * f, env = Math.pow(1 - f, 1.1) * (i === 0 ? 0.8 : 1);
      const short = R() < 0.2 ? 0.55 : 1, tip = Wd * 0.5 * env * (0.65 + R() * 0.45) * short, st = span2 / n, dr = 0.6 + R() * 0.5;
      pts.push([bx + sg * tip, y + st * dr]);
      pts.push([bx + sg * tip * (0.88 + R() * 0.08), y + st * (dr - 0.3)]);
      pts.push([bx + sg * tip * (0.2 + R() * 0.2), y - st * (0.35 + R() * 0.25)]);
    }
    return pts;
  };
  const L = side(-1), Rt = side(1), tw = Math.max(0.6, Wd * 0.045);
  x.beginPath();
  x.moveTo(bx - tw, by + 1);
  x.lineTo(bx - tw, cb);
  for (const p of L) x.lineTo(p[0], p[1]);
  x.lineTo(bx, by - H * 1.03);
  for (let i = Rt.length - 1; i >= 0; i--) x.lineTo(Rt[i][0], Rt[i][1]);
  x.lineTo(bx + tw, cb);
  x.lineTo(bx + tw, by + 1);
  x.closePath();
  x.fill();
}
var ALP = [
  // base, amp (fractions of h), noise cells, octaves, persistence, alpine
  [0.47, 0.25, 4, 7, 0.56, 1],
  [0.56, 0.13, 4, 6, 0.52, 0.55],
  [0.645, 0.1, 3, 6, 0.5, 0.25],
  [0.745, 0.09, 3, 5, 0.5, 0],
  [0.865, 0.075, 2, 5, 0.45, 0]
];
function bakeAlp(s, w, h, c) {
  const N = s.N, hz = haze3(c), p0 = tone4(c, 0);
  const ys = s.R.map((prof, k) => {
    const [base, amp] = ALP[k];
    return Array.from(prof, (v) => h * (base - amp * v));
  });
  s.ys = ys;
  const span2 = Math.max(w, h * 1.6), X = (i) => i / N * span2 - (span2 - w) / 2;
  const topFar = Math.min(...ys[0]);
  const tf = clamp4(topFar / h, 0.12, 0.4);
  const skyH = Math.min(h * 0.9, Math.max(...ys[0]) + 2), k9 = h / skyH;
  s.sky = wash3(w, skyH, [[0, MX3(c, p0, 0.015, 0.7)], [tf * 0.5 * k9, MX3(c, p0, 0.05)], [tf * k9, MX3(c, p0, 0.13)], [ALP[0][0] * k9, MX3(c, p0, 0.3)], [0.62 * k9, MX3(c, p0, 0.28)], [0.9 * k9, MX3(c, hz, 0.2)]]);
  {
    const x = s.sky.getContext("2d"), cx = w * s.sunx, cy = h * ALP[0][0], r = Math.max(w, h) * 0.55;
    const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    gr.addColorStop(0, rgb3(p0, 0.16));
    gr.addColorStop(0.4, rgb3(p0, 0.06));
    gr.addColorStop(1, rgb3(p0, 0));
    x.globalCompositeOperation = "screen";
    x.fillStyle = gr;
    x.fillRect(0, 0, w, h);
  }
  const F = [0.4, 0.25, 0.165, 0.095, 0.04], V = [0.13, 0.11, 0.1, 0.075, 0.035], D = [1, 1, 1, 0.93, 0.8];
  s.L = ys.map((yy, k) => {
    const trees = k === 4 ? s.trees : null;
    const top = Math.max(0, Math.floor(Math.min(...yy) - (trees ? h * 0.04 : 2)));
    const bot = k < 4 ? Math.min(h, Math.ceil(Math.max(...ys[k + 1])) + 2) : h;
    const cv = mk6(w, bot - top), x = cv.getContext("2d"), lo = Math.max(...yy) - top;
    const col = k === 0 ? p0 : hz;
    const gr = x.createLinearGradient(0, Math.min(...yy) - top, 0, lo + h * 0.1);
    gr.addColorStop(0, MX3(c, col, F[k], D[k]));
    gr.addColorStop(0.55, MX3(c, k === 0 ? hz : hz, F[k] * (k === 0 ? 0.62 : 1), D[k]));
    gr.addColorStop(1, MX3(c, hz, (k === 0 ? F[k] * 0.62 : F[k]) + V[k], D[k]));
    x.fillStyle = gr;
    x.beginPath();
    x.moveTo(0, cv.height + 1);
    for (let i = 0; i <= N; i++) x.lineTo(X(i), yy[i] - top);
    x.lineTo(w, cv.height + 1);
    x.closePath();
    x.fill();
    if (trees) {
      x.fillStyle = MX3(c, hz, F[k], D[k]);
      const TR = rng7(s.seed + 11), nt = w < 200 ? 3 : 8;
      for (const tr of trees) {
        const i = Math.round(tr.x * N), th = Math.max(1, tr.h * h);
        fir2(x, X(i), yy[i] - top + 2, th, th * 0.36, TR, nt, 0.06);
      }
    }
    dither5(x, cv.width, cv.height);
    return { cv, top };
  });
  {
    const yy = ys[0], top = s.L[0].top, cv = mk6(w, s.L[0].cv.height), x = cv.getContext("2d"), amp = ALP[0][1] * h, base = ALP[0][0] * h;
    const R = rng7(s.seed + 7);
    x.save();
    x.beginPath();
    x.moveTo(0, cv.height);
    for (let i = 0; i <= N; i++) x.lineTo(X(i), yy[i] - top);
    x.lineTo(w, cv.height);
    x.closePath();
    x.clip();
    for (let ip = 1; ip < N; ip++) {
      if (!(yy[ip] < yy[ip - 1] && yy[ip] <= yy[ip + 1])) continue;
      let jv = ip;
      while (jv > 0 && yy[jv - 1] >= yy[jv]) jv--;
      const fh = yy[jv] - yy[ip];
      if (fh < h * 6e-3) continue;
      const hgt = clamp4((base - yy[ip]) / amp, 0, 1), lit = 0.25 + 0.75 * hgt * hgt;
      const depth = Math.min(fh * 1.5 + h * 0.01, amp * (0.35 + 0.5 * hgt));
      const gr = x.createLinearGradient(0, yy[ip] - top, 0, yy[ip] - top + depth);
      gr.addColorStop(0, W5(c, 0.5 * lit));
      gr.addColorStop(0.18, rgb3(p0, 0.55 * lit));
      gr.addColorStop(0.6, rgb3(p0, 0.2 * lit));
      gr.addColorStop(1, rgb3(p0, 0));
      x.fillStyle = gr;
      x.beginPath();
      x.moveTo(X(jv), yy[jv] - top);
      for (let j = jv + 1; j <= ip; j++) x.lineTo(X(j), yy[j] - top);
      const sx = X(ip), sy = yy[ip] - top, ex = sx + (sx - X(jv)) * (0.08 + R() * 0.15), ey = sy + depth, steps = 7;
      for (let q = 1; q <= steps; q++) {
        const f = q / steps;
        x.lineTo(sx + (ex - sx) * f + (R() - 0.5) * fh * 0.12, sy + (ey - sy) * f);
      }
      x.lineTo(X(jv) + (sx - X(jv)) * 0.3, yy[jv] - top + depth * 0.6);
      x.closePath();
      x.fill();
    }
    x.restore();
    x.lineWidth = Math.max(0.6, h / 800);
    x.lineJoin = "round";
    for (let i = 0; i < N; i++) {
      const up2 = yy[i + 1] < yy[i], hgt = clamp4((base - yy[i]) / amp, 0, 1);
      const a = (up2 ? 0.55 : 0.12) * (0.2 + 0.8 * hgt);
      if (a < 0.03) continue;
      x.strokeStyle = W5(c, a);
      x.beginPath();
      x.moveTo(X(i), yy[i] - top + 0.5);
      x.lineTo(X(i + 1), yy[i + 1] - top + 0.5);
      x.stroke();
    }
    s.lit = cv;
  }
  s.strips = mistStrips(puff2(c, haze3(c, 0.25), "alp"), s.mist, w, h);
}
function beamSprite(c) {
  return sprite6("beam" + c.acc + c.bg, () => {
    const BW = 512, BH = 128, cv = mk6(BW, BH), x = cv.getContext("2d"), p = haze3(c, 0.6);
    x.globalCompositeOperation = "lighter";
    for (let j = 0; j < 9; j++) {
      const sp = 4 + j / 8 * 58, gr = x.createLinearGradient(0, 0, BW, 0);
      gr.addColorStop(0, rgb3(p, 0.2));
      gr.addColorStop(0.08, rgb3(p, 0.13));
      gr.addColorStop(0.4, rgb3(p, 0.05));
      gr.addColorStop(1, rgb3(p, 0));
      x.fillStyle = gr;
      x.beginPath();
      x.moveTo(0, BH / 2 - 1.2);
      x.lineTo(BW, BH / 2 - sp);
      x.lineTo(BW, BH / 2 + sp);
      x.lineTo(0, BH / 2 + 1.2);
      x.closePath();
      x.fill();
    }
    return cv;
  });
}
function bakeLight(s, w, h, c) {
  const hy = Math.round(h * s.hor), hz = haze3(c), p0 = tone4(c, 0), N = s.N;
  s.hy = hy;
  s.sky = wash3(w, hy, [[0, MX3(c, p0, 0.02, 0.7)], [0.55, MX3(c, p0, 0.05)], [0.9, MX3(c, hz, 0.13)], [1, MX3(c, hz, 0.17)]]);
  {
    const x2 = s.sky.getContext("2d");
    x2.globalCompositeOperation = "screen";
    for (const st of w < 200 ? s.stars.slice(0, 8) : s.stars) {
      x2.fillStyle = W5(c, st.a * (1 - st.y) * 0.7);
      const r = Math.max(0.6, st.r * Math.min(1, w / 900));
      x2.fillRect(st.x * w, st.y * hy * 0.8, r, r);
    }
  }
  s.sea = wash3(w, h - hy, [[0, MX3(c, hz, 0.15, 0.95)], [0.06, MX3(c, hz, 0.09, 0.9)], [0.35, MX3(c, hz, 0.035, 0.8)], [1, MX3(c, p0, 0, 0.55)]]);
  const wl = hy + h * 0.022, landTop = Math.max(0, Math.floor(hy - h * 0.25)), land = mk6(w, wl + 2 - landTop), x = land.getContext("2d");
  x.translate(0, -landTop);
  s.landTop = landTop;
  x.fillStyle = MX3(c, hz, 0.1, 0.95);
  x.beginPath();
  x.moveTo(w * 0.66, hy + 1);
  for (let i = 0; i <= 40; i++) {
    const f = i / 40;
    x.lineTo(w * (0.66 + 0.36 * f), hy - h * (4e-3 + 0.02 * Math.sin(f * Math.PI * 0.9) + 6e-3 * s.far[i % s.far.length]));
  }
  x.lineTo(w * 1.02, hy + 1);
  x.closePath();
  x.fill();
  const HW = 0.5;
  const ly = (i) => {
    const f = i / N;
    const crest = hy - h * (0.07 + 0.045 * Math.sin(Math.PI * clamp4(f / 0.62, 0, 1) * 0.8)) - h * 0.01 * s.head[i];
    const drop = clamp4((f - 0.58) / 0.1, 0, 1), dd = drop * drop * (3 - 2 * drop);
    const shelf = wl - h * (0.012 + 8e-3 * s.head[i * 7 % (N + 1)]) * (1 - clamp4((f - 0.78) / 0.2, 0, 1));
    return crest + (shelf - crest) * dd;
  };
  x.fillStyle = MX3(c, p0, 0.02, 0.7);
  x.beginPath();
  x.moveTo(-2, wl + 1);
  for (let i = 0; i <= N; i++) x.lineTo(i / N * w * HW, ly(i));
  x.lineTo(w * HW + 2, wl + 1);
  x.closePath();
  x.fill();
  for (const [sx, sw2, sh] of [[0.535, 0.012, 0.034], [0.565, 6e-3, 0.018]]) {
    x.beginPath();
    x.moveTo(w * sx - sw2 * w * 0.6, wl + 1);
    x.lineTo(w * sx - sw2 * w * 0.35, wl - h * sh);
    x.lineTo(w * sx + sw2 * w * 0.2, wl - h * sh * 1.08);
    x.lineTo(w * sx + sw2 * w * 0.6, wl + 1);
    x.closePath();
    x.fill();
  }
  const lx = w * s.lx, pi = Math.round(s.lx / HW * N), py = ly(pi) + 1, th = Math.max(4, h * 0.085), bw = th * 0.2, tw2 = th * 0.13;
  x.fillStyle = MX3(c, hz, 0.24, 0.95);
  x.beginPath();
  x.moveTo(lx - bw / 2, py);
  x.lineTo(lx - tw2 / 2, py - th);
  x.lineTo(lx + tw2 / 2, py - th);
  x.lineTo(lx + bw / 2, py);
  x.closePath();
  x.fill();
  x.fillStyle = MX3(c, p0, 0.02, 0.7);
  x.fillRect(lx - tw2 * 0.85, py - th - Math.max(0.8, th * 0.03), tw2 * 1.7, Math.max(0.8, th * 0.03));
  x.fillRect(lx - tw2 * 0.38, py - th - th * 0.16, tw2 * 0.1 + 0.5, th * 0.14);
  x.fillRect(lx + tw2 * 0.28, py - th - th * 0.16, tw2 * 0.1 + 0.5, th * 0.14);
  x.beginPath();
  x.moveTo(lx - tw2 * 0.55, py - th - th * 0.16);
  x.lineTo(lx, py - th - th * 0.27);
  x.lineTo(lx + tw2 * 0.55, py - th - th * 0.16);
  x.closePath();
  x.fill();
  const cx = lx + th * 0.22, cw = th * 0.34, ch = th * 0.15;
  x.beginPath();
  x.moveTo(cx, py + 1);
  x.lineTo(cx, py - ch);
  x.lineTo(cx + cw / 2, py - ch - th * 0.09);
  x.lineTo(cx + cw, py - ch);
  x.lineTo(cx + cw, py + 1);
  x.closePath();
  x.fill();
  s.land = land;
  s.lamp = { x: lx, y: py - th - th * 0.085, th };
  s.wl = wl;
  s.beam = beamSprite(c);
  s.mistSpr = puff2(c, haze3(c, 0.3), "lh");
  s.lampSpr = spark2(c, haze3(c, 0.7), "lh");
  s.swellCol = rgb3(haze3(c, 0.3), 1);
}
var SCENES_NIGHT = [
  {
    name: "Alpenglow",
    flav: "Artscape",
    reset: (w, h) => {
      const seed = Math.random() * 1e9 | 0, R = rng7(seed), N = 360;
      const prof = ALP.map(([, , cells, oct, pers, alp]) => {
        const n1 = fbm3(N, cells, oct, pers, R), n2 = fbm3(N, Math.max(2, cells - 1), 4, 0.45, R), n3 = fbm3(N, cells * 4, 3, 0.5, R), out = new Float32Array(N + 1);
        for (let i = 0; i <= N; i++) {
          const ridged = 1 - Math.min(1, Math.abs(n2[i]) * 1.6);
          out[i] = (1 - alp) * (0.5 + n1[i]) + alp * (0.5 * (0.5 + n1[i]) + 0.5 * ridged * ridged + 0.12 * n3[i]);
        }
        norm012(out);
        if (alp > 0.9) for (let i = 0; i <= N; i++) out[i] = Math.pow(out[i], 1.15);
        return out;
      });
      const trees = [];
      for (let x = 0; x < 1; x += 4e-3 + R() * 0.01) if (Math.sin(x * 9 + seed) + R() * 0.8 > 0.15) trees.push({ x, h: 0.012 + R() * 0.022 });
      const stars2 = Array.from({ length: 110 }, () => ({ x: R(), y: Math.pow(R(), 1.5) * 0.42, r: 0.7 + R() * 1.1, a: 0.1 + R() * 0.45, ph: R() * 9, sp: 0.5 + R() }));
      const mist = [];
      for (let k = 0; k < 5; k++) for (let j = 0; j < (k === 4 ? 2 : 3); j++) {
        const nb = ALP[Math.min(4, k + 1)];
        mist.push({ k, x: R(), y: k === 4 ? 0.93 + R() * 0.05 : nb[0] - nb[1] * (0.2 + R() * 0.5), len: 0.4 + R() * 0.5, th: 0.05 + R() * 0.07, sp: (4e-3 + R() * 5e-3) * (1 + k * 0.5) * (R() < 0.5 ? -1 : 1), a: 0.12 + R() * 0.1, ph: R() * 9 });
      }
      return { seed, N, R: prof, trees, stars: stars2, mist, sunx: 0.2 + R() * 0.6, key: "" };
    },
    frame: (g, w, h, t, c, s) => {
      const key = w + "x" + h + c.acc + c.bg;
      if (s.key !== key) {
        bakeAlp(s, w, h, c);
        s.key = key;
      }
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;
      g.fillStyle = c.bg;
      g.fillRect(0, 0, w, h);
      g.drawImage(s.sky, 0, 0);
      g.globalCompositeOperation = "screen";
      const sr = Math.min(1, w / 1e3);
      for (const st of w < 200 ? s.stars.slice(0, 10) : s.stars) {
        const a = st.a * (0.6 + 0.4 * Math.sin(t * 45e-5 * st.sp + st.ph)) * (1 - st.y * 1.6);
        if (a < 0.02) continue;
        g.fillStyle = W5(c, a);
        const r = Math.max(0.6, st.r * sr);
        g.fillRect(st.x * w, st.y * h, r, r);
      }
      for (let k = 0; k < 5; k++) {
        const L = s.L[k];
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = 1;
        g.drawImage(L.cv, 0, L.top);
        g.globalCompositeOperation = "screen";
        if (k === 0) {
          g.globalAlpha = 0.72 + 0.28 * Math.sin(t * 11e-5 + 1);
          g.drawImage(s.lit, 0, L.top);
        }
        for (const st of s.strips) if (st.k === k) drawStrip(g, st, w, t, 0.7 + 0.3 * Math.sin(t * 18e-5 + st.ph));
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
    }
  },
  {
    name: "Lighthouse",
    flav: "Artscape",
    reset: (w, h) => {
      const seed = Math.random() * 1e9 | 0, R = rng7(seed), N = 200;
      const head = norm012(fbm3(N, 6, 5, 0.55, R)), far = Array.from({ length: 41 }, () => R());
      const stars2 = Array.from({ length: 70 }, () => ({ x: R(), y: Math.pow(R(), 1.4), r: 0.6 + R(), a: 0.08 + R() * 0.35 }));
      const mist = Array.from({ length: 7 }, (_, i) => ({ x: R(), y: 0.5 + R() * 0.16, len: 0.35 + R() * 0.5, th: 0.04 + R() * 0.05, sp: (4e-3 + R() * 6e-3) * (R() < 0.5 ? -1 : 1), a: 0.12 + R() * 0.12, ph: R() * 9 }));
      const swells = Array.from({ length: 34 }, () => ({ ph: R() * 9, jo: R() * 0.6, k: 3e-3 + R() * 4e-3, k2: 9e-3 + R() * 8e-3 }));
      const glit = Array.from({ length: 36 }, () => ({ y: Math.pow(R(), 1.3), off: R() - 0.5, len: 0.3 + R(), ph: R() * 9 }));
      return { seed, N, head, far, stars: stars2, mist, swells, glit, hor: 0.6, lx: 0.2 + R() * 0.04, key: "" };
    },
    frame: (g, w, h, t, c, s) => {
      const key = w + "x" + h + c.acc + c.bg;
      if (s.key !== key) {
        bakeLight(s, w, h, c);
        s.key = key;
      }
      const hy = s.hy, T = t * 1e-3, sc = h / 900, L = s.lamp;
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;
      g.fillStyle = c.bg;
      g.fillRect(0, 0, w, h);
      g.drawImage(s.sky, 0, 0);
      g.drawImage(s.sea, 0, hy);
      g.globalCompositeOperation = "screen";
      const NS = s.swells.length, lakeH = h - hy, drift2 = T * 0.045, stp = Math.max(4, w / 64), ks = 1 / Math.max(0.3, sc);
      g.strokeStyle = s.swellCol;
      for (let i = 0; i < NS; i++) {
        const sw = s.swells[i], p = ((i + sw.jo + drift2) % NS + NS) % NS / NS, y0 = hy + lakeH * Math.pow(p, 1.85);
        const fadeIn = Math.min(1, p * 30), amp = (0.3 + 7 * p * p) * sc;
        const thin = 0.085 * Math.pow(1 - p, 2.4) * fadeIn, broad = 0.032 * Math.sin(Math.PI * Math.min(1, p * 1.15)) * fadeIn;
        g.beginPath();
        for (let x = 0; x <= w + stp; x += stp) {
          const y = y0 + amp * Math.sin(x * sw.k * ks + T * 0.22 + sw.ph) + amp * 0.45 * Math.sin(x * sw.k2 * ks - T * 0.15 + sw.ph);
          x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        if (thin > 4e-3) {
          g.globalAlpha = thin;
          g.lineWidth = Math.max(0.5, (0.7 + 0.8 * p) * sc);
          g.stroke();
        }
        if (broad > 4e-3 && p > 0.12 && i % 2) {
          g.globalAlpha = broad * 1.3;
          g.lineWidth = (3 + 17 * p) * sc;
          g.stroke();
        }
      }
      const th = T * 6.2832 / 20;
      let flash = 0;
      const beams = [];
      for (let b = 0; b < 2; b++) {
        const ph = th + b * Math.PI, cx = Math.cos(ph), sz = Math.sin(ph);
        flash = Math.max(flash, Math.pow(Math.max(0, sz), 14));
        const len = w * 1.05 * Math.abs(cx), spread = h * 0.05 * (0.5 + 0.5 * Math.abs(cx));
        const a = (0.3 + 0.55 * Math.max(0, sz)) * Math.min(1, Math.abs(cx) * 2.5);
        beams.push({ sg: Math.sign(cx), len, spread, a });
      }
      const fog = (odd) => {
        for (let i = odd; i < s.mist.length; i += 2) {
          const b = s.mist[i], len = b.len * w, span2 = w + len, mx = ((b.x * span2 + t * b.sp * (w / 1440)) % span2 + span2) % span2 - len / 2;
          let lit = 0;
          for (const bm of beams) {
            const d = (mx - L.x) * bm.sg;
            if (d > -len * 0.5 && d < bm.len) lit = Math.max(lit, bm.a * (1 - Math.max(0, d) / Math.max(1, bm.len)) * Math.exp(-Math.pow((b.y * h - L.y) / (h * 0.08), 2)));
          }
          mistBand(g, s.mistSpr, b, w, h, t, (b.a * (0.7 + 0.3 * Math.sin(T * 0.18 + b.ph)) + lit * 0.45) * (odd ? 0.7 : 1));
        }
      };
      g.globalCompositeOperation = "screen";
      fog(0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
      g.drawImage(s.land, 0, s.landTop);
      g.globalCompositeOperation = "screen";
      for (const bm of beams) {
        if (bm.len < 2 || bm.a < 0.01) continue;
        g.save();
        g.translate(L.x, L.y);
        g.rotate(bm.sg * 0.01);
        g.scale(bm.sg * bm.len / 512, bm.spread / 62);
        g.globalAlpha = bm.a;
        g.drawImage(s.beam, 0, -64);
        g.restore();
      }
      const lr = L.th * (0.32 + 1.5 * flash);
      g.globalAlpha = 0.55 + 0.45 * flash;
      g.drawImage(s.lampSpr, L.x - lr, L.y - lr, lr * 2, lr * 2);
      if (flash > 0.02) {
        const fr = h * 0.16 * flash;
        g.globalAlpha = 0.3 * flash;
        g.drawImage(s.mistSpr, L.x - fr * 1.6, L.y - fr * 0.6, fr * 3.2, fr * 1.2);
      }
      g.globalAlpha = 1;
      g.fillStyle = W5(c, 0.75 + 0.25 * flash);
      g.fillRect(L.x - Math.max(0.6, L.th * 0.025), L.y - Math.max(0.6, L.th * 0.025), Math.max(1.2, L.th * 0.05), Math.max(1.2, L.th * 0.05));
      for (const gl of s.glit) {
        const y = s.wl + 3 * sc + gl.y * (h - s.wl) * 0.75, f = 0.5 + 0.5 * Math.sin(T * 0.8 + gl.ph);
        const a = (0.03 + 0.3 * flash) * f * (1 - gl.y * 0.7);
        if (a < 0.01) continue;
        g.fillStyle = W5(c, a);
        const ln = (4 + 22 * gl.y) * gl.len * sc;
        g.fillRect(L.x + gl.off * (6 + 40 * gl.y) * sc - ln / 2, y, ln, Math.max(0.7, sc));
      }
      fog(1);
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
    }
  }
];

// from nightPlaces.ts
var TAU7 = Math.PI * 2;
var AP6 = (c, i, a) => {
  const p = c.pal[(i % c.pal.length + c.pal.length) % c.pal.length];
  return `rgba(${p[0]},${p[1]},${p[2]},${a})`;
};
var W6 = (c, a, i = 0) => c.light ? AP6(c, i, Math.min(1, a * 1.6)) : `rgba(255,255,255,${a})`;
var clamp5 = (v, a, b) => v < a ? a : v > b ? b : v;
var sstep5 = (a, b, v) => {
  const u = clamp5((v - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
};
var rgb4 = (v, a = 1) => `rgba(${v[0] | 0},${v[1] | 0},${v[2] | 0},${a})`;
var tone5 = (c, i) => c.pal[(i % c.pal.length + c.pal.length) % c.pal.length];
var haze4 = (c, k = 0.38, i = 0) => {
  const p = tone5(c, i);
  return c.light ? p : [p[0] + (255 - p[0]) * k, p[1] + (255 - p[1]) * k, p[2] + (255 - p[2]) * k];
};
var mixv5 = (c, p, k, d = 1) => [(c.br + (p[0] - c.br) * k) * d, (c.bg2 + (p[1] - c.bg2) * k) * d, (c.bb + (p[2] - c.bb) * k) * d];
var MX4 = (c, p, k, d = 1, a = 1) => rgb4(mixv5(c, p, k, d), a);
var BGA2 = (c, a) => `rgba(${c.br},${c.bg2},${c.bb},${a})`;
var small3 = (w) => w < 200;
var hsh2 = (n) => {
  const v = Math.sin(n) * 43758.5453;
  return v - Math.floor(v);
};
function mk7(w, h) {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  return cv;
}
var rng8 = (a) => () => {
  a |= 0;
  a = a + 1831565813 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
function noise13(n, cells, R) {
  const cp = Array.from({ length: cells + 2 }, () => R() * 2 - 1), out = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const x = i / n * cells, i0 = Math.floor(x), f = x - i0, u = f * f * (3 - 2 * f);
    out[i] = cp[i0] * (1 - u) + cp[i0 + 1] * u;
  }
  return out;
}
function fbm4(n, cells, oct, pers, R) {
  const out = new Float32Array(n + 1);
  let amp = 1, tot = 0, cl = cells;
  for (let o = 0; o < oct; o++) {
    const a = noise13(n, cl, R);
    for (let i = 0; i <= n; i++) out[i] += a[i] * amp;
    tot += amp;
    amp *= pers;
    cl *= 2;
  }
  for (let i = 0; i <= n; i++) out[i] /= tot;
  return out;
}
var norm013 = (a) => {
  let lo = 1e9, hi = -1e9;
  for (const v of a) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const d = hi - lo || 1;
  for (let i = 0; i < a.length; i++) a[i] = (a[i] - lo) / d;
  return a;
};
var _sp5 = /* @__PURE__ */ new Map();
function sprite7(key, build) {
  let s = _sp5.get(key);
  if (!s) {
    if (_sp5.size > 96) _sp5.clear();
    s = build();
    _sp5.set(key, s);
  }
  return s;
}
function puff3(c, p, name) {
  return sprite7("puff" + name + c.acc + c.bg + p.join(), () => {
    const S = 64, hc = S / 2, cv = mk7(S, S), x = cv.getContext("2d");
    const gr = x.createRadialGradient(hc, hc, 0, hc, hc, hc);
    gr.addColorStop(0, rgb4(p, 1));
    gr.addColorStop(0.3, rgb4(p, 0.78));
    gr.addColorStop(0.55, rgb4(p, 0.42));
    gr.addColorStop(0.8, rgb4(p, 0.12));
    gr.addColorStop(1, rgb4(p, 0));
    x.fillStyle = gr;
    x.fillRect(0, 0, S, S);
    return cv;
  });
}
function spark3(c, p, name) {
  return sprite7("spark" + name + c.acc + c.bg + p.join(), () => {
    const S = 64, hc = S / 2, cv = mk7(S, S), x = cv.getContext("2d");
    const gr = x.createRadialGradient(hc, hc, 0, hc, hc, hc);
    gr.addColorStop(0, rgb4(p, 1));
    gr.addColorStop(0.12, rgb4(p, 0.6));
    gr.addColorStop(0.35, rgb4(p, 0.16));
    gr.addColorStop(1, rgb4(p, 0));
    x.fillStyle = gr;
    x.fillRect(0, 0, S, S);
    return cv;
  });
}
function streak(c, p, name = "") {
  return sprite7("streak" + name + c.acc + c.bg + p.join(), () => {
    const cv = mk7(16, 64), x = cv.getContext("2d"), gr = x.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, rgb4(p, 0.85));
    gr.addColorStop(0.35, rgb4(p, 0.35));
    gr.addColorStop(1, rgb4(p, 0));
    x.fillStyle = gr;
    x.fillRect(0, 0, 16, 64);
    x.globalCompositeOperation = "destination-in";
    const hg = x.createLinearGradient(0, 0, 16, 0);
    hg.addColorStop(0, "rgba(0,0,0,0)");
    hg.addColorStop(0.5, "rgba(0,0,0,1)");
    hg.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = hg;
    x.fillRect(0, 0, 16, 64);
    return cv;
  });
}
var _dith5 = null;
function dither6(x, w, h) {
  if (!_dith5) {
    _dith5 = mk7(64, 64);
    const d = _dith5.getContext("2d"), id = d.createImageData(64, 64);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = Math.random() < 0.5 ? 0 : 255;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = 255;
    }
    d.putImageData(id, 0, 0);
  }
  if (w < 200) return;
  x.save();
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = "source-atop";
  x.globalAlpha = 0.012;
  x.fillStyle = x.createPattern(_dith5, "repeat");
  x.fillRect(0, 0, x.canvas.width, x.canvas.height);
  x.restore();
}
var fresh3 = (g, c, w, h) => {
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
  g.fillStyle = c.bg;
  g.fillRect(0, 0, w, h);
};
var done3 = (g) => {
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
};
var keyOf5 = (w, h, c) => w + "x" + h + c.acc + c.bg;
var poly2 = (x, pts) => {
  x.beginPath();
  x.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
  x.closePath();
};
function bakeAlley(s, w, h, c) {
  const p0 = tone5(c, 0), hz = haze4(c, 0.5), warm = haze4(c, 0.42, 1), few = small3(w), R = rng8(s.seed + 11);
  const hy = Math.round(h * 0.5), K = Math.max(h * 0.36, w * 0.24), E = 0.85, vx = s.vx * w, ZE = 27;
  const P = (X, Y, z) => [vx + X * K / z, hy + (E - Y) * K / z];
  Object.assign(s, { hy, K, E, vxp: vx });
  const fog = (z) => Math.pow(clamp5(z / ZE, 0, 1), 0.5);
  const cv = mk7(w, h), x = cv.getContext("2d");
  const sg = x.createLinearGradient(0, 0, 0, hy);
  sg.addColorStop(0, MX4(c, p0, 0.05, 0.5));
  sg.addColorStop(1, MX4(c, p0, 0.24, 0.9));
  x.fillStyle = sg;
  x.fillRect(0, 0, w, hy + 1);
  for (let i = 0; i < 10; i++) {
    const z = 48 + R() * 40, X0 = (R() - 0.5) * 16, wd = 1.6 + R() * 3, ht = 7 + R() * 24, [ax, ay] = P(X0, ht, z), [bx, by] = P(X0 + wd, 0, z);
    x.fillStyle = MX4(c, p0, 0.18, 0.66);
    x.fillRect(ax, ay, bx - ax, by - ay);
    x.fillStyle = W6(c, 0.22);
    for (let j = 0; j < (few ? 2 : 14); j++) x.fillRect(ax + R() * (bx - ax), ay + R() * (by - ay) * 0.9, 1, 1);
    x.fillStyle = AP6(c, 0, 0.8);
    x.fillRect((ax + bx) / 2 - 0.75, ay - 1.5, 1.5, 1.5);
  }
  const gg = x.createLinearGradient(0, hy, 0, h);
  gg.addColorStop(0, MX4(c, p0, 0.24, 0.8));
  gg.addColorStop(0.12, MX4(c, p0, 0.1, 0.45));
  gg.addColorStop(1, MX4(c, p0, 0.05, 0.28));
  x.fillStyle = gg;
  x.fillRect(0, hy, w, h - hy);
  x.globalCompositeOperation = "screen";
  for (const sh of s.shops) {
    const zm = (sh.za + sh.zb) / 2, [gx, gy] = P(sh.sd * 0.7, 0, zm), rx = 1.1 * K / zm, ry = rx * clamp5(E / zm, 0.08, 0.7);
    x.globalAlpha = 0.2;
    x.drawImage(puff3(c, warm, "sjw"), gx - rx, gy - ry, rx * 2, ry * 2);
  }
  {
    const r = h * 0.55;
    x.globalAlpha = 0.4;
    x.drawImage(puff3(c, p0, "sjg"), vx - r, hy - r * 0.7, r * 2, r * 1.4);
  }
  x.globalAlpha = 1;
  x.globalCompositeOperation = "source-over";
  for (const sd of [-1, 1]) {
    const fac = sd < 0 ? s.L : s.Rt;
    for (let i = fac.length - 1; i >= 0; i--) {
      const f = fac[i], A2 = P(sd, 0, f.z1), B = P(sd, 0, f.z2);
      const col = (z) => MX4(c, p0, 0.08 + 0.32 * fog(z) + 0.06 * f.k, 0.32 + 0.46 * fog(z)), gr = x.createLinearGradient(A2[0], 0, B[0], 0);
      gr.addColorStop(0, col(f.z1));
      gr.addColorStop(1, col(f.z2));
      x.fillStyle = gr;
      poly2(x, [A2, P(sd, f.hb, f.z1), P(sd, f.hb, f.z2), B]);
      x.fill();
      x.fillStyle = MX4(c, p0, 0.03 + 0.2 * fog(f.z2), 0.2 + 0.3 * fog(f.z2));
      poly2(x, [P(sd, 1.92, f.z1), P(sd, 2.06, f.z1), P(sd, 2.06, f.z2), P(sd, 1.92, f.z2)]);
      x.fill();
      const S0 = P(sd, 0, f.z1), S1 = P(sd, f.hb, f.z1);
      x.strokeStyle = MX4(c, p0, 0.03, 0.18);
      x.lineWidth = Math.max(0.6, K / f.z1 * 0.012);
      x.beginPath();
      x.moveTo(S0[0], S0[1]);
      x.lineTo(S1[0], S1[1]);
      x.stroke();
      if (f.win) {
        const za = f.z1 + (f.z2 - f.z1) * 0.3, zb = f.z2 - (f.z2 - f.z1) * 0.3;
        x.fillStyle = rgb4(warm, (0.28 + 0.3 * f.k) * (1 - 0.4 * fog(za)));
        poly2(x, [P(sd, 2.3, za), P(sd, 2.8, za), P(sd, 2.8, zb), P(sd, 2.3, zb)]);
        x.fill();
      }
    }
  }
  for (const sh of s.shops) {
    const sd = sh.sd, A2 = P(sd, 0, sh.za), B = P(sd, 1.55, sh.za), C2 = P(sd, 1.55, sh.zb), D = P(sd, 0, sh.zb);
    x.fillStyle = rgb4(warm, 0.62 * (1 - 0.5 * fog(sh.za)));
    poly2(x, [A2, B, C2, D]);
    x.fill();
    x.fillStyle = MX4(c, tone5(c, 2), 0.3, 0.5);
    poly2(x, [P(sd, 1.12, sh.za), B, C2, P(sd, 1.12, sh.zb)]);
    x.fill();
    x.strokeStyle = rgb4(warm, 0.5);
    x.lineWidth = Math.max(0.5, K / sh.za * 6e-3);
    for (let j = 1; j < 4; j++) {
      const z = sh.za + (sh.zb - sh.za) * j / 4, a = P(sd, 1.12, z), b = P(sd, 1.55, z);
      x.beginPath();
      x.moveTo(a[0], a[1]);
      x.lineTo(b[0], b[1]);
      x.stroke();
    }
  }
  x.globalCompositeOperation = "screen";
  {
    const r = h * 0.16;
    x.globalAlpha = 0.55;
    x.drawImage(puff3(c, hz, "sjh"), vx - r, hy - r * 0.9, r * 2, r * 1.8);
    x.globalAlpha = 1;
  }
  x.globalCompositeOperation = "source-over";
  for (const wi of s.wires) {
    const z2 = wi.z + wi.dz, zm = (wi.z + z2) / 2, A2 = P(-1, wi.yl, wi.z), B = P(1, wi.yr, z2), M = P(0, (wi.yl + wi.yr) / 2 - wi.sag, zm);
    const qx = 2 * M[0] - (A2[0] + B[0]) / 2, qy = 2 * M[1] - (A2[1] + B[1]) / 2;
    x.strokeStyle = MX4(c, p0, 0.03 + 0.2 * fog(zm), 0.16 + 0.3 * fog(zm));
    x.lineWidth = Math.max(0.5, K / zm * 8e-3);
    for (let j = 0; j < wi.n; j++) {
      const o = j * K / zm * 0.04;
      x.beginPath();
      x.moveTo(A2[0], A2[1] + o);
      x.quadraticCurveTo(qx, qy + o * 1.4, B[0], B[1] + o);
      x.stroke();
    }
  }
  const rf = mk7(w, h - hy), y = rf.getContext("2d");
  y.translate(0, -hy);
  poly2(y, [P(-1, 0, 0.12), P(-1, 0, ZE), P(1, 0, ZE), P(1, 0, 0.12)]);
  y.clip();
  y.globalCompositeOperation = "screen";
  {
    const r = h * 0.07;
    y.globalAlpha = 0.5;
    y.drawImage(streak(c, hz, "sj"), vx - r, hy, r * 2, (h - hy) * 0.8);
  }
  for (const sh of s.shops) {
    const zm = (sh.za + sh.zb) / 2, [gx, gy] = P(sh.sd * 0.97, -0.7, zm), r = 0.9 * K / zm;
    y.globalAlpha = 0.16;
    y.drawImage(puff3(c, warm, "sjw"), gx - r * 0.5, gy - r * 0.6, r, r * 1.6);
  }
  const dark = MX4(c, p0, 0.03, 0.2);
  const items = [...s.signs.map((o) => ({ ...o, ty: 0 })), ...s.lamps.map((o) => ({ ...o, ty: 1 }))].sort((a, b) => b.z - a.z);
  for (const it of items) {
    const col = tone5(c, it.t), hi = haze4(c, 0.55, it.t);
    if (it.ty === 0) {
      const [ax, ay] = P(it.sd, it.y2, it.z), [bx, by] = P(it.sd * (1 - it.wd), it.y1, it.z);
      const l = Math.min(ax, bx), sw = Math.abs(bx - ax), t0 = ay, sh = by - ay;
      x.globalCompositeOperation = "screen";
      x.globalAlpha = 0.3;
      x.drawImage(puff3(c, col, "sjs"), l - sw * 2.2, t0 - sh * 0.3, sw * 5.4, sh * 1.6);
      x.globalAlpha = 1;
      x.globalCompositeOperation = "source-over";
      x.fillStyle = dark;
      x.fillRect(l - sw * 0.07, t0 - sw * 0.07, sw * 1.14, sh + sw * 0.14);
      if (it.neon) {
        x.strokeStyle = rgb4(col, 0.95);
        x.lineWidth = Math.max(0.6, sw * 0.07);
        x.strokeRect(l + sw * 0.12, t0 + sw * 0.12, sw * 0.76, sh - sw * 0.24);
        x.strokeStyle = rgb4(hi, 0.9);
        x.lineWidth = Math.max(0.4, sw * 0.025);
        x.strokeRect(l + sw * 0.12, t0 + sw * 0.12, sw * 0.76, sh - sw * 0.24);
        x.fillStyle = rgb4(col, 0.8);
        for (let j = 1; j < it.seg; j++) x.fillRect(l + sw * 0.3, t0 + sh * j / it.seg - sw * 0.03, sw * 0.4, sw * 0.06);
      } else {
        x.fillStyle = rgb4(col, 0.95);
        x.fillRect(l, t0, sw, sh);
        x.fillStyle = rgb4(hi, 0.92);
        x.fillRect(l + sw * 0.14, t0 + sw * 0.14, sw * 0.72, sh - sw * 0.28);
        x.fillStyle = rgb4(col, 0.85);
        for (let j = 1; j < it.seg; j++) x.fillRect(l + sw * 0.14, t0 + sh * j / it.seg - sw * 0.04, sw * 0.72, sw * 0.08);
      }
      const r0 = hy + (E + it.y1) * K / it.z, r1 = hy + (E + it.y2) * K / it.z;
      y.globalAlpha = 0.55;
      y.drawImage(streak(c, col, "sj"), l - sw * 0.1, r0, sw * 1.2, (r1 - r0) * 1.9);
      y.globalAlpha = 0.14;
      y.drawImage(puff3(c, col, "sjs"), l - sw * 1.5, r0, sw * 4, (r1 - r0) * 1.6);
    } else {
      const [lx, ly] = P(it.sd * 0.86, it.y, it.z), rx = 0.075 * K / it.z, ry = 0.1 * K / it.z, [, ey] = P(it.sd * 0.86, 1.95, it.z);
      x.strokeStyle = dark;
      x.lineWidth = Math.max(0.5, rx * 0.08);
      x.beginPath();
      x.moveTo(lx, ey);
      x.lineTo(lx, ly - ry);
      x.stroke();
      x.globalCompositeOperation = "screen";
      x.globalAlpha = 0.45;
      x.drawImage(spark3(c, col, "sjl"), lx - rx * 6, ly - rx * 6, rx * 12, rx * 12);
      x.globalAlpha = 1;
      x.globalCompositeOperation = "source-over";
      x.fillStyle = rgb4(col, 0.95);
      x.beginPath();
      x.ellipse(lx, ly, rx, ry, 0, 0, TAU7);
      x.fill();
      x.fillStyle = rgb4(hi, 0.75);
      x.beginPath();
      x.ellipse(lx - rx * 0.1, ly, rx * 0.5, ry * 0.75, 0, 0, TAU7);
      x.fill();
      x.fillStyle = dark;
      x.fillRect(lx - rx * 0.7, ly - ry * 1.05, rx * 1.4, ry * 0.2);
      x.fillRect(lx - rx * 0.7, ly + ry * 0.85, rx * 1.4, ry * 0.2);
      const r0 = hy + (E + it.y) * K / it.z;
      y.globalAlpha = 0.5;
      y.drawImage(streak(c, col, "sj"), lx - rx * 1.1, r0 - ry, rx * 2.2, ry * 7);
    }
  }
  dither6(x, w, h);
  s.img = cv;
  s.refl = rf;
}
function bakeRiver(s, w, h, c) {
  const p0 = tone5(c, 0), p1 = tone5(c, 1), warm = haze4(c, 0.42, 1), few = small3(w), R = rng8(s.seed + 21);
  const H0 = Math.round(h * (w > h ? 0.52 : 0.44)), S = clamp5(h / 900 * 0.8 + w / 1440 * 0.2, 0.45, 1.6);
  Object.assign(s, { H0, S });
  const UH = H0 + Math.ceil(S * 14), up2 = mk7(w, UH), x = up2.getContext("2d");
  const sg = x.createLinearGradient(0, 0, 0, H0);
  sg.addColorStop(0, MX4(c, p0, 0.04, 0.5));
  sg.addColorStop(0.55, MX4(c, p0, 0.1, 0.74));
  sg.addColorStop(1, MX4(c, p1, 0.22, 0.9));
  x.fillStyle = sg;
  x.fillRect(0, 0, w, H0 + 1);
  x.globalCompositeOperation = "screen";
  x.globalAlpha = 0.2;
  x.drawImage(puff3(c, warm, "lrg"), -w * 0.2, H0 - h * 0.3, w * 1.4, h * 0.4);
  x.globalAlpha = 1;
  x.globalCompositeOperation = "source-over";
  const bankH = S * 12, base = H0 - bankH, N = 200;
  const back = norm013(fbm4(N, 7, 4, 0.5, R));
  x.fillStyle = MX4(c, p0, 0.1, 0.46);
  x.beginPath();
  x.moveTo(0, base + 1);
  for (let i = 0; i <= N; i++) x.lineTo(i / N * w, base - S * (100 + 70 * back[i]));
  x.lineTo(w, base + 1);
  x.closePath();
  x.fill();
  for (let i = 0; i < (few ? 2 : 8); i++) {
    const tx = R() * w, ty = base - S * (140 + R() * 50);
    for (let j = 0; j < 46; j++) {
      const a = R() * TAU7, d = Math.sqrt(R()) * S * 46;
      x.beginPath();
      x.arc(tx + Math.cos(a) * d * 1.5, ty + Math.sin(a) * d * 0.55, S * (5 + R() * 9), 0, TAU7);
      x.fill();
    }
    x.fillRect(tx - S * 3, ty, S * 6, base - ty);
  }
  const houses = [], dark = MX4(c, p0, 0.05, 0.3);
  let hx = -R() * S * 60;
  while (hx < w + S * 20) {
    const hw = S * (70 + R() * 60), wallH = S * (72 + R() * 28), roofH = S * (16 + R() * 10), top = base - wallH, midY = top + wallH * 0.47;
    x.fillStyle = MX4(c, warm, 0.26 + R() * 0.1, 0.7);
    x.fillRect(hx, top, hw, wallH);
    const nw = hw > S * 105 ? 3 : 2;
    for (let j = 0; j < nw; j++) {
      const ww = S * 13, wh = S * 17, wx = hx + hw * (j + 0.5) / nw - ww / 2, wy = top + wallH * 0.1;
      if (R() < 0.7) {
        x.fillStyle = rgb4(warm, 0.85);
        x.fillRect(wx, wy, ww, wh);
        x.fillStyle = dark;
        x.fillRect(wx + ww * 0.47, wy, ww * 0.06, wh);
        x.fillRect(wx, wy + wh * 0.48, ww, wh * 0.05);
      } else {
        x.fillStyle = MX4(c, p0, 0.06, 0.34);
        x.fillRect(wx, wy, ww, wh);
      }
      x.fillStyle = MX4(c, tone5(c, 2), 0.22, 0.45);
      x.fillRect(wx - ww * 0.45, wy, ww * 0.4, wh);
      x.fillRect(wx + ww * 1.05, wy, ww * 0.4, wh);
    }
    const dx = hx + hw * 0.1, dw = hw * 0.8, dy = midY + S * 4;
    const gr = x.createLinearGradient(0, dy, 0, base);
    gr.addColorStop(0, rgb4(warm, 0.9));
    gr.addColorStop(1, rgb4(p1, 0.55));
    x.fillStyle = gr;
    x.fillRect(dx, dy, dw, base - dy);
    x.fillStyle = dark;
    for (let j = 0; j <= 3; j++) x.fillRect(dx + dw * j / 3 - S * 1.5, dy, S * 3, base - dy);
    x.fillStyle = MX4(c, p0, 0.05, 0.28);
    poly2(x, [[hx - S * 4, midY + S * 4], [hx + S * 2, midY - S * 6], [hx + hw - S * 2, midY - S * 6], [hx + hw + S * 4, midY + S * 4]]);
    x.fill();
    poly2(x, [[hx - S * 7, top + S * 3], [hx + hw * 0.1, top - roofH], [hx + hw * 0.9, top - roofH], [hx + hw + S * 7, top + S * 3]]);
    x.fill();
    x.strokeStyle = MX4(c, warm, 0.14, 0.5);
    x.lineWidth = Math.max(0.6, S * 1.2);
    x.beginPath();
    x.moveTo(hx + hw * 0.1, top - roofH);
    x.lineTo(hx + hw * 0.9, top - roofH);
    x.stroke();
    houses.push({ hx, hw, top, midY });
    hx += hw + (R() < 0.18 ? S * (12 + R() * 40) : 0);
  }
  s.lamps = [];
  const lantern = (lx, ly, r, ti) => {
    const col = tone5(c, ti), hi = haze4(c, 0.5, ti);
    x.globalCompositeOperation = "screen";
    x.globalAlpha = 0.45;
    x.drawImage(spark3(c, col, "lrs"), lx - r * 6, ly - r * 6, r * 12, r * 12);
    x.globalAlpha = 1;
    x.globalCompositeOperation = "source-over";
    x.fillStyle = rgb4(col, 0.95);
    x.beginPath();
    x.ellipse(lx, ly, r, r * 1.25, 0, 0, TAU7);
    x.fill();
    x.fillStyle = rgb4(hi, 0.85);
    x.beginPath();
    x.ellipse(lx - r * 0.15, ly, r * 0.45, r * 0.9, 0, 0, TAU7);
    x.fill();
    x.fillStyle = dark;
    x.fillRect(lx - r * 0.55, ly - r * 1.4, r * 1.1, r * 0.3);
    x.fillRect(lx - r * 0.55, ly + r * 1.1, r * 1.1, r * 0.3);
    x.fillRect(lx - r * 0.08, ly + r * 1.4, r * 0.16, r * 0.8);
    s.lamps.push({ x: lx, y: ly, r, ti });
  };
  const string = (x0, x1, y0, sag, step) => {
    const n = Math.max(2, Math.round((x1 - x0) / step));
    x.strokeStyle = dark;
    x.lineWidth = Math.max(0.5, S * 0.8);
    x.beginPath();
    x.moveTo(x0, y0);
    x.quadraticCurveTo((x0 + x1) / 2, y0 + sag * 2, x1, y0);
    x.stroke();
    for (let i = 1; i < n; i++) {
      const u = i / n, lx = x0 + (x1 - x0) * u, cy = y0 + sag * 4 * u * (1 - u);
      x.fillStyle = dark;
      x.fillRect(lx - S * 0.3, cy, S * 0.6, S * 3);
      lantern(lx, cy + S * 8.5, S * (4.8 + R() * 1.6), R() * 3 | 0);
    }
  };
  for (const o of houses) {
    string(o.hx, o.hx + o.hw, o.top + S * 5, S * 7, S * 21);
    if (R() < 0.6) string(o.hx + o.hw * 0.05, o.hx + o.hw * 0.95, o.midY + S * 6, S * 5, S * 26);
  }
  x.fillStyle = MX4(c, p0, 0.07, 0.36);
  x.fillRect(0, base, w, bankH + 1);
  x.fillStyle = MX4(c, warm, 0.16, 0.55);
  x.fillRect(0, base, w, Math.max(1, S * 1.5));
  x.fillStyle = MX4(c, p0, 0.03, 0.22);
  for (let i = 0; i < (few ? 2 : clamp5(Math.round(w / 110), 4, 16)); i++) {
    const fx = R() * w, fh = S * (11 + R() * 4);
    x.fillRect(fx - S * 2.2, base - fh, S * 4.4, fh - S * 2.5);
    x.beginPath();
    x.arc(fx, base - fh - S * 2, S * 2.4, 0, TAU7);
    x.fill();
  }
  const nb = few ? 1 : clamp5(Math.round(w / 320), 2, 6);
  for (let i = 0; i < nb; i++) {
    const bx = (i + 0.2 + R() * 0.6) / nb * w, L = S * (70 + R() * 40), by = H0 + S * 2;
    x.fillStyle = MX4(c, p0, 0.04, 0.26);
    x.beginPath();
    x.moveTo(bx - L / 2, by - S * 7);
    x.quadraticCurveTo(bx - L * 0.3, by + S * 5, bx, by + S * 5);
    x.quadraticCurveTo(bx + L * 0.3, by + S * 5, bx + L / 2, by - S * 9);
    x.lineTo(bx + L * 0.4, by - S * 3);
    x.lineTo(bx - L * 0.4, by - S * 2);
    x.closePath();
    x.fill();
    x.beginPath();
    x.ellipse(bx, by - S * 3, L * 0.2, S * 7, 0, Math.PI, TAU7);
    x.fill();
    lantern(bx + L * 0.42, by - S * 16, S * 3.4, R() * 3 | 0);
  }
  dither6(x, w, UH);
  const WH = h - H0, wt = mk7(w, WH), y = wt.getContext("2d");
  const wg = y.createLinearGradient(0, 0, 0, WH);
  wg.addColorStop(0, MX4(c, p1, 0.14, 0.62));
  wg.addColorStop(1, MX4(c, p0, 0.05, 0.36));
  y.fillStyle = wg;
  y.fillRect(0, 0, w, WH);
  y.save();
  y.globalAlpha = 0.55;
  y.scale(1, -1);
  y.drawImage(up2, 0, 0, up2.width, H0, 0, -H0, up2.width, H0);
  y.restore();
  y.globalCompositeOperation = "screen";
  for (const L of s.lamps) {
    const d = H0 - L.y;
    y.globalAlpha = 0.4;
    y.drawImage(streak(c, tone5(c, L.ti), "lr"), L.x - L.r * 1.4, d - L.r * 2, L.r * 2.8, d * 0.7 + S * 50);
  }
  y.globalAlpha = 1;
  y.globalCompositeOperation = "source-over";
  const fg = y.createLinearGradient(0, 0, 0, WH);
  fg.addColorStop(0, BGA2(c, 0.05));
  fg.addColorStop(1, BGA2(c, 0.55));
  y.fillStyle = fg;
  y.fillRect(0, 0, w, WH);
  y.fillStyle = W6(c, 0.03);
  for (let i = 0; i < (few ? 4 : 60); i++) y.fillRect(R() * w * 0.9, Math.pow(R(), 0.8) * WH, w * (0.03 + R() * 0.15), 1);
  s.up = up2;
  s.water = wt;
}
function bakePerseids(s, w, h, c) {
  const p0 = tone5(c, 0), hz = haze4(c, 0.55), warm = haze4(c, 0.42, 1), few = small3(w), R = rng8(s.seed + 51);
  const base = Math.round(h * (w > h ? 0.64 : 0.6)), N = 300, gx = s.gx * w, G2 = Math.min(w * 0.8, h * 0.62), TH = G2 * 0.6;
  s.base = base;
  const sky = mk7(w, h), x = sky.getContext("2d"), gr = x.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, MX4(c, p0, 0.03, 0.48));
  gr.addColorStop(0.5 * base / h, MX4(c, tone5(c, 2), 0.07, 0.66));
  gr.addColorStop(base / h, MX4(c, p0, 0.16, 0.86));
  gr.addColorStop(1, MX4(c, p0, 0.1, 0.6));
  x.fillStyle = gr;
  x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = "screen";
  x.globalAlpha = 0.1;
  x.drawImage(puff3(c, haze4(c, 0.5, 2), "psa"), -w * 0.3, base - h * 0.3, w * 1.6, h * 0.42);
  const A2 = [s.mw.ax * w, s.mw.ay * h], B = [s.mw.bx * w, s.mw.by * h], dx = B[0] - A2[0], dy = B[1] - A2[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, Wd = Math.min(w, h) * 0.14;
  const gs = () => (R() + R() + R() - 1.5) / 1.5;
  const mp = puff3(c, haze4(c, 0.55, 2), "psm"), mq = puff3(c, haze4(c, 0.5), "psn");
  for (let i = 0; i < (few ? 40 : 560); i++) {
    const u = R(), o = gs() * Wd * 0.9, r = Wd * (0.25 + R() * 0.5) * (1 - Math.abs(o) / Wd * 0.5);
    x.globalAlpha = 0.02 + R() * 0.026;
    x.drawImage(R() < 0.3 ? mq : mp, A2[0] + dx * u + nx * o - r, A2[1] + dy * u + ny * o - r, r * 2, r * 2);
  }
  x.globalAlpha = 1;
  const sr = Math.min(1, w / 1e3);
  for (let i = 0; i < (few ? 60 : 2400); i++) {
    const u = R(), o = gs() * Wd * 0.7;
    x.fillStyle = W6(c, 0.05 + R() * R() * 0.5);
    const r = Math.max(0.5, (0.4 + R() * 0.8) * sr);
    x.fillRect(A2[0] + dx * u + nx * o, A2[1] + dy * u + ny * o, r, r);
  }
  x.globalCompositeOperation = "source-over";
  const dk = puff3(c, [c.br, c.bg2, c.bb], "psd");
  for (let i = 0; i < (few ? 8 : 170); i++) {
    const u = R(), o = (Math.sin(u * 8 + s.mw.ph) * 0.22 + (R() - 0.5) * 0.25) * Wd, r = Wd * (0.1 + R() * 0.22);
    x.globalAlpha = 0.07 + R() * 0.08;
    x.drawImage(dk, A2[0] + dx * u + nx * o - r, A2[1] + dy * u + ny * o - r, r * 2, r * 2);
  }
  x.globalAlpha = 1;
  x.globalCompositeOperation = "screen";
  for (let i = 0; i < (few ? 30 : 700); i++) {
    const sy = Math.pow(R(), 1.2) * base;
    x.fillStyle = W6(c, (0.06 + R() * R() * 0.55) * (1 - 0.5 * sy / base));
    const r = Math.max(0.5, (0.5 + R()) * sr);
    x.fillRect(R() * w, sy, r, r);
  }
  const bs = spark3(c, hz, "psx");
  for (let i = 0; i < (few ? 4 : 28); i++) {
    const px = R() * w, py = R() * base * 0.9, r = (3 + R() * 5) * Math.max(0.6, sr);
    x.globalAlpha = 0.35 + R() * 0.35;
    x.drawImage(bs, px - r, py - r, r * 2, r * 2);
    x.fillStyle = W6(c, 0.9);
    x.fillRect(px - 0.7, py - 0.7, 1.4, 1.4);
  }
  x.globalAlpha = 1;
  x.globalCompositeOperation = "source-over";
  dither6(x, w, h);
  s.sky = sky;
  const land = mk7(w, h), y = land.getContext("2d"), X = (i) => i / N * w;
  const far = norm013(fbm4(N, 9, 5, 0.55, R)), mid = norm013(fbm4(N, 6, 5, 0.55, R)), fg = norm013(fbm4(N, 3, 4, 0.5, R));
  const ridge2 = (yy, col) => {
    y.fillStyle = col;
    y.beginPath();
    y.moveTo(-2, h + 2);
    for (let i = 0; i <= N; i++) y.lineTo(X(i), yy(i));
    y.lineTo(w + 2, h + 2);
    y.closePath();
    y.fill();
  };
  ridge2((i) => base + h * 0.01 - h * 0.12 * Math.pow(far[i], 1.5), MX4(c, p0, 0.17, 0.62));
  const bY = base + h * 0.02;
  const tower = (x0, x1, top, pointed) => {
    const wd = x1 - x0, lt = wd * 0.09, rt = wd * 0.12, pts = [[x0 - wd * 0.12, bY]];
    for (let k = 1; k <= 8; k++) {
      const f = k / 8;
      pts.push([x0 + lt * f * f + (R() - 0.5) * wd * 0.03, bY + (top + wd * 0.06 - bY) * f]);
    }
    if (pointed) pts.push([x0 + wd * 0.25, top - wd * 0.15], [x0 + wd * 0.4, top - wd * 0.42], [x0 + wd * 0.48, top - wd * 0.36], [x0 + wd * 0.6, top - wd * 0.2], [x0 + wd * 0.85, top + wd * 0.05]);
    else for (let k = 0; k <= 9; k++) {
      const u = k / 9;
      pts.push([x0 + lt + (wd - lt - rt) * u, top - wd * 0.05 * Math.sin(u * Math.PI) + u * wd * 0.1 + (R() - 0.5) * wd * 0.03]);
    }
    const sh = top + (bY - top) * (0.18 + R() * 0.15);
    pts.push([x1 - rt, sh], [x1 - rt * 0.2, sh + wd * 0.04]);
    for (let k = 1; k <= 6; k++) {
      const f = k / 6;
      pts.push([x1 - rt * 0.2 * (1 - f) + (R() - 0.5) * wd * 0.03, sh + wd * 0.04 + (bY - sh - wd * 0.04) * f]);
    }
    pts.push([x1 + wd * 0.12, bY]);
    const g2 = y.createLinearGradient(x0, 0, x1, 0);
    g2.addColorStop(0, MX4(c, p0, 0.16, 0.54));
    g2.addColorStop(0.45, MX4(c, p0, 0.11, 0.46));
    g2.addColorStop(1, MX4(c, p0, 0.07, 0.36));
    y.fillStyle = g2;
    poly2(y, pts);
    y.fill();
    y.save();
    y.clip();
    y.strokeStyle = MX4(c, p0, 0.05, 0.3, 0.6);
    y.lineWidth = Math.max(0.6, wd * 0.012);
    for (let k = 0; k < (few ? 1 : 7); k++) {
      let px = x0 + wd * (0.1 + R() * 0.8), py = top + R() * wd * 0.2;
      y.beginPath();
      y.moveTo(px, py);
      while (py < bY) {
        px += (R() - 0.5) * wd * 0.04;
        py += wd * (0.05 + R() * 0.08);
        y.lineTo(px, py);
      }
      y.stroke();
    }
    y.strokeStyle = W6(c, 0.035);
    y.lineWidth = Math.max(0.6, wd * 8e-3);
    for (let k = 0; k < (few ? 0 : 4); k++) {
      const ly = top + (bY - top) * (0.2 + k * 0.2 + R() * 0.08);
      y.beginPath();
      y.moveTo(x0 - wd * 0.1, ly);
      y.lineTo(x1 + wd * 0.1, ly + (R() - 0.5) * wd * 0.05);
      y.stroke();
    }
    y.restore();
  };
  tower(gx - 0.53 * G2, gx - 0.46 * G2, bY - TH * 0.45, true);
  tower(gx - 0.48 * G2, gx - 0.25 * G2, bY - TH * 0.7, true);
  tower(gx - 0.2 * G2, gx + 0.14 * G2, bY - TH, false);
  tower(gx + 0.19 * G2, gx + 0.49 * G2, bY - TH * 0.92, false);
  y.fillStyle = MX4(c, p0, 0.12, 0.48);
  y.beginPath();
  y.moveTo(gx - G2 * 0.9, bY + h * 0.03);
  y.quadraticCurveTo(gx - G2 * 0.3, bY - TH * 0.2, gx, bY - TH * 0.14);
  y.quadraticCurveTo(gx + G2 * 0.35, bY - TH * 0.2, gx + G2 * 0.95, bY + h * 0.03);
  y.closePath();
  y.fill();
  ridge2((i) => {
    const d = Math.abs(X(i) - gx) / Math.max(w * 0.5, G2 * 0.8);
    return base + h * 0.05 - h * 0.24 * sstep5(0.35, 0.9, d) * (0.35 + 0.65 * Math.pow(mid[i], 1.2));
  }, MX4(c, p0, 0.07, 0.36));
  const fy0 = h * (w > h ? 0.82 : 0.8), hx = s.hx * w, kw = Math.max(w * 0.16, h * 0.12);
  const fgY = (px, i) => fy0 - h * 0.05 * fg[i] - h * 0.07 * Math.exp(-(((px - hx) / kw) ** 2));
  ridge2((i) => fgY(X(i), i), MX4(c, p0, 0.04, 0.25));
  y.strokeStyle = W6(c, 0.05);
  y.lineWidth = Math.max(0.6, h / 900);
  y.beginPath();
  for (let i = 0; i <= N; i++) i ? y.lineTo(X(i), fgY(X(i), i)) : y.moveTo(X(i), fgY(X(i), i));
  y.stroke();
  {
    const gY = fgY(hx, Math.round(hx / w * N)) + 2, HW = Math.min(w, h) * 0.12, HH = HW * 0.5, dark = MX4(c, p0, 0.05, 0.3), roof = MX4(c, p0, 0.03, 0.2);
    y.globalCompositeOperation = "screen";
    y.globalAlpha = 0.16;
    y.drawImage(puff3(c, warm, "psw"), hx - HW * 1.6, gY - HW * 0.2, HW * 3.2, HW * 0.55);
    y.globalAlpha = 1;
    y.globalCompositeOperation = "source-over";
    const ax = hx + HW * 0.5 * s.side;
    y.fillStyle = dark;
    y.fillRect(Math.min(ax, ax + HW * 0.38 * s.side), gY - HH * 0.55, HW * 0.38, HH * 0.55 + 4);
    y.fillStyle = roof;
    poly2(y, [[ax - (s.side < 0 ? HW * 0.4 : 0), gY - HH * 0.55], [ax + (s.side > 0 ? HW * 0.4 : 0), gY - HH * 0.55], [ax + HW * 0.2 * s.side, gY - HH * 0.8]]);
    y.fill();
    y.fillStyle = dark;
    y.fillRect(hx - HW / 2, gY - HH, HW, HH + 4);
    y.fillStyle = roof;
    poly2(y, [[hx - HW * 0.56, gY - HH], [hx - HW * 0.38, gY - HH - HW * 0.22], [hx + HW * 0.38, gY - HH - HW * 0.22], [hx + HW * 0.56, gY - HH]]);
    y.fill();
    y.fillRect(hx + HW * 0.2, gY - HH - HW * 0.3, HW * 0.06, HW * 0.12);
    const ws = HW * 0.055, glow = spark3(c, warm, "psh");
    for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) {
      if (R() < 0.25) continue;
      const wx = hx - HW * 0.36 + k * HW * 0.24, wy = gY - HH * (r ? 0.38 : 0.78);
      y.globalCompositeOperation = "screen";
      y.globalAlpha = 0.55;
      y.drawImage(glow, wx - ws * 4, wy - ws * 4, ws * 8, ws * 8);
      y.globalAlpha = 1;
      y.globalCompositeOperation = "source-over";
      y.fillStyle = rgb4(warm, 0.95);
      y.fillRect(wx - ws / 2, wy - ws * 0.6, ws, ws * 1.2);
    }
  }
  dither6(y, w, h);
  s.land = land;
}
var SCENES_NIGHTPLACES = [
  {
    name: "Shinjuku Rain",
    flav: "Cinematic",
    reset: () => {
      const seed = Math.random() * 1e9 | 0, R = rng8(seed);
      const side = () => {
        const f = [];
        let z = 0.12;
        while (z < 28) {
          const len = 0.7 + R() * 2.4 * (0.4 + z / 27);
          f.push({ z1: z, z2: z + len, hb: 2.4 + R() * 1.3, k: R(), lit: R() < 0.5, win: R() < 0.45 });
          z += len;
        }
        return f;
      };
      const L = side(), Rt = side(), shops = [], signs = [], lamps = [];
      for (const [sd, fac] of [[-1, L], [1, Rt]]) for (const f of fac) if (f.lit) shops.push({ sd, za: f.z1 + (f.z2 - f.z1) * 0.12, zb: f.z2 - (f.z2 - f.z1) * 0.12 });
      for (const sd of [-1, 1]) for (let i = 0; i < 14; i++) {
        const y1 = 2.1 + R() * 0.5;
        signs.push({ sd, z: 0.6 + Math.pow(R(), 1.3) * 17, y1, y2: y1 + 0.7 + R() * 1.2, wd: 0.16 + R() * 0.12, t: R() * 3 | 0, seg: 1 + (R() * 4 | 0), neon: R() < 0.3 });
      }
      for (const sd of [-1, 1]) for (let i = 0; i < 9; i++) lamps.push({ sd, z: 0.85 + Math.pow(R(), 1.2) * 14, y: 1.72, t: R() < 0.8 ? 0 : 1 });
      return {
        seed,
        vx: 0.5 + (R() - 0.5) * 0.12,
        L,
        Rt,
        shops,
        signs,
        lamps,
        wires: Array.from({ length: 8 }, () => ({ z: 1.2 + R() * 14, dz: (R() - 0.5) * 2.5, yl: 2.6 + R() * 0.9, yr: 2.6 + R() * 0.9, sag: 0.15 + R() * 0.35, n: 1 + (R() * 3 | 0) })),
        drops: Array.from({ length: 280 }, () => ({ x: R() * 1.1 - 0.05, y: R(), v: 0.7 + R() * 0.5, d: R() })),
        splash: Array.from({ length: 50 }, (_, i) => ({ i, sp: 0.55 + R() * 0.5, ph: R() })),
        key: ""
      };
    },
    frame: (g, w, h, t, c, s) => {
      const key = keyOf5(w, h, c);
      if (s.key !== key) {
        bakeAlley(s, w, h, c);
        s.key = key;
      }
      const tt = t * 1e-3, few = small3(w), hy = s.hy, K = s.K, E = s.E, vx = s.vxp;
      fresh3(g, c, w, h);
      g.drawImage(s.img, 0, 0);
      g.globalCompositeOperation = "screen";
      g.globalAlpha = 0.9;
      const rows = few ? 6 : 26, sh = (h - hy) / rows, sc = Math.min(w, h * 1.6) / 1440;
      for (let k = 0; k < rows; k++) {
        const sy = k * sh, off = (Math.sin(tt * 1.1 + k * 0.83) + 0.5 * Math.sin(tt * 2.3 - k * 1.7)) * (0.3 + k / rows * 2.4) * sc;
        g.drawImage(s.refl, 0, sy, s.refl.width, sh, off, hy + sy, s.refl.width, sh + 0.5);
      }
      g.globalAlpha = 1;
      g.lineCap = "round";
      const list = few ? s.drops.slice(0, 30) : s.drops;
      for (const [lo, hi, a, lw] of [[0, 0.65, 0.09, 0.6], [0.65, 1.01, 0.2, 1.1]]) {
        g.strokeStyle = W6(c, a);
        g.lineWidth = Math.max(0.5, lw * Math.min(1.4, h / 900));
        g.beginPath();
        for (const d of list) {
          if (d.d < lo || d.d >= hi) continue;
          const L = h * (0.018 + 0.05 * d.d), y = (d.y + tt * d.v) % 1 * (h + L * 2) - L, xx = d.x * w + y / h * w * 0.03;
          g.moveTo(xx, y);
          g.lineTo(xx + L * 0.1, y + L);
        }
        g.stroke();
      }
      for (const sp of few ? s.splash.slice(0, 6) : s.splash) {
        const cyc = tt * sp.sp + sp.ph, n = Math.floor(cyc), a = cyc - n;
        if (a > 0.45) continue;
        const z = 0.5 + Math.pow(hsh2(n * 3.3 + sp.i * 1.7), 1.5) * 8, X = hsh2(n * 7.1 + sp.i * 2.9) * 1.9 - 0.95, sx = vx + X * K / z, sy = hy + E * K / z;
        if (sy > h + 4) continue;
        const u = a / 0.45, rx = 0.09 * K / z * u, ry = rx * clamp5(E / z * 1.2, 0.1, 0.5);
        g.strokeStyle = W6(c, 0.3 * (1 - u));
        g.lineWidth = Math.max(0.5, K / z * 4e-3);
        g.beginPath();
        g.ellipse(sx, sy, Math.max(0.5, rx), Math.max(0.3, ry), 0, 0, TAU7);
        g.stroke();
      }
      done3(g);
    }
  },
  {
    name: "Lantern River",
    flav: "Artscape",
    reset: () => {
      const seed = Math.random() * 1e9 | 0, R = rng8(seed);
      return { seed, floats: Array.from({ length: 46 }, () => ({ x: R() * 1.2, d: Math.pow(R(), 0.85), v: 4e-3 + R() * 5e-3, ph: R() * 6.3, ti: R() < 0.55 ? 1 : R() < 0.5 ? 0 : 2, sz: 0.8 + R() * 0.45 })).sort((a, b) => a.d - b.d), key: "" };
    },
    frame: (g, w, h, t, c, s) => {
      const key = keyOf5(w, h, c);
      if (s.key !== key) {
        bakeRiver(s, w, h, c);
        s.key = key;
      }
      const tt = t * 1e-3, few = small3(w), H0 = s.H0, S = s.S;
      fresh3(g, c, w, h);
      g.fillStyle = MX4(c, tone5(c, 0), 0.08, 0.45);
      g.fillRect(0, H0, w, h - H0);
      const rows = few ? 6 : 32, sh = (h - H0) / rows, sc = Math.min(w, h * 1.6) / 1440;
      for (let k = 0; k < rows; k++) {
        const sy = k * sh, off = Math.sin(tt * 0.7 + k * 0.55) * (0.4 + k / rows * 4.5) * sc;
        g.drawImage(s.water, 0, sy, s.water.width, sh, off, H0 + sy, s.water.width, sh + 0.5);
      }
      g.drawImage(s.up, 0, 0);
      g.globalCompositeOperation = "screen";
      for (const L of few ? s.floats.filter((_, i) => i % 5 === 0) : s.floats) {
        const d = L.d, r = S * (1.6 + 9 * d) * L.sz, u = ((L.x + tt * L.v * (0.35 + 0.9 * d)) % 1.2 + 1.2) % 1.2 - 0.1;
        const xx = u * w + Math.sin(tt * 0.3 + L.ph) * r * 0.6, y0 = H0 + (h - H0) * (0.03 + 0.97 * Math.pow(d, 1.35)) + Math.sin(tt * 0.9 + L.ph) * r * 0.08;
        const col = tone5(c, L.ti), hi = haze4(c, 0.5, L.ti);
        g.globalAlpha = 0.22 + 0.06 * Math.sin(tt * 2.1 + L.ph);
        g.drawImage(puff3(c, col, "lrw"), xx - r * 6, y0 - r * 0.9, r * 12, r * 2.4);
        g.globalAlpha = 0.4;
        g.drawImage(streak(c, col, "lr"), xx - r * 0.45, y0 + r * 0.2, r * 0.9, r * 4.5);
        g.globalAlpha = 0.55;
        g.drawImage(spark3(c, col, "lrf"), xx - r * 3, y0 - r * 3.4, r * 6, r * 6);
        g.globalAlpha = 1;
        g.fillStyle = rgb4(col, 0.9);
        g.fillRect(xx - r * 0.55, y0 - r * 0.9, r * 1.1, r * 0.9);
        g.fillStyle = rgb4(hi, 0.95);
        g.fillRect(xx - r * 0.3, y0 - r * 0.75, r * 0.6, r * 0.6);
        g.fillStyle = W6(c, 0.9);
        g.fillRect(xx - r * 0.1, y0 - r * 0.5, r * 0.2, r * 0.25);
      }
      done3(g);
    }
  },
  {
    name: "Perseids",
    flav: "Artscape",
    reset: () => {
      const seed = Math.random() * 1e9 | 0, R = rng8(seed), left = R() < 0.5;
      return {
        seed,
        hseed: seed % 1e3 / 7,
        gx: 0.5 + (R() - 0.5) * 0.2,
        hx: R() < 0.5 ? 0.14 + R() * 0.14 : 0.72 + R() * 0.14,
        side: R() < 0.5 ? -1 : 1,
        mw: { ax: left ? -0.05 : 1.05, ay: 0.72, bx: left ? 0.75 + R() * 0.3 : 0.25 - R() * 0.3, by: -0.15, ph: R() * 6 },
        rad: { x: R() < 0.5 ? -0.25 : 1.25, y: -0.4 },
        key: ""
      };
    },
    frame: (g, w, h, t, c, s) => {
      const key = keyOf5(w, h, c);
      if (s.key !== key) {
        bakePerseids(s, w, h, c);
        s.key = key;
      }
      const tt = t * 1e-3, hz = haze4(c, 0.55), tr = haze4(c, 0.45, 2);
      fresh3(g, c, w, h);
      g.drawImage(s.sky, 0, 0);
      g.globalCompositeOperation = "screen";
      g.lineCap = "round";
      const PER = 2.4, k0 = Math.floor(tt / PER), rx = s.rad.x * w, ry = s.rad.y * h, M = Math.max(w, h), lw = Math.max(0.8, Math.min(1.6, h / 700));
      for (let k = k0 - 1; k <= k0; k++) {
        const q = (n) => hsh2(k * 7.31 + n * 1.97 + s.hseed);
        if (q(0) > 0.6) continue;
        const st = k * PER + q(1) * PER * 0.6, dur = 0.4 + q(2) * 0.7, p = (tt - st) / dur;
        if (p < 0 || p > 2.2) continue;
        const sx = (0.04 + q(3) * 0.92) * w, sy = (0.03 + q(4) * 0.5) * s.base;
        let dx = sx - rx, dy = sy - ry;
        const dl = Math.hypot(dx, dy) || 1;
        dx /= dl;
        dy /= dl;
        const big = q(6) > 0.84, L = (0.05 + 0.13 * q(5)) * M * (big ? 1.5 : 1), pp = Math.min(1, p), hx = sx + dx * L * pp, hy = sy + dy * L * pp;
        if (p <= 1) {
          const f = Math.pow(Math.sin(pp * Math.PI), 0.6), tl = L * Math.min(pp, 0.5), tx = hx - dx * tl, ty = hy - dy * tl;
          const gr = g.createLinearGradient(tx, ty, hx, hy);
          gr.addColorStop(0, W6(c, 0));
          gr.addColorStop(1, W6(c, 0.9 * f));
          g.strokeStyle = gr;
          g.lineWidth = lw * (big ? 1.8 : 1);
          g.beginPath();
          g.moveTo(tx, ty);
          g.lineTo(hx, hy);
          g.stroke();
          const r = lw * (big ? 12 : 5);
          g.globalAlpha = f * (big ? 0.9 : 0.55);
          g.drawImage(spark3(c, big ? tr : hz, big ? "psb" : "psm"), hx - r, hy - r, r * 2, r * 2);
          g.globalAlpha = 1;
        }
        if (big && p > 0.5) {
          g.strokeStyle = rgb4(tr, 0.22 * (1 - sstep5(0.5, 2.2, p)));
          g.lineWidth = lw * 2.2;
          g.beginPath();
          g.moveTo(sx + dx * L * 0.25, sy + dy * L * 0.25);
          g.lineTo(sx + dx * L * 0.9, sy + dy * L * 0.9);
          g.stroke();
        }
      }
      g.globalCompositeOperation = "source-over";
      g.drawImage(s.land, 0, 0);
      done3(g);
    }
  }
];

// from physicsPhase.ts
var TAU8 = Math.PI * 2;
var clamp6 = (v, a, b) => v < a ? a : v > b ? b : v;
var sstep6 = (e0, e1, x) => {
  const u = clamp6((x - e0) / (e1 - e0), 0, 1);
  return u * u * (3 - 2 * u);
};
var rgba4 = (v, a) => `rgba(${v[0] | 0},${v[1] | 0},${v[2] | 0},${a})`;
function mk8(w, h) {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  return cv;
}
function rng9(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function tick3(s, t) {
  const dt = s.lt == null || t < s.lt ? 16.7 : Math.min(100, t - s.lt);
  s.lt = t;
  return dt;
}
function hueOf2(p) {
  const r = p[0] / 255, g = p[1] / 255, b = p[2] / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d < 1e-6) return 0;
  let h = mx === r ? (g - b) / d % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}
var lift = (p) => {
  const m = Math.max(p[0], p[1], p[2], 1), k = m < 215 ? 215 / m : 1;
  return [Math.min(255, p[0] * k), Math.min(255, p[1] * k), Math.min(255, p[2] * k)];
};
var _rk = "";
var _rg = [];
var _ra = 0;
function ringOf(c) {
  const key = c.pal.map((p) => p.join(",")).join(";") + (c.light ? "L" : "");
  if (key === _rk) return;
  _rk = key;
  const it = c.pal.map((p, i) => ({ p: c.light ? p.slice() : lift(p), h: hueOf2(p), i }));
  it.sort((a, b) => a.h - b.h);
  _rg = it.map((o) => o.p);
  _ra = it.findIndex((o) => o.i === 0);
}
var span = (c, x) => x * (c.pal.length >= 6 ? 1 : 0.45);
function tone6(c, pos) {
  ringOf(c);
  const n = _rg.length, f = Math.floor(pos);
  let u = pos - f;
  u = u * u * (3 - 2 * u);
  const a = _rg[((_ra + f) % n + n) % n], b = _rg[((_ra + f + 1) % n + n) % n];
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}
var BUDGET = 52e4;
function dens(w, h, budget, NB2 = 4) {
  const S = Math.max(1, Math.sqrt(w * h / budget));
  const bw = Math.max(2, Math.round(w / S)), bh = Math.max(2, Math.round(h / S));
  const cv = mk8(bw, bh), x = cv.getContext("2d");
  const img = x.createImageData(bw, bh), n = bw * bh;
  const bl = mk8(Math.max(2, Math.round(bw / 7)), Math.max(2, Math.round(bh / 7)));
  const blx = bl.getContext("2d");
  blx.imageSmoothingEnabled = true;
  blx.imageSmoothingQuality = "high";
  NB2 = bh < 60 ? 1 : NB2;
  return {
    bw,
    bh,
    n,
    k: bw / w,
    cv,
    x,
    img,
    px: new Uint32Array(img.data.buffer),
    // two channels, interleaved: a deposit touches one cache line, not two
    v: new Float32Array(n * 2),
    ref: 0,
    bl,
    blx,
    NB: NB2,
    fr: 0,
    bt: new Float64Array(NB2).fill(-1),
    bs: new Float64Array(NB2),
    bc: new Float64Array(NB2)
  };
}
function develop(D, c, T, tau, t, gain, hot, add = false, all = false) {
  if (all || D.NB === 1) {
    for (let b = 0; b < D.NB; b++) developBand(D, c, T, tau, t, gain, hot, add, b);
  } else developBand(D, c, T, tau, t, gain, hot, add, D.fr++ % D.NB);
  let s = 0, n = 0;
  for (let b = 0; b < D.NB; b++) {
    s += D.bs[b];
    n += D.bc[b];
  }
  if (n) {
    const m = s / n;
    D.ref = D.ref ? D.ref + (m - D.ref) * 0.06 : m;
  }
}
function developBand(D, c, T, tau, t, gain, hot, add, band) {
  const V = D.v, px = D.px;
  const lt = D.bt[band], decay = tau > 0 && lt >= 0 ? Math.exp(-Math.max(0, t - lt) / tau) : tau > 0 ? 1 : 0;
  D.bt[band] = t;
  const bw = D.bw;
  const br = add ? 0 : c.br, bg = add ? 0 : c.bg2, bb = add ? 0 : c.bb;
  const bgp = (4278190080 | bb << 16 | bg << 8 | br) >>> 0;
  const k = 1 / (Math.max(D.ref, 1e-4) * gain);
  const hw = c.light ? 0 : hot;
  const t0 = T[0], t1 = T[1];
  const r0 = t0[0], g0 = t0[1], b0 = t0[2], r1 = t1[0], g1 = t1[1], b1 = t1[2];
  let sum = 0, cnt = 0;
  for (let row = band; row < D.bh; row += D.NB) for (let i = row * bw, n = i + bw; i < n; i++) {
    const i2 = i << 1, a = V[i2], b = V[i2 + 1], s = a + b;
    if (s < 0.015) {
      if (s !== 0) {
        V[i2] = 0;
        V[i2 + 1] = 0;
      }
      px[i] = bgp;
      continue;
    }
    sum += s;
    cnt++;
    let v = s * k;
    v = v / (1 + v);
    v = v * (1.35 - 0.35 * v);
    const is = v / s;
    let r = (r0 * a + r1 * b) * is, g = (g0 * a + g1 * b) * is, bl = (b0 * a + b1 * b) * is;
    if (hw > 0 && v > 0.6) {
      const u = (v - 0.6) * 2.5, hk = u * u * hw;
      r += (255 - r) * hk;
      g += (255 - g) * hk;
      bl += (255 - bl) * hk;
    }
    r += br;
    g += bg;
    bl += bb;
    px[i] = (4278190080 | (bl > 255 ? 255 : bl) << 16 | (g > 255 ? 255 : g) << 8 | (r > 255 ? 255 : r)) >>> 0;
    V[i2] = a * decay;
    V[i2 + 1] = b * decay;
  }
  D.bs[band] = sum;
  D.bc[band] = cnt;
  D.x.putImageData(D.img, 0, 0);
}
function show(g, D, x, y, w, h, bloom, op = "source-over") {
  g.globalAlpha = 1;
  g.globalCompositeOperation = op;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "medium";
  g.drawImage(D.cv, x, y, w, h);
  if (bloom > 0) {
    D.blx.globalCompositeOperation = "copy";
    D.blx.drawImage(D.cv, 0, 0, D.bl.width, D.bl.height);
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = bloom;
    g.drawImage(D.bl, x, y, w, h);
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
}
var GL_MIN = 200 * 200;
var GL_POINTS = 0;
var GL_LINES = 1;
var VS_Q = `#version 300 es
in vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;
var FS_FADE = `#version 300 es
precision mediump float; uniform float k; out vec4 o; void main() { o = vec4(k); }`;
var VS_P = `#version 300 es
in vec4 a; uniform vec2 res; out vec2 cw;
void main() { gl_Position = vec4(a.x / res.x * 2.0 - 1.0, 1.0 - a.y / res.y * 2.0, 0.0, 1.0); gl_PointSize = 1.0; cw = a.zw; }`;
var FS_P = `#version 300 es
precision highp float; in vec2 cw; out vec4 o; void main() { o = vec4(cw, 0.0, 0.0); }`;
var VS_L = `#version 300 es
in vec3 a; uniform vec4 rot; uniform vec4 cam; uniform vec2 off; uniform vec2 res; out vec2 cw;
void main() {
  float X1 = a.x * rot.x - a.y * rot.y, Y1 = a.x * rot.y + a.y * rot.x, Z = a.z - cam.x;
  float sy0 = Z * rot.z + Y1 * rot.w, dep = Y1 * rot.z - Z * rot.w, f = cam.y / (cam.y + dep);
  vec2 px = vec2(off.x + X1 * f * cam.w, off.y - sy0 * f * cam.w);
  gl_Position = vec4(px.x / res.x * 2.0 - 1.0, 1.0 - px.y / res.y * 2.0, 0.0, 1.0);
  float near = clamp(0.5 - dep * cam.z, 0.0, 1.0), wg = 0.25 + 0.75 * near * near;
  cw = vec2(wg * near, wg * (1.0 - near));
}`;
var FS_T = `#version 300 es
precision highp float;
uniform sampler2D T; uniform vec3 bg, c0, c1; uniform float k, hot, bloom, hz;
out vec4 o;
float crv(float x) { float v = x / (1.0 + x); return v * (1.35 - 0.35 * v); }
// a soft blur from one mip level: four taps half a texel off the pixel, so the
// level's bilinear blocks average away instead of showing as a grid
vec4 soft(vec2 uv, vec2 res, float lod) {
  vec2 d = exp2(lod) / res * 0.75;
  return 0.25 * (textureLod(T, uv + vec2(d.x, d.y), lod) + textureLod(T, uv + vec2(-d.x, d.y), lod) + textureLod(T, uv + vec2(d.x, -d.y), lod) + textureLod(T, uv - d, lod));
}
void main() {
  vec2 res = vec2(textureSize(T, 0)), uv = gl_FragCoord.xy / res;
  vec4 s = texelFetch(T, ivec2(gl_FragCoord.xy), 0), m1 = textureLod(T, uv, 0.8), m = soft(uv, res, 1.6), b = 0.5 * (soft(uv, res, 3.5) + soft(uv, res, 5.5));
  float d = s.r + s.g, dm = m.r + m.g;
  // sparse: haze. Middling: part of a 2x2 mean, to still the grain. Dense: the pixel.
  float a = smoothstep(hz * 0.25, hz, max(d * 0.35, dm) * k);
  vec2 sharp = mix(m1.rg, s.rg, 0.4 + 0.6 * smoothstep(hz, hz * 12.0, d * k));
  vec2 ch = mix(m.rg, sharp, a); float dd = ch.r + ch.g;
  float v = crv(dd * k);
  vec3 col = mix(c1, c0, dd > 1e-6 ? ch.r / dd : 0.5) * v;
  if (hot > 0.0) { float u = clamp((v - 0.6) * 2.5, 0.0, 1.0); col += (vec3(1.0) - col) * u * u * hot; }
  float db = b.r + b.g;
  col += mix(c1, c0, db > 1e-6 ? b.r / db : 0.5) * crv(db * k * 0.7) * bloom;
  o = vec4(min(bg + col, vec3(1.0)), 1.0);
}`;
var G = null;
function glProg(gl, vs, fs) {
  const mkS = (type, src) => {
    const o = gl.createShader(type);
    gl.shaderSource(o, src);
    gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o));
    return o;
  };
  const p = gl.createProgram();
  gl.attachShader(p, mkS(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, mkS(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, /in vec[34] a;/.test(vs) ? "a" : "p");
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) {
    const nm = gl.getActiveUniform(p, i).name;
    u[nm] = gl.getUniformLocation(p, nm);
  }
  return { p, u };
}
function glCtx() {
  if (G === false) return null;
  if (G) {
    if (!G.gl.isContextLost()) return G;
    G = false;
    return null;
  }
  try {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1;
    const gl = cv.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!gl || !gl.getExtension("EXT_color_buffer_float")) {
      G = false;
      return null;
    }
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    G = {
      cv,
      gl,
      quad,
      dyn: gl.createBuffer(),
      res: [],
      fade: glProg(gl, VS_Q, FS_FADE),
      pts: glProg(gl, VS_P, FS_P),
      lor: glProg(gl, VS_L, FS_P),
      tone: glProg(gl, VS_Q, FS_T)
    };
    return G;
  } catch (e) {
    G = false;
    return null;
  }
}
function glRes(w, h) {
  if (w * h < GL_MIN) return null;
  const C = glCtx();
  if (!C) return null;
  const gl = C.gl;
  while (C.res.length >= 3) {
    const o2 = C.res.shift();
    gl.deleteTexture(o2.tex);
    gl.deleteFramebuffer(o2.fbo);
    if (o2.vbo) gl.deleteBuffer(o2.vbo);
    o2.dead = true;
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texStorage2D(gl.TEXTURE_2D, Math.floor(Math.log2(Math.max(w, h))) + 1, gl.RGBA16F, w, h);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteTexture(tex);
    gl.deleteFramebuffer(fbo);
    G = false;
    return null;
  }
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  const o = { tex, fbo, w, h, dead: false, vbo: null };
  C.res.push(o);
  return o;
}
var glOK = (o) => !!o && !o.dead && !!G && !G.gl.isContextLost();
function glBegin(o, fade) {
  const gl = G.gl, i = G.res.indexOf(o);
  if (i >= 0 && i !== G.res.length - 1) {
    G.res.splice(i, 1);
    G.res.push(o);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, o.fbo);
  gl.viewport(0, 0, o.w, o.h);
  if (fade <= 0) {
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  } else if (fade < 1) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ZERO, gl.SRC_COLOR);
    gl.useProgram(G.fade.p);
    gl.uniform1f(G.fade.u.k, fade);
    gl.bindBuffer(gl.ARRAY_BUFFER, G.quad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
}
function glDraw(o, data, n, mode) {
  if (n <= 0) return;
  const gl = G.gl;
  gl.useProgram(G.pts.p);
  gl.uniform2f(G.pts.u.res, o.w, o.h);
  gl.bindBuffer(gl.ARRAY_BUFFER, G.dyn);
  gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, n * 4), gl.STREAM_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
  gl.drawArrays(mode, 0, n);
}
function glShow(g, o, c, T, k, hot, bloom, hz, add = false) {
  const gl = G.gl, P = G.tone;
  gl.disable(gl.BLEND);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, o.tex);
  gl.generateMipmap(gl.TEXTURE_2D);
  if (G.cv.width !== o.w || G.cv.height !== o.h) {
    G.cv.width = o.w;
    G.cv.height = o.h;
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, o.w, o.h);
  gl.useProgram(P.p);
  gl.uniform1i(P.u.T, 0);
  if (add) gl.uniform3f(P.u.bg, 0, 0, 0);
  else gl.uniform3f(P.u.bg, c.br / 255, c.bg2 / 255, c.bb / 255);
  gl.uniform3f(P.u.c0, T[0][0] / 255, T[0][1] / 255, T[0][2] / 255);
  gl.uniform3f(P.u.c1, T[1][0] / 255, T[1][1] / 255, T[1][2] / 255);
  gl.uniform1f(P.u.k, k);
  gl.uniform1f(P.u.hot, c.light ? 0 : hot);
  gl.uniform1f(P.u.bloom, bloom);
  gl.uniform1f(P.u.hz, hz);
  gl.bindBuffer(gl.ARRAY_BUFFER, G.quad);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  g.globalCompositeOperation = add ? "lighter" : "source-over";
  g.globalAlpha = 1;
  g.drawImage(G.cv, 0, 0, o.w, o.h);
  g.globalCompositeOperation = "source-over";
}
function coarse(w, h) {
  const cw = Math.ceil(w / 8), ch = Math.ceil(h / 8);
  return { cw, ch, a: new Float32Array(cw * ch), ref: 0 };
}
function coarseAdd(K, x, y, wt) {
  const X = x >> 3, Y = y >> 3;
  if (X >= 0 && X < K.cw && Y >= 0 && Y < K.ch) K.a[Y * K.cw + X] += wt;
}
function coarseRef(K, decay) {
  const a = K.a;
  let s = 0, n = 0;
  for (let i = 0; i < a.length; i++) {
    const v = a[i];
    if (v > 0.5) {
      s += v;
      n++;
    }
    a[i] = v * decay;
  }
  const r = n ? s / n / 64 : 1;
  K.ref = K.ref ? K.ref + (r - K.ref) * 0.08 : r;
  return K.ref;
}
var _tb = new Float32Array(5e3);
var _tm = new Uint8Array(1600);
function shapeOK(test, p) {
  test(p, _tb);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i < 5e3; i += 2) {
    const x = _tb[i], y = _tb[i + 1];
    if (!(x === x) || !(y === y) || Math.abs(x) > 1e4 || Math.abs(y) > 1e4) return false;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  const ex = Math.max(x1 - x0, y1 - y0);
  if (ex < 1e-3) return false;
  _tm.fill(0);
  const k = 39.99 / ex;
  let cnt = 0;
  for (let i = 0; i < 5e3; i += 2) {
    const j = ((_tb[i + 1] - y0) * k | 0) * 40 + ((_tb[i] - x0) * k | 0);
    if (!_tm[j]) {
      _tm[j] = 1;
      cnt++;
    }
  }
  return cnt > SHAPE_MIN;
}
var SHAPE_MIN = 360;
function testOf(def) {
  const fake = { x: 0.1, y: 0.13, bb: [0, 0, 0, 0], view: { cx: 0, cy: 0, sc: 1 } };
  return (p, buf) => {
    fake.x = 0.1;
    fake.y = 0.13;
    fake.buf = null;
    def.it(fake, p, 300, null, false);
    fake.buf = buf;
    def.it(fake, p, 2500, null, false);
    fake.buf = null;
  };
}
function attractor(def) {
  const test = testOf(def), lo = def.lo, hi = def.hi, dim = lo.length;
  const real = (q) => q.map((u, i) => lo[i] + (hi[i] - lo[i]) * u);
  const ok = (q) => q.every((u) => u >= 0 && u <= 1) && shapeOK(test, real(q));
  const rnd = () => {
    const v = [];
    let n = 0;
    for (let i = 0; i < dim; i++) {
      const g = Math.random() * 2 - 1;
      v.push(g);
      n += g * g;
    }
    n = Math.sqrt(n) || 1;
    return v.map((g) => g / n);
  };
  const ahead = (q, v, sec) => q.map((u, i) => u + v[i] * def.speed * sec);
  return {
    name: def.name,
    flav: "Phase",
    reset: (w, h) => {
      let q = lo.map(() => Math.random());
      for (let k = 0; k < 80 && !ok(q); k++) q = lo.map(() => Math.random());
      return { D: null, gr: void 0, q, v: rnd(), x: 0.1, y: 0.13, bb: null, view: null, rate: 1, chk: 0, warm: false };
    },
    frame: (g, w, h, t, c, s) => {
      if (s.gr === void 0 || s.gr && !glOK(s.gr)) {
        const had = s.gr !== void 0;
        s.gr = glRes(w, h);
        if (had) s.warm = false;
      }
      const gpu = !!s.gr;
      if (!gpu && !s.D) {
        s.D = dens(w, h, BUDGET);
        s.warm = false;
      }
      const dt = tick3(s, t), D = gpu ? s.FD || (s.FD = { bw: w, bh: h, n: w * h }) : s.D, first = !s.warm;
      s.chk -= dt;
      if (s.chk <= 0) {
        const good = ok(s.q);
        s.rate = good ? 1 : 5;
        s.chk = good ? 600 : 250;
        if (good ? !ok(ahead(s.q, s.v, 3)) || !ok(ahead(s.q, s.v, 6)) : true) {
          let best = null, bd = -1e9;
          for (let k = 0; k < 24; k++) {
            const d = rnd(), dd = d.reduce((a, x, i) => a + x * s.v[i], 0);
            if (good) {
              if (dd > bd && ok(ahead(s.q, d, 3)) && ok(ahead(s.q, d, 6))) {
                bd = dd;
                best = d;
              }
            } else for (const sec of [2, 5, 10]) {
              if (ok(ahead(s.q, d, sec))) {
                const sco = dd - sec;
                if (sco > bd) {
                  bd = sco;
                  best = d;
                }
                break;
              }
            }
          }
          if (best) s.v = best;
        }
      }
      const sp = def.speed * (dt / 1e3) * s.rate;
      let n = 0;
      for (let i = 0; i < dim; i++) {
        s.v[i] += (Math.random() * 2 - 1) * 0.02 * Math.sqrt(dt / 16.7);
        let u = s.q[i] + s.v[i] * sp;
        if (u < 0) {
          u = -u;
          s.v[i] = Math.abs(s.v[i]);
        } else if (u > 1) {
          u = 2 - u;
          s.v[i] = -Math.abs(s.v[i]);
        }
        s.q[i] = u;
        n += s.v[i] * s.v[i];
      }
      n = Math.sqrt(n) || 1;
      for (let i = 0; i < dim; i++) s.v[i] /= n;
      const p = real(s.q);
      const per = gpu ? def.NG : Math.min(def.N, D.n * 0.7);
      let N = Math.round(per * (dt / 16.7));
      if (first) {
        s.view = { cx: 0, cy: 0, sc: 1 };
        def.it(s, p, 3e3, D, false);
        fit(s, D, def.fill, 1);
        N = Math.round(Math.min(gpu ? 12e5 : 25e5, per * def.tau * (gpu ? 1.4 : 1) / 16.7 * 0.85));
        s.warm = true;
        if (gpu) s.K = coarse(w, h);
      }
      if (gpu) {
        N = Math.min(N, 12e5);
        if (!s.out || s.out.length < N * 4) s.out = new Float32Array(Math.max(N, per * 2) * 4);
      }
      def.it(s, p, N, D, true);
      const bb = s.bb;
      if (s.rate === 1 && bb[1] - bb[0] < 0.02 && bb[3] - bb[2] < 0.02) {
        s.x = 0.1 + Math.random() * 0.05;
        s.y = 0.13;
        def.it(s, p, 300, D, false);
      }
      fit(s, D, def.fill, Math.min(1, dt / 2500));
      const pos = 1.25 * Math.sin(TAU8 * t / 611e3) + 0.6 * Math.sin(TAU8 * t / 233e3);
      const T = [tone6(c, pos), tone6(c, pos + span(c, 1.15))];
      if (gpu) {
        const O = s.out, n2 = s.oc, K = s.K, fade = first ? 0 : Math.exp(-dt / (def.tau * 1.4));
        for (let i = 0; i < n2 * 4; i += 16) coarseAdd(K, O[i], O[i + 1], 4);
        const ref = coarseRef(K, fade || 1);
        glBegin(s.gr, fade);
        glDraw(s.gr, O, n2, GL_POINTS);
        glShow(g, s.gr, c, T, 1 / (ref * def.ggain), def.hot, def.bloom, 0.12);
        return;
      }
      if (first) meter(D);
      develop(D, c, T, def.tau, t, def.gain, def.hot, false, first);
      show(g, D, 0, 0, w, h, def.bloom);
    }
  };
}
function fit(s, D, fill, k) {
  const b = s.bb;
  if (!b || s.rate > 1) return;
  const ex = b[1] - b[0], ey = b[3] - b[2];
  if (!(ex > 0.2) || !(ey > 0.2)) return;
  const v = s.view;
  let sc = Math.min(D.bw * fill / ex, D.bh * fill / ey);
  if (!v.sc0) {
    v.sc0 = v.sc = sc;
    v.cx = (b[0] + b[1]) / 2;
    v.cy = (b[2] + b[3]) / 2;
    return;
  }
  sc = Math.min(sc, v.sc0 * 2);
  v.sc *= Math.pow(sc / v.sc, sc > v.sc ? k * 0.4 : k);
  v.cx += ((b[0] + b[1]) / 2 - v.cx) * k;
  v.cy += ((b[2] + b[3]) / 2 - v.cy) * k;
}
function meter(D) {
  const V = D.v;
  let s = 0, n = 0;
  for (let i = 0; i < D.n; i++) {
    const v = V[2 * i] + V[2 * i + 1];
    if (v >= 0.015) {
      s += v;
      n++;
    }
  }
  D.ref = n ? s / n : 1;
}
var SN = 4096;
var SIN = new Float32Array(SN + 1);
var SK = SN / TAU8;
var SQ = SN / 4;
for (let i = 0; i <= SN; i++) SIN[i] = Math.sin(i / SN * TAU8);
var CLIFFORD = {
  name: "Clifford",
  N: 56e3,
  NG: 11e4,
  ggain: 2.6,
  tau: 3200,
  gain: 0.9,
  hot: 0.55,
  bloom: 0.32,
  fill: 0.78,
  lo: [-2.2, -2.2, -1.7, -1.7],
  hi: [2.2, 2.2, 1.7, 1.7],
  speed: 75e-4,
  it: (s, p, N, D, dep) => {
    const a = p[0], b = p[1], cc = p[2], dd = p[3];
    let x = s.x, y = s.y, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    const buf = s.buf, O = dep ? s.out : null;
    let oc = 0;
    const V = D ? D.v : null, bw = D ? D.bw : 0, bh = D ? D.bh : 0;
    const v = s.view, sc = v.sc, ox = bw * 0.5 - v.cx * sc, oy = bh * 0.5 - v.cy * sc;
    for (let i = 0; i < N; i++) {
      let us1 = a * y * SK, js1 = Math.floor(us1);
      const fs1 = us1 - js1;
      js1 &= 4095;
      const s1 = SIN[js1] + (SIN[js1 + 1] - SIN[js1]) * fs1;
      let uc1 = a * x * SK + SQ, jc1 = Math.floor(uc1);
      const fc1 = uc1 - jc1;
      jc1 &= 4095;
      const c1 = SIN[jc1] + (SIN[jc1 + 1] - SIN[jc1]) * fc1;
      let us2 = b * x * SK, js2 = Math.floor(us2);
      const fs2 = us2 - js2;
      js2 &= 4095;
      const s2 = SIN[js2] + (SIN[js2 + 1] - SIN[js2]) * fs2;
      let uc2 = b * y * SK + SQ, jc2 = Math.floor(uc2);
      const fc2 = uc2 - jc2;
      jc2 &= 4095;
      const c2 = SIN[jc2] + (SIN[jc2 + 1] - SIN[jc2]) * fc2;
      const nx = s1 + cc * c1, ny = s2 + dd * c2;
      const dx = nx - x, dy = ny - y;
      x = nx;
      y = ny;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (buf) {
        buf[i * 2] = x;
        buf[i * 2 + 1] = y;
      }
      if (dep) {
        const fx = x * sc + ox, fy = y * sc + oy, q = dx * dx / (dx * dx + dy * dy + 1e-12);
        if (O) {
          O[oc] = fx;
          O[oc + 1] = fy;
          O[oc + 2] = q;
          O[oc + 3] = 1 - q;
          oc += 4;
        } else {
          const X = fx | 0, Y = fy | 0;
          if (X >= 0 && X < bw && Y >= 0 && Y < bh) {
            const j = Y * bw + X << 1;
            V[j] += q;
            V[j + 1] += 1 - q;
          }
        }
      }
    }
    s.x = x;
    s.y = y;
    s.bb = [x0, x1, y0, y1];
    s.oc = oc >> 2;
  }
};
var DEJONG = {
  name: "De Jong",
  N: 56e3,
  NG: 11e4,
  ggain: 2.6,
  tau: 3200,
  gain: 0.9,
  hot: 0.55,
  bloom: 0.32,
  fill: 0.78,
  lo: [-3.1, -3.1, -3.1, -3.1],
  hi: [3.1, 3.1, 3.1, 3.1],
  speed: 6e-3,
  it: (s, p, N, D, dep) => {
    const a = p[0], b = p[1], cc = p[2], dd = p[3];
    let x = s.x, y = s.y, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    const buf = s.buf, O = dep ? s.out : null;
    let oc = 0;
    const V = D ? D.v : null, bw = D ? D.bw : 0, bh = D ? D.bh : 0;
    const v = s.view, sc = v.sc, ox = bw * 0.5 - v.cx * sc, oy = bh * 0.5 - v.cy * sc;
    for (let i = 0; i < N; i++) {
      let us1 = a * y * SK, js1 = Math.floor(us1);
      const fs1 = us1 - js1;
      js1 &= 4095;
      const s1 = SIN[js1] + (SIN[js1 + 1] - SIN[js1]) * fs1;
      let uc1 = b * x * SK + SQ, jc1 = Math.floor(uc1);
      const fc1 = uc1 - jc1;
      jc1 &= 4095;
      const c1 = SIN[jc1] + (SIN[jc1 + 1] - SIN[jc1]) * fc1;
      let us2 = cc * x * SK, js2 = Math.floor(us2);
      const fs2 = us2 - js2;
      js2 &= 4095;
      const s2 = SIN[js2] + (SIN[js2 + 1] - SIN[js2]) * fs2;
      let uc2 = dd * y * SK + SQ, jc2 = Math.floor(uc2);
      const fc2 = uc2 - jc2;
      jc2 &= 4095;
      const c2 = SIN[jc2] + (SIN[jc2 + 1] - SIN[jc2]) * fc2;
      const nx = s1 - c1, ny = s2 - c2;
      const dx = nx - x, dy = ny - y;
      x = nx;
      y = ny;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (buf) {
        buf[i * 2] = x;
        buf[i * 2 + 1] = y;
      }
      if (dep) {
        const fx = x * sc + ox, fy = y * sc + oy, q = dx * dx / (dx * dx + dy * dy + 1e-12);
        if (O) {
          O[oc] = fx;
          O[oc + 1] = fy;
          O[oc + 2] = q;
          O[oc + 3] = 1 - q;
          oc += 4;
        } else {
          const X = fx | 0, Y = fy | 0;
          if (X >= 0 && X < bw && Y >= 0 && Y < bh) {
            const j = Y * bw + X << 1;
            V[j] += q;
            V[j + 1] += 1 - q;
          }
        }
      }
    }
    s.x = x;
    s.y = y;
    s.bb = [x0, x1, y0, y1];
    s.oc = oc >> 2;
  }
};
var IKEDA = {
  name: "Ikeda",
  N: 5e4,
  NG: 8e4,
  ggain: 2.6,
  tau: 3200,
  gain: 0.9,
  hot: 0.55,
  bloom: 0.32,
  fill: 0.76,
  lo: [0.82, 4.4, 0.05, 0.85],
  hi: [0.94, 8.6, 0.75, 1.15],
  speed: 9e-3,
  it: (s, p, N, D, dep) => {
    const u = p[0], pp = p[1], kk = p[2], a0 = p[3];
    let x = s.x, y = s.y, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    const buf = s.buf, O = dep ? s.out : null;
    let oc = 0;
    const V = D ? D.v : null, bw = D ? D.bw : 0, bh = D ? D.bh : 0;
    const v = s.view, sc = v.sc, ox = bw * 0.5 - v.cx * sc, oy = bh * 0.5 - v.cy * sc;
    for (let i = 0; i < N; i++) {
      const th = kk - pp / (1 + x * x + y * y);
      let ust = th * SK, jst = Math.floor(ust);
      const fst = ust - jst;
      jst &= 4095;
      const st = SIN[jst] + (SIN[jst + 1] - SIN[jst]) * fst;
      let uct = th * SK + SQ, jct = Math.floor(uct);
      const fct = uct - jct;
      jct &= 4095;
      const ct = SIN[jct] + (SIN[jct + 1] - SIN[jct]) * fct;
      const nx = a0 + u * (x * ct - y * st);
      const ny = u * (x * st + y * ct);
      const dx = nx - x, dy = ny - y;
      x = nx;
      y = ny;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (buf) {
        buf[i * 2] = x;
        buf[i * 2 + 1] = y;
      }
      if (dep) {
        const fx = x * sc + ox, fy = y * sc + oy, q = dx * dx / (dx * dx + dy * dy + 1e-12);
        if (O) {
          O[oc] = fx;
          O[oc + 1] = fy;
          O[oc + 2] = q;
          O[oc + 3] = 1 - q;
          oc += 4;
        } else {
          const X = fx | 0, Y = fy | 0;
          if (X >= 0 && X < bw && Y >= 0 && Y < bh) {
            const j = Y * bw + X << 1;
            V[j] += q;
            V[j + 1] += 1 - q;
          }
        }
      }
    }
    s.x = x;
    s.y = y;
    s.bb = [x0, x1, y0, y1];
    s.oc = oc >> 2;
  }
};
function lorPar(P) {
  const sg = 10 + 3 * Math.sin(TAU8 * P / 347 + 1.3);
  const be = 2.35 + 0.65 * Math.sin(TAU8 * P / 271 + 0.2);
  const rh0 = sg * (sg + be + 3) / Math.max(0.5, sg - be - 1);
  const rh = rh0 + 3 + 10 * (0.5 + 0.5 * Math.sin(TAU8 * P / 419 + 2.2));
  return [sg, be, rh];
}
var LORENZ = {
  name: "Lorenz",
  flav: "Phase",
  reset: (w, h) => ({
    D: null,
    gr: void 0,
    N: 0,
    p3: null,
    head: 0,
    P: Math.random() * 3e3,
    ph: Math.random() * TAU8,
    warm: false,
    x: 1,
    y: 1,
    z: 20,
    hx: -1,
    hy: 2,
    hz: 24,
    view: null,
    tail: new Float32Array(3 * 420),
    th: 0,
    hacc: 0
  }),
  frame: (g, w, h, t, c, s) => {
    if (s.gr === void 0 || s.gr && !glOK(s.gr)) {
      const had = s.gr !== void 0;
      s.gr = glRes(w, h);
      if (had) s.warm = false;
    }
    const gpu = !!s.gr;
    if (!gpu && !s.D) {
      s.D = dens(w, h, BUDGET);
      s.warm = false;
    }
    const D = gpu ? s.FD || (s.FD = { bw: w, bh: h, n: w * h }) : s.D;
    if (!s.warm) {
      s.N = gpu ? 2e5 : Math.round(clamp6(D.n * 0.27, 16e3, 14e4));
      if (!s.p3 || s.p3.length !== s.N * 3) s.p3 = new Float32Array(s.N * 3);
      s.head = 0;
      s.view = null;
    }
    const dt = tick3(s, t), first = !s.warm;
    s.P += dt / 1e3;
    const [sg, be, rh] = lorPar(s.P);
    const H = 16e-4, p3 = s.p3, N = s.N;
    const step = (o, n2, keep) => {
      let x = o.x, y = o.y, z = o.z;
      for (let i = 0; i < n2; i++) {
        const dx = sg * (y - x), dy = x * (rh - z) - y, dz = x * y - be * z;
        const mx = x + dx * H * 0.5, my = y + dy * H * 0.5, mz = z + dz * H * 0.5;
        x += sg * (my - mx) * H;
        y += (mx * (rh - mz) - my) * H;
        z += (mx * my - be * mz) * H;
        if (keep) {
          const k2 = s.head, k3 = k2 * 3;
          p3[k3] = x;
          p3[k3 + 1] = y;
          p3[k3 + 2] = z;
          s.head = k2 + 1 === N ? 0 : k2 + 1;
        }
      }
      o.x = x;
      o.y = y;
      o.z = z;
    };
    const h0 = s.head;
    let added = 0;
    if (first) {
      step(s, 3e3, false);
      step(s, N, true);
      s.warm = true;
    } else {
      added = Math.min(N - 1, Math.round(600 * dt / 16.7));
      step(s, added, true);
    }
    s.hacc += dt / 1e3 * 0.42 / 16e-4;
    const hs = { x: s.hx, y: s.hy, z: s.hz };
    if (!s.tailOn) {
      s.tailOn = true;
      step(hs, 2e3, false);
      s.hacc = 420 * 4;
    }
    while (s.hacc >= 1) {
      s.hacc -= 4;
      step(hs, 4, false);
      const k2 = s.th * 3;
      s.tail[k2] = hs.x;
      s.tail[k2 + 1] = hs.y;
      s.tail[k2 + 2] = hs.z;
      s.th = (s.th + 1) % 420;
    }
    s.hx = hs.x;
    s.hy = hs.y;
    s.hz = hs.z;
    const yaw = -Math.PI / 4 + 1.05 * Math.sin(TAU8 * t / 263e3 + s.ph) + 0.35 * Math.sin(TAU8 * t / 97e3), pitch = 0.22 + 0.14 * Math.sin(TAU8 * t / 173e3);
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const zc = rh - 1, R = Math.max(10, rh * 0.95), cam = R * 3.2, inv2R = 1 / (2.2 * R);
    if (!s.view) s.view = { cx: 0, cy: 0, sc: D.bh * 0.85 / (2 * R) };
    const v = s.view, sc = v.sc, ox = D.bw * 0.5 - v.cx * sc, oy = D.bh * 0.5 + v.cy * sc;
    const pos = 1.5 * Math.sin(TAU8 * t / 587e3 + 2.1) + 0.8 * Math.sin(TAU8 * t / 211e3);
    const tn = tone6(c, pos), tf = tone6(c, pos - span(c, 1.3));
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    if (gpu) {
      const gl = G.gl, o = s.gr;
      if (!o.vbo) {
        o.vbo = gl.createBuffer();
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, o.vbo);
      if (first || o.vn !== N) {
        gl.bufferData(gl.ARRAY_BUFFER, p3, gl.DYNAMIC_DRAW);
        o.vn = N;
      } else if (added > 0) {
        const a1 = Math.min(added, N - h0);
        gl.bufferSubData(gl.ARRAY_BUFFER, h0 * 12, p3, h0 * 3, a1 * 3);
        if (added > a1) gl.bufferSubData(gl.ARRAY_BUFFER, 0, p3, 0, (added - a1) * 3);
      }
      const K = s.K || (s.K = coarse(w, h));
      let lx = 0, ly = 0;
      for (let i = 0; i < N; i += 8) {
        const i3 = i * 3, X1 = p3[i3] * cy - p3[i3 + 1] * sy, Y1 = p3[i3] * sy + p3[i3 + 1] * cy, Z = p3[i3 + 2] - zc;
        const dep = Y1 * cp - Z * sp, f = cam / (cam + dep), sx = X1 * f, syy = (Z * cp + Y1 * sp) * f;
        if (sx < x0) x0 = sx;
        if (sx > x1) x1 = sx;
        if (syy < y0) y0 = syy;
        if (syy > y1) y1 = syy;
        const fx = sx * sc + ox, fy = oy - syy * sc;
        let near = 0.5 - dep * inv2R;
        near = near < 0 ? 0 : near > 1 ? 1 : near;
        if (i) coarseAdd(K, fx, fy, Math.min(40, Math.hypot(fx - lx, fy - ly)) * (0.25 + 0.75 * near * near));
        lx = fx;
        ly = fy;
      }
      const ref = coarseRef(K, 0);
      glBegin(o, 0);
      const P = G.lor;
      gl.useProgram(P.p);
      gl.uniform4f(P.u.rot, cy, sy, cp, sp);
      gl.uniform4f(P.u.cam, zc, cam, inv2R, sc);
      gl.uniform2f(P.u.off, ox, oy);
      gl.uniform2f(P.u.res, w, h);
      gl.bindBuffer(gl.ARRAY_BUFFER, o.vbo);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
      const hd2 = s.head;
      if (N - hd2 > 1) gl.drawArrays(gl.LINE_STRIP, hd2, N - hd2);
      if (hd2 > 1) gl.drawArrays(gl.LINE_STRIP, 0, hd2);
      glShow(g, o, c, [tn, tf], 1 / (ref * 2.2), 0.5, 0.34, 0.12);
    } else {
      const V = D.v, bw = D.bw, bh = D.bh;
      let lx = 0, ly = 0;
      for (let i = 0; i < N; i += 2) {
        const i3 = i * 3, X1 = p3[i3] * cy - p3[i3 + 1] * sy, Y1 = p3[i3] * sy + p3[i3 + 1] * cy, Z = p3[i3 + 2] - zc;
        const sy0 = Z * cp + Y1 * sp, dep = Y1 * cp - Z * sp;
        const f = cam / (cam + dep), sx = X1 * f, syy = sy0 * f;
        if (sx < x0) x0 = sx;
        if (sx > x1) x1 = sx;
        if (syy < y0) y0 = syy;
        if (syy > y1) y1 = syy;
        const fx = sx * sc + ox, fy = oy - syy * sc;
        let near = 0.5 - dep * inv2R;
        near = near < 0 ? 0 : near > 1 ? 1 : near;
        const wgt = 0.28 + 0.72 * near * near, wa = wgt * near, wb = wgt * (1 - near);
        let X = fx | 0, Y = fy | 0;
        if (X >= 0 && X < bw && Y >= 0 && Y < bh) {
          const j = Y * bw + X << 1;
          V[j] += wa;
          V[j + 1] += wb;
        }
        X = (fx + lx) * 0.5 | 0;
        Y = (fy + ly) * 0.5 | 0;
        if (X >= 0 && X < bw && Y >= 0 && Y < bh) {
          const j = Y * bw + X << 1;
          V[j] += wa;
          V[j + 1] += wb;
        }
        lx = fx;
        ly = fy;
      }
      if (first) meter(D);
      develop(D, c, [tn, tf], 0, t, 1.4, 0.5, false, first);
      show(g, D, 0, 0, w, h, 0.34);
    }
    const k = Math.min(1, dt / 1200);
    const tsc = Math.min(D.bw * 0.78 / Math.max(1, x1 - x0), D.bh * 0.78 / Math.max(1, y1 - y0));
    v.sc += (tsc - v.sc) * k;
    v.cx += ((x0 + x1) / 2 - v.cx) * k;
    v.cy += ((y0 + y1) / 2 - v.cy) * k;
    const S = w / D.bw, n = 420;
    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";
    g.lineJoin = "round";
    const P2 = (i) => {
      const q = (s.th + i) % n * 3, X1 = s.tail[q] * cy - s.tail[q + 1] * sy, Y1 = s.tail[q] * sy + s.tail[q + 1] * cy, Z = s.tail[q + 2] - zc;
      const f = cam / (cam + (Y1 * cp - Z * sp));
      return [(X1 * f * sc + ox) * S, (oy - (Z * cp + Y1 * sp) * f * sc) * S];
    };
    const seg = 14, per = n / seg, hot = c.light ? rgba4(tn, 1) : `rgba(255,255,255,1)`;
    for (let k2 = 0; k2 < seg; k2++) {
      const e = (k2 + 1) / seg;
      g.beginPath();
      for (let i = Math.floor(k2 * per); i <= Math.min(n - 1, Math.floor((k2 + 1) * per) + 1); i++) {
        const q = P2(i);
        i === Math.floor(k2 * per) ? g.moveTo(q[0], q[1]) : g.lineTo(q[0], q[1]);
      }
      g.globalAlpha = e * e * 0.7;
      g.strokeStyle = k2 > seg - 3 ? hot : rgba4(tn, 1);
      g.lineWidth = Math.max(0.8, w / 1700) * (0.6 + 0.8 * e);
      g.stroke();
    }
    const hd = P2(n - 1), gr = glowSp3(c, tn), r = Math.max(6, w / 90);
    g.globalAlpha = 0.55;
    g.drawImage(gr, hd[0] - r, hd[1] - r, r * 2, r * 2);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.lineCap = "butt";
    g.lineJoin = "miter";
  }
};
var _glow = /* @__PURE__ */ new Map();
function glowSp3(c, t) {
  const key = (t[0] | 0) + "," + (t[1] | 0) + "," + (t[2] | 0) + (c.light ? "L" : "");
  let cv = _glow.get(key);
  if (cv) return cv;
  if (_glow.size > 64) _glow.clear();
  cv = mk8(64, 64);
  const x = cv.getContext("2d");
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, c.light ? rgba4(t, 1) : "rgba(255,255,255,1)");
  gr.addColorStop(0.12, rgba4(t, 0.8));
  gr.addColorStop(0.4, rgba4(t, 0.18));
  gr.addColorStop(1, rgba4(t, 0));
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);
  _glow.set(key, cv);
  return cv;
}
function ppPar(P) {
  return [
    0.35 + 0.65 * Math.sin(TAU8 * P / 293 + 0.6),
    // a: one well or two
    0.4 * Math.sin(TAU8 * P / 211 + 2.4),
    // mu: sink or source
    0.15 * Math.sin(TAU8 * P / 367 + 4.4),
    // e: tilt
    0.9 + 0.35 * Math.sin(TAU8 * P / 157 + 1.7)
    // k: damping
  ];
}
function ppFate(x, y, p) {
  const a = p[0], mu = p[1], e = p[2], k = p[3], h = 0.06;
  let sx = 0, flips = 0, last = x > 0 ? 1 : -1;
  for (let i = 0; i < 360; i++) {
    const ay = a * x - x * x * x - k * (x * x - mu) * y + e;
    const mx = x + y * h * 0.5, my = y + ay * h * 0.5;
    x += my * h;
    y += (a * mx - mx * mx * mx - k * (mx * mx - mu) * my + e) * h;
    if (!(x === x) || Math.abs(x) > 50) return 2;
    if (i > 240) {
      sx += x;
      const sg = x > 0 ? 1 : -1;
      if (sg !== last) {
        flips++;
        last = sg;
      }
    }
  }
  if (flips >= 2) return 2;
  const m = sx / 120;
  return Math.abs(m) < 0.2 ? 2 : m > 0 ? 0 : 1;
}
var PHASE_PORTRAIT = {
  name: "Phase Portrait",
  flav: "Phase",
  reset: (w, h) => ({ D: null, gr: void 0, N: 0, P: Math.random() * 3e3, warm: false }),
  frame: (g, w, h, t, c, s) => {
    if (s.gr === void 0 || s.gr && !glOK(s.gr)) {
      const had = s.gr !== void 0;
      s.gr = glRes(w, h);
      if (had) s.warm = false;
    }
    const gpu = !!s.gr;
    if (!gpu && !s.D) {
      s.D = dens(w, h, BUDGET, 2);
      s.warm = false;
    }
    const D = s.D, bw = gpu ? w : D.bw, bh = gpu ? h : D.bh;
    if (!s.warm) {
      const N = gpu ? Math.round(clamp6(w * h * 38e-5, 300, 1400)) : Math.round(clamp6(D.n * 26e-4, 260, 1500));
      const YR2 = 2.3, sc2 = bh / (2 * YR2);
      Object.assign(s, {
        N,
        x: new Float32Array(N),
        y: new Float32Array(N),
        age: new Float32Array(N),
        life: new Float32Array(N),
        cls: new Uint8Array(N),
        sc: sc2,
        XR: bw / sc2 / 2,
        YR: YR2,
        seg: gpu ? new Float32Array(N * 8) : null,
        pt: gpu ? new Float32Array(N * 4) : null,
        K: gpu ? coarse(w, h) : null
      });
    }
    const dt = tick3(s, t), first = !s.warm;
    s.P += dt / 1e3;
    const p = ppPar(s.P), a = p[0], mu = p[1], e = p[2], k = p[3];
    const V = gpu ? null : D.v, sc = s.sc, ox = bw / 2, oy = bh / 2;
    const XR = s.XR * 1.05, YR = s.YR * 1.05;
    let stable = 0;
    for (let q = -2.5; q < 2.5; q += 0.01) {
      const f0 = a * q - q * q * q + e, f1 = a * (q + 0.01) - (q + 0.01) ** 3 + e;
      if (f0 === 0 || f0 * f1 < 0) {
        const xr = q + 5e-3;
        if (3 * xr * xr > a && xr * xr > mu) stable++;
      }
    }
    s.bi = stable >= 2;
    const spawn = (i, age) => {
      const x = (Math.random() * 2 - 1) * XR, y = (Math.random() * 2 - 1) * YR;
      s.x[i] = x;
      s.y[i] = y;
      s.age[i] = age;
      s.life[i] = 7e3 + Math.random() * 7e3;
      s.cls[i] = s.bi ? ppFate(x, y, p) % 2 : y > 0 ? 0 : 1;
    };
    const RATE = 0.5;
    let simDt = dt / 1e3 * RATE, frames = 1, fdt = dt;
    if (first) {
      for (let i = 0; i < s.N; i++) spawn(i, Math.random() * 6e3);
      s.warm = true;
      frames = 50;
      fdt = 40;
      simDt = fdt / 1e3 * RATE;
    }
    const TAUF = 1100;
    for (let f = 0; f < frames; f++) {
      let ns_ = 0;
      for (let i = 0; i < s.N; i++) {
        let age = s.age[i] + fdt;
        if (age > s.life[i]) {
          spawn(i, 0);
          age = 0;
        }
        s.age[i] = age;
        const L = s.life[i], env = Math.min(1, age / 900, (L - age) / 1400);
        let x = s.x[i], y = s.y[i];
        const x0 = x, y0 = y;
        const vy0 = a * x - x * x * x - k * (x * x - mu) * y + e;
        const sp = Math.sqrt(y * y + vy0 * vy0) * simDt * sc;
        const ns = Math.min(6, 1 + sp / 0.9 | 0), hh = simDt / ns;
        const ch = s.cls[i] & 1;
        const wt = env * (Math.min(1, sp / ns) + 0.1);
        for (let q = 0; q < ns; q++) {
          const ay = a * x - x * x * x - k * (x * x - mu) * y + e;
          const mx = x + y * hh * 0.5, my = y + ay * hh * 0.5;
          x += my * hh;
          y += (a * mx - mx * mx * mx - k * (mx * mx - mu) * my + e) * hh;
          if (V) {
            const X = x * sc + ox | 0, Y = oy - y * sc | 0;
            if (X >= 0 && X < bw && Y >= 0 && Y < bh) V[(Y * bw + X << 1) + ch] += wt;
          }
        }
        if (!(x === x) || Math.abs(x) > 8 || Math.abs(y) > 8) {
          spawn(i, 0);
          continue;
        }
        s.x[i] = x;
        s.y[i] = y;
        if (gpu) {
          const ax = x0 * sc + ox, ay = oy - y0 * sc, bx = x * sc + ox, by = oy - y * sc, c0 = ch ? 0 : env, c1 = ch ? env : 0, q8 = ns_ * 8;
          const S = s.seg;
          S[q8] = ax;
          S[q8 + 1] = ay;
          S[q8 + 2] = c0;
          S[q8 + 3] = c1;
          S[q8 + 4] = bx;
          S[q8 + 5] = by;
          S[q8 + 6] = c0;
          S[q8 + 7] = c1;
          const Pt = s.pt, q4 = ns_ * 4;
          Pt[q4] = bx;
          Pt[q4 + 1] = by;
          Pt[q4 + 2] = c0 * 0.15;
          Pt[q4 + 3] = c1 * 0.15;
          coarseAdd(s.K, bx, by, env * (Math.min(60, Math.hypot(bx - ax, by - ay)) + 0.15));
          ns_++;
        }
      }
      if (gpu) {
        glBegin(s.gr, first && f === 0 ? 0 : Math.exp(-fdt / TAUF));
        glDraw(s.gr, s.seg, ns_ * 2, GL_LINES);
        glDraw(s.gr, s.pt, ns_, GL_POINTS);
        if (f < frames - 1) coarseRef(s.K, Math.exp(-fdt / TAUF));
      } else if (frames > 1 && f < frames - 1) {
        const dk = Math.exp(-fdt / TAUF);
        for (let j = 0; j < D.n * 2; j++) V[j] *= dk;
      }
    }
    const pos = 1.4 * Math.sin(TAU8 * t / 557e3) + 0.7 * Math.sin(TAU8 * t / 199e3 + 3);
    const T = [tone6(c, pos), tone6(c, pos + span(c, 1.25))];
    if (gpu) {
      const ref = coarseRef(s.K, Math.exp(-fdt / TAUF));
      glShow(g, s.gr, c, T, 1 / (ref * 4.5), 0.5, 0.3, 0.12);
      return;
    }
    if (first) meter(D);
    develop(D, c, T, TAUF, t, 4, 0.5, false, first);
    show(g, D, 0, 0, w, h, 0.3);
  }
};
var CH_MODES = [];
for (let n = 1; n <= 8; n++) for (let m = n + 1; m <= 9; m++) {
  if (m + n > 3) {
    CH_MODES.push([n, m, -1]);
    if ((m + n) % 2 === 0) CH_MODES.push([n, m, 1]);
  }
}
function chMode(i) {
  const R = rng9(i * 7919 + 17);
  return CH_MODES[Math.floor(R() * CH_MODES.length)];
}
var CH_HOLD = 24e3;
var CH_GLIDE = 11e3;
var CH_CYC = CH_HOLD + CH_GLIDE;
function chBuild(s, m1, m2, k) {
  const G2 = s.G, F = s.F, Ct = s.Ct;
  let mx = 0;
  for (let j = 0; j < G2; j++) for (let i = 0; i < G2; i++) {
    const f1 = Ct[m1[0]][i] * Ct[m1[1]][j] + m1[2] * Ct[m1[1]][i] * Ct[m1[0]][j];
    const f2 = Ct[m2[0]][i] * Ct[m2[1]][j] + m2[2] * Ct[m2[1]][i] * Ct[m2[0]][j];
    const f = f1 * (1 - k) + f2 * k;
    F[j * G2 + i] = f;
    const af = f < 0 ? -f : f;
    if (af > mx) mx = af;
  }
  s.inv = 1 / Math.max(0.05, mx);
}
function chPlate(c, L) {
  const pad = Math.ceil(L * 0.08), S = Math.ceil(L + pad * 2);
  const cv = mk8(S, S), x = cv.getContext("2d");
  x.fillStyle = "rgba(0,0,0,0.55)";
  x.filter = `blur(${Math.max(1, pad * 0.45)}px)`;
  x.fillRect(pad * 0.9, pad * 1.25, L * 1.02, L * 1.02);
  x.filter = "none";
  const t0 = tone6(c, 0);
  const lg = x.createLinearGradient(pad, pad, pad + L, pad + L);
  const mixc = (k, a) => rgba4([c.br + (t0[0] - c.br) * k, c.bg2 + (t0[1] - c.bg2) * k, c.bb + (t0[2] - c.bb) * k], a);
  lg.addColorStop(0, mixc(0.085, 1));
  lg.addColorStop(0.55, mixc(0.045, 1));
  lg.addColorStop(1, mixc(0.028, 1));
  x.fillStyle = lg;
  x.fillRect(pad, pad, L, L);
  const sh = x.createLinearGradient(pad, pad + L, pad + L, pad);
  sh.addColorStop(0.3, mixc(0, 0));
  sh.addColorStop(0.5, mixc(0.12, 0.25));
  sh.addColorStop(0.7, mixc(0, 0));
  x.globalCompositeOperation = "lighter";
  x.fillStyle = sh;
  x.fillRect(pad, pad, L, L);
  x.globalCompositeOperation = "source-over";
  const lw = Math.max(1, L / 700);
  x.lineWidth = lw;
  x.strokeStyle = mixc(0.45, 0.55);
  x.beginPath();
  x.moveTo(pad + lw / 2, pad + L);
  x.lineTo(pad + lw / 2, pad + lw / 2);
  x.lineTo(pad + L, pad + lw / 2);
  x.stroke();
  x.strokeStyle = mixc(0.12, 0.6);
  x.beginPath();
  x.moveTo(pad + L - lw / 2, pad);
  x.lineTo(pad + L - lw / 2, pad + L - lw / 2);
  x.lineTo(pad, pad + L - lw / 2);
  x.stroke();
  return { cv, pad };
}
var CHLADNI = {
  name: "Chladni",
  flav: "Physics",
  reset: (w, h) => {
    const L = Math.round(Math.min(w, h) * 0.84), res = Math.max(8, Math.min(L, 660));
    const N = Math.round(clamp6(L * L / 20, 3500, 6e4)), G2 = 192;
    const Ct = [];
    for (let n = 0; n <= 9; n++) {
      const a = new Float32Array(G2);
      for (let i = 0; i < G2; i++) a[i] = Math.cos(n * Math.PI * i / (G2 - 1));
      Ct.push(a);
    }
    const u = new Float32Array(N), v = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      u[i] = Math.random();
      v[i] = Math.random();
    }
    const gt = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const q = Math.random();
      gt[i] = 0.012 + 0.075 * q * q;
    }
    return { L, res, D: null, gr: void 0, N, G: G2, F: new Float32Array(G2 * G2), Ct, u, v, gt, mob: new Float32Array(N), fr: 0, off: Math.floor(Math.random() * 997), key: "", inv: 1, warm: false, rs: Math.random() * 4e9 | 1, plate: null, pk: "" };
  },
  frame: (g, w, h, t, c, s) => {
    if (s.gr === void 0 || s.gr && !glOK(s.gr)) {
      const had = s.gr !== void 0;
      s.gr = glRes(w, h);
      if (had) s.warm = true;
    }
    const gpu = !!s.gr;
    if (!gpu && !s.D) s.D = dens(s.res, s.res, s.res * s.res);
    const dt = tick3(s, t), D = s.D, L = s.L;
    const tt = t + s.off * CH_CYC, ci = Math.floor(tt / CH_CYC), local = tt - ci * CH_CYC;
    const k = sstep6(CH_HOLD, CH_CYC, local);
    const m1 = chMode(ci), m2 = chMode(ci + 1);
    const key = m1.join() + "|" + m2.join() + "|" + Math.round(k * 400);
    if (key !== s.key) {
      s.key = key;
      chBuild(s, m1, m2, k);
    }
    const G2 = s.G, F = s.F, Gm = G2 - 1, inv = s.inv, u = s.u, v = s.v, mob = s.mob, N = s.N;
    let r = s.rs;
    const first = !s.warm, steps = first ? Math.round(clamp6(24e5 / N, 40, 120)) : 1;
    s.warm = true;
    const ts = steps > 1 ? 1 : dt / 16.7, hop = 0.011 * Math.sqrt(ts), bias = 0.05 * ts;
    const still = k === 0 || k === 1, fr = s.fr = s.fr + 1 | 0, gt = s.gt;
    for (let st = 0; st < steps; st++) for (let i = 0; i < N; i++) {
      if (still && steps === 1 && mob[i] === 0 && i + fr & 7) continue;
      let uu = u[i], vv = v[i];
      const fx = uu * Gm, fy = vv * Gm;
      let ix = fx | 0, iy = fy | 0;
      if (ix > G2 - 2) ix = G2 - 2;
      if (iy > G2 - 2) iy = G2 - 2;
      const tx = fx - ix, ty = fy - iy, j = iy * G2 + ix;
      const f00 = F[j], f10 = F[j + 1], f01 = F[j + G2], f11 = F[j + G2 + 1];
      const f = f00 + (f10 - f00) * tx + (f01 - f00) * ty + (f00 - f10 - f01 + f11) * tx * ty;
      let amp = (f < 0 ? -f : f) * inv;
      if (amp > 1) amp = 1;
      const e = amp - gt[i];
      if (e <= 0) {
        mob[i] = mob[i] < 0.02 ? 0 : mob[i] * 0.85;
        continue;
      }
      const gx = ((f10 - f00) * (1 - ty) + (f11 - f01) * ty) * Gm, gy = ((f01 - f00) * (1 - tx) + (f11 - f10) * tx) * Gm;
      const g2 = gx * gx + gy * gy + 1e-4;
      let nk = -f / g2 * bias;
      const sl = Math.abs(nk) * Math.sqrt(g2), cap = 4e-3 * ts;
      if (sl > cap) nk *= cap / sl;
      r ^= r << 13;
      r ^= r >>> 17;
      r ^= r << 5;
      const r1 = (r >>> 0) / 4294967296 - 0.5;
      r ^= r << 13;
      r ^= r >>> 17;
      r ^= r << 5;
      const r2 = (r >>> 0) / 4294967296 - 0.5;
      const kick = hop * (e * Math.sqrt(e) + 0.04 * e);
      uu += gx * nk + r1 * kick;
      vv += gy * nk + r2 * kick;
      if (uu < 0) uu = -uu;
      else if (uu > 1) uu = 2 - uu;
      if (vv < 0) vv = -vv;
      else if (vv > 1) vv = 2 - vv;
      u[i] = uu;
      v[i] = vv;
      mob[i] += (Math.min(1, e * 4) - mob[i]) * 0.25;
    }
    s.rs = r;
    const pos = 1.3 * Math.sin(TAU8 * t / 467e3 + 1.2) + 0.25 * Math.sin(ci * 2.3);
    const T = [tone6(c, pos), tone6(c, pos + span(c, 1.2))];
    const ox = (w - L) / 2, oy = (h - L) / 2;
    if (!gpu) {
      const V = D.v, bw = D.bw, bh = D.bh;
      for (let i = 0; i < N; i++) {
        const X = u[i] * (bw - 1e-3) | 0, Y = v[i] * (bh - 1e-3) | 0, j = Y * bw + X;
        const m = mob[i];
        V[j << 1] += 1 - m;
        V[(j << 1) + 1] += m * 0.45;
      }
      if (first) meter(D);
      develop(D, c, T, 0, t, 0.55, 0.6, true, first);
    }
    g.globalCompositeOperation = "source-over";
    g.fillStyle = c.bg;
    g.fillRect(0, 0, w, h);
    const pk = L + "|" + c.bg + "|" + c.acc + "|" + c.pal.length;
    if (pk !== s.pk) {
      s.pk = pk;
      s.plate = chPlate(c, L);
    }
    g.drawImage(s.plate.cv, ox - s.plate.pad, oy - s.plate.pad);
    if (gpu) {
      const O = s.out || (s.out = new Float32Array(N * 4)), K = s.K || (s.K = coarse(w, h));
      for (let i = 0, q = 0; i < N; i++, q += 4) {
        const m = mob[i], X = ox + u[i] * L, Y = oy + v[i] * L;
        O[q] = X;
        O[q + 1] = Y;
        O[q + 2] = 1 - m;
        O[q + 3] = m * 0.45;
        if ((i & 3) === 0) coarseAdd(K, X, Y, 4);
      }
      const ref = coarseRef(K, 0);
      glBegin(s.gr, 0);
      glDraw(s.gr, O, N, GL_POINTS);
      glShow(g, s.gr, c, T, 1 / (ref * 0.5), 0.6, 0.28, 0.05, true);
    } else show(g, D, ox, oy, L, L, 0.28, "lighter");
  }
};
var SCENES_PHASE = [
  CHLADNI,
  attractor(CLIFFORD),
  LORENZ,
  PHASE_PORTRAIT,
  attractor(DEJONG),
  attractor(IKEDA)
];

// from cloudKit.ts
var hash2 = (x, y, s) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041);
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
};
function vnoise2(x, y, s, px) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  let xa = x0, xb = x0 + 1;
  if (px > 0) {
    xa = (xa % px + px) % px;
    xb = (xb % px + px) % px;
  }
  const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10), v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = hash2(xa, y0, s), b = hash2(xb, y0, s), c = hash2(xa, y0 + 1, s), d = hash2(xb, y0 + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm5(x, y, s, oct, px, bil = false) {
  let sum = 0, amp = 0.5, norm = 0, f = 1;
  for (let o = 0; o < oct; o++) {
    const n = vnoise2(x * f, y * f, s + o * 101, px * f);
    sum += amp * (bil ? 1 - Math.abs(n * 2 - 1) : n);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}
function cloudPaint(o) {
  const res = o.res ?? 0.6, oct = o.oct ?? 6, warp = o.warp ?? 0.9;
  const iw = Math.max(2, Math.ceil(o.w * res)), ih = Math.max(2, Math.ceil(o.h * res));
  const per = o.tile ? Math.round(o.cells) : 0;
  const cpp = (per || o.cells) / iw;
  const D = new Float32Array(iw * ih);
  const asp = o.aspect ?? 1, bil = !!o.billow, mid = bil ? 0.62 : 0.5, gain = o.gain ?? 2;
  const s = o.seed | 0;
  for (let j = 0; j < ih; j++) {
    const Y = (j + 0.5) / res;
    for (let i = 0; i < iw; i++) {
      const X = (i + 0.5) / res;
      const cx = i * cpp, cy = j * cpp * asp;
      const qx = fbm5(cx + 5.2, cy + 1.3, s + 7, 3, per), qy = fbm5(cx + 1.7, cy + 9.2, s + 13, 3, per);
      const n = fbm5(cx + warp * (qx - 0.5) * 4, cy + warp * (qy - 0.5) * 4, s, oct, per, bil);
      D[j * iw + i] = (n - mid) * gain + o.shape(X, Y);
    }
  }
  const [c0, c1] = o.cover ?? [-0.05, 0.25];
  const steps = o.steps ?? 6, st = (o.stepPx ?? 14) * res, ab = o.absorb ?? 0.55;
  const lx = o.light[0], ly = o.light[1];
  const at = (x2, y2) => {
    let xi = Math.round(x2), yi = Math.round(y2);
    if (yi < 0 || yi >= ih) return -1;
    if (per) xi = (xi % iw + iw) % iw;
    else if (xi < 0 || xi >= iw) return -1;
    return D[yi * iw + xi];
  };
  const cv = document.createElement("canvas");
  cv.width = iw;
  cv.height = ih;
  const x = cv.getContext("2d"), id = x.createImageData(iw, ih), px = id.data;
  const A2 = (o.alpha ?? 1) * 255;
  for (let j = 0; j < ih; j++) {
    for (let i = 0; i < iw; i++) {
      const d = D[j * iw + i];
      let a = (d - c0) / (c1 - c0);
      if (a <= 0) continue;
      if (a > 1) a = 1;
      a = a * a * (3 - 2 * a);
      let sum = 0;
      for (let k = 1; k <= steps; k++) {
        const v = at(i + lx * st * k, j + ly * st * k);
        if (v > c0) sum += v - c0;
      }
      const lit = Math.exp(-ab * sum);
      let rim = (d - at(i + lx * st * 0.6, j + ly * st * 0.6)) * 2.2;
      rim = rim < 0 ? 0 : rim > 1 ? 1 : rim;
      const depth = Math.min(1, Math.max(0, (d - c0) / (1 - c0)));
      const c = o.col(lit, rim * (1 - depth * 0.6), depth, (i + 0.5) / res, (j + 0.5) / res);
      const q = (j * iw + i) * 4, dn = (hash2(i, j, s + 99) - 0.5) * 2.2;
      px[q] = c[0] + dn;
      px[q + 1] = c[1] + dn;
      px[q + 2] = c[2] + dn;
      px[q + 3] = a * A2;
    }
  }
  x.putImageData(id, 0, 0);
  if (res === 1) return cv;
  const out = document.createElement("canvas");
  out.width = Math.ceil(o.w);
  out.height = Math.ceil(o.h);
  const y = out.getContext("2d");
  y.imageSmoothingEnabled = true;
  y.imageSmoothingQuality = "high";
  y.drawImage(cv, 0, 0, out.width, out.height);
  return out;
}
function ridge(n, cells, seed, oct = 4) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = fbm5(i / n * cells, 0.5, seed, oct, cells);
  return out;
}

// from placeScenes.ts
var TAU9 = Math.PI * 2;
var AP7 = (c, i, a) => {
  const p = c.pal[(i % c.pal.length + c.pal.length) % c.pal.length];
  return `rgba(${p[0]},${p[1]},${p[2]},${a})`;
};
var W7 = (c, a, i = 0) => c.light ? AP7(c, i, Math.min(1, a * 1.6)) : `rgba(255,255,255,${a})`;
var clamp7 = (v, a, b) => v < a ? a : v > b ? b : v;
var rgb5 = (v, a = 1) => `rgba(${v[0] | 0},${v[1] | 0},${v[2] | 0},${a})`;
var tone7 = (c, i) => c.pal[(i % c.pal.length + c.pal.length) % c.pal.length];
var haze5 = (c, k = 0.38, i = 0) => {
  const p = tone7(c, i);
  return c.light ? p : [p[0] + (255 - p[0]) * k, p[1] + (255 - p[1]) * k, p[2] + (255 - p[2]) * k];
};
var mixv6 = (c, p, k, d = 1) => [(c.br + (p[0] - c.br) * k) * d, (c.bg2 + (p[1] - c.bg2) * k) * d, (c.bb + (p[2] - c.bb) * k) * d];
var MX5 = (c, p, k, d = 1, a = 1) => rgb5(mixv6(c, p, k, d), a);
var BGA3 = (c, a) => `rgba(${c.br},${c.bg2},${c.bb},${a})`;
var small4 = (w) => w < 200;
var bz2 = (a, b, c, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
var bz3 = (a, b, c, d, t) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};
function mk9(w, h) {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  return cv;
}
var rng10 = (a) => () => {
  a |= 0;
  a = a + 1831565813 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
function noise14(n, cells, R) {
  const cp = Array.from({ length: cells + 2 }, () => R() * 2 - 1), out = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const x = i / n * cells, i0 = Math.floor(x), f = x - i0, u = f * f * (3 - 2 * f);
    out[i] = cp[i0] * (1 - u) + cp[i0 + 1] * u;
  }
  return out;
}
function fbm6(n, cells, oct, pers, R) {
  const out = new Float32Array(n + 1);
  let amp = 1, tot = 0, cl = cells;
  for (let o = 0; o < oct; o++) {
    const a = noise14(n, cl, R);
    for (let i = 0; i <= n; i++) out[i] += a[i] * amp;
    tot += amp;
    amp *= pers;
    cl *= 2;
  }
  for (let i = 0; i <= n; i++) out[i] /= tot;
  return out;
}
var norm014 = (a) => {
  let lo = 1e9, hi = -1e9;
  for (const v of a) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const d = hi - lo || 1;
  for (let i = 0; i < a.length; i++) a[i] = (a[i] - lo) / d;
  return a;
};
var _sp6 = /* @__PURE__ */ new Map();
function sprite8(key, build) {
  let s = _sp6.get(key);
  if (!s) {
    if (_sp6.size > 64) _sp6.clear();
    s = build();
    _sp6.set(key, s);
  }
  return s;
}
function puff4(c, p, name) {
  return sprite8("puff" + name + c.acc + c.bg + p.join(), () => {
    const S = 64, hc = S / 2, cv = mk9(S, S), x = cv.getContext("2d");
    const gr = x.createRadialGradient(hc, hc, 0, hc, hc, hc);
    gr.addColorStop(0, rgb5(p, 1));
    gr.addColorStop(0.3, rgb5(p, 0.78));
    gr.addColorStop(0.55, rgb5(p, 0.42));
    gr.addColorStop(0.8, rgb5(p, 0.12));
    gr.addColorStop(1, rgb5(p, 0));
    x.fillStyle = gr;
    x.fillRect(0, 0, S, S);
    return cv;
  });
}
function spark4(c, p, name) {
  return sprite8("spark" + name + c.acc + c.bg + p.join(), () => {
    const S = 64, hc = S / 2, cv = mk9(S, S), x = cv.getContext("2d");
    const gr = x.createRadialGradient(hc, hc, 0, hc, hc, hc);
    gr.addColorStop(0, rgb5(p, 1));
    gr.addColorStop(0.12, rgb5(p, 0.6));
    gr.addColorStop(0.35, rgb5(p, 0.16));
    gr.addColorStop(1, rgb5(p, 0));
    x.fillStyle = gr;
    x.fillRect(0, 0, S, S);
    return cv;
  });
}
var _dith6 = null;
function dither7(x, w, h) {
  if (!_dith6) {
    _dith6 = mk9(64, 64);
    const d = _dith6.getContext("2d"), id = d.createImageData(64, 64);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = Math.random() < 0.5 ? 0 : 255;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = 255;
    }
    d.putImageData(id, 0, 0);
  }
  if (w < 200) return;
  x.save();
  x.globalCompositeOperation = "source-atop";
  x.globalAlpha = 0.012;
  x.fillStyle = x.createPattern(_dith6, "repeat");
  x.fillRect(0, 0, w, h);
  x.restore();
}
function wash4(w, h, stops) {
  const cv = mk9(w, h), x = cv.getContext("2d"), gr = x.createLinearGradient(0, 0, 0, cv.height);
  for (const [o, col] of stops) gr.addColorStop(clamp7(o, 0, 1), col);
  x.fillStyle = gr;
  x.fillRect(0, 0, cv.width, cv.height);
  dither7(x, cv.width, cv.height);
  return cv;
}
var makeStars2 = (R, n, ymax) => Array.from({ length: n }, () => ({ x: R(), y: Math.pow(R(), 1.4) * ymax, r: 0.6 + R() * 1.1, a: 0.12 + R() * 0.5, ph: R() * 9, sp: 0.4 + R() }));
function drawStars2(g, c, stars2, w, h, t, fade) {
  const sr = Math.min(1, w / 1e3);
  for (const st of small4(w) ? stars2.slice(0, 12) : stars2) {
    const a = st.a * (0.62 + 0.38 * Math.sin(t * 45e-5 * st.sp + st.ph)) * (fade ? fade(st.y) : 1);
    if (a < 0.02) continue;
    g.fillStyle = W7(c, a);
    const r = Math.max(0.6, st.r * sr);
    g.fillRect(st.x * w, st.y * h, r, r);
  }
}
var fresh4 = (g, c, w, h) => {
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
  g.fillStyle = c.bg;
  g.fillRect(0, 0, w, h);
};
var done4 = (g) => {
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
};
var keyOf6 = (w, h, c) => w + "x" + h + c.acc + c.bg;
function bakeLava(s, w, h, c) {
  const p0 = tone7(c, 0), hz = haze5(c, 0.5), N = s.N, S = Math.max(w, h);
  const ry = (i) => h * (s.ridgeBase - s.ridgeAmp * s.ridge[i]);
  const ic = Math.round(s.cx * N), cx = s.cx * w, baseY = ry(ic);
  const rw = S * 0.03, bw = S * 0.17, ch = h * 0.1, rimY = baseY - ch;
  Object.assign(s, { cxp: cx, rimY, rw });
  s.sky = wash4(w, h, [[0, MX5(c, p0, 0.02, 0.55)], [0.35, MX5(c, p0, 0.05, 0.75)], [s.ridgeBase, MX5(c, p0, 0.2, 0.95)], [1, MX5(c, p0, 0.2)]]);
  {
    const x2 = s.sky.getContext("2d"), r = S * 0.6, gr = x2.createRadialGradient(cx, rimY, 0, cx, rimY, r);
    gr.addColorStop(0, rgb5(p0, 0.34));
    gr.addColorStop(0.22, rgb5(p0, 0.12));
    gr.addColorStop(0.6, rgb5(p0, 0.03));
    gr.addColorStop(1, rgb5(p0, 0));
    x2.globalCompositeOperation = "screen";
    x2.fillStyle = gr;
    x2.fillRect(0, 0, w, h);
  }
  const land = mk9(w, h), x = land.getContext("2d");
  const gl = x.createLinearGradient(0, h * (s.ridgeBase - s.ridgeAmp), 0, h);
  gl.addColorStop(0, MX5(c, p0, 0.12, 0.5));
  gl.addColorStop(0.4, MX5(c, p0, 0.06, 0.42));
  gl.addColorStop(1, MX5(c, p0, 0.05, 0.36));
  x.fillStyle = gl;
  x.beginPath();
  x.moveTo(0, h);
  for (let i = 0; i <= N; i++) x.lineTo(i / N * w, ry(i));
  x.lineTo(w, h);
  x.closePath();
  x.fill();
  const cone = () => {
    x.beginPath();
    x.moveTo(cx - bw, baseY + h * 0.012);
    x.quadraticCurveTo(cx - rw * 1.7, baseY - ch * 0.3, cx - rw, rimY);
    x.lineTo(cx - rw * 0.35, rimY + ch * 0.07);
    x.lineTo(cx + rw * 0.3, rimY - ch * 0.03);
    x.lineTo(cx + rw, rimY + ch * 0.03);
    x.quadraticCurveTo(cx + rw * 1.8, baseY - ch * 0.28, cx + bw, baseY + h * 0.012);
    x.closePath();
  };
  x.fillStyle = MX5(c, p0, 0.1, 0.46);
  cone();
  x.fill();
  x.save();
  cone();
  x.clip();
  {
    const gr = x.createRadialGradient(cx, rimY, 0, cx, rimY, ch * 1.6);
    gr.addColorStop(0, rgb5(p0, 0.5));
    gr.addColorStop(0.35, rgb5(p0, 0.14));
    gr.addColorStop(1, rgb5(p0, 0));
    x.globalCompositeOperation = "screen";
    x.fillStyle = gr;
    x.fillRect(0, 0, w, h);
  }
  x.restore();
  dither7(x, w, h);
  s.land = land;
  const pts = [], M = s.M;
  for (let k = 0; k <= M; k++) {
    const u = k / M, e = Math.pow(u, 1.55);
    const mx = Math.sin(u * 4.2 + s.m1) * 0.1 + Math.sin(u * 9.5 + s.m2) * 0.035;
    pts.push({ x: cx + mx * w * (0.04 + u * 1.1), y: rimY + ch * 0.04 + (h * 1.05 - rimY) * e, wd: h * (5e-3 + 0.075 * Math.pow(u, 1.5)) });
  }
  s.pts = pts;
  const fl = mk9(w, h), f = fl.getContext("2d"), tmp = mk9(w, h), q = tmp.getContext("2d");
  f.globalCompositeOperation = "screen";
  for (let k = 0; k < pts.length; k += 3) {
    const p = pts[k], r = p.wd * 5 + h * 0.025;
    f.globalAlpha = 0.08;
    f.drawImage(puff4(c, p0, "lv"), p.x - r, p.y - r * 0.45, r * 2, r * 0.9);
  }
  q.lineCap = "round";
  q.lineJoin = "round";
  for (const [lw, col, a] of [[2.6, p0, 0.24], [1.3, p0, 0.75], [0.75, hz, 0.8], [0.3, c.light ? p0 : [255, 255, 255], 0.65]]) {
    q.clearRect(0, 0, w, h);
    q.strokeStyle = rgb5(col, 1);
    for (let k = 0; k < pts.length - 1; k++) {
      const a1 = pts[k], b1 = pts[k + 1];
      q.lineWidth = Math.max(0.5, (a1.wd + b1.wd) * 0.5 * lw);
      q.beginPath();
      q.moveTo(a1.x, a1.y);
      q.lineTo(b1.x, b1.y);
      q.stroke();
    }
    f.globalAlpha = a;
    f.drawImage(tmp, 0, 0);
  }
  f.globalCompositeOperation = "source-over";
  f.globalAlpha = 1;
  const R = rng10(s.seed + 5);
  for (let k = 10; k < pts.length; k++) {
    const p = pts[k], n = p.wd / (h * 0.02) | 0, dy = pts[k].y - pts[k - 1].y;
    for (let j = 0; j < n; j++) {
      const r = p.wd * (0.08 + R() * 0.12);
      f.fillStyle = MX5(c, p0, 0.08, 0.3, 0.4 + R() * 0.3);
      f.beginPath();
      f.ellipse(p.x + (R() - 0.5) * p.wd * 0.95, p.y + (R() - 0.5) * dy * 2, r * 1.3, r * 0.5, R() * 0.6 - 0.3, 0, TAU9);
      f.fill();
    }
  }
  s.flow = fl;
}
function bakeBlossom(s, w, h, c) {
  const p0 = tone7(c, 0), p1 = tone7(c, 1), hz = haze5(c, 0.55), lamp = haze5(c, 0.45, 1), R = rng10(s.seed + 3), few = small4(w);
  s.sky = wash4(w, h, [[0, MX5(c, p0, 0.03, 0.55)], [0.5, MX5(c, p0, 0.07, 0.8)], [0.84, MX5(c, p1, 0.1, 0.9)], [1, MX5(c, p1, 0.06, 0.7)]]);
  const tree = mk9(w, h), x = tree.getContext("2d");
  const bx = s.tx * w, by = h * 0.93, P = (X, Y) => [bx + X * h, by + Y * h];
  const lit = (y) => clamp7((y / h - 0.18) / 0.7, 0, 1);
  x.globalCompositeOperation = "screen";
  {
    const r = h * 0.55;
    x.globalAlpha = 0.1;
    x.drawImage(puff4(c, p0, "nbg"), bx - r * 1.4, by - h * 0.55 - r * 0.5, r * 2.8, r * 1.3);
    x.globalAlpha = 1;
  }
  x.globalCompositeOperation = "source-over";
  const dark = MX5(c, p0, 0.05, 0.4);
  const [tx0, ty0] = P(0, 0), [tx1, ty1] = P(s.top.x, s.top.y);
  x.fillStyle = dark;
  x.beginPath();
  x.moveTo(tx0 - h * 0.03, ty0 + 2);
  x.quadraticCurveTo(tx0 - h * 6e-3, (ty0 + ty1) / 2, tx1 - h * 0.011, ty1);
  x.lineTo(tx1 + h * 0.011, ty1);
  x.quadraticCurveTo(tx0 + h * 0.016, (ty0 + ty1) / 2, tx0 + h * 0.03, ty0 + 2);
  x.closePath();
  x.fill();
  const q = (L, u) => [bz2(s.top.x, L.cx, L.ex, u), bz2(s.top.y, L.cy, L.ey, u)];
  x.strokeStyle = dark;
  x.lineCap = "round";
  for (const L of s.limbs) {
    const [ax, ay] = P(s.top.x, s.top.y), [cx2, cy2] = P(L.cx, L.cy), [ex, ey] = P(L.ex, L.ey);
    x.lineWidth = Math.max(1, L.wd * h);
    x.beginPath();
    x.moveTo(ax, ay);
    x.quadraticCurveTo(cx2, cy2, ex, ey);
    x.stroke();
  }
  x.globalCompositeOperation = "screen";
  for (const L of s.limbs) for (let u = 0; u <= 1; u += few ? 0.1 : 0.028) {
    const [qx, qy] = q(L, u), [px, py] = P(qx, qy);
    for (let j = 0; j < (few ? 2 : 6); j++) {
      const y = py + (R() - 0.5) * h * 0.07, l = lit(y);
      x.fillStyle = rgb5(R() < l * 0.5 ? hz : p0, 0.12 + 0.35 * l * R());
      x.beginPath();
      x.arc(px + (R() - 0.5) * h * 0.08, y, h * (2e-3 + R() * 3e-3), 0, TAU9);
      x.fill();
    }
  }
  for (const L of s.limbs) for (const st of L.strands) {
    const [qx, qy] = q(L, st.u), [sx, sy] = P(qx, qy), ex = sx + st.dx * h, ey = sy + st.len * h, kx = sx + st.dx * h * 2, ky = sy + st.len * h * 0.3;
    x.globalCompositeOperation = "source-over";
    x.strokeStyle = MX5(c, p0, 0.1, 0.55, 0.5);
    x.lineWidth = Math.max(0.5, h * 12e-4);
    x.beginPath();
    x.moveTo(sx, sy);
    x.quadraticCurveTo(kx, ky, ex, ey);
    x.stroke();
    x.globalCompositeOperation = "screen";
    const n2 = Math.round(st.len / (few ? 0.03 : 8e-3));
    for (let j = 0; j < n2; j++) {
      const v = (j + R()) / n2, px = bz2(sx, kx, ex, v) + (R() - 0.5) * h * 0.014, py = bz2(sy, ky, ey, v) + (R() - 0.5) * h * 0.01, l = lit(py) * (0.55 + 0.45 * v);
      x.fillStyle = rgb5(R() < l * 0.75 ? hz : p0, 0.2 + 0.55 * l * (0.5 + R() * 0.5));
      x.beginPath();
      x.arc(px, py, h * (22e-4 + R() * 34e-4), 0, TAU9);
      x.fill();
    }
  }
  x.globalCompositeOperation = "source-over";
  dither7(x, w, h);
  s.tree = tree;
  const gd = mk9(w, h * 0.16), y0 = h * 0.86, z = gd.getContext("2d");
  const gg = z.createLinearGradient(0, 0, 0, gd.height);
  gg.addColorStop(0, MX5(c, p0, 0.06, 0.55));
  gg.addColorStop(1, MX5(c, p0, 0.04, 0.42));
  z.fillStyle = gg;
  z.fillRect(0, h * 0.025, w, gd.height);
  const n = clamp7(Math.round(w / 170), 3, 10);
  s.lamps = [];
  for (let i = 0; i < n; i++) {
    const lx = (i + 0.5 + (R() - 0.5) * 0.3) / n * w, ly = h * 0.855, lw = h * 0.016, lh = h * 0.026;
    z.globalCompositeOperation = "screen";
    z.globalAlpha = 0.16;
    z.drawImage(puff4(c, p1, "nbp"), lx - h * 0.08, h * 0.02, h * 0.16, h * 0.05);
    z.globalAlpha = 1;
    z.globalCompositeOperation = "source-over";
    z.fillStyle = dark;
    z.fillRect(lx - h * 15e-4, ly - y0 + lh * 0.5, h * 3e-3, h * 0.04);
    z.fillStyle = rgb5(lamp, 0.95);
    z.beginPath();
    z.ellipse(lx, ly - y0, lw / 2, lh / 2, 0, 0, TAU9);
    z.fill();
    z.fillStyle = dark;
    z.fillRect(lx - lw * 0.35, ly - y0 - lh * 0.55, lw * 0.7, h * 3e-3);
    s.lamps.push({ x: lx, y: ly, ph: R() * 6 });
  }
  s.ground = gd;
  s.groundY = y0;
}
function bakeBlue(s, w, h, c) {
  const p0 = tone7(c, 0), hz = haze5(c, 0.5), N = s.N, SH = Math.round(h * s.shore), R = rng10(s.seed + 6);
  s.SH = SH;
  const span2 = Math.max(w, h * 1.3), X = (i) => i / N * span2 - (span2 - w) / 2;
  const far = Array.from(s.far, (v) => SH - h * (0.05 + 0.38 * v)), near = Array.from(s.near, (v) => SH - h * (0.012 + 0.1 * v));
  const up2 = mk9(w, SH + 1), x = up2.getContext("2d");
  const sg = x.createLinearGradient(0, 0, 0, SH);
  sg.addColorStop(0, MX5(c, p0, 0.06, 0.55));
  sg.addColorStop(0.5, MX5(c, p0, 0.2, 0.85));
  sg.addColorStop(0.85, MX5(c, hz, 0.36));
  sg.addColorStop(1, MX5(c, hz, 0.44));
  x.fillStyle = sg;
  x.fillRect(0, 0, w, SH + 1);
  x.globalCompositeOperation = "screen";
  for (const st of small4(w) ? s.stars.slice(0, 10) : s.stars) {
    x.fillStyle = W7(c, st.a * 0.8);
    const r = Math.max(0.6, st.r * Math.min(1, w / 1e3));
    x.fillRect(st.x * w, st.y * SH, r, r);
  }
  x.globalCompositeOperation = "source-over";
  const poly3 = (yy) => {
    x.beginPath();
    x.moveTo(0, SH + 1);
    for (let i = 0; i <= N; i++) x.lineTo(X(i), yy[i]);
    x.lineTo(w, SH + 1);
    x.closePath();
  };
  const top = Math.min(...far), fg = x.createLinearGradient(0, top, 0, SH);
  fg.addColorStop(0, MX5(c, hz, 0.34));
  fg.addColorStop(0.3, MX5(c, p0, 0.2, 0.72));
  fg.addColorStop(1, MX5(c, p0, 0.12, 0.48));
  x.fillStyle = fg;
  poly3(far);
  x.fill();
  x.lineWidth = Math.max(0.6, h / 900);
  x.strokeStyle = W7(c, 0.14);
  x.beginPath();
  for (let i = 0; i <= N; i++) i ? x.lineTo(X(i), far[i] + 0.5) : x.moveTo(X(i), far[i] + 0.5);
  x.stroke();
  x.fillStyle = MX5(c, p0, 0.08, 0.4);
  poly3(near);
  x.fill();
  s.wins = [];
  for (const cb of s.cabins) {
    const cw = cb.wd * h, chh = cb.ht * h, cx = cb.x * w, base = SH - h * 2e-3;
    x.fillStyle = MX5(c, p0, 0.05, 0.3);
    x.fillRect(cx - cw / 2, base - chh, cw, chh + 2);
    x.beginPath();
    x.moveTo(cx - cw * 0.58, base - chh);
    x.lineTo(cx, base - chh - cw * 0.42);
    x.lineTo(cx + cw * 0.58, base - chh);
    x.closePath();
    x.fill();
    if (!cb.lit) continue;
    for (const fx of cb.w2 ? [-0.22, 0.22] : [0]) {
      const wx = cx + fx * cw, wy = base - chh * 0.55, ws = Math.max(1, h * 55e-4);
      x.globalCompositeOperation = "screen";
      x.globalAlpha = 0.5;
      const r = ws * 5;
      x.drawImage(spark4(c, hz, "bhw"), wx - r, wy - r, r * 2, r * 2);
      x.globalAlpha = 1;
      x.fillStyle = W7(c, 0.9);
      x.fillRect(wx - ws / 2, wy - ws / 2, ws, ws * 1.2);
      x.globalCompositeOperation = "source-over";
      s.wins.push({ x: wx, ws, ph: R() * 6 });
    }
  }
  dither7(x, w, SH);
  s.up = up2;
  const wt = mk9(w, h - SH), y = wt.getContext("2d"), wg = y.createLinearGradient(0, 0, 0, h - SH);
  wg.addColorStop(0, BGA3(c, 0.3));
  wg.addColorStop(1, BGA3(c, 0.62));
  y.fillStyle = wg;
  y.fillRect(0, 0, w, h - SH);
  y.fillStyle = W7(c, 0.025);
  for (let i = 0; i < (small4(w) ? 4 : 40); i++) y.fillRect(R() * w * 0.8, Math.pow(R(), 0.7) * (h - SH), w * (0.05 + R() * 0.2), 1);
  s.water = wt;
  s.streak = sprite8("bhs" + c.acc + c.bg, () => {
    const cv = mk9(8, 64), z = cv.getContext("2d"), gr = z.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, rgb5(hz, 0.8));
    gr.addColorStop(1, rgb5(hz, 0));
    z.fillStyle = gr;
    z.fillRect(0, 0, 8, 64);
    return cv;
  });
}
function bakeSalt(s, w, h, c) {
  const p0 = tone7(c, 0), H0 = Math.round(h * 0.5), R = rng10(s.seed + 1);
  s.H0 = H0;
  s.sky = wash4(w, H0, [[0, MX5(c, p0, 0.44)], [0.55, MX5(c, p0, 0.2)], [0.9, MX5(c, p0, 0.07)], [1, MX5(c, p0, 0.1)]]);
  {
    const x = s.sky.getContext("2d"), N = 160, prof = norm014(fbm6(N, 6, 4, 0.5, R));
    x.fillStyle = MX5(c, p0, 0.3);
    x.beginPath();
    x.moveTo(0, H0);
    for (let i = 0; i <= N; i++) x.lineTo(i / N * w, H0 - h * (3e-3 + 0.016 * prof[i] * (0.35 + 0.65 * Math.sin(i / N * 3 + 1) ** 2)));
    x.lineTo(w, H0);
    x.closePath();
    x.fill();
  }
  const W22 = Math.max(1, Math.ceil(w)), dark = mixv6(c, p0, 0.06), lip = mixv6(c, p0, 0.62), mid = mixv6(c, p0, 0.36);
  s.clouds = [0, 1].map((k) => {
    const y0 = Math.floor(k ? H0 * 0.08 : H0 * 0.5), y1 = Math.ceil(k ? H0 * 0.66 : H0 * 0.94), CH = y1 - y0;
    const n = k ? small4(w) ? 2 : 6 : small4(w) ? 3 : 10, cs = [];
    for (let i = 0; i < n; i++) {
      const cw = (k ? 0.1 : 0.05) * Math.max(w, h * 1.2) * (0.7 + R() * 0.7), ch = cw * (k ? 0.42 : 0.3);
      cs.push({ x: (i + R() * 0.7) / n * W22, y: Math.max(ch * 1.1, CH * (0.55 + R() * 0.35)), cw, ch });
    }
    const shape = (X, Y) => {
      let best = -1;
      for (const q of cs) {
        let dx = X - q.x;
        dx -= Math.round(dx / W22) * W22;
        const u = dx / q.cw, v = (Y - q.y) / q.ch;
        const e = 1 - u * u - (v > 0 ? v * v * 9 : v * v * 0.7);
        if (e > best) best = e;
      }
      return Math.max(-1, best * 1.3 - 0.25);
    };
    const cv = cloudPaint({
      w: W22,
      h: CH,
      res: small4(w) ? 1 : 0.6,
      seed: s.seed + 31 + k,
      tile: true,
      cells: Math.max(4, Math.round(W22 / ((k ? 0.045 : 0.028) * Math.max(w, h)))),
      oct: 4,
      warp: 0.15,
      billow: true,
      gain: 1.25,
      shape,
      light: [0.25, -0.97],
      cover: [-0.05, 0.2],
      steps: 6,
      stepPx: CH * 0.025,
      absorb: 0.8,
      col: (lt, rim) => [0, 1, 2].map((q) => {
        const v = dark[q] + (mid[q] - dark[q]) * Math.pow(lt, 0.7);
        return v + (lip[q] - v) * rim * 0.8;
      }),
      alpha: 0.95
    });
    return { cv, y0, sp: k ? 9 : 4 };
  });
  const wt = mk9(w, h - H0), y = wt.getContext("2d");
  y.fillStyle = BGA3(c, 0.1);
  y.fillRect(0, 0, w, h - H0);
  y.fillStyle = MX5(c, p0, 0.2, 1, 0.12);
  for (let i = 0; i < (small4(w) ? 3 : 26); i++) y.fillRect(R() * w, Math.pow(R(), 1.5) * (h - H0), w * (0.04 + R() * 0.18), 1);
  s.wet = wt;
}
function deadTree(x, H, seed) {
  const R = rng10(seed);
  const limb = (px, py, a, len, wd, d) => {
    const ex = px + Math.cos(a) * len, ey = py + Math.sin(a) * len;
    x.lineWidth = wd;
    x.beginPath();
    x.moveTo(px, py);
    x.quadraticCurveTo((px + ex) / 2 + (R() - 0.5) * len * 0.3, (py + ey) / 2 + (R() - 0.5) * len * 0.2, ex, ey);
    x.stroke();
    if (d <= 0) return;
    const n = 2 + (R() < 0.35 ? 1 : 0);
    for (let i = 0; i < n; i++) limb(ex, ey, a + (R() - 0.5) * 1.1 + (i - (n - 1) / 2) * 0.6, len * (0.55 + R() * 0.25), wd * 0.6, d - 1);
  };
  x.lineCap = "round";
  x.lineJoin = "round";
  limb(0, 0, -Math.PI / 2 + (R() - 0.5) * 0.3, H * 0.36, Math.max(1, H * 0.06), 4);
}
function bakeSand(s, w, h, c) {
  const p0 = tone7(c, 0), p2 = tone7(c, 2), L = c.light, R = rng10(s.seed + 8), N = s.N;
  const lit = (k) => L ? MX5(c, p0, 0.3 * k) : MX5(c, p0, 0.55 * k, 0.95);
  const shade = (k) => L ? MX5(c, p0, 0.78 * k) : MX5(c, p0, 0.2 * k, 0.52);
  const base = h * 0.86;
  const cv = mk9(w, h), x = cv.getContext("2d");
  const sg = x.createLinearGradient(0, 0, 0, h * 0.62);
  if (L) {
    sg.addColorStop(0, MX5(c, p2, 0.46));
    sg.addColorStop(1, MX5(c, p2, 0.1));
  } else {
    sg.addColorStop(0, MX5(c, p2, 0.06, 0.6));
    sg.addColorStop(1, MX5(c, p0, 0.22));
  }
  x.fillStyle = sg;
  x.fillRect(0, 0, w, h);
  x.fillStyle = L ? BGA3(c, 1) : MX5(c, haze5(c, 0.6), 0.26);
  x.fillRect(0, h * 0.8, w, h * 0.2);
  x.strokeStyle = L ? MX5(c, p0, 0.25, 1, 0.22) : BGA3(c, 0.35);
  x.lineWidth = Math.max(0.5, h / 1400);
  for (let i = 0; i < (small4(w) ? 6 : 60); i++) {
    let px2 = R() * w, py2 = base + R() * (h - base);
    x.beginPath();
    x.moveTo(px2, py2);
    for (let j = 0; j < 4; j++) {
      px2 += (R() - 0.5) * h * 0.05;
      py2 += (R() - 0.5) * h * 0.012;
      x.lineTo(px2, py2);
    }
    x.stroke();
  }
  const fy = Array.from(s.far, (v) => h * (0.62 - 0.1 * v)), X = (i) => i / N * w;
  x.fillStyle = lit(0.55);
  x.beginPath();
  x.moveTo(0, base);
  for (let i = 0; i <= N; i++) x.lineTo(X(i), fy[i]);
  x.lineTo(w, base);
  x.closePath();
  x.fill();
  x.fillStyle = shade(0.6);
  for (let i = 1; i < N; i++) {
    if (!(fy[i] < fy[i - 1] && fy[i] <= fy[i + 1])) continue;
    let j = i;
    while (j < N && fy[j + 1] >= fy[j]) j++;
    if (j - i < 2) continue;
    x.beginPath();
    x.moveTo(X(i), fy[i]);
    for (let k = i + 1; k <= j; k++) x.lineTo(X(k), fy[k]);
    x.lineTo(X(j), base);
    x.lineTo(X(i) + (X(j) - X(i)) * 0.25, base);
    x.closePath();
    x.fill();
  }
  const px = s.px * w, py = h * 0.22;
  const P = [px, py], L0 = [-0.05 * w, h * 0.74], LC = [0.14 * w, h * 0.48], RC = [px + 0.25 * w, h * 0.27], R0 = [1.05 * w, h * 0.58];
  const K1 = [px - 0.03 * w, h * 0.38], K2 = [px - 0.12 * w, h * 0.62], K3 = [px - 0.2 * w, base];
  const crest = (t) => [bz3(P[0], K1[0], K2[0], K3[0], t), bz3(P[1], K1[1], K2[1], K3[1], t)];
  s.crest = crest;
  x.fillStyle = lit(1);
  x.beginPath();
  x.moveTo(L0[0], base);
  x.lineTo(L0[0], L0[1]);
  x.quadraticCurveTo(LC[0], LC[1], P[0], P[1]);
  x.bezierCurveTo(K1[0], K1[1], K2[0], K2[1], K3[0], K3[1]);
  x.closePath();
  x.fill();
  x.fillStyle = shade(1);
  x.beginPath();
  x.moveTo(P[0], P[1]);
  x.quadraticCurveTo(RC[0], RC[1], R0[0], R0[1]);
  x.lineTo(R0[0], base);
  x.lineTo(K3[0], K3[1]);
  x.bezierCurveTo(K2[0], K2[1], K1[0], K1[1], P[0], P[1]);
  x.closePath();
  x.fill();
  const Q = [0.84 * w, h * 0.5], QL = [0.56 * w, base], QLC = [0.7 * w, h * 0.6], QRC = [0.97 * w, h * 0.5], QR = [1.1 * w, h * 0.68];
  const J1 = [0.81 * w, h * 0.62], J2 = [0.74 * w, h * 0.76], J3 = [0.66 * w, base];
  x.fillStyle = lit(1.05);
  x.beginPath();
  x.moveTo(QL[0], QL[1]);
  x.quadraticCurveTo(QLC[0], QLC[1], Q[0], Q[1]);
  x.bezierCurveTo(J1[0], J1[1], J2[0], J2[1], J3[0], J3[1]);
  x.closePath();
  x.fill();
  x.fillStyle = shade(1.05);
  x.beginPath();
  x.moveTo(Q[0], Q[1]);
  x.quadraticCurveTo(QRC[0], QRC[1], QR[0], QR[1]);
  x.lineTo(QR[0], base);
  x.lineTo(J3[0], J3[1]);
  x.bezierCurveTo(J2[0], J2[1], J1[0], J1[1], Q[0], Q[1]);
  x.closePath();
  x.fill();
  x.strokeStyle = L ? BGA3(c, 0.55) : W7(c, 0.3);
  x.lineWidth = Math.max(0.6, h / 900);
  x.beginPath();
  x.moveTo(P[0], P[1]);
  x.bezierCurveTo(K1[0], K1[1], K2[0], K2[1], K3[0], K3[1]);
  x.stroke();
  x.beginPath();
  x.moveTo(Q[0], Q[1]);
  x.bezierCurveTo(J1[0], J1[1], J2[0], J2[1], J3[0], J3[1]);
  x.stroke();
  {
    const gr = x.createLinearGradient(0, base, 0, base + h * 0.03);
    gr.addColorStop(0, L ? MX5(c, p0, 0.3, 1, 0.5) : BGA3(c, 0.5));
    gr.addColorStop(1, L ? MX5(c, p0, 0.3, 1, 0) : BGA3(c, 0));
    x.fillStyle = gr;
    x.fillRect(0, base, w, h * 0.03);
  }
  for (const tr of s.trees) {
    const H = tr.s * h, bx = tr.x * w, by = tr.y * h;
    x.save();
    x.setTransform(1, 0, -1.1, -0.13, bx, by);
    x.strokeStyle = L ? MX5(c, p0, 0.3, 1, 0.5) : BGA3(c, 0.55);
    deadTree(x, H, tr.seed);
    x.restore();
    x.save();
    x.translate(bx, by);
    x.strokeStyle = L ? "rgba(255,255,255,.94)" : MX5(c, p0, 0.04, 0.28);
    deadTree(x, H, tr.seed);
    x.restore();
  }
  dither7(x, w, h);
  s.img = cv;
}
var SCENES_PLACES = [
  {
    name: "Lava Field",
    flav: "Artscape",
    reset: (w, h) => {
      const seed = Math.random() * 1e9 | 0, R = rng10(seed), N = 240;
      return {
        seed,
        N,
        ridge: norm014(fbm6(N, 3, 5, 0.5, R)),
        ridgeBase: 0.6,
        ridgeAmp: 0.08,
        cx: 0.38 + R() * 0.24,
        M: 140,
        m1: R() * 6,
        m2: R() * 6,
        stars: makeStars2(R, 70, 0.32),
        plume: Array.from({ length: 9 }, () => ({ ph: R(), sp: 0.7 + R() * 0.6, dx: (R() - 0.3) * 0.8 })),
        pulses: Array.from({ length: 28 }, () => ({ u0: R(), sp: 0.6 + R() * 0.8, sz: R() })),
        embers: Array.from({ length: 46 }, () => ({ ph: R(), sp: 0.6 + R() * 0.9, dx: R() - 0.5 })),
        key: ""
      };
    },
    frame: (g, w, h, t, c, s) => {
      const key = keyOf6(w, h, c);
      if (s.key !== key) {
        bakeLava(s, w, h, c);
        s.key = key;
      }
      const tt = t * 1e-3, p0 = tone7(c, 0), hz = haze5(c, 0.5), few = small4(w);
      fresh4(g, c, w, h);
      g.drawImage(s.sky, 0, 0);
      g.globalCompositeOperation = "screen";
      drawStars2(g, c, s.stars, w, h, t, (y) => clamp7(1 - y * 2.4, 0, 1));
      const pf = puff4(c, p0, "lv");
      for (const pl of few ? s.plume.slice(0, 4) : s.plume) {
        const a = (tt * 0.02 * pl.sp + pl.ph) % 1, r = s.rw * (1.4 + a * 6), y = s.rimY - a * h * 0.42, xx = s.cxp + (pl.dx * a * 0.12 + Math.sin(tt * 0.1 + pl.ph * 6) * 8e-3) * w;
        g.globalAlpha = 0.2 * Math.sin(a * Math.PI) * (1 - a * 0.4);
        g.drawImage(pf, xx - r, y - r, r * 2, r * 2);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
      g.drawImage(s.land, 0, 0);
      g.globalCompositeOperation = "screen";
      {
        const r = s.rw * 3.2 * (1 + 0.08 * Math.sin(tt * 1.7));
        g.globalAlpha = 0.85;
        g.drawImage(spark4(c, hz, "lvr"), s.cxp - r, s.rimY - r * 0.6, r * 2, r * 1.2);
      }
      g.globalAlpha = 0.9 + 0.1 * Math.sin(tt * 0.8);
      g.drawImage(s.flow, 0, 0);
      const sk = spark4(c, hz, "lvp"), M = s.pts.length - 1;
      for (const pu of few ? s.pulses.slice(0, 6) : s.pulses) {
        const u = (pu.u0 + tt * 0.016 * pu.sp) % 1, p = s.pts[Math.min(M, u * M | 0)], r = p.wd * (0.9 + pu.sz * 0.8);
        g.globalAlpha = 0.6 * Math.sqrt(Math.sin(u * Math.PI));
        g.drawImage(sk, p.x - r, p.y - r * 0.6, r * 2, r * 1.2);
      }
      g.globalAlpha = 1;
      const es = Math.max(1, h / 650);
      for (const e of few ? s.embers.slice(0, 8) : s.embers) {
        const a = (tt * 0.12 * e.sp + e.ph) % 1, y = s.rimY - a * h * 0.3, xx = s.cxp + (e.dx * a * 0.08 + Math.sin(a * 7 + e.ph * 6) * 6e-3) * w;
        const al = (1 - a) * (0.5 + 0.5 * Math.sin(tt * 9 * e.sp + e.ph * 6)) * 0.85;
        if (al < 0.03) continue;
        g.fillStyle = a < 0.3 ? rgb5(hz, al) : AP7(c, 0, al);
        g.fillRect(xx, y, es * (1.3 - a), es * (1.3 - a));
      }
      done4(g);
    }
  },
  {
    name: "Night Blossom",
    flav: "Artscape",
    reset: (w, h) => {
      const seed = Math.random() * 1e9 | 0, R = rng10(seed), top = { x: (R() - 0.5) * 0.04, y: -0.5 }, limbs = [], nL = 11;
      for (let i = 0; i < nL; i++) {
        const a = Math.PI * (1.08 + 0.84 * (i + 0.5 + (R() - 0.5) * 0.6) / nL), len = 0.2 + R() * 0.22;
        const strands = [], ns = 4 + (R() * 5 | 0);
        for (let j = 0; j < ns; j++) {
          const u = 0.3 + 0.7 * (j + R() * 0.8) / ns;
          strands.push({ u, len: 0.12 + R() * 0.3 * (0.4 + u * 0.6), dx: (R() - 0.5) * 0.03 + Math.cos(a) * 0.02 });
        }
        limbs.push({ cx: top.x + Math.cos(a) * len * 0.6, cy: top.y + Math.sin(a) * len * 0.75 - 0.03, ex: top.x + Math.cos(a) * len * 1.25, ey: top.y + Math.sin(a) * len * 0.7 + 0.06, wd: 6e-3 + R() * 6e-3, strands });
      }
      const petals = Array.from({ length: 80 }, () => ({ x: R(), y: R(), v: 0.025 + R() * 0.04, dx: 6e-3 + R() * 0.012, f: 0.5 + R() * 0.9, ph: R() * 6.3, sz: 0.55 + R() * 0.8, rs: 0.6 + R() * 1.6, k: R() < 0.6 }));
      return { seed, tx: 0.5 + (R() - 0.5) * 0.16, top, limbs, petals, key: "" };
    },
    frame: (g, w, h, t, c, s) => {
      const key = keyOf6(w, h, c);
      if (s.key !== key) {
        bakeBlossom(s, w, h, c);
        s.key = key;
      }
      const tt = t * 1e-3, p0 = tone7(c, 0), hz = haze5(c, 0.55), p1 = tone7(c, 1), few = small4(w);
      fresh4(g, c, w, h);
      g.drawImage(s.sky, 0, 0);
      g.globalCompositeOperation = "screen";
      const lg = spark4(c, p1, "nbl");
      for (const L of s.lamps) {
        const r = h * 0.06 * (1 + 0.05 * Math.sin(tt * 2.6 + L.ph));
        g.globalAlpha = 0.5;
        g.drawImage(lg, L.x - r, L.y - r, r * 2, r * 2);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
      g.drawImage(s.tree, 0, 0);
      g.drawImage(s.ground, 0, s.groundY);
      const sz = Math.max(1.3, h * 45e-4);
      for (const p of few ? s.petals.slice(0, 12) : s.petals) {
        const y = ((p.y + tt * p.v) % 1.08 - 0.04) * h, xx = ((p.x + tt * p.dx + Math.sin(tt * p.f + p.ph) * 0.02) % 1 + 1) % 1 * w;
        const r = sz * p.sz, flip = Math.abs(Math.cos(tt * p.rs + p.ph));
        g.fillStyle = rgb5(p.k ? hz : p0, 0.5 + 0.35 * flip);
        g.beginPath();
        g.ellipse(xx, y, r, Math.max(0.3, r * (0.22 + 0.55 * flip)), tt * p.rs * 0.5 + p.ph, 0, TAU9);
        g.fill();
      }
      done4(g);
    }
  },
  {
    name: "Blue Hour",
    flav: "Artscape",
    reset: (w, h) => {
      const seed = Math.random() * 1e9 | 0, R = rng10(seed), N = 300;
      const r1 = fbm6(N, 5, 6, 0.55, R), r2 = fbm6(N, 3, 4, 0.5, R), far = new Float32Array(N + 1);
      for (let i = 0; i <= N; i++) {
        const rd = 1 - Math.min(1, Math.abs(r1[i]) * 1.8);
        far[i] = 0.55 * rd * rd + 0.45 * (0.5 + r2[i]);
      }
      norm014(far);
      for (let i = 0; i <= N; i++) far[i] = Math.pow(far[i], 1.6);
      const cabins = [];
      let x = 0.04 + R() * 0.1;
      while (x < 0.96) {
        cabins.push({ x, wd: 0.022 + R() * 0.02, ht: 0.018 + R() * 0.016, lit: R() < 0.7, w2: R() < 0.4 });
        x += 0.028 + R() * 0.06 * (R() < 0.25 ? 3.5 : 1);
      }
      return { seed, N, far, near: norm014(fbm6(N, 4, 5, 0.5, R)), cabins, stars: makeStars2(R, 90, 0.42), shore: 0.62, key: "" };
    },
    frame: (g, w, h, t, c, s) => {
      const key = keyOf6(w, h, c);
      if (s.key !== key) {
        bakeBlue(s, w, h, c);
        s.key = key;
      }
      const tt = t * 1e-3, p0 = tone7(c, 0), SH = s.SH, few = small4(w);
      fresh4(g, c, w, h);
      g.drawImage(s.up, 0, 0);
      g.fillStyle = MX5(c, p0, 0.1, 0.5);
      g.fillRect(0, SH, w, h - SH);
      const rows = few ? 6 : 30, sh = (h - SH) / rows;
      for (let k = 0; k < rows; k++) {
        const sy = SH - (k + 1) * sh;
        if (sy < 0) break;
        const off = Math.sin(tt * 0.9 + k * 0.7) * (0.5 + k / rows * 5) * (w / 1440);
        g.save();
        g.translate(off, SH + (k + 1) * sh);
        g.scale(1, -1);
        g.drawImage(s.up, 0, sy, w, sh, 0, 0, w, sh + 0.5);
        g.restore();
      }
      g.drawImage(s.water, 0, SH);
      g.globalCompositeOperation = "screen";
      for (const wn of s.wins) {
        const L = h * (0.05 + 0.05 * (0.5 + 0.5 * Math.sin(tt * 0.7 + wn.ph)));
        g.globalAlpha = 0.45 + 0.15 * Math.sin(tt * 2.3 + wn.ph);
        g.drawImage(s.streak, wn.x - wn.ws * 0.6 + Math.sin(tt * 1.4 + wn.ph) * wn.ws * 0.4, SH + 1, wn.ws * 1.2, L);
      }
      done4(g);
    }
  },
  {
    name: "Salt Flat",
    flav: "Artscape",
    reset: () => ({ seed: Math.random() * 1e9 | 0, key: "" }),
    frame: (g, w, h, t, c, s) => {
      const key = keyOf6(w, h, c);
      if (s.key !== key) {
        bakeSalt(s, w, h, c);
        s.key = key;
      }
      const H0 = s.H0;
      fresh4(g, c, w, h);
      const top = () => {
        g.drawImage(s.sky, 0, 0);
        for (const st of s.clouds) {
          const W22 = st.cv.width, ox = Math.round((t * 1e-3 * st.sp * (w / 1440) % W22 + W22) % W22);
          g.drawImage(st.cv, ox - W22, st.y0);
          g.drawImage(st.cv, ox, st.y0);
        }
      };
      top();
      g.save();
      g.translate(0, 2 * H0);
      g.scale(1, -1);
      top();
      g.restore();
      g.drawImage(s.wet, 0, H0);
      done4(g);
    }
  },
  {
    name: "Sand Sea",
    flav: "Artscape",
    reset: (w, h) => {
      const seed = Math.random() * 1e9 | 0, R = rng10(seed), N = 220, n1 = fbm6(N, 6, 4, 0.5, R), far = new Float32Array(N + 1);
      for (let i = 0; i <= N; i++) {
        const r = 1 - Math.min(1, Math.abs(n1[i]) * 1.4);
        far[i] = Math.pow(r, 1.3);
      }
      norm014(far);
      const trees = [], nT = 3 + (R() * 2 | 0);
      for (let i = 0; i < nT; i++) trees.push({ x: 0.16 + (i + R() * 0.7) / nT * 0.74, y: 0.87 + R() * 0.09, s: 0.07 + R() * 0.08, seed: R() * 1e9 | 0 });
      return {
        seed,
        N,
        far,
        trees,
        px: 0.36 + R() * 0.12,
        drift: Array.from({ length: 80 }, () => ({ u: R() * 0.38, ph: R(), sp: 0.6 + R() * 0.8, len: 0.5 + R(), op: 0.4 + R() * 0.6 })),
        key: ""
      };
    },
    frame: (g, w, h, t, c, s) => {
      const key = keyOf6(w, h, c);
      if (s.key !== key) {
        bakeSand(s, w, h, c);
        s.key = key;
      }
      const tt = t * 1e-3, few = small4(w);
      fresh4(g, c, w, h);
      g.drawImage(s.img, 0, 0);
      const ds = Math.max(1, h / 650), hz = haze5(c, 0.4);
      for (const d of few ? s.drift.slice(0, 10) : s.drift) {
        const a = (tt * 0.3 * d.sp + d.ph) % 1, [cx, cy] = s.crest(d.u);
        const xx = cx + a * w * 0.05 * d.len, y = cy + a * h * 0.014 + Math.sin(a * 5 + d.ph * 6) * h * 3e-3;
        const al = Math.sin(a * Math.PI) * 0.42 * d.op;
        g.fillStyle = c.light ? BGA3(c, al) : rgb5(hz, al);
        g.fillRect(xx, y, ds * 3, ds);
      }
      done4(g);
    }
  }
];

// from skyWater.ts
var AP8 = (c, i, a) => {
  const p = c.pal[(i % c.pal.length + c.pal.length) % c.pal.length];
  return `rgba(${p[0]},${p[1]},${p[2]},${a})`;
};
var W8 = (c, a, i = 0) => c.light ? AP8(c, i, Math.min(1, a * 1.6)) : `rgba(255,255,255,${a})`;
function LTr2(c, k, i = 0) {
  const p = c.pal[(i % c.pal.length + c.pal.length) % c.pal.length];
  if (k <= 1) {
    const q2 = Math.max(0, k);
    return [c.br + (p[0] - c.br) * q2, c.bg2 + (p[1] - c.bg2) * q2, c.bb + (p[2] - c.bb) * q2];
  }
  const q = c.light ? 0 : Math.min(1, k - 1);
  return [p[0] + (255 - p[0]) * q, p[1] + (255 - p[1]) * q, p[2] + (255 - p[2]) * q];
}
var rgba5 = (v, a) => `rgba(${v[0] | 0},${v[1] | 0},${v[2] | 0},${a})`;
var LT2 = (c, k, a = 1, i = 0) => rgba5(LTr2(c, k, i), a);
function mk10(w, h) {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  return cv;
}
function rng11(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var sq2 = (v) => v * v;
var gauss = (R) => (R() + R() + R() + R() - 2) * 0.866;
var _spKey3 = "";
var _sp7 = /* @__PURE__ */ new Map();
function sprite9(c, id, make) {
  const k = c.acc + "|" + c.bg + "|" + (c.light ? 1 : 0);
  if (k !== _spKey3) {
    _spKey3 = k;
    _sp7.clear();
  }
  let cv = _sp7.get(id);
  if (!cv) {
    cv = make();
    _sp7.set(id, cv);
  }
  return cv;
}
function radial3(stops, S = 64) {
  const cv = mk10(S, S), x = cv.getContext("2d");
  const gr = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  x.fillStyle = gr;
  x.fillRect(0, 0, S, S);
  return cv;
}
var softSp2 = (c, k, i = 0) => sprite9(c, "s" + k + "_" + i, () => {
  const v = LTr2(c, k, i);
  return radial3([[0, rgba5(v, 1)], [0.22, rgba5(v, 0.72)], [0.45, rgba5(v, 0.34)], [0.7, rgba5(v, 0.1)], [1, rgba5(v, 0)]], 96);
});
var holeSp = (c) => sprite9(c, "hole", () => radial3([[0, "rgba(0,0,0,1)"], [0.35, "rgba(0,0,0,.6)"], [0.7, "rgba(0,0,0,.18)"], [1, "rgba(0,0,0,0)"]], 64));
var keyOf7 = (w, h, c) => w + "x" + h + "|" + c.acc + "|" + c.bg;
function tick4(s, t) {
  const dt = s.lt == null || t < s.lt ? 16 : Math.min(64, t - s.lt);
  s.lt = t;
  return dt;
}
function bakeCloudSea(w, h, c, s) {
  const R = rng11(s.seed), m = Math.min(w, h);
  const H0 = h * 0.42, sx = w * 0.64, sr = Math.max(1.5, m * 0.042), sy = H0 - sr * 0.15;
  s.H0 = H0;
  s.sx = sx;
  s.sy = sy;
  s.m = m;
  const sky = mk10(w, h), x = sky.getContext("2d");
  const gr = x.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, LT2(c, 0.035, 1, 2));
  gr.addColorStop(0.18, LT2(c, 0.07));
  gr.addColorStop(0.34, LT2(c, 0.2));
  gr.addColorStop(0.42, LT2(c, 0.42));
  gr.addColorStop(1, LT2(c, 0.3));
  x.fillStyle = gr;
  x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = "screen";
  const sunK = c.light ? 0.3 : 1;
  s.sunK = sunK;
  const big = softSp2(c, 0.9);
  x.globalAlpha = 0.55 * sunK;
  x.drawImage(big, sx - w * 0.75, sy - h * 0.55, w * 1.5, h * 1.1);
  x.globalAlpha = 0.6 * sunK;
  x.drawImage(softSp2(c, 1.2), sx - m * 0.32, sy - m * 0.3, m * 0.64, m * 0.6);
  if (!c.light) {
    x.globalAlpha = 0.9;
    x.drawImage(softSp2(c, 1.6), sx - sr * 3.2, sy - sr * 3.2, sr * 6.4, sr * 6.4);
    x.globalAlpha = 1;
    x.fillStyle = LT2(c, 1.75);
    x.beginPath();
    x.arc(sx, sy, sr, 0, 6.2832);
    x.fill();
  }
  x.globalCompositeOperation = "source-over";
  s.sky = sky;
  const ci = mk10(w, H0), y = ci.getContext("2d");
  y.globalCompositeOperation = "lighter";
  const streak2 = softSp2(c, 1.05);
  for (let i = 0; i < 16; i++) {
    const cx = R() * w, cy = H0 * (0.18 + R() * 0.6), len = w * (0.12 + R() * 0.3), th = Math.max(1, m * (0.012 + R() * 0.03));
    const lift2 = 0.2 + 0.8 * (cy / H0);
    y.globalAlpha = (0.04 + R() * 0.08) * lift2;
    for (const ox of [-w, 0, w]) y.drawImage(streak2, cx - len / 2 + ox, cy - th / 2, len, th);
  }
  s.ci = ci;
  const fr = [0, 0.08, 0.2, 0.4, 0.68], rr = [0.012, 0.022, 0.04, 0.07, 0.115];
  const hz = [1, 0.8, 0.6, 0.38, 0.16], vv = [0.8, 1.7, 3.2, 5.8, 10];
  s.layers = [];
  for (let k = 0; k < 5; k++) {
    const r = Math.max(1.2, m * rr[k]);
    const yk = H0 + (h - H0) * fr[k];
    const ny = k < 4 ? H0 + (h - H0) * fr[k + 1] : h;
    const kb = 0.1 + 0.28 * Math.pow(hz[k], 1.1);
    const kt = Math.min(1.08, kb + 0.1 + 0.5 * (1 - hz[k]));
    const kh = kb + 0.06 + 0.05 * hz[k];
    const fy = 0.5 + 0.3 * (1 - hz[k]);
    const top = Math.floor(yk - r * 3.2 * fy - r);
    const bot = k < 4 ? Math.min(h, Math.ceil(ny + r * 2)) : h;
    const heads = ridge(Math.ceil(w), Math.max(3, Math.round(w / (r * 3.2))), s.seed + k * 31);
    const sh = LTr2(c, kb * 0.8), li = LTr2(c, kt), rimc = LTr2(c, Math.min(1.9, kt + 0.4));
    const cv = cloudPaint({
      w,
      h: bot - top,
      res: k < 2 ? 0.75 : 0.5,
      seed: s.seed + k * 977,
      tile: true,
      cells: Math.max(4, Math.round(w / (r * 1.7))),
      oct: 6,
      warp: 0.12,
      billow: true,
      gain: 2.2,
      aspect: 1 / fy,
      shape: (X, Y) => {
        const hv = heads[Math.min(heads.length - 1, Math.max(0, X | 0))];
        const line = yk - top - Math.pow(hv, 1.7) * r * 3.4 * fy - r * 0.15;
        return Math.max(-1.2, Math.min(0.9, (Y - line) / (r * fy * 0.8))) * 0.85;
      },
      light: [0.28, -0.96],
      cover: [-0.1, 0.12],
      steps: 7,
      stepPx: r * 0.3,
      absorb: 0.8,
      col: (lt, rim, dp) => {
        const L = Math.pow(lt, 0.6);
        return [0, 1, 2].map((q) => {
          const v = sh[q] + (li[q] - sh[q]) * L;
          return (v + (rimc[q] - v) * rim * 0.75) * (1 - dp * 0.12);
        });
      }
    });
    const o = cv.getContext("2d");
    o.globalCompositeOperation = "source-atop";
    const mg = o.createLinearGradient(0, yk - top - r * 0.1 * fy, 0, yk - top + Math.max(r * 2 * fy, (ny - yk) * 0.9));
    mg.addColorStop(0, LT2(c, kh, 0));
    mg.addColorStop(0.55, LT2(c, kh, 0.55));
    mg.addColorStop(1, LT2(c, kh, 0.92));
    o.fillStyle = mg;
    o.fillRect(0, 0, w, h);
    o.globalCompositeOperation = "source-over";
    s.layers.push({ cv, top, v: vv[k] * Math.max(0.2, w / 1440) });
  }
}
var cloudSea = {
  name: "Cloud Sea",
  flav: "Artscape",
  reset: () => ({ seed: Math.random() * 1e9 | 0, key: "" }),
  frame: (g, w, h, t, c, s) => {
    const key = keyOf7(w, h, c);
    if (s.key !== key) {
      s.key = key;
      bakeCloudSea(w, h, c, s);
    }
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.drawImage(s.sky, 0, 0);
    g.globalCompositeOperation = "screen";
    const co = t * 12e-4 * Math.max(0.2, w / 1440) % w;
    g.drawImage(s.ci, co - w, 0);
    g.drawImage(s.ci, co, 0);
    g.globalCompositeOperation = "source-over";
    for (const L of s.layers) {
      const off = t * L.v / 1e3 % w;
      g.drawImage(L.cv, off - w, L.top);
      g.drawImage(L.cv, off, L.top);
    }
    g.globalCompositeOperation = "screen";
    const br = (0.85 + 0.15 * Math.sin(t * 11e-5)) * (s.sunK ?? 1);
    const H0 = s.H0, sx = s.sx;
    g.globalAlpha = 0.3 * br;
    g.drawImage(softSp2(c, 1), sx - w * 0.55, H0 - (h - H0) * 0.25, w * 1.1, (h - H0) * 0.7);
    g.globalAlpha = 0.22 * br;
    g.drawImage(softSp2(c, 1.2), sx - w * 0.22, H0 - (h - H0) * 0.08, w * 0.44, (h - H0) * 0.3);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }
};
function causticTile(c, seed) {
  const CELL = 20, GX = 16, GY = 16, TW = CELL * GX, TH = CELL * GY;
  const R = rng11(seed);
  const px = new Float32Array(GX * GY), py = new Float32Array(GX * GY);
  for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
    px[j * GX + i] = (i + 0.1 + R() * 0.8) * CELL;
    py[j * GX + i] = (j + 0.1 + R() * 0.8) * CELL;
  }
  const cv = mk10(TW, TH), x = cv.getContext("2d");
  const id = x.createImageData(TW, TH), d = id.data;
  const col = LTr2(c, 1.4);
  const T = 6.2832, p1 = R() * 9, p2 = R() * 9, p3 = R() * 9, p4 = R() * 9;
  for (let y = 0; y < TH; y++) {
    for (let xx = 0; xx < TW; xx++) {
      const wx = xx + 5.5 * Math.sin(T * y / TH * 3 + p1) + 3 * Math.sin(T * (xx + y) / TW * 2 + p2);
      const wy = y + 5.5 * Math.sin(T * xx / TW * 3 + p3) + 3 * Math.sin(T * (xx - y) / TH * 2 + p4);
      const fx = (wx % TW + TW) % TW, fy = (wy % TH + TH) % TH;
      const cx = fx / CELL | 0, cy = fy / CELL | 0;
      let f1 = 1e9, f2 = 1e9;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        let gi = cx + di, gj = cy + dj, ox = 0, oy = 0;
        if (gi < 0) {
          gi += GX;
          ox = -TW;
        } else if (gi >= GX) {
          gi -= GX;
          ox = TW;
        }
        if (gj < 0) {
          gj += GY;
          oy = -TH;
        } else if (gj >= GY) {
          gj -= GY;
          oy = TH;
        }
        const k = gj * GX + gi, ddx = px[k] + ox - fx, ddy = py[k] + oy - fy, dd = ddx * ddx + ddy * ddy;
        if (dd < f1) {
          f2 = f1;
          f1 = dd;
        } else if (dd < f2) f2 = dd;
      }
      const e = Math.sqrt(f2) - Math.sqrt(f1);
      let v = Math.max(0, 1 - e / 4.2);
      v = v * v * (3 - 2 * v);
      v = v * 0.85 + 0.15 * Math.max(0, 1 - e / 9);
      const o = (y * TW + xx) * 4;
      d[o] = col[0];
      d[o + 1] = col[1];
      d[o + 2] = col[2];
      d[o + 3] = v * 230 | 0;
    }
  }
  x.putImageData(id, 0, 0);
  return cv;
}
function causticSheet(L, t, sa, sb) {
  const o = L.o, pa = L.pa, pb = L.pb;
  o.globalCompositeOperation = "source-over";
  o.clearRect(0, 0, L.w, L.h);
  o.globalCompositeOperation = "lighter";
  const M = (sc, sq3, ox, oy) => typeof DOMMatrix !== "undefined" ? new DOMMatrix([sc, 0, 0, sc * sq3, ox, oy]) : null;
  const ma = M(sa[0], L.sq, sa[1] + t * sa[2], sa[3] + t * sa[4]);
  const mb = M(sb[0], L.sq, sb[1] + t * sb[2], sb[3] + t * sb[4]);
  if (ma && pa.setTransform) {
    pa.setTransform(ma);
    pb.setTransform(mb);
  }
  o.globalAlpha = sa[5];
  o.fillStyle = pa;
  o.fillRect(0, 0, L.w, L.h);
  o.globalAlpha = sb[5];
  o.fillStyle = pb;
  o.fillRect(0, 0, L.w, L.h);
  o.globalAlpha = 1;
  o.globalCompositeOperation = "destination-in";
  o.drawImage(L.mask, 0, 0);
  o.globalCompositeOperation = "source-over";
}
function sheet(tile, w, h, sq3, stops) {
  const cv = mk10(w, h), o = cv.getContext("2d");
  const mask = mk10(w, h), mq = mask.getContext("2d");
  const gr = mq.createLinearGradient(0, 0, 0, Math.max(1, h));
  for (const [p, a] of stops) gr.addColorStop(p, `rgba(0,0,0,${a})`);
  mq.fillStyle = gr;
  mq.fillRect(0, 0, w, h);
  return { cv, o, mask, w: cv.width, h: cv.height, sq: sq3, pa: o.createPattern(tile, "repeat"), pb: o.createPattern(tile, "repeat") };
}
function raySprite(c) {
  return sprite9(c, "ray", () => {
    const RW = 48, RH = 192, cv = mk10(RW, RH), x = cv.getContext("2d");
    const id = x.createImageData(RW, RH), d = id.data, col = LTr2(c, 1.25);
    for (let y = 0; y < RH; y++) {
      const f = y / RH, half = 0.22 + 0.78 * f;
      const vf = Math.min(1, f * 14) * Math.pow(1 - f, 1.4);
      for (let xx = 0; xx < RW; xx++) {
        const u = (xx / (RW - 1) - 0.5) * 2 / half;
        const a = Math.exp(-u * u * 2.6) * vf;
        const o = (y * RW + xx) * 4;
        d[o] = col[0];
        d[o + 1] = col[1];
        d[o + 2] = col[2];
        d[o + 3] = a * 255 | 0;
      }
    }
    x.putImageData(id, 0, 0);
    return cv;
  });
}
function boulder(o, R, cx, by, rw, rh, h) {
  const pts = [];
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + i / n * Math.PI, k = i === 0 || i === n ? 1 : 0.8 + R() * 0.3;
    pts.push([cx + Math.cos(a) * rw * k, by + Math.sin(a) * rh * k * (i === 0 || i === n ? 0 : 1)]);
  }
  o.beginPath();
  o.moveTo(pts[0][0], Math.max(h, pts[0][1]));
  o.lineTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    o.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  o.lineTo(pts[n][0], pts[n][1]);
  o.lineTo(pts[n][0], Math.max(h, pts[n][1]));
  o.quadraticCurveTo(cx, Math.max(h, by) + rh * 0.12, pts[0][0], Math.max(h, pts[0][1]));
  o.closePath();
}
function bakeSunken(w, h, c, s) {
  const R = rng11(s.seed), m = Math.min(w, h);
  const F = h * 0.72;
  s.F = F;
  s.m = m;
  const bg = mk10(w, h), x = bg.getContext("2d");
  const gr = x.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, LT2(c, 0.42));
  gr.addColorStop(0.08, LT2(c, 0.3));
  gr.addColorStop(0.3, LT2(c, 0.17));
  gr.addColorStop(0.6, LT2(c, 0.1));
  gr.addColorStop(0.72, LT2(c, 0.085));
  gr.addColorStop(1, LT2(c, 0.05));
  x.fillStyle = gr;
  x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = "screen";
  x.globalAlpha = 0.35;
  x.drawImage(softSp2(c, 0.8), -w * 0.1, -h * 0.45, w * 0.9, h * 0.9);
  x.globalAlpha = 1;
  x.globalCompositeOperation = "source-over";
  const rid = [{ y: 0, kc: 0.13, kb: 0.095, amp: 0.012 }, { y: 0.28, kc: 0.17, kb: 0.08, amp: 0.02 }, { y: 0.6, kc: 0.21, kb: 0.06, amp: 0.03 }];
  s.rid = [];
  for (const q of rid) {
    const by = F + (h - F) * q.y, f1 = 1 + R() * 2, f2 = 3 + R() * 4, p1 = R() * 9, p2 = R() * 9;
    const Y = (xx) => by + h * q.amp * (Math.sin(xx / w * 6.283 * f1 + p1) * 0.65 + Math.sin(xx / w * 6.283 * f2 + p2) * 0.35) - h * q.amp;
    x.beginPath();
    x.moveTo(0, h);
    for (let xx = 0; xx <= w + 8; xx += 8) x.lineTo(xx, Y(xx));
    x.lineTo(w, h);
    x.closePath();
    const sg = x.createLinearGradient(0, by - h * q.amp * 2, 0, h);
    sg.addColorStop(0, LT2(c, q.kc));
    sg.addColorStop(0.3, LT2(c, q.kb));
    sg.addColorStop(1, LT2(c, q.kb * 0.7));
    x.fillStyle = sg;
    x.fill();
    s.rid.push(Y);
  }
  const fx = w * (0.55 + R() * 0.15);
  boulder(x, R, fx, s.rid[0](fx) + h * 0.012, m * 0.09, m * 0.05, s.rid[0](fx) + h * 0.012);
  const fg0 = x.createLinearGradient(0, s.rid[0](fx) - m * 0.05, 0, s.rid[0](fx) + h * 0.02);
  fg0.addColorStop(0, LT2(c, 0.13));
  fg0.addColorStop(0.3, LT2(c, 0.09));
  fg0.addColorStop(1, LT2(c, 0.085));
  x.fillStyle = fg0;
  x.fill();
  s.bg = bg;
  const fg = mk10(w, h), o = fg.getContext("2d");
  const rocks = [{ x: w * (0.02 + R() * 0.05), rw: m * 0.26, rh: m * 0.2 }, { x: w * (0.9 + R() * 0.06), rw: m * 0.2, rh: m * 0.15 }];
  for (const rk of rocks) {
    const by = h + rk.rh * 0.12;
    boulder(o, R, rk.x, by, rk.rw, rk.rh, h + 2);
    const rg = o.createLinearGradient(0, by - rk.rh, 0, by + rk.rh * 0.3);
    rg.addColorStop(0, LT2(c, 0.17));
    rg.addColorStop(0.18, LT2(c, 0.07));
    rg.addColorStop(0.6, LT2(c, 0.035));
    rg.addColorStop(1, LT2(c, 0.025));
    o.fillStyle = rg;
    o.fill();
  }
  s.fg = fg;
  const tile = causticTile(c, s.seed + 7);
  const Fh = h - (F - h * 0.03);
  s.floorF = sheet(tile, w, Fh, 0.3, [[0, 0], [0.12, 0.35], [0.35, 0.55], [0.62, 0], [1, 0]]);
  s.floorN = sheet(tile, w, Fh, 0.5, [[0, 0], [0.3, 0], [0.6, 0.55], [1, 1]]);
  s.surf = sheet(tile, w, h * 0.17, 0.32, [[0, 1], [0.3, 0.55], [0.7, 0.12], [1, 0]]);
  s.grass = [];
  for (const rk of [{ x: rocks[0].x + rocks[0].rw * 0.75, sgn: 1 }, { x: rocks[1].x - rocks[1].rw * 0.6, sgn: -1 }]) {
    const n2 = Math.max(4, Math.round(10 + R() * 5));
    for (let i = 0; i < n2; i++) {
      const bx = rk.x + (R() - 0.5) * m * 0.09;
      s.grass.push({ x: bx, y: s.rid[2](bx) + h * (0.04 + R() * 0.03), hh: h * (0.08 + Math.pow(R(), 0.7) * 0.2), wd: Math.max(0.8, m * (25e-4 + R() * 3e-3)), ph: R() * 6.28, lean: rk.sgn * (0.05 + R() * 0.25) });
    }
  }
  s.rays = [];
  for (let i = 0; i < 10; i++) s.rays.push({ u: (i + 0.2 + R() * 0.6) / 10, wd: 0.05 + R() * 0.1, ph: R() * 9, sp: 5e-5 + R() * 8e-5, sw: R() * 9 });
  s.mo = [];
  const n = Math.max(12, Math.round(w * h / 14e3));
  for (let i = 0; i < n; i++) {
    const z = R();
    s.mo.push({ x: R() * w, y: R() * h, z, ph: R() * 9, vy: (2 + z * 6) / 1e3, sz: 0.6 + z * 1.4 });
  }
}
var sunkenLight = {
  name: "Sunken Light",
  flav: "Artscape",
  reset: () => ({ seed: Math.random() * 1e9 | 0, key: "" }),
  frame: (g, w, h, t, c, s) => {
    const key = keyOf7(w, h, c);
    if (s.key !== key) {
      s.key = key;
      bakeSunken(w, h, c, s);
    }
    const dt = tick4(s, t), F = s.F, m = s.m;
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.drawImage(s.bg, 0, 0);
    const S = Math.max(0.25, m / 900) * 1.5, bre = 0.8 + 0.2 * Math.sin(t * 17e-5);
    causticSheet(s.floorF, t, [S * 1.15, 0, 26e-4, 0, 8e-4, 0.3 * bre], [S * 1.4, 90, -2e-3, 40, 13e-4, 0.24 * bre]);
    causticSheet(s.floorN, t, [S * 2.7, 0, 58e-4, 0, 18e-4, 0.3 * bre], [S * 3.3, 90, -44e-4, 40, 29e-4, 0.24 * bre]);
    g.globalCompositeOperation = "lighter";
    g.drawImage(s.floorF.cv, 0, F - h * 0.03);
    g.drawImage(s.floorN.cv, 0, F - h * 0.03);
    causticSheet(s.surf, t, [S * 1.4, 0, 8e-3, 0, 26e-4, 0.5], [S * 1.8, 120, -62e-4, 30, 35e-4, 0.36]);
    g.drawImage(s.surf.cv, 0, 0);
    g.globalCompositeOperation = "screen";
    const rs = raySprite(c), sunX = w * 0.2, sunY = -h * 1.2;
    const pool = softSp2(c, 1.1);
    for (const r of s.rays) {
      const x0 = r.u * w * 1.15 - w * 0.05 + Math.sin(t * r.sp * 0.6 + r.sw) * w * 0.012;
      const an = Math.atan2(x0 - sunX, -sunY);
      const b = 0.5 + 0.5 * Math.sin(t * r.sp + r.ph);
      const al = 0.06 + 0.2 * b * b;
      const wd = w * r.wd * (0.85 + 0.3 * b), len = h * 1.02;
      g.save();
      g.translate(x0, -h * 0.02);
      g.rotate(-an);
      g.globalAlpha = al;
      g.drawImage(rs, -wd / 2, 0, wd, len);
      g.restore();
      const fy = F + (h - F) * 0.45, fx = x0 + Math.tan(an) * (fy + h * 0.02);
      g.globalAlpha = al * 0.5;
      g.drawImage(pool, fx - wd * 0.9, fy - wd * 0.16, wd * 1.8, wd * 0.32);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.fillStyle = LT2(c, 0.04);
    for (const b of s.grass) {
      const sw = (b.lean + Math.sin(t * 45e-5 + b.ph) * 0.2) * b.hh + Math.sin(t * 11e-4 + b.ph * 2) * b.hh * 0.03;
      const tx = b.x + sw, ty = b.y - b.hh;
      g.beginPath();
      g.moveTo(b.x - b.wd, b.y);
      g.quadraticCurveTo(b.x - b.wd + sw * 0.15, b.y - b.hh * 0.6, tx, ty);
      g.quadraticCurveTo(b.x + b.wd + sw * 0.2, b.y - b.hh * 0.55, b.x + b.wd, b.y);
      g.closePath();
      g.fill();
    }
    g.drawImage(s.fg, 0, 0);
    g.globalCompositeOperation = "screen";
    const gs = softSp2(c, 1.2);
    for (const p of s.mo) {
      p.y += p.vy * dt;
      p.x += Math.sin(t * 4e-4 + p.ph) * 0.01 * dt * p.z;
      if (p.y > h + 4) {
        p.y = -4;
        p.x = Math.random() * w;
      }
      const a = (0.16 + 0.4 * p.z) * (0.7 + 0.3 * Math.sin(t * 11e-4 + p.ph));
      if (p.z > 0.85) {
        g.globalAlpha = a * 0.45;
        const r = p.sz * 4;
        g.drawImage(gs, p.x - r, p.y - r, r * 2, r * 2);
      } else {
        g.globalAlpha = 1;
        g.fillStyle = LT2(c, 1.2, a);
        g.fillRect(p.x, p.y, p.sz, p.sz);
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }
};
function bakeStorm(w, h, c, s) {
  const R = rng11(s.seed), m = Math.min(w, h);
  const Hy = h * 0.7;
  s.Hy = Hy;
  s.m = m;
  const base = mk10(w, h), x = base.getContext("2d");
  const gr = x.createLinearGradient(0, 0, 0, Hy);
  gr.addColorStop(0, LT2(c, 0.025, 1, 2));
  gr.addColorStop(0.45, LT2(c, 0.06));
  gr.addColorStop(0.82, LT2(c, 0.2));
  gr.addColorStop(1, LT2(c, 0.38));
  x.fillStyle = gr;
  x.fillRect(0, 0, w, Hy + 2);
  x.globalCompositeOperation = "screen";
  x.globalAlpha = 0.55;
  x.drawImage(softSp2(c, 0.9), -w * 0.3, Hy - h * 0.45, w * 1, h * 0.8);
  x.globalAlpha = 0.35;
  x.drawImage(softSp2(c, 1.15), w * 0.02, Hy - h * 0.12, w * 0.38, h * 0.2);
  x.globalAlpha = 1;
  x.globalCompositeOperation = "source-over";
  const pg = x.createLinearGradient(0, Hy, 0, h);
  pg.addColorStop(0, LT2(c, 0.12));
  pg.addColorStop(0.12, LT2(c, 0.06));
  pg.addColorStop(1, LT2(c, 0.012));
  x.fillStyle = pg;
  x.fillRect(0, Hy, w, h - Hy);
  for (let i = 0; i < 26; i++) {
    const f = Math.pow(R(), 1.8), yy = Hy + 2 + f * (h - Hy) * 0.5, len = w * (0.01 + R() * 0.05) * (1 + f * 3);
    x.fillStyle = LT2(c, 0.28 - f * 0.15, 0.35 * (1 - f));
    x.fillRect(R() * w, yy, len, Math.max(1, f * 3));
  }
  for (let i = 0; i < Math.round(w * 0.6); i++) {
    const f = Math.pow(R(), 0.6), yy = Hy + f * (h - Hy);
    x.fillStyle = LT2(c, 0.09 * (1 - f) + 0.02, 0.4);
    x.fillRect(R() * w, yy, 1 + f * 5, 1);
  }
  x.beginPath();
  x.moveTo(0, Hy + 1);
  const hp = [R() * 9, R() * 9];
  for (let xx = 0; xx <= w + 6; xx += 6) x.lineTo(xx, Hy - h * (6e-3 + 0.01 * (0.5 + 0.5 * Math.sin(xx / w * 9 + hp[0])) * (0.5 + 0.5 * Math.sin(xx / w * 23 + hp[1]))));
  x.lineTo(w, Hy + 1);
  x.closePath();
  x.fillStyle = LT2(c, 0.15);
  x.fill();
  const vx = w * 0.3;
  x.beginPath();
  x.moveTo(vx - 1, Hy);
  x.lineTo(vx + 1, Hy);
  x.lineTo(w * 0.42, h);
  x.lineTo(w * 0.1, h);
  x.closePath();
  const rg = x.createLinearGradient(0, Hy, 0, h);
  rg.addColorStop(0, LT2(c, 0.16, 0.8));
  rg.addColorStop(0.4, LT2(c, 0.07, 0.5));
  rg.addColorStop(1, LT2(c, 0.03, 0.35));
  x.fillStyle = rg;
  x.fill();
  const poles = [];
  for (let i = 0; i < 9; i++) {
    const z = 1 / (1 + i * 0.9), px = vx + (w * 0.06 - vx) * z * 1.05 - w * 0.01 * z;
    const ph = h * 0.42 * z, py = Hy + (h - Hy) * 0.55 * z;
    poles.push({ x: px, y: py, top: py - ph, z });
  }
  x.strokeStyle = LT2(c, 0.02);
  x.fillStyle = LT2(c, 0.02);
  for (const p of poles) {
    x.lineWidth = Math.max(1, m * 7e-3 * p.z);
    x.beginPath();
    x.moveTo(p.x, p.y);
    x.lineTo(p.x, p.top);
    x.stroke();
    const cw2 = h * 0.035 * p.z;
    x.lineWidth = Math.max(0.8, m * 4e-3 * p.z);
    x.beginPath();
    x.moveTo(p.x - cw2, p.top + cw2 * 0.4);
    x.lineTo(p.x + cw2, p.top + cw2 * 0.4);
    x.stroke();
  }
  x.lineWidth = Math.max(0.6, m * 12e-4);
  for (const side of [-1, 1]) {
    x.beginPath();
    for (let i = 0; i < poles.length - 1; i++) {
      const a = poles[i], b = poles[i + 1];
      const ax = a.x + side * h * 0.035 * a.z * 0.85, ay = a.top + h * 0.035 * a.z * 0.4;
      const bx = b.x + side * h * 0.035 * b.z * 0.85, by = b.top + h * 0.035 * b.z * 0.4;
      x.moveTo(ax, ay);
      x.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + h * 0.03 * a.z, bx, by);
    }
    x.stroke();
  }
  s.base = base;
  const cx = w * 0.66, bw = w * 0.17, baseY = Hy - h * 0.075, Hc = h * 0.4, topY = baseY - Hc;
  const ox = Math.floor(cx - bw * 1.3), cw = Math.ceil(bw * 3.9), oy = Math.floor(topY - h * 0.07), ch = Math.ceil(Hy - oy + h * 0.02);
  const cl = mk10(cw, ch), o = cl.getContext("2d");
  const ctr = (f) => 0.12 * f;
  const hw = (f) => 0.6 - 0.14 * Math.sin(Math.PI * Math.min(1, f / 0.75)) + 0.38 * sq2(Math.max(0, (f - 0.62) / 0.2));
  const anvT = (u) => 0.97 - 0.06 * Math.max(0, (u - 0.3) / 1.7) - 0.07 * Math.max(0, (-0.2 - u) / 0.35);
  const anvB = (u) => 0.8 + 0.08 * Math.max(0, (u - 0.3) / 1.7) + 0.1 * Math.max(0, (-0.2 - u) / 0.35);
  const inside = (u, f) => {
    if (f < 0) return 0;
    if (f <= 0.82 && Math.abs(u - ctr(f)) < hw(f)) return 1;
    if (u > -0.55 && u < 2 && f > anvB(u) && f < anvT(u)) return 2;
    if (sq2((u - 0.18) / 0.2) + sq2((f - 0.97) / 0.07) < 1) return 1;
    return 0;
  };
  const GS = Math.max(4, Math.round(m * 0.012)), GW = Math.ceil(cw / GS) + 1, GH = Math.ceil(ch / GS) + 1;
  let G2 = new Float32Array(GW * GH);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const u = (i * GS + ox - cx) / bw, f = (baseY - (j * GS + oy)) / Hc;
    const k = inside(u, f), wide = u > -0.6 && u < 2.05 && f > anvB(u) - 0.05 && f < anvT(u) + 0.03;
    G2[j * GW + i] = k === 1 ? 1 : k === 2 || wide ? 1.5 : 0;
  }
  const RB = 3;
  for (let pass = 0; pass < 3; pass++) {
    const T = new Float32Array(GW * GH);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      let sm = 0, n = 0;
      for (let k = -RB; k <= RB; k++) {
        const ii = i + k;
        if (ii >= 0 && ii < GW) {
          sm += G2[j * GW + ii];
          n++;
        }
      }
      T[j * GW + i] = sm / n;
    }
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      let sm = 0, n = 0;
      for (let k = -RB; k <= RB; k++) {
        const jj = j + k;
        if (jj >= 0 && jj < GH) {
          sm += T[jj * GW + i];
          n++;
        }
      }
      G2[j * GW + i] = sm / n;
    }
  }
  const shape = (X, Y) => {
    const gx = Math.min(GW - 1.001, Math.max(0, X / GS)), gy = Math.min(GH - 1.001, Math.max(0, Y / GS));
    const i = gx | 0, j = gy | 0, fx = gx - i, fy2 = gy - j;
    const v = G2[j * GW + i] * (1 - fx) * (1 - fy2) + G2[j * GW + i + 1] * fx * (1 - fy2) + G2[(j + 1) * GW + i] * (1 - fx) * fy2 + G2[(j + 1) * GW + i + 1] * fx * fy2;
    return (Math.min(1, v) - 0.5) * 2.4;
  };
  const dark = LTr2(c, 0.06), hi = LTr2(c, 0.62), rimc = LTr2(c, 0.95);
  const body = cloudPaint({
    w: cw,
    h: ch,
    res: 0.7,
    seed: s.seed + 5,
    cells: Math.max(6, cw / (m * 0.075)),
    oct: 5,
    warp: 0.25,
    billow: true,
    gain: 1.6,
    shape,
    light: [-0.92, 0.38],
    cover: [-0.08, 0.16],
    steps: 7,
    stepPx: m * 0.012,
    absorb: 0.7,
    col: (lt, rim, dp, X, Y) => {
      const f = Math.max(0, Math.min(1.1, (baseY - (Y + oy)) / Hc));
      const alt = Math.min(1, Math.pow(f * 1.05, 1.4) * 0.85 + 0.1);
      const L = lt * alt;
      return [0, 1, 2].map((q) => {
        const v = dark[q] + (hi[q] - dark[q]) * L;
        return v + (rimc[q] - v) * rim * alt * 0.8;
      });
    }
  });
  o.drawImage(body, 0, 0);
  const fib = softSp2(c, 0.6);
  for (let i = 0; i < 60; i++) {
    const u = 0.6 + R() * 1.6, f = anvB(u) + (anvT(u) - anvB(u)) * R();
    const X = cx + u * bw, Y = baseY - f * Hc, L = bw * (0.3 + R() * 0.7), th = Math.max(1, h * (4e-3 + R() * 0.01));
    o.globalAlpha = 0.12 + R() * 0.2;
    o.drawImage(fib, X - ox - L / 2, Y - oy - th / 2, L, th);
  }
  o.globalAlpha = 1;
  const Y0 = baseY - oy - h * 0.012, Y1 = Hy - oy + h * 6e-3, VH = Y1 - Y0;
  const vcv = mk10(cw, ch), vq = vcv.getContext("2d");
  const vsp = softSp2(c, 0.1);
  for (let i = 0; i < 6; i++) {
    const u = (i + 0.2 + R() * 0.6) / 6, cwd = bw * (0.1 + R() * 0.12), X = cx - bw * 0.6 + u * bw * 1.2 - ox;
    vq.save();
    vq.translate(X, Y0);
    vq.transform(1, 0, -0.16, 1, 0, 0);
    vq.globalAlpha = 0.5 + R() * 0.45;
    vq.drawImage(vsp, -cwd, -VH * 0.9, cwd * 2, VH * 2.6);
    vq.restore();
  }
  vq.globalAlpha = 1;
  vq.globalCompositeOperation = "destination-in";
  const vg = vq.createLinearGradient(0, Y0, 0, Y1);
  vg.addColorStop(0, "rgba(0,0,0,1)");
  vg.addColorStop(0.6, "rgba(0,0,0,.7)");
  vg.addColorStop(1, "rgba(0,0,0,.05)");
  vq.fillStyle = vg;
  vq.fillRect(0, Y0, cw, ch);
  vq.clearRect(0, 0, cw, Math.max(0, Y0));
  o.drawImage(vcv, 0, 0);
  o.globalCompositeOperation = "source-atop";
  o.fillStyle = LT2(c, 0.3, 0.12);
  o.fillRect(0, 0, cw, ch);
  const bs = o.createLinearGradient(0, baseY - oy - Hc * 0.3, 0, baseY - oy + h * 5e-3);
  bs.addColorStop(0, LT2(c, 0.07, 0));
  bs.addColorStop(1, LT2(c, 0.07, 0.7));
  o.fillStyle = bs;
  o.fillRect(0, 0, cw, ch);
  o.globalCompositeOperation = "source-over";
  s.cl = cl;
  s.clx = ox;
  s.cly = oy;
  s.fl = [];
  for (let i = 0; i < 3; i++) {
    const fc = mk10(cw, ch), q = fc.getContext("2d");
    const lx = cx - ox + (R() - 0.45) * bw * 0.9, ly = baseY - oy - (baseY - topY) * (0.2 + R() * 0.45);
    q.drawImage(softSp2(c, 1.5), lx - m * 0.3, ly - m * 0.3, m * 0.6, m * 0.6);
    q.globalAlpha = 0.6;
    q.drawImage(softSp2(c, 1.1), lx - m * 0.6, ly - m * 0.55, m * 1.2, m * 1.1);
    q.globalAlpha = 1;
    q.globalCompositeOperation = "destination-in";
    q.drawImage(cl, 0, 0);
    s.fl.push({ cv: fc, lx: lx + ox, ly: ly + oy });
  }
  const rw = Math.ceil(bw * 1.6), rh = Math.ceil(Hy - baseY + h * 0.05), rx = cx - bw * 0.72, ry = baseY - h * 0.03;
  const tile = mk10(rw, Math.max(8, Math.round(h * 0.12))), tq = tile.getContext("2d");
  const TH = tile.height, sl = 0.18;
  tq.strokeStyle = LT2(c, 0.6);
  tq.lineWidth = Math.max(0.6, m * 12e-4);
  for (let i = 0; i < Math.round(rw * 0.5); i++) {
    const X = R() * rw, Y = R() * TH, L = TH * (0.08 + R() * 0.2);
    tq.globalAlpha = 0.15 + R() * 0.5;
    for (const dy of [-TH, 0, TH]) {
      tq.beginPath();
      tq.moveTo(X, Y + dy);
      tq.lineTo(X - L * sl, Y + L + dy);
      tq.stroke();
    }
  }
  const mask = mk10(rw, rh), mq = mask.getContext("2d");
  const curt = 4;
  for (let i = 0; i < curt; i++) {
    const u = (i + 0.3 + R() * 0.4) / curt, cwid = rw * (0.12 + R() * 0.16);
    mq.save();
    mq.translate(u * rw, 0);
    mq.transform(1, 0, -sl * 0.9, 1, 0, 0);
    mq.globalAlpha = 0.55 + R() * 0.45;
    mq.drawImage(softSp2(c, 0), -cwid, -rh * 0.1, cwid * 2, rh * 2.1);
    mq.restore();
  }
  mq.globalAlpha = 1;
  mq.globalCompositeOperation = "destination-in";
  const vf = mq.createLinearGradient(0, 0, 0, rh);
  vf.addColorStop(0, "rgba(0,0,0,0)");
  vf.addColorStop(0.12, "rgba(0,0,0,1)");
  vf.addColorStop(0.8, "rgba(0,0,0,.8)");
  vf.addColorStop(1, "rgba(0,0,0,0)");
  mq.fillStyle = vf;
  mq.fillRect(0, 0, rw, rh);
  s.rain = { tile, mask, cv: mk10(rw, rh), rx, ry, rw, rh };
  s.st = [];
  for (let i = 0; i < Math.max(6, Math.round(w * h / 3e4)); i++) s.st.push({ x: R() * w, y: Math.pow(R(), 1.4) * Hy * 0.55, a: 0.15 + R() * 0.45, ph: R() * 9, sp: 4e-4 + R() * 8e-4 });
}
var distantStorm = {
  name: "Distant Storm",
  flav: "Cinematic",
  reset: () => ({ seed: Math.random() * 1e9 | 0, key: "", nx: 0, fe: null }),
  frame: (g, w, h, t, c, s) => {
    const key = keyOf7(w, h, c);
    if (s.key !== key) {
      s.key = key;
      bakeStorm(w, h, c, s);
    }
    const m = s.m, Hy = s.Hy;
    if (s.lt == null || t < s.lt - 1e3) {
      s.nx = t + 2200;
      s.fe = null;
    }
    s.lt = t;
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.drawImage(s.base, 0, 0);
    g.globalCompositeOperation = "screen";
    for (const p of s.st) {
      g.fillStyle = W8(c, p.a * (0.6 + 0.4 * Math.sin(t * p.sp + p.ph)));
      g.fillRect(p.x, p.y, 1.3, 1.3);
    }
    if (!s.fe && t >= s.nx) {
      s.fe = { t0: t, i: Math.random() * s.fl.length | 0, pk: 0.45 + Math.random() * 0.4, dbl: Math.random() < 0.5 };
    }
    let fl = 0, fe = s.fe;
    if (fe) {
      const d = t - fe.t0;
      const pulse = (u) => u < 0 ? 0 : u < 220 ? Math.sin(u / 220 * 1.5708) : Math.exp(-(u - 220) / 520);
      fl = fe.pk * (pulse(d) + (fe.dbl ? 0.7 * pulse(d - 520) : 0));
      if (d > 4200) {
        s.fe = null;
        s.nx = t + 6e3 + Math.random() * 11e3;
      }
    }
    const r = s.rain, q = r.cv.getContext("2d");
    q.globalCompositeOperation = "source-over";
    q.clearRect(0, 0, r.rw, r.rh);
    const TH = r.tile.height, sc = t * 0.03 % TH;
    for (let y = sc - TH; y < r.rh; y += TH) q.drawImage(r.tile, 0, y);
    q.globalCompositeOperation = "destination-in";
    q.drawImage(r.mask, Math.sin(t * 4e-5) * r.rw * 0.04, 0);
    g.globalAlpha = Math.min(1, 0.7 + fl * 0.6);
    g.drawImage(r.cv, r.rx, r.ry);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.drawImage(s.cl, s.clx, s.cly);
    if (fl > 4e-3) {
      const f = s.fl[fe.i];
      g.globalCompositeOperation = "screen";
      g.globalAlpha = Math.min(1, fl);
      g.drawImage(f.cv, s.clx, s.cly);
      g.globalAlpha = fl * 0.22;
      g.drawImage(softSp2(c, 1.1), f.lx - m * 0.5, Hy - m * 0.25, m, m * 0.4);
      g.globalAlpha = 1;
    }
    g.globalCompositeOperation = "source-over";
  }
};
function bakeMilky(w, h, c, s) {
  const R = rng11(s.seed), m = Math.min(w, h);
  const Hy = h * 0.7;
  s.Hy = Hy;
  s.m = m;
  const M = Math.ceil(Math.max(w, h) * 0.1 + 10);
  s.M = M;
  const sky = mk10(w, h), x = sky.getContext("2d");
  const gr = x.createLinearGradient(0, 0, 0, Hy);
  gr.addColorStop(0, LT2(c, 0.012, 1, 2));
  gr.addColorStop(0.55, LT2(c, 0.035));
  gr.addColorStop(0.9, LT2(c, 0.1));
  gr.addColorStop(1, LT2(c, 0.15));
  x.fillStyle = gr;
  x.fillRect(0, 0, w, h);
  s.sky = sky;
  const SW = w + 2 * M, SH = h + 2 * M;
  const st = mk10(SW, SH), o = st.getContext("2d");
  const P0 = [w * 0.2 + M, h * 0.92 + M], P1 = [w * 0.42 + M, h * 0.02 + M], P2 = [w * 1.12 + M, -h * 0.08 + M];
  const bz = (u) => {
    const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, d = u * u;
    return [a * P0[0] + b * P1[0] + d * P2[0], a * P0[1] + b * P1[1] + d * P2[1]];
  };
  const nrm = (u) => {
    const e = 1e-3, p = bz(u), q2 = bz(Math.min(1, u + e));
    const dx = q2[0] - p[0], dy = q2[1] - p[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };
  const width = (u) => m * (0.2 - 0.1 * u) * (1 + 0.6 * Math.exp(-sq2((u - 0.17) / 0.09)));
  o.globalCompositeOperation = "screen";
  const NG = 450;
  for (let i = 0; i < NG; i++) {
    const u = R(), p = bz(u), n = nrm(u), wd = width(u), off = gauss(R) * wd * 0.35;
    const r = wd * (0.35 + R() * 0.5), core = Math.exp(-sq2((u - 0.17) / 0.1));
    o.globalAlpha = (0.035 + 0.06 * core) * (0.6 + R() * 0.4);
    const ti = R() < 0.93 ? 0 : R() < 0.5 ? 1 : 2;
    if (ti) o.globalAlpha *= 0.5;
    o.drawImage(softSp2(c, ti ? 0.7 : Math.round((0.85 + 0.2 * core) * 10) / 10, ti), p[0] + n[0] * off - r, p[1] + n[1] * off - r, r * 2, r * 2);
  }
  const clouds = [];
  for (let i = 0; i < 7; i++) clouds.push({ u: 0.08 + R() * 0.8, off: gauss(R) * 0.15, r: 0.25 + R() * 0.35 });
  for (const k of clouds) {
    const p = bz(k.u), n = nrm(k.u), wd = width(k.u), r = wd * k.r;
    o.globalAlpha = 0.09 + R() * 0.07;
    o.drawImage(softSp2(c, 1.05), p[0] + n[0] * k.off * wd - r, p[1] + n[1] * k.off * wd - r, r * 2, r * 2);
  }
  const cp = bz(0.17);
  o.globalAlpha = 0.3;
  o.drawImage(softSp2(c, 1.04), cp[0] - m * 0.22, cp[1] - m * 0.2, m * 0.44, m * 0.4);
  o.globalAlpha = 0.18;
  o.drawImage(softSp2(c, 1), cp[0] - m * 0.45, cp[1] - m * 0.4, m * 0.9, m * 0.8);
  o.globalAlpha = 1;
  const NB2 = 12, bk = Array.from({ length: NB2 * 2 }, () => []);
  const put = (X, Y, a, sz) => {
    const b = Math.min(NB2 - 1, a * NB2 | 0) + (R() < 0.88 ? 0 : NB2);
    bk[b].push(X, Y, sz);
  };
  const bgN = Math.round(SW * SH / 1100), bandN = Math.round(SW * SH / 260);
  for (let i = 0; i < bgN; i++) put(R() * SW, R() * SH, 0.15 + Math.pow(R(), 3) * 0.75, R() < 0.06 ? 1.6 : 1);
  for (let i = 0; i < bandN; i++) {
    let u = R(), off;
    if (R() < 0.3) {
      const k = clouds[R() * clouds.length | 0];
      u = k.u + gauss(R) * 0.025;
      off = (k.off + gauss(R) * k.r * 0.35) * width(u);
    } else off = gauss(R) * width(u) * 0.3;
    const p = bz(u), n = nrm(u);
    put(p[0] + n[0] * off + (R() - 0.5) * 3, p[1] + n[1] * off + (R() - 0.5) * 3, 0.08 + Math.pow(R(), 2.5) * 0.55, R() < 0.03 ? 1.4 : 0.9);
  }
  for (let b = 0; b < NB2 * 2; b++) {
    const L = bk[b];
    if (!L.length) continue;
    const a = (b % NB2 + 0.5) / NB2;
    o.fillStyle = b < NB2 ? W8(c, a) : LT2(c, 1.3, a);
    for (let i = 0; i < L.length; i += 3) o.fillRect(L[i], L[i + 1], L[i + 2], L[i + 2]);
  }
  o.globalCompositeOperation = "destination-out";
  const hole = holeSp(c);
  const lanes = [{ off: 0.04, w: 0.11, a: 0.34, from: 0.06, to: 0.8, n: 1 }, { off: -0.2, w: 0.07, a: 0.3, from: 0.12, to: 0.55, n: 0.6 }, { off: 0.26, w: 0.06, a: 0.28, from: 0.3, to: 0.95, n: 0.6 }, { off: -0.05, w: 0.05, a: 0.35, from: 0.1, to: 0.45, n: 0.8 }];
  for (const L of lanes) {
    const n = Math.max(24, Math.round(m * 0.9 * (L.to - L.from) * L.n));
    let wob = 0;
    for (let i = 0; i < n; i++) {
      const u = L.from + (L.to - L.from) * (i / n) + (R() - 0.5) * 6e-3;
      wob += (R() - 0.5) * 0.08;
      wob *= 0.95;
      const p = bz(u), nn = nrm(u), wd = width(u), off = (L.off + wob) * wd;
      const r = wd * L.w * (0.4 + R() * 1), an = Math.atan2(-nn[0], nn[1]);
      const patch = Math.max(0, Math.sin(u * 23 + L.off * 40) * 0.6 + 0.55);
      o.globalAlpha = L.a * (0.35 + R() * 0.65) * Math.min(1, patch);
      if (o.globalAlpha < 0.02) continue;
      o.save();
      o.translate(p[0] + nn[0] * off, p[1] + nn[1] * off);
      o.rotate(an);
      o.drawImage(hole, -r * 2.6, -r * 0.7, r * 5.2, r * 1.4);
      o.restore();
    }
  }
  o.globalCompositeOperation = "source-over";
  o.globalAlpha = 1;
  s.st = st;
  s.tw = [];
  for (let i = 0; i < Math.max(8, Math.round(w * h / 22e3)); i++) s.tw.push({ x: R() * SW, y: R() * SH, a: 0.4 + R() * 0.5, ph: R() * 9, sp: 6e-4 + R() * 12e-4, ti: R() < 0.7 ? 0 : 1 });
  s.pv = [w * 0.5 + M, h * 1.5 + M];
  const mt = mk10(w, h), q = mt.getContext("2d");
  const frac3 = (rough) => {
    const N = 257, v = new Float32Array(N);
    v[0] = R();
    v[N - 1] = R();
    for (let step = N - 1, amp = 1; step > 1; step >>= 1, amp *= rough)
      for (let i = step >> 1; i < N; i += step) v[i] = (v[i - (step >> 1)] + v[i + (step >> 1)]) / 2 + (R() - 0.5) * amp;
    let lo = 1e9, hi = -1e9;
    for (const x2 of v) {
      lo = Math.min(lo, x2);
      hi = Math.max(hi, x2);
    }
    for (let i = 0; i < N; i++) v[i] = (v[i] - lo) / (hi - lo || 1);
    return (u) => {
      const f = Math.max(0, Math.min(1, u)) * (N - 1), i = Math.min(N - 2, f | 0), e = f - i;
      return v[i] * (1 - e) + v[i + 1] * e;
    };
  };
  const ridges = [{ y: 0.7, amp: 0.15, k: 0.1, r: 0.58 }, { y: 0.76, amp: 0.1, k: 0.055, r: 0.55 }, { y: 0.84, amp: 0.08, k: 0.02, r: 0.5 }];
  let near = null;
  for (let ri = 0; ri < ridges.length; ri++) {
    const rd = ridges[ri], fn = frac3(rd.r);
    const Y = (xx) => h * (rd.y - rd.amp * fn(xx / w));
    q.beginPath();
    q.moveTo(0, h);
    for (let xx = 0; xx <= w + 3; xx += 3) q.lineTo(xx, Y(xx));
    q.lineTo(w, h);
    q.closePath();
    const top = h * (rd.y - rd.amp);
    const rg = q.createLinearGradient(0, top, 0, h);
    rg.addColorStop(0, LT2(c, rd.k));
    rg.addColorStop(0.3, LT2(c, rd.k * 0.8));
    rg.addColorStop(1, LT2(c, rd.k * 0.5));
    q.fillStyle = rg;
    q.fill();
    if (ri < 2) {
      const ny = ridges[ri + 1].y, na = ridges[ri + 1].amp;
      const hz = q.createLinearGradient(0, h * (ny - na * 1.1), 0, h * ny);
      hz.addColorStop(0, LT2(c, rd.k + 0.05, 0));
      hz.addColorStop(1, LT2(c, rd.k + 0.05, 0.55));
      q.fillStyle = hz;
      q.fillRect(0, h * (ny - na * 1.1), w, h * na * 1.2);
    }
    near = Y;
  }
  q.fillStyle = LT2(c, 0.018);
  let px = R() * m * 0.05;
  while (px < w) {
    const gap = R() < 0.25 ? m * (0.04 + R() * 0.12) : m * (6e-3 + R() * 0.012);
    px += gap;
    const ty = near(px), th = m * (0.02 + R() * 0.035);
    q.beginPath();
    q.moveTo(px, ty - th);
    const tiers = 4;
    for (let k = 1; k <= tiers; k++) {
      const yy = ty - th + th * k / tiers, ww = th * 0.22 * (k / tiers + 0.15);
      q.lineTo(px + ww, yy);
      q.lineTo(px + ww * 0.35, yy);
    }
    for (let k = tiers; k >= 1; k--) {
      const yy = ty - th + th * k / tiers, ww = th * 0.22 * (k / tiers + 0.15);
      q.lineTo(px - ww * 0.35, yy);
      q.lineTo(px - ww, yy);
    }
    q.closePath();
    q.fill();
    q.fillRect(px - 0.5, ty - 2, 1, 4);
  }
  s.mt = mt;
}
var milkyWay = {
  name: "Milky Way",
  flav: "Cosmic",
  reset: () => ({ seed: Math.random() * 1e9 | 0, key: "", me: null, nm: 0 }),
  frame: (g, w, h, t, c, s) => {
    const key = keyOf7(w, h, c);
    if (s.key !== key) {
      s.key = key;
      bakeMilky(w, h, c, s);
    }
    if (s.lt == null || t < s.lt - 1e3) {
      s.nm = t + 18e3 + Math.random() * 2e4;
      s.me = null;
    }
    s.lt = t;
    const M = s.M, Hy = s.Hy, m = s.m;
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.drawImage(s.sky, 0, 0);
    const an = 0.045 * Math.sin(t / 9e5 * 6.2832) + 0.012 * Math.sin(t / 23e4 * 6.2832);
    g.save();
    g.translate(s.pv[0] - M, s.pv[1] - M);
    g.rotate(an);
    g.translate(-s.pv[0], -s.pv[1]);
    g.globalCompositeOperation = "lighter";
    g.drawImage(s.st, 0, 0);
    const gz = Math.max(1.5, m * 56e-4), dz = Math.max(0.4, Math.min(0.8, m * 9e-4));
    for (const p of s.tw) {
      const a = p.a * (0.55 + 0.45 * Math.sin(t * p.sp + p.ph));
      g.globalAlpha = a * 0.35;
      g.drawImage(softSp2(c, 1.4, p.ti), p.x - gz, p.y - gz, gz * 2, gz * 2);
      g.globalAlpha = 1;
      g.fillStyle = W8(c, a, p.ti);
      g.fillRect(p.x - dz, p.y - dz, dz * 2, dz * 2);
    }
    g.restore();
    if (!s.me && t >= s.nm) {
      const a0 = 0.5 + Math.random() * 0.5;
      s.me = { t0: t, x: w * (0.2 + Math.random() * 0.7), y: h * (0.05 + Math.random() * 0.3), dx: Math.cos(a0 + 1.6) * m * 0.25, dy: Math.sin(a0) * m * 0.16 };
    }
    if (s.me) {
      const e = (t - s.me.t0) / 900;
      if (e >= 1) {
        s.me = null;
        s.nm = t + 25e3 + Math.random() * 35e3;
      } else {
        const hx = s.me.x + s.me.dx * e, hy = s.me.y + s.me.dy * e, tl = 0.35;
        const tx = s.me.x + s.me.dx * Math.max(0, e - tl), ty = s.me.y + s.me.dy * Math.max(0, e - tl);
        const lg = g.createLinearGradient(tx, ty, hx, hy);
        const a = Math.sin(e * 3.1416) * 0.55;
        lg.addColorStop(0, W8(c, 0));
        lg.addColorStop(1, W8(c, a));
        g.strokeStyle = lg;
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(tx, ty);
        g.lineTo(hx, hy);
        g.stroke();
      }
    }
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    const ex = g.createLinearGradient(0, Hy - h * 0.3, 0, Hy);
    ex.addColorStop(0, LT2(c, 0.12, 0));
    ex.addColorStop(1, LT2(c, 0.14, 0.55));
    g.fillStyle = ex;
    g.fillRect(0, Hy - h * 0.3, w, h * 0.3);
    g.drawImage(s.mt, 0, 0);
  }
};
var SCENES_SKY = [cloudSea, sunkenLight, distantStorm, milkyWay];

// from waterLight.ts
var TAU10 = Math.PI * 2;
var AP9 = (c, i, a) => {
  const p = c.pal[(i % c.pal.length + c.pal.length) % c.pal.length];
  return `rgba(${p[0]},${p[1]},${p[2]},${a})`;
};
var W9 = (c, a, i = 0) => c.light ? AP9(c, i, Math.min(1, a * 1.6)) : `rgba(255,255,255,${a})`;
var clamp8 = (v, a, b) => v < a ? a : v > b ? b : v;
var sstep7 = (a, b, v) => {
  const u = clamp8((v - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
};
var rgb6 = (v, a = 1) => `rgba(${v[0] | 0},${v[1] | 0},${v[2] | 0},${a})`;
var tone8 = (c, i) => c.pal[(i % c.pal.length + c.pal.length) % c.pal.length];
var haze6 = (c, k = 0.38, i = 0) => {
  const p = tone8(c, i);
  return c.light ? p : [p[0] + (255 - p[0]) * k, p[1] + (255 - p[1]) * k, p[2] + (255 - p[2]) * k];
};
var mixv7 = (c, p, k, d = 1) => [(c.br + (p[0] - c.br) * k) * d, (c.bg2 + (p[1] - c.bg2) * k) * d, (c.bb + (p[2] - c.bb) * k) * d];
var MX6 = (c, p, k, d = 1, a = 1) => rgb6(mixv7(c, p, k, d), a);
var BGA4 = (c, a) => `rgba(${c.br},${c.bg2},${c.bb},${a})`;
var small5 = (w) => w < 200;
function mk11(w, h) {
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  return cv;
}
var rng12 = (a) => () => {
  a |= 0;
  a = a + 1831565813 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
function noise15(n, cells, R) {
  const cp = Array.from({ length: cells + 2 }, () => R() * 2 - 1), out = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const x = i / n * cells, i0 = Math.floor(x), f = x - i0, u = f * f * (3 - 2 * f);
    out[i] = cp[i0] * (1 - u) + cp[i0 + 1] * u;
  }
  return out;
}
function fbm7(n, cells, oct, pers, R) {
  const out = new Float32Array(n + 1);
  let amp = 1, tot = 0, cl = cells;
  for (let o = 0; o < oct; o++) {
    const a = noise15(n, cl, R);
    for (let i = 0; i <= n; i++) out[i] += a[i] * amp;
    tot += amp;
    amp *= pers;
    cl *= 2;
  }
  for (let i = 0; i <= n; i++) out[i] /= tot;
  return out;
}
var norm015 = (a) => {
  let lo = 1e9, hi = -1e9;
  for (const v of a) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const d = hi - lo || 1;
  for (let i = 0; i < a.length; i++) a[i] = (a[i] - lo) / d;
  return a;
};
var _sp8 = /* @__PURE__ */ new Map();
function sprite10(key, build) {
  let s = _sp8.get(key);
  if (!s) {
    if (_sp8.size > 64) _sp8.clear();
    s = build();
    _sp8.set(key, s);
  }
  return s;
}
function puff5(c, p, name) {
  return sprite10("puff" + name + c.acc + c.bg + p.join(), () => {
    const S = 64, hc = S / 2, cv = mk11(S, S), x = cv.getContext("2d");
    const gr = x.createRadialGradient(hc, hc, 0, hc, hc, hc);
    gr.addColorStop(0, rgb6(p, 1));
    gr.addColorStop(0.3, rgb6(p, 0.78));
    gr.addColorStop(0.55, rgb6(p, 0.42));
    gr.addColorStop(0.8, rgb6(p, 0.12));
    gr.addColorStop(1, rgb6(p, 0));
    x.fillStyle = gr;
    x.fillRect(0, 0, S, S);
    return cv;
  });
}
function spark5(c, p, name) {
  return sprite10("spark" + name + c.acc + c.bg + p.join(), () => {
    const S = 64, hc = S / 2, cv = mk11(S, S), x = cv.getContext("2d");
    const gr = x.createRadialGradient(hc, hc, 0, hc, hc, hc);
    gr.addColorStop(0, rgb6(p, 1));
    gr.addColorStop(0.12, rgb6(p, 0.6));
    gr.addColorStop(0.35, rgb6(p, 0.16));
    gr.addColorStop(1, rgb6(p, 0));
    x.fillStyle = gr;
    x.fillRect(0, 0, S, S);
    return cv;
  });
}
var _dith7 = null;
function dither8(x, w, h) {
  if (!_dith7) {
    _dith7 = mk11(64, 64);
    const d = _dith7.getContext("2d"), id = d.createImageData(64, 64);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = Math.random() < 0.5 ? 0 : 255;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = 255;
    }
    d.putImageData(id, 0, 0);
  }
  if (w < 200) return;
  x.save();
  x.globalCompositeOperation = "source-atop";
  x.globalAlpha = 0.012;
  x.fillStyle = x.createPattern(_dith7, "repeat");
  x.fillRect(0, 0, w, h);
  x.restore();
}
function wash5(w, h, stops) {
  const cv = mk11(w, h), x = cv.getContext("2d"), gr = x.createLinearGradient(0, 0, 0, cv.height);
  for (const [o, col] of stops) gr.addColorStop(clamp8(o, 0, 1), col);
  x.fillStyle = gr;
  x.fillRect(0, 0, cv.width, cv.height);
  dither8(x, cv.width, cv.height);
  return cv;
}
var makeStars3 = (R, n, ymax) => Array.from({ length: n }, () => ({ x: R(), y: Math.pow(R(), 1.4) * ymax, r: 0.6 + R() * 1.1, a: 0.12 + R() * 0.5, ph: R() * 9, sp: 0.4 + R() }));
var bakeStars = (x, c, stars2, w, H, few) => {
  x.globalCompositeOperation = "screen";
  for (const st of few ? stars2.slice(0, 10) : stars2) {
    x.fillStyle = W9(c, st.a);
    const r = Math.max(0.6, st.r * Math.min(1, w / 1e3));
    x.fillRect(st.x * w, st.y * H, r, r);
  }
  x.globalCompositeOperation = "source-over";
};
var fresh5 = (g, c, w, h) => {
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
  g.fillStyle = c.bg;
  g.fillRect(0, 0, w, h);
};
var done5 = (g) => {
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
};
var keyOf8 = (w, h, c) => w + "x" + h + c.acc + c.bg;
function skyline(x, w, base, N, yAt) {
  x.beginPath();
  x.moveTo(0, base);
  for (let i = 0; i <= N; i++) x.lineTo(i / N * w, yAt(i));
  x.lineTo(w, base);
  x.closePath();
  x.fill();
}
function bakeBaikal(s, w, h, c) {
  const p0 = tone8(c, 0), R = rng12(s.seed + 2), few = small5(w), H0 = Math.round(h * s.hzY), N = s.N, IH = h - H0;
  s.H0 = H0;
  s.sky = wash5(w, H0 + 1, [[0, MX6(c, p0, 0.02, 0.5)], [0.55, MX6(c, p0, 0.05, 0.66)], [1, MX6(c, p0, 0.14, 0.82)]]);
  bakeStars(s.sky.getContext("2d"), c, s.stars, w, H0, few);
  const my = (i) => H0 - h * (0.012 + 0.07 * s.ridge[i]);
  s.land = mk11(w, H0 + 2);
  {
    const y = s.land.getContext("2d");
    y.fillStyle = MX6(c, p0, 0.1, 0.42);
    skyline(y, w, H0 + 2, N, my);
    y.strokeStyle = W9(c, 0.1);
    y.lineWidth = Math.max(0.6, h / 1e3);
    y.beginPath();
    for (let i = 0; i <= N; i++) i ? y.lineTo(i / N * w, my(i) + 0.6) : y.moveTo(0, my(i) + 0.6);
    y.stroke();
  }
  const AW = Math.max(8, Math.ceil(w / 2)), AH = Math.max(8, Math.ceil(H0 / 2));
  Object.assign(s, { AW, AH, au: mk11(AW, AH) });
  s.tex = s.curtains.map((cu, k) => {
    const pa = tone8(c, cu.ti), pt = tone8(c, cu.ti + 1), hh = haze6(c, 0.5, cu.ti), RR = rng12(s.seed + 10 + k);
    const strip = mk11(4, 256), z = strip.getContext("2d"), gr = z.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, rgb6(pt, 0));
    gr.addColorStop(0.35, rgb6(pt, 0.18));
    gr.addColorStop(0.72, rgb6(pa, 0.55));
    gr.addColorStop(0.93, rgb6(hh, 1));
    gr.addColorStop(1, rgb6(pa, 0));
    z.fillStyle = gr;
    z.fillRect(0, 0, 4, 256);
    const TW = AW * 2, cv = mk11(TW, AH), x = cv.getContext("2d");
    const env = norm015(fbm7(TW, 6, 3, 0.5, RR)), fine = norm015(fbm7(TW, few ? 30 : 160, 2, 0.5, RR)), ln = norm015(fbm7(TW, 30, 2, 0.5, RR));
    x.globalCompositeOperation = "lighter";
    for (let i = 0; i < TW; i++) {
      const e = Math.pow(env[i], 1.6), I = e * (0.35 + 0.65 * fine[i]);
      if (I < 0.02) continue;
      const L = AH * (0.3 + 0.55 * e * (0.5 + 0.5 * ln[i]));
      x.globalAlpha = Math.min(1, I * 1.1);
      x.drawImage(strip, i, AH * 0.96 - L, 1, L);
    }
    return cv;
  });
  s.ice = wash5(w, IH + 1, [[0, MX6(c, p0, 0.14, 0.6)], [0.25, MX6(c, p0, 0.08, 0.46)], [1, MX6(c, p0, 0.04, 0.34)]]);
  const ov = mk11(w, IH + 1), o = ov.getContext("2d");
  o.fillStyle = MX6(c, p0, 0.07, 0.38, 0.9);
  o.beginPath();
  o.moveTo(0, 0);
  for (let i = 0; i <= N; i++) o.lineTo(i / N * w, (H0 - my(i)) * 0.9);
  o.lineTo(w, 0);
  o.closePath();
  o.fill();
  {
    const dg = o.createLinearGradient(0, 0, 0, IH);
    dg.addColorStop(0, BGA4(c, 0));
    dg.addColorStop(0.25, BGA4(c, 0.12));
    dg.addColorStop(1, BGA4(c, 0.5));
    o.fillStyle = dg;
    o.fillRect(0, 0, w, IH + 1);
  }
  const half = w / 2 / IH, P = (X, Z) => [w / 2 + X * IH / Z, IH / Z], ls = h / 900;
  o.lineCap = "round";
  o.lineJoin = "round";
  const crack = (X, Z, a, n, d, br) => {
    let [px, py] = P(X, Z);
    for (let k = 0; k < n; k++) {
      a += (R() - 0.5) * 0.25;
      X += Math.cos(a) * 0.1 * Z;
      Z += Math.sin(a) * 0.06 * Z;
      if (Z < 0.95 || Z > 40) break;
      const [qx, qy] = P(X, Z), lw = Math.max(0.5, 1.5 * ls / Math.sqrt(Z));
      o.strokeStyle = W9(c, 0.035 * br);
      o.lineWidth = lw * 4;
      o.beginPath();
      o.moveTo(px, py);
      o.lineTo(qx, qy);
      o.stroke();
      o.strokeStyle = W9(c, (0.22 / Math.sqrt(Z) + 0.03) * br);
      o.lineWidth = lw;
      o.stroke();
      px = qx;
      py = qy;
      if (d > 0 && R() < 0.06) crack(X, Z, a + (R() < 0.5 ? 1 : -1) * (0.6 + R() * 0.6), (n - k) * 0.5 | 0, d - 1, br * 0.7);
    }
  };
  for (let i = 0; i < (few ? 2 : 9); i++) {
    const Z = 1 + Math.pow(R(), 2) * 10;
    crack((R() * 2 - 1) * half * Z * 1.1, Z, (R() - 0.5) * 1.2 + (R() < 0.5 ? 0 : Math.PI), 30 + (R() * 40 | 0), 1, 0.5 + R() * 0.5);
  }
  for (let i = 0; i < (few ? 20 : 600); i++) {
    const Z = 1 + Math.pow(R(), 0.7) * 20, [px, py] = P((R() * 2 - 1) * half * Z, Z), r = Math.max(0.6, 2.2 * ls / Z);
    o.fillStyle = W9(c, 0.05 + R() * 0.2);
    o.fillRect(px, py, r, r * 0.6);
  }
  const nb = few ? 3 : clamp8(Math.round(w * h / 7e4), 6, 18);
  for (let i = 0; i < nb; i++) {
    const Z = 1.05 + Math.pow(R(), 1.3) * 5, [px, py] = P((R() * 2 - 1) * half * Z * 0.95, Z);
    const r0 = IH / Z * (0.04 + R() * 0.07), m = 3 + (R() * 5 | 0);
    for (let j = 0; j < m; j++) {
      const r = r0 * (1 - j * 0.09) * (0.8 + R() * 0.3), yy = py + j * r0 * 0.55, xx = px + (R() - 0.5) * r0 * 0.15, k = 1 - j / m * 0.7;
      o.fillStyle = W9(c, 0.16 * k);
      o.beginPath();
      o.ellipse(xx, yy, r, r * 0.3, 0, 0, TAU10);
      o.fill();
      o.strokeStyle = W9(c, 0.3 * k);
      o.lineWidth = Math.max(0.5, r * 0.05);
      o.stroke();
      o.strokeStyle = W9(c, 0.55 * k);
      o.beginPath();
      o.ellipse(xx, yy, r * 0.9, r * 0.25, 0, Math.PI * 1.1, Math.PI * 1.9);
      o.stroke();
    }
  }
  dither8(o, w, IH);
  s.ov = ov;
}
function bakeBow(s, w, h, c) {
  const p0 = tone8(c, 0), p1 = tone8(c, 1), hz = haze6(c, 0.55), R = rng12(s.seed + 4), few = small5(w), N = 200;
  const fx = s.fx * w, fw = Math.min(w * 0.3, Math.max(w * 0.12, h * 0.16)), lip = h * s.lip, base = h * s.base;
  Object.assign(s, { fxp: fx, fw, lipY: lip, baseY: base, nm: few ? 6 : clamp8(Math.round(w * h / 5e4) + 8, 10, 20) });
  const back = mk11(w, h), x = back.getContext("2d");
  {
    const gr = x.createLinearGradient(0, 0, 0, lip);
    gr.addColorStop(0, MX6(c, p0, 0.05, 0.55));
    gr.addColorStop(1, MX6(c, p0, 0.15, 0.78));
    x.fillStyle = gr;
    x.fillRect(0, 0, w, lip + h * 0.06);
  }
  {
    const mx = s.moonL ? w * 0.1 : w * 0.9, r = Math.max(w, h) * 0.5, gr = x.createRadialGradient(mx, -h * 0.04, 0, mx, -h * 0.04, r);
    gr.addColorStop(0, rgb6(hz, 0.3));
    gr.addColorStop(0.3, rgb6(p0, 0.08));
    gr.addColorStop(1, rgb6(p0, 0));
    x.globalCompositeOperation = "screen";
    x.fillStyle = gr;
    x.fillRect(0, 0, w, h * 0.5);
    x.globalCompositeOperation = "source-over";
  }
  bakeStars(x, c, s.stars, w, lip, few);
  const rimY = (i) => lip - h * (8e-3 + 0.045 * s.rim[i]);
  const wg = x.createLinearGradient(0, lip - h * 0.06, 0, h);
  wg.addColorStop(0, MX6(c, p0, 0.09, 0.46));
  wg.addColorStop(1, MX6(c, p0, 0.06, 0.36));
  x.fillStyle = wg;
  skyline(x, w, h, N, rimY);
  for (let px = 0; px < w; px += h * (6e-3 + R() * 0.01)) {
    const ry = rimY(Math.round(px / w * N)) + 1, th = h * (8e-3 + R() * 0.026);
    x.beginPath();
    x.moveTo(px - th * 0.22, ry);
    x.lineTo(px, ry - th);
    x.lineTo(px + th * 0.22, ry);
    x.closePath();
    x.fill();
  }
  x.lineWidth = Math.max(0.6, h / 1200);
  for (let i = 0; i < (few ? 10 : 260); i++) {
    const px = R() * w, py = lip + R() * (base - lip), L = h * (0.02 + R() * 0.08);
    x.strokeStyle = R() < 0.5 ? W9(c, 0.02 + R() * 0.03) : MX6(c, p0, 0.04, 0.3, 0.5);
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + (R() - 0.5) * L * 0.15, py + L);
    x.stroke();
  }
  x.globalCompositeOperation = "screen";
  x.globalAlpha = 0.12;
  x.drawImage(puff5(c, hz, "mbw"), fx - fw * 1.7, lip, fw * 3.4, base - lip);
  x.globalAlpha = 1;
  x.globalCompositeOperation = "source-over";
  {
    const gr = x.createLinearGradient(0, base, 0, h);
    gr.addColorStop(0, MX6(c, p0, 0.14, 0.55));
    gr.addColorStop(1, MX6(c, p0, 0.05, 0.36));
    x.fillStyle = gr;
    x.fillRect(0, base, w, h - base);
  }
  x.globalCompositeOperation = "screen";
  x.globalAlpha = 0.28;
  x.drawImage(puff5(c, hz, "mbr"), fx - fw * 0.65, base - h * 0.02, fw * 1.3, (h - base) * 1.3);
  for (let i = 0; i < (few ? 6 : 40); i++) {
    const r = fw * (0.12 + R() * 0.3);
    x.globalAlpha = 0.05 + R() * 0.09;
    x.drawImage(puff5(c, hz, "mbr"), fx + (R() - 0.5) * fw * 1.6 - r, base - r * (0.3 + R() * 0.9), r * 2, r * (0.8 + R() * 0.6));
  }
  x.globalAlpha = 1;
  for (let i = 0; i < (few ? 4 : 90); i++) {
    const v = Math.pow(R(), 1.5), L = w * (0.02 + R() * 0.1);
    x.fillStyle = W9(c, 0.03 + R() * 0.04);
    x.fillRect(R() * w - L / 2, base + h * 0.02 + v * (h - base), L, 1);
  }
  x.globalCompositeOperation = "source-over";
  dither8(x, w, h);
  s.back = back;
  const prof = norm015(fbm7(128, 9, 3, 0.5, R));
  s.fb = mk11(128, 4);
  {
    const z2 = s.fb.getContext("2d");
    for (let i = 0; i < 128; i++) {
      const v = i / 127, e = sstep7(0, 0.16, v) * sstep7(1, 0.84, v);
      z2.fillStyle = rgb6(hz, (0.14 + 0.5 * prof[i]) * e);
      z2.fillRect(i, 0, 1, 4);
    }
  }
  const TWf = Math.ceil(fw * 1.45), TH = Math.ceil(base - lip + h * 0.02), st = mk11(TWf, TH), z = st.getContext("2d");
  const sp = sprite10("mbs" + c.acc + c.bg, () => {
    const cv = mk11(4, 64), q = cv.getContext("2d"), gr = q.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, rgb6(hz, 0));
    gr.addColorStop(0.5, rgb6(hz, 1));
    gr.addColorStop(1, rgb6(hz, 0));
    q.fillStyle = gr;
    q.fillRect(0, 0, 4, 64);
    return cv;
  });
  for (let i = 0; i < (few ? 30 : 520); i++) {
    const sx = R() * TWf, sy = R() * TH, L = TH * (0.04 + R() * 0.2), wd = Math.max(0.6, (0.5 + R() * 1.5) * h / 900);
    const ev = sstep7(0, 0.14, sx / TWf) * sstep7(1, 0.86, sx / TWf);
    z.globalAlpha = (0.05 + R() * 0.25 * (0.4 + 0.6 * prof[Math.min(127, sx / TWf * 127 | 0)])) * ev;
    z.drawImage(sp, sx, sy, wd, L);
    z.drawImage(sp, sx, sy - TH, wd, L);
  }
  Object.assign(s, { st, TWf, TH });
  const front = mk11(w, h), f = front.getContext("2d"), yTop = lip - h * 0.07;
  const wall = (side, jag) => {
    const xe = (v) => fx + side * fw * (0.95 + 1.7 * v + (jag[Math.round(v * N)] - 0.5) * 0.5), pts = [];
    for (let i = 0; i <= 40; i++) {
      const v = i / 40;
      pts.push([xe(v), yTop + (h - yTop) * v]);
    }
    const ox = side < 0 ? 0 : w, edgeY = yTop - h * 0.1;
    f.fillStyle = MX6(c, p0, 0.04, 0.3);
    f.beginPath();
    f.moveTo(ox, h);
    f.lineTo(ox, edgeY);
    for (const p of pts) f.lineTo(p[0], p[1]);
    f.lineTo(ox, h);
    f.closePath();
    f.fill();
    for (let u = 0; u < 1; u += 0.012 + R() * 0.02) {
      const px = ox + (pts[0][0] - ox) * u, py = edgeY + (yTop - edgeY) * u, th = h * (0.015 + R() * 0.045);
      f.beginPath();
      f.moveTo(px - th * 0.2, py + 2);
      f.lineTo(px, py - th);
      f.lineTo(px + th * 0.2, py + 2);
      f.closePath();
      f.fill();
    }
    f.strokeStyle = W9(c, 0.08);
    f.lineWidth = Math.max(0.8, h / 700);
    f.beginPath();
    pts.forEach((p, i) => i ? f.lineTo(p[0], p[1]) : f.moveTo(p[0], p[1]));
    f.stroke();
    f.fillStyle = MX6(c, p1, 0.16, 0.42, 0.8);
    for (let i = 0; i < (few ? 4 : 50); i++) {
      const p = pts[6 + (R() * 34 | 0)], r = h * (3e-3 + R() * 8e-3);
      f.beginPath();
      f.ellipse(p[0] - side * r * (1 + R() * 4), p[1], r * 1.6, r * 0.6, 0, 0, TAU10);
      f.fill();
    }
  };
  wall(-1, s.jagL);
  wall(1, s.jagR);
  for (let i = 0; i < (few ? 3 : 9); i++) {
    const bx2 = (i + R()) / (few ? 3 : 9) * w, r = h * (0.03 + R() * 0.07), by2 = h * (0.98 + R() * 0.05);
    if (Math.abs(bx2 - fx) < fw * 0.8) continue;
    f.fillStyle = MX6(c, p0, 0.03, 0.26);
    f.beginPath();
    f.ellipse(bx2, by2, r * 1.5, r, 0, 0, TAU10);
    f.fill();
    f.strokeStyle = W9(c, 0.07);
    f.lineWidth = Math.max(0.6, h / 1e3);
    f.beginPath();
    f.ellipse(bx2, by2, r * 1.5, r, 0, Math.PI * 1.15, Math.PI * 1.7);
    f.stroke();
  }
  dither8(f, w, h);
  s.front = front;
  const Rb = Math.max(fw * 2.4, w * 0.32), bx = fx + (R() - 0.5) * fw, by = base + Rb * 0.45, y0 = Math.max(0, Math.floor(by - Rb * 1.08));
  const bow = mk11(w, Math.min(h, by) - y0 + 1), b = bow.getContext("2d");
  b.globalCompositeOperation = "lighter";
  for (const [k, ti, a] of [[1, 1, 0.16], [0.975, 0, 0.2], [0.95, 2, 0.14]]) {
    const col = tone8(c, ti);
    for (const [m, al] of [[3, 0.3], [2, 0.4], [1, 0.6]]) {
      b.strokeStyle = rgb6(col, a * al);
      b.lineWidth = Rb * 0.022 * m;
      b.beginPath();
      b.arc(bx, by - y0, Rb * k, Math.PI, TAU10);
      b.stroke();
    }
  }
  b.strokeStyle = W9(c, 0.03);
  b.lineWidth = Rb * 0.08;
  b.beginPath();
  b.arc(bx, by - y0, Rb * 0.88, Math.PI, TAU10);
  b.stroke();
  b.globalCompositeOperation = "destination-in";
  {
    const gr = b.createLinearGradient(0, 0, 0, bow.height);
    gr.addColorStop(0, "rgba(0,0,0,0)");
    gr.addColorStop(clamp8((base - h * 0.22 - y0) / bow.height, 0, 1), "rgba(0,0,0,.12)");
    gr.addColorStop(clamp8((base - y0) / bow.height, 0, 1), "rgba(0,0,0,.8)");
    gr.addColorStop(1, "rgba(0,0,0,.5)");
    b.fillStyle = gr;
    b.fillRect(0, 0, w, bow.height);
  }
  Object.assign(s, { bow, bowY: y0 });
}
function bakeWait(s, w, h, c) {
  const p0 = tone8(c, 0), hz = haze6(c, 0.45), R = rng12(s.seed + 5), few = small5(w);
  const VY = Math.round(h * s.vy), VX = w * s.vx, F = h * 0.5, A2 = Math.max(1.5, w / h * 1.35), B = 1.5;
  Object.assign(s, { VY, F });
  const cave = mk11(w, VY + 1), x = cave.getContext("2d");
  {
    const gr = x.createRadialGradient(VX, VY - h * 0.08, 0, VX, VY - h * 0.08, Math.max(w, h) * 0.8);
    gr.addColorStop(0, MX6(c, p0, 0.1, 0.5));
    gr.addColorStop(0.35, MX6(c, p0, 0.06, 0.4));
    gr.addColorStop(1, MX6(c, p0, 0.03, 0.3));
    x.fillStyle = gr;
    x.fillRect(0, 0, w, VY + 1);
  }
  const P = (th, Z) => [VX - A2 * Math.cos(th) * F / Z, VY - B * Math.sin(th) * F / Z];
  const glow = mk11(w, VY + 1), q = glow.getContext("2d"), sk = spark5(c, tone8(c, 0), "wtg");
  const n = few ? 160 : clamp8(Math.round(w * h / 280), 1200, 4800), c1 = R() * 6, c2 = R() * 6, c3 = R() * 6;
  x.globalCompositeOperation = "screen";
  q.globalCompositeOperation = "screen";
  let made = 0, tries = 0;
  while (made < n && tries < n * 8) {
    tries++;
    const th = 0.3 + R() * (Math.PI - 0.6), Z = 0.8 * Math.pow(30, R()), lz = Math.log(Z);
    const cl = 0.5 + 0.5 * Math.sin(th * 6 + c1 + Math.sin(lz * 3 + c2) * 1.5) * Math.sin(lz * 4.5 + c3 + th * 2);
    if (R() > 0.15 + 0.85 * cl * cl) continue;
    const [px, py] = P(th, Z);
    if (px < -4 || px > w + 4 || py < -4 || py > VY) continue;
    made++;
    const k = Math.min(1, 1.4 / Z), a = 0.25 + 0.7 * R(), r = Math.max(0.6, (0.6 + 1.6 * k) * h / 900);
    x.fillStyle = rgb6(hz, Math.min(1, a * (0.6 + 0.6 * k)));
    x.fillRect(px - r / 2, py - r / 2, r, r);
    if (R() < 0.55) {
      const gr = r * (3.5 + 5 * k);
      q.globalAlpha = 0.6 * a;
      q.drawImage(sk, px - gr, py - gr, gr * 2, gr * 2);
    }
    if (Z < 2.5 && R() < 0.12 && !few) {
      const L = (h * 0.015 + R() * h * 0.05) * k, br = Math.max(0.6, r * 0.5);
      for (let b = r; b < L; b += 3 + R() * 4) {
        x.fillStyle = rgb6(hz, (0.3 - 0.27 * b / L) * a);
        x.fillRect(px - br / 2, py + b, br, br);
      }
    }
  }
  q.globalAlpha = 0.1;
  q.drawImage(puff5(c, tone8(c, 0), "wth"), VX - w * 0.45, VY - h * 0.5, w * 0.9, h * 0.48);
  q.globalAlpha = 1;
  x.globalCompositeOperation = "source-over";
  const dark = MX6(c, p0, 0.02, 0.24), N = 200, roof = s.roof, shore = s.shore;
  x.fillStyle = dark;
  x.beginPath();
  x.moveTo(0, 0);
  for (let i = 0; i <= N; i++) x.lineTo(i / N * w, h * (0.01 + 0.05 * roof[i]));
  x.lineTo(w, 0);
  x.closePath();
  x.fill();
  for (let i = 0; i < (few ? 4 : 34); i++) {
    const sx = R() * w, y0 = h * (0.01 + 0.05 * roof[Math.round(sx / w * N)]), len = h * (0.015 + Math.pow(R(), 2) * 0.1), bw = len * (0.18 + R() * 0.15);
    x.beginPath();
    x.moveTo(sx - bw, y0 - 2);
    x.quadraticCurveTo(sx - bw * 0.3, y0 + len * 0.6, sx, y0 + len);
    x.quadraticCurveTo(sx + bw * 0.3, y0 + len * 0.6, sx + bw, y0 - 2);
    x.closePath();
    x.fill();
  }
  x.beginPath();
  x.moveTo(0, VY + 1);
  for (let i = 0; i <= N; i++) {
    const u = i / N, e = 0.25 + 3 * Math.pow(Math.abs(u - s.vx) * 1.3, 2);
    x.lineTo(u * w, VY - h * (3e-3 + 0.03 * shore[i] * e));
  }
  x.lineTo(w, VY + 1);
  x.closePath();
  x.fill();
  dither8(x, w, VY);
  Object.assign(s, { cave, glow });
  const RH = h - VY, wv = mk11(w, RH + 1), y = wv.getContext("2d"), dg = y.createLinearGradient(0, 0, 0, RH);
  dg.addColorStop(0, BGA4(c, 0.25));
  dg.addColorStop(1, BGA4(c, 0.6));
  y.fillStyle = dg;
  y.fillRect(0, 0, w, RH + 1);
  for (let i = 0; i < (few ? 3 : 50); i++) {
    const v = Math.pow(R(), 1.6), L = w * (0.03 + R() * 0.15) * (0.3 + v);
    y.fillStyle = rgb6(hz, 0.02 + R() * 0.03);
    y.fillRect(R() * w - L / 2, v * RH, L, 1);
  }
  s.wover = wv;
}
var SCENES_WATERLIGHT = [
  {
    name: "Baikal Ice",
    flav: "Cosmic",
    reset: (w, h) => {
      const seed = Math.random() * 1e9 | 0, R = rng12(seed), N = 240;
      return {
        seed,
        N,
        hzY: 0.47 + R() * 0.05,
        ridge: norm015(fbm7(N, 4, 5, 0.5, R)),
        stars: makeStars3(R, 160, 0.9),
        curtains: Array.from({ length: 2 + (R() < 0.4 ? 1 : 0) }, (_, k) => ({
          ti: k,
          base: 0.6 + R() * 0.26,
          a1: 0.05 + R() * 0.07,
          a2: 0.02 + R() * 0.03,
          f1: 0.5 + R() * 1.1,
          f2: 2 + R() * 2,
          f3: 5 + R() * 9,
          sp: 0.7 + R() * 0.6,
          ph: R() * 6.3,
          int: k ? 0.5 + R() * 0.3 : 0.85 + R() * 0.15
        })),
        key: ""
      };
    },
    frame: (g, w, h, t, c, s) => {
      const key = keyOf8(w, h, c);
      if (s.key !== key) {
        bakeBaikal(s, w, h, c);
        s.key = key;
      }
      const tt = t * 1e-3, few = small5(w), H0 = s.H0, AW = s.AW, AH = s.AH, x = s.au.getContext("2d");
      x.globalCompositeOperation = "source-over";
      x.globalAlpha = 1;
      x.clearRect(0, 0, AW, AH);
      x.globalCompositeOperation = "lighter";
      const n = few ? 16 : 90;
      for (let k = 0; k < s.curtains.length; k++) {
        const cu = s.curtains[k], tex = s.tex[k], scroll = (0.5 + 0.5 * Math.sin(tt * 9e-3 * cu.sp + cu.ph)) * AW;
        for (let i = 0; i < n; i++) {
          const x0 = Math.floor(i * AW / n), x1 = Math.floor((i + 1) * AW / n), u = (x0 + x1) * 0.5 / AW;
          if (x1 <= x0) continue;
          const wave = AH * (cu.a1 * Math.sin(u * cu.f1 * TAU10 + tt * 0.045 * cu.sp + cu.ph) + cu.a2 * Math.sin(u * cu.f2 * TAU10 - tt * 0.07 * cu.sp + cu.ph * 2));
          const b = 0.55 + 0.45 * Math.sin(u * cu.f3 - tt * 0.25 * cu.sp + cu.ph * 3);
          x.globalAlpha = cu.int * b;
          x.drawImage(tex, x0 + scroll, 0, x1 - x0, AH, x0, cu.base * AH - AH * 0.96 + wave, x1 - x0, AH);
        }
      }
      fresh5(g, c, w, h);
      g.drawImage(s.sky, 0, 0);
      g.globalCompositeOperation = "screen";
      g.drawImage(s.au, 0, 0, w, H0);
      g.globalCompositeOperation = "source-over";
      g.drawImage(s.land, 0, 0);
      g.drawImage(s.ice, 0, H0);
      g.globalCompositeOperation = "screen";
      g.globalAlpha = 0.5;
      g.save();
      g.translate(0, 2 * H0);
      g.scale(1, -1);
      g.drawImage(s.au, 0, 0, w, H0);
      g.restore();
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
      g.drawImage(s.ov, 0, H0);
      done5(g);
    }
  },
  {
    name: "Moonbow",
    flav: "Cinematic",
    reset: (w, h) => {
      const seed = Math.random() * 1e9 | 0, R = rng12(seed), N = 200;
      return {
        seed,
        fx: 0.42 + R() * 0.16,
        lip: 0.16 + R() * 0.04,
        base: 0.73 + R() * 0.03,
        moonL: R() < 0.5,
        rim: norm015(fbm7(N, 5, 4, 0.5, R)),
        jagL: norm015(fbm7(N, 6, 4, 0.5, R)),
        jagR: norm015(fbm7(N, 6, 4, 0.5, R)),
        stars: makeStars3(R, 70, 0.9),
        puffs: Array.from({ length: 20 }, () => ({ ox: R() * 2 - 1, dir: R() < 0.5 ? -1 : 1, per: 9 + R() * 6, ph: R(), sz: 0.7 + R() * 0.6 })),
        key: ""
      };
    },
    frame: (g, w, h, t, c, s) => {
      const key = keyOf8(w, h, c);
      if (s.key !== key) {
        bakeBow(s, w, h, c);
        s.key = key;
      }
      const tt = t * 1e-3, hz = haze6(c, 0.55), fx = s.fxp, fw = s.fw, lip = s.lipY, TH = s.TH;
      fresh5(g, c, w, h);
      g.drawImage(s.back, 0, 0);
      const FH = s.baseY + h * 0.01 - lip, NB2 = small5(w) ? 6 : 40, yb = (j) => Math.round(lip + j * FH / NB2), spread = (j) => 1 + 0.45 * Math.pow((j + 0.5) / NB2, 1.6);
      g.globalAlpha = 0.9;
      for (let j = 0; j < NB2; j++) {
        const k = spread(j);
        g.drawImage(s.fb, fx - fw * 0.7 * k, yb(j), fw * 1.4 * k, yb(j + 1) - yb(j));
      }
      g.globalCompositeOperation = "screen";
      for (const [sp, al, fl] of [[0.16, 0.7, 1], [0.26, 0.9, -1]]) {
        const off = tt * h * sp % TH;
        g.globalAlpha = al;
        g.save();
        g.translate(fx, 0);
        g.scale(fl, 1);
        for (let j = 0; j < NB2; j++) {
          const ya = yb(j), yz = yb(j + 1), k = spread(j) * (fl < 0 ? 1.06 : 1), ww = s.TWf * k;
          for (const t0 of [lip - TH + off, lip + off]) {
            const y0 = Math.max(ya, t0), y1 = Math.min(yz, t0 + TH);
            if (y1 - y0 > 0.01) g.drawImage(s.st, 0, y0 - t0, s.TWf, y1 - y0, -ww / 2, y0, ww, y1 - y0);
          }
        }
        g.restore();
      }
      g.globalCompositeOperation = "screen";
      g.globalAlpha = 0.35;
      g.drawImage(puff5(c, hz, "mbl"), fx - fw * 0.6, lip - h * 0.012, fw * 1.2, h * 0.03);
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
      g.drawImage(s.front, 0, 0);
      g.globalCompositeOperation = "screen";
      const pf = puff5(c, hz, "mbm");
      for (let i = 0; i < s.nm; i++) {
        const m = s.puffs[i], a = (tt / m.per + m.ph) % 1;
        const xx = fx + (m.ox * 0.6 + m.dir * a * 0.9) * fw * (1 + a * 1.5), yy = s.baseY + h * 0.015 - a * h * 0.2 - a * a * h * 0.05, r = fw * (0.35 + a * 0.9) * m.sz;
        g.globalAlpha = 0.13 * Math.sin(a * Math.PI);
        g.drawImage(pf, xx - r, yy - r * 0.7, r * 2, r * 1.4);
      }
      g.globalAlpha = 0.5 + 0.15 * Math.sin(tt * 0.15);
      g.drawImage(s.bow, 0, s.bowY);
      done5(g);
    }
  },
  {
    name: "Waitomo",
    flav: "Light",
    reset: (w, h) => {
      const seed = Math.random() * 1e9 | 0, R = rng12(seed);
      return {
        seed,
        vy: 0.55 + R() * 0.04,
        vx: 0.4 + R() * 0.2,
        Yc: 0.25,
        ph: R() * 6.3,
        roof: norm015(fbm7(200, 9, 4, 0.55, R)),
        shore: norm015(fbm7(200, 12, 4, 0.5, R)),
        key: ""
      };
    },
    frame: (g, w, h, t, c, s) => {
      const key = keyOf8(w, h, c);
      if (s.key !== key) {
        bakeWait(s, w, h, c);
        s.key = key;
      }
      const tt = t * 1e-3, few = small5(w), VY = s.VY, RH = h - VY, F = s.F;
      const drips = [];
      for (let k = 0; k < 3; k++) {
        const per = 7 + k * 2.3, q = (tt + k * 3.1 + s.ph * 5) / per, cyc = Math.floor(q), a = (q - cyc) / 0.75;
        if (a > 1) continue;
        const H = rng12(s.seed ^ cyc * 7919 + k * 104729 | 0), u = 0.08 + H() * 0.84, Zr = 0.35 + H() * 2.5;
        const rx = (0.03 + a * 0.4) * F / Zr, ry = rx * s.Yc / Zr;
        drips.push({ x: u * w, y: VY + s.Yc * F / Zr, rx, ry, a, amp: 3 * (1 - a) * Math.max(0.4, w / 1440) });
      }
      fresh5(g, c, w, h);
      g.drawImage(s.cave, 0, 0);
      const rows = few ? 8 : 44, sh = RH / rows;
      for (let k = 0; k < rows; k++) {
        const y0 = VY + k * sh, sy = VY - (k + 1) * sh;
        if (sy < 0) break;
        let off = Math.sin(tt * 0.4 + k * 0.45) * 0.6 * (w / 1440) * (1 + k / rows * 2);
        for (const d of drips) {
          const dd = (y0 + sh / 2 - d.y) / Math.max(4, d.ry * 2.2);
          if (Math.abs(dd) < 1) off += Math.sin(dd * 9 - d.a * 20) * d.amp * (1 - Math.abs(dd));
        }
        g.save();
        g.translate(off, y0 + sh);
        g.scale(1, -1);
        g.drawImage(s.cave, 0, sy, w, sh, 0, 0, w, sh + 0.5);
        g.restore();
      }
      g.drawImage(s.wover, 0, VY);
      g.globalCompositeOperation = "screen";
      const ns = few ? 6 : 48;
      for (let i = 0; i < ns; i++) {
        const x0 = Math.floor(i * w / ns), x1 = Math.floor((i + 1) * w / ns), u = (x0 + x1) * 0.5 / w;
        if (x1 <= x0) continue;
        g.globalAlpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(u * 4.4 - tt * 0.13 + s.ph));
        g.drawImage(s.glow, x0, 0, x1 - x0, VY, x0, 0, x1 - x0, VY);
      }
      g.globalAlpha = 0.28 * (0.8 + 0.2 * Math.sin(tt * 0.13 + s.ph));
      g.save();
      g.translate(0, 2 * VY);
      g.scale(1, -1);
      g.drawImage(s.glow, 0, 0);
      g.restore();
      g.globalCompositeOperation = "source-over";
      g.lineWidth = Math.max(0.6, h / 1e3);
      for (const d of drips) {
        const al = 0.22 * (1 - d.a) * sstep7(0, 0.05, d.a);
        g.globalAlpha = 1;
        g.strokeStyle = W9(c, al);
        g.beginPath();
        g.ellipse(d.x, d.y, d.rx, Math.max(0.5, d.ry), 0, 0, TAU10);
        g.stroke();
        g.strokeStyle = W9(c, al * 0.55);
        g.beginPath();
        g.ellipse(d.x, d.y, d.rx * 0.68, Math.max(0.4, d.ry * 0.68), 0, 0, TAU10);
        g.stroke();
      }
      done5(g);
    }
  }
];
export {
  SCENES_AUTOMATA,
  SCENES_BUNGIE,
  SCENES_COZY,
  SCENES_DEEPSPACE,
  SCENES_FLUIDINK,
  SCENES_GROWTH,
  SCENES_NIGHT,
  SCENES_NIGHTPLACES,
  SCENES_PHASE,
  SCENES_PLACES,
  SCENES_SKY,
  SCENES_WATERLIGHT
};
