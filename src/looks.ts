// Colour looks: one canvas colour and one accent drive every one of T3's theme variables.
// T3 builds its own palette the same way (surfaces sit fixed steps above the canvas, tinted
// by the accent; text sits near white), so a look keeps T3's structure and only moves the
// two anchors, inside ranges that stay readable: the canvas stays dark, text stays light,
// and the accent stays light enough for T3's dark accent-foreground text.

export type Look = { name?: string; canvasHue: number; accentHue: number; vibrance: number; canvasL: number; accentL: number };
export type Scheme = "analogous" | "complementary" | "triadic" | "mono";
export const SCHEMES: Scheme[] = ["analogous", "complementary", "triadic", "mono"];
export const SCHEME_OFFSET: Record<Scheme, number> = { analogous: 32, complementary: 180, triadic: 120, mono: 0 };
export const RANGE = { canvasL: [0.13, 0.3] as const, accentL: [0.68, 0.9] as const };

export const PRESETS: Look[] = [
  { name: "Grid Night", canvasHue: 248, accentHue: 183, vibrance: 0.5, canvasL: 0.204, accentL: 0.85 },
  { name: "Ember", canvasHue: 32, accentHue: 62, vibrance: 0.62, canvasL: 0.19, accentL: 0.8 },
  { name: "Lagoon", canvasHue: 224, accentHue: 192, vibrance: 0.55, canvasL: 0.2, accentL: 0.84 },
  { name: "Orchid", canvasHue: 302, accentHue: 336, vibrance: 0.55, canvasL: 0.19, accentL: 0.8 },
  { name: "Moss", canvasHue: 146, accentHue: 112, vibrance: 0.45, canvasL: 0.19, accentL: 0.83 },
  { name: "Citrus", canvasHue: 256, accentHue: 100, vibrance: 0.7, canvasL: 0.18, accentL: 0.88 },
  { name: "Rose", canvasHue: 356, accentHue: 20, vibrance: 0.5, canvasL: 0.2, accentL: 0.8 },
  { name: "Ink", canvasHue: 262, accentHue: 262, vibrance: 0.12, canvasL: 0.16, accentL: 0.88 },
  { name: "Saffron", canvasHue: 284, accentHue: 76, vibrance: 0.62, canvasL: 0.165, accentL: 0.84 },
  { name: "Glacier", canvasHue: 218, accentHue: 206, vibrance: 0.28, canvasL: 0.22, accentL: 0.9 },
  { name: "Copper", canvasHue: 205, accentHue: 48, vibrance: 0.55, canvasL: 0.18, accentL: 0.8 },
  { name: "Absinthe", canvasHue: 162, accentHue: 128, vibrance: 0.7, canvasL: 0.155, accentL: 0.86 },
  { name: "Plum Smoke", canvasHue: 318, accentHue: 282, vibrance: 0.34, canvasL: 0.2, accentL: 0.82 },
  { name: "Arcade", canvasHue: 288, accentHue: 168, vibrance: 0.82, canvasL: 0.145, accentL: 0.86 },
  { name: "Midnight Gold", canvasHue: 256, accentHue: 86, vibrance: 0.42, canvasL: 0.14, accentL: 0.85 },
];

export const wrapHue = (h: number) => ((h % 360) + 360) % 360;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const hueGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

export const canvasChroma = (v: number) => 0.008 + 0.05 * v;
export const accentChroma = (v: number) => 0.03 + 0.17 * v;
export const lookCanvas = (l: Look) => `oklch(${l.canvasL} ${canvasChroma(l.vibrance).toFixed(4)} ${l.canvasHue.toFixed(1)})`;
export const lookAccent = (l: Look) => `oklch(${l.accentL} ${accentChroma(l.vibrance).toFixed(4)} ${l.accentHue.toFixed(1)})`;

/** which scheme a look's two hues sit in, if any */
export function schemeOf(l: Look): Scheme | null {
  const gap = hueGap(l.canvasHue, l.accentHue);
  return SCHEMES.find((s) => Math.abs(gap - SCHEME_OFFSET[s]) <= 12) ?? null;
}

/** a harmonious look in one roll: a scheme, a hue, and strengths inside the readable ranges */
export function shuffleLook(): Look {
  const r = Math.random;
  const scheme = (["analogous", "analogous", "complementary", "triadic", "mono"] as Scheme[])[Math.floor(r() * 5)];
  const canvasHue = r() * 360;
  const accentHue = wrapHue(canvasHue + (r() < 0.5 ? -1 : 1) * SCHEME_OFFSET[scheme] + (r() - 0.5) * 16);
  return {
    canvasHue, accentHue,
    vibrance: scheme === "mono" ? 0.2 + r() * 0.5 : 0.3 + r() * 0.55,
    canvasL: 0.15 + r() * 0.1,
    accentL: 0.72 + r() * 0.16,
  };
}

const OKLCH = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*\)$/;
type Lch = [number, number, number];
function parse(v: string): Lch | null {
  const m = OKLCH.exec(v.trim());
  return m ? [m[2] ? +m[1] / 100 : +m[1], +m[3], +m[4]] : null;
}

/** null when T3's current theme can't carry a look: none of its variables are set, or it's a light theme */
export function lookBase(st: CSSStyleDeclaration): { canvas: Lch; accent: Lch } | null {
  const canvas = parse(st.getPropertyValue("--app-theme-canvas")), accent = parse(st.getPropertyValue("--app-theme-accent"));
  if (!canvas || !accent || canvas[0] > 0.5) return null;
  return { canvas, accent };
}

/** T3's theme variables, as T3 set them on <html>, rewritten around the look's canvas and accent.
 *  With `drift`, every hue adds the animated --t3-drift (0..360) so the whole app turns. */
export function lookRules(look: Look, st: CSSStyleDeclaration, drift = false): string {
  const base = lookBase(st);
  if (!base) return "";
  const [Lc0, Cc0, Hc0] = base.canvas, [La0, Ca0, Ha0] = base.accent;
  const Cc = canvasChroma(look.vibrance), Ca = accentChroma(look.vibrance);
  const k = Ca0 > 0.005 ? Ca / Ca0 : 1;
  const dLc = look.canvasL - Lc0, dLa = look.accentL - La0, dHa = look.accentHue - Ha0;
  const rules: string[] = [];
  for (let i = 0; i < st.length; i++) {
    const name = st[i];
    if (!name.startsWith("--app-theme-") || /error|warning/.test(name)) continue;
    const v = parse(st.getPropertyValue(name));
    if (!v) continue;
    let [L, C, H] = v;
    if (hueGap(H, Hc0) < 10 && Math.abs(C - Cc0) < 0.01) {
      // the canvas family: canvas, window chrome, toolbar, terminal ground
      L += dLc; C = Cc; H = look.canvasHue;
    } else if (C >= 0.008 && hueGap(H, Ha0) <= 25) {
      H += dHa;
      if (C >= Ca0 * 0.8) { C *= k; if (L >= La0 - 0.08) L += dLa; } // the accent and its strong uses
      else if (L < 0.6) { L += dLc; C = Math.min(C * k, 0.085); }   // surfaces keep their steps above the canvas
      else C = Math.min(C * k, 0.045);                               // near-white text keeps its lightness
    } else if (C >= 0.008) {
      // the off-hue few (muted text, message actions, accent text) turn with the accent
      H += dHa; C = Math.min(C * Math.sqrt(k), 0.12);
    } else continue;
    const hue = drift ? `calc(${wrapHue(H).toFixed(2)} + var(--t3-drift, 0))` : wrapHue(H).toFixed(2);
    rules.push(`${name}: oklch(${clamp(L, 0, 1).toFixed(4)} ${C.toFixed(4)} ${hue}) !important;`);
  }
  return rules.length ? `html[data-t3-look] { ${rules.join(" ")} }` : "";
}
