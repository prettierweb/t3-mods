// T3 scenes: The Grid's Phase and Automata scenes running as T3's window background.
// The scenes are bundled straight from The Grid's source, so a fix there lands here on rebuild.
// The Grid's scenes that T3 shows, in one file
import { SCENES_AUTOMATA, SCENES_BUNGIE, SCENES_COZY, SCENES_DEEPSPACE, SCENES_FLUIDINK, SCENES_GROWTH, SCENES_NIGHT, SCENES_NIGHTPLACES, SCENES_PHASE, SCENES_PLACES, SCENES_SKY, SCENES_WATERLIGHT } from "./grid-scenes.js";
import { SCENES_EMERGENCE } from "./emergence";
import { SCENES_CALM } from "./calm";
import { SCENES_THEMES, THEMES, RING_CSS } from "./themes";
import { startDictation } from "./dictation";
import { startCompact } from "./compact";
import { startPrivacy } from "./privacy";
import { startHealth } from "./health";
import { startSync } from "./sync";
import { startRecent } from "./recent";
import { startUsage } from "./usage";
import { PRESETS, SCHEMES, SCHEME_OFFSET, RANGE, schemeOf, shuffleLook, lookRules, lookBase, lookCanvas, lookAccent, wrapHue, type Look, type Scheme } from "./looks";

// A lane is about 560 px wide, under T3 phone breakpoint, so T3 gave it the phone message box that
// folds to a bare "Ask anything" row whenever it is not focused. Lanes are desktop panes: the
// 639 px phone query answers no there. Runs before T3 scripts (injected on new document).
if (location.search.includes("t3lane") && !(window as any).__t3laneMQ) {
  (window as any).__t3laneMQ = 1;
  const real = window.matchMedia.bind(window);
  window.matchMedia = (q: string) => (/max-width:\s*639(\.\d+)?px|width\s*<\s*40rem/.test(q) ? real("not all") : real(q));
}

type Scene = { name: string; reset: (w: number, h: number) => any; frame: (g: any, w: number, h: number, t: number, c: any, s: any) => void };

// Chosen from all of The Grid's scenes (2026-10-31, src/bench.ts): at most 2 ms a frame at T3's
// window size, a first frame under 0.6 s, no more than 4% of the screen bright enough to fight
// text at 60% strength, and picked by eye from a contact sheet. Left out for cost: Mycelium,
// Lakeside Aurora, Oil Film, Globular, Ebru, Wax Lamp, Caldera Lights, Toro Nagashi, Lavender
// Dusk, Sea of Stars, Long Hull, Mezzotint. Left out by eye: too faint (Cloud Chamber, Route 66,
// Night Train, Tea Steam, Ink Bloom, Frostfern, Fireflies) or wrong behind text (Fogbound Pines,
// Snell's Window).
const GROUPS = [
  { title: "Themes", names: ["Ring", "Reach", "Glass"] },
  { title: "Phase", names: ["Clifford", "Lorenz", "Phase Portrait", "De Jong", "Ikeda", "Chladni"] },
  { title: "Automata", names: ["Automaton", "Turing", "Life", "Langton", "Sandpile", "Guilloche"] },
  { title: "Emergence", names: ["Belousov", "Physarum", "Ising"] },
  { title: "Calm", names: ["Contours", "Harmonograph", "Moiré"] },
  { title: "Space", names: ["Star Nursery", "Whirlpool", "Ringrise", "Totality"] },
  { title: "Ink and growth", names: ["Silk Wind", "Reef", "Meadow"] },
  { title: "Sky and water", names: ["Cloud Sea", "Sunken Light", "Distant Storm", "Milky Way", "Baikal Ice", "Moonbow", "Waitomo"] },
  { title: "Night", names: ["Alpenglow", "Lighthouse", "Shinjuku Rain", "Lantern River", "Perseids", "Blue Hour", "Night Blossom", "Lava Field", "Salt Flat", "Sand Sea"] },
  { title: "Cozy", names: ["First Snow", "Candlelight"] },
  { title: "Halo", names: ["Keystone", "High Keep", "Vigil"] },
];
const ALL: Scene[] = [
  ...SCENES_PHASE, ...SCENES_AUTOMATA, ...SCENES_DEEPSPACE, ...SCENES_FLUIDINK, ...SCENES_GROWTH, ...SCENES_SKY,
  ...SCENES_WATERLIGHT, ...SCENES_NIGHT, ...SCENES_NIGHTPLACES, ...SCENES_PLACES, ...SCENES_COZY, ...SCENES_BUNGIE,
  ...SCENES_EMERGENCE, ...SCENES_CALM, ...SCENES_THEMES,
];
const byName = (n: string | null) => ALL.find((s) => s.name === n) ?? null;
const SCENES = GROUPS.flatMap((g) => g.names).map(byName).filter(Boolean) as Scene[];

const KEY = "t3scenes";
const FPS = 30;

// Scenes wear T3's active theme, as they wear The Grid's: its canvas is the ground, its
// accent leads, and two hue turns of the accent fill out the palette (The Grid's fallback).
function toRgb(css: string, fallback: number[]): number[] {
  const x = document.createElement("canvas").getContext("2d")!;
  x.fillStyle = "#010203"; x.fillStyle = css.trim() || "#010203";
  if (x.fillStyle === "#010203") return fallback;
  x.fillRect(0, 0, 1, 1);
  const d = x.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}
function rotateHue([r, g, b]: number[], deg: number): number[] {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d > 1e-6) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  }
  h = (((h * 60 + deg) % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, xx = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r1, g1, b1] = h < 60 ? [c, xx, 0] : h < 120 ? [xx, c, 0] : h < 180 ? [0, c, xx] : h < 240 ? [0, xx, c] : h < 300 ? [xx, 0, c] : [c, 0, xx];
  return [r1, g1, b1].map((v) => Math.round((v + m) * 255));
}
let themeKey = "";
let COLOR: any = null;
// `fixed` gives the canvas and accent straight from a look: while the whole app drifts, the
// computed variables change every step, and the scene must not rebuild on each one.
function readTheme(fixed?: { canvas: string; accent: string }): boolean {
  const cs = getComputedStyle(document.documentElement);
  const canvasCss = fixed?.canvas ?? cs.getPropertyValue("--app-theme-canvas"), accentCss = fixed?.accent ?? cs.getPropertyValue("--app-theme-accent");
  const key = canvasCss + "|" + accentCss;
  if (key === themeKey && COLOR) return false;
  themeKey = key;
  const B = toRgb(canvasCss, [11, 24, 36]), A = toRgb(accentCss, [127, 227, 212]);
  const light = (B[0] + B[1] + B[2]) / 3 > 180;
  const hexOf = (p: number[]) => "#" + p.map((n) => n.toString(16).padStart(2, "0")).join("");
  COLOR = { acc: hexOf(A), bg: hexOf(B), r: A[0], g: A[1], b: A[2], br: B[0], bg2: B[1], bb: B[2], pal: [A, rotateHue(A, 90), rotateHue(A, -90)], light };
  return true;
}

// ── colour that keeps changing: The Grid's two looks, "Scene drifts through every colour"
// and "Each page wears its own colour" (here: each project) ──────────────────────────────
// The drift is The Grid's: a hue-rotate filter on the scene canvas in 100 ms steps, so no
// scene re-bakes its palette mid-turn. One turn takes 2 minutes by default (The Grid's pace);
// the Speed slider runs from 10 minutes to 5 seconds.
const HUE_STEP_MS = 100, TURN_SLOW = 600, TURN_FAST = 5;
const speedToTurn = (x: number) => TURN_SLOW * (TURN_FAST / TURN_SLOW) ** (x / 100);
const turnToSpeed = (t: number) => (100 * Math.log(t / TURN_SLOW)) / Math.log(TURN_FAST / TURN_SLOW);
const turnLabel = (t: number) => (t < 60 ? `every ${Math.round(t)} s` : `every ${+(t / 60).toFixed(t < 120 ? 1 : 0)} min`);
// A project gets a hue of its own from its name, the same every time, unless one is listed here
// or picked by hand (right-click a pane's top bar).
const PROJECT_COLOURS: Record<string, string> = {};
// Extras that need another program are listed by the launcher (config.json); with no list, all are on.
const MODS_CFG = (window as any).__t3modsCfg as Record<string, any> | undefined;
const hasExtra = (k: string) => !MODS_CFG || !!MODS_CFG[k];
function oklchHueOfHex(h: string): number {
  const lin = [1, 3, 5].map((i) => { const v = parseInt(h.slice(i, i + 2), 16) / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  const [r, g, b] = lin;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
}
// Nov 10: a project's colour can be picked by hand (right-click a pane's top bar); kept per
// project name in localStorage, so every pane and the Recent list agree
const HUE_KEY = "t3projhue";
const hueOverrides = (): Record<string, number> => { try { return JSON.parse(localStorage.getItem(HUE_KEY) || "{}"); } catch { return {}; } };
function projectHue(name: string): number | null {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  const own = hueOverrides()[key];
  if (typeof own === "number") return own;
  if (PROJECT_COLOURS[key]) return oklchHueOfHex(PROJECT_COLOURS[key]);
  let hsh = 2166136261;
  for (const ch of key) hsh = Math.imul(hsh ^ ch.charCodeAt(0), 16777619);
  return (hsh >>> 0) % 360;
}
const OKLCH = /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*\)$/;
const hueGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
// T3 writes its palette as oklch values on <html>; the accent family (accent, selected rows,
// message bubbles, focus, sidebar) all share the accent's hue. Those, and only those, turn.
function tintRules(targetHue: number): string {
  const st = document.documentElement.style;
  const acc = OKLCH.exec(st.getPropertyValue("--app-theme-accent").trim());
  if (!acc) return "";
  const baseHue = +acc[3], rules: string[] = [];
  for (let i = 0; i < st.length; i++) {
    const name = st[i];
    if (!name.startsWith("--app-theme-") || /error|warning/.test(name)) continue;
    const m = OKLCH.exec(st.getPropertyValue(name).trim());
    if (!m || +m[2] < 0.008 || hueGap(+m[3], baseHue) > 25) continue;
    const h = (((+m[3] - baseHue + targetHue) % 360) + 360) % 360;
    rules.push(`${name}: oklch(${m[1]} ${m[2]} ${h.toFixed(2)}) !important;`);
  }
  return rules.length ? `html[data-t3-tint] { ${rules.join(" ")} }` : "";
}

const TOUR_MIN = 4;
const TOUR = [...GROUPS[0].names, ...GROUPS[1].names, ...GROUPS[2].names, ...GROUPS[3].names]; // Phase, Automata, Emergence and Calm
type Saved = { scene: string | null; strength: number; drift: boolean; driftApp: boolean; turnSec: number; smooth: boolean; pauseAway: boolean; projectTint: boolean; projectBand: boolean; look: Look | null; looks: Look[]; calm: boolean; tour: boolean; t3First?: boolean };
const load = (): Saved => {
  const base: Saved = { scene: "Clifford", strength: 60, drift: true, driftApp: false, turnSec: 120, smooth: false, pauseAway: true, projectTint: false, projectBand: true, look: null, looks: [], calm: true, tour: true };
  try {
    const s: Saved = { ...base, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
    // once: T3's own theme colours come first. A look, the per-project accent and the colour turns
    // are still in the Look panel, but nothing repaints T3 until one is picked there.
    if (!s.t3First) { Object.assign(s, { t3First: true, look: null, projectTint: false, driftApp: false, drift: false }); localStorage.setItem(KEY, JSON.stringify(s)); }
    return s;
  } catch { return base; }
};
const save = (s: Saved) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };

// Thumbnails are developed the way The Grid develops its picker: 22 engine frames, then kept.
const TW = 192, TH = 120;
const thumbCache = new Map<string, HTMLCanvasElement>();
// scenes that draw onto their own paper (a pen) keep it between preview frames
const ACCUMULATES = new Set(["Harmonograph"]);
// one flat colour: a lost WebGL context, or a scene that drew nothing yet
function blank(g: CanvasRenderingContext2D): boolean {
  const d = g.getImageData(0, 0, TW, TH).data, step = 4 * 37;
  for (let i = step; i < d.length; i += step)
    if (Math.abs(d[i] - d[0]) + Math.abs(d[i + 1] - d[1]) + Math.abs(d[i + 2] - d[2]) + Math.abs(d[i + 3] - d[3]) > 12) return false;
  return true;
}
function paintThumb(target: HTMLCanvasElement, scene: Scene, tries = 0) {
  const g = target.getContext("2d", { willReadFrequently: true })!;
  const key = `${scene.name}|${COLOR.acc}|${COLOR.bg}`;
  const cached = thumbCache.get(key);
  if (cached) { g.clearRect(0, 0, TW, TH); g.drawImage(cached, 0, 0); return; }
  try {
    const st = scene.reset(TW, TH), keep = ACCUMULATES.has(scene.name), n = keep ? 110 : 22;
    for (let f = 0; f < n; f++) {
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      if (!keep && f < n - 1) g.clearRect(0, 0, TW, TH);
      scene.frame(g, TW, TH, 400 + f * 90, COLOR, st);
    }
    // a blank is never cached; it tries again once the GPU has a context to spare
    if (blank(g)) {
      if (tries < 3) setTimeout(() => { if (target.isConnected && !thumbCache.has(key)) paintThumb(target, scene, tries + 1); }, 500 + tries * 700);
      return;
    }
    const copy = document.createElement("canvas");
    copy.width = TW; copy.height = TH;
    copy.getContext("2d")!.drawImage(target, 0, 0);
    thumbCache.set(key, copy);
  } catch { /* a scene that throws just shows empty */ }
}

const INFINITY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide" aria-hidden="true"><path d="M6 16c5 0 7-8 12-8a4 4 0 0 1 0 8c-5 0-7-8-12-8a4 4 0 1 0 0 8"/></svg>`;
const IMAGES_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide size-4" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/></svg>`;
const HISTORY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide size-4" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`;
// the Kani helper (media chat's serve.mjs): media library at /, the change record at /kani
const LIBRARY_URL = "http://127.0.0.1:8790";
// polls until fn returns something truthy, or gives up with null
async function waitFor<T>(fn: () => T | null | undefined | Promise<T | null | undefined>, ms: number): Promise<T | null> {
  const end = performance.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (performance.now() > end) return null;
    await new Promise((r) => setTimeout(r, 120));
  }
}
const HEART_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
const SCHEME_LABEL: Record<Scheme, string> = { analogous: "Analogous", complementary: "Complementary", triadic: "Triadic", mono: "Mono" };
const ICON_CHECK = `<svg class="t3s-menu-tail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
const ICON_MORE = `<svg class="t3s-menu-tail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;
const CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`;

const CSS = `
  #t3-scene { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 0; pointer-events: none; }
  html[data-t3-scene-light] .t3s-thumb canvas { filter: invert(1) hue-rotate(180deg); }
  /* T3 leaves an inline colour on <body>; see-through lanes show it, so it has to match the theme */
  html:not([data-t3-scene]):not([data-t3-lane]) body { background-color: var(--background) !important; }
  /* the project band: the chat header takes a wash of the project colour and a solid edge on top */
  html[data-t3-band] header:has(button[aria-label^="New thread in "]) {
    background-color: color-mix(in oklch, var(--t3-band) 42%, var(--background)) !important;
    box-shadow: inset 0 3px 0 var(--t3-band);
  }
  html[data-t3-band][data-t3-lane] header:has(button[aria-label^="New thread in "]),
  html[data-t3-band][data-t3-scene] header:has(button[aria-label^="New thread in "]) {
    background-color: color-mix(in oklch, var(--t3-band) 42%, var(--app-theme-canvas, #111)) !important;
  }
  html[data-t3-scene], html[data-t3-scene] body { background: var(--app-theme-canvas) !important; }
  html[data-t3-scene] #root { position: relative; z-index: 1; }
  html[data-t3-scene] { --background: transparent !important; --sidebar-stage-fade: transparent !important; }
  html[data-t3-scene] .bg-sidebar {
    background-color: color-mix(in srgb, var(--app-theme-canvas) 58%, transparent) !important;
    backdrop-filter: blur(22px) saturate(150%);
  }
  /* T3's own glass (composer, menus, dialogs) turns on with a scene unless it was already set below solid */
  html[data-t3-scene-glass] { --glass-opacity: 62% !important; --glass-blur: 22px !important; --glass-saturation: 150% !important; }
  /* Smooth: no blur over the scene; the sidebar keeps its tint */
  html[data-t3-smooth] .bg-sidebar { backdrop-filter: none !important; background-color: color-mix(in srgb, var(--app-theme-canvas) 86%, transparent) !important; }

  /* the pop-out docks on the right with no backdrop, so the scene stays in view while you pick */
  #t3s-modal { position: fixed; top: 40px; right: 8px; bottom: 8px; width: var(--t3s-dock, 440px); z-index: 2147483000; display: flex; }
  #t3s-modal .t3s-panel {
    flex: 1; min-width: 0; overflow: auto;
    background: color-mix(in srgb, var(--popover) 76%, transparent);
    backdrop-filter: blur(26px) saturate(150%);
    border: 1px solid var(--border); border-radius: 16px;
    box-shadow: 0 24px 80px rgb(0 0 0 / 0.45); padding: 18px 20px 16px;
  }
  #t3s-surface { flex: 1; min-height: 0; overflow-y: auto; }
  #t3s-surface .t3s-panel { padding: 14px 16px 16px; }
  #t3s-surface .t3s-grid, #t3s-modal .t3s-grid { grid-template-columns: repeat(auto-fill, minmax(124px, 1fr)); }
  .t3s-panel { color: var(--foreground); }
  .t3s-panel header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .t3s-panel h2 { font-size: 15px; font-weight: 600; margin: 0; flex: 1; }
  .t3s-panel .t3s-text-btn, .t3s-panel .t3s-icon-btn {
    font: inherit; font-size: 13px; color: var(--muted-foreground); background: none; border: 0; cursor: pointer;
    border-radius: 8px; padding: 5px 9px; display: inline-flex; align-items: center;
  }
  .t3s-panel .t3s-icon-btn { padding: 6px; }
  .t3s-panel .t3s-text-btn:hover, .t3s-panel .t3s-icon-btn:hover { background: var(--accent); color: var(--foreground); }
  .t3s-panel .t3s-text-btn[aria-pressed="true"] { color: var(--foreground); background: var(--accent); }
  .t3s-panel h3 { font-size: 13px; font-weight: 600; margin: 16px 0 10px; color: var(--foreground); }
  .t3s-panel .t3s-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px 12px; }
  .t3s-panel .t3s-thumb { font: inherit; color: inherit; text-align: left; background: none; border: 0; padding: 0; cursor: pointer; display: flex; flex-direction: column; min-width: 0; }
  .t3s-panel .t3s-thumb .t3s-frame {
    display: block; width: 100%; border-radius: 10px; overflow: hidden; border: 1px solid var(--border); aspect-ratio: 16 / 10;
    outline: 2px solid transparent; outline-offset: 2px; transition: outline-color 120ms, border-color 120ms;
  }
  .t3s-panel .t3s-thumb canvas { display: block; width: 100%; height: 100%; }
  .t3s-panel .t3s-thumb:hover .t3s-frame { border-color: color-mix(in srgb, var(--app-theme-accent) 55%, transparent); }
  .t3s-panel .t3s-thumb[aria-pressed="true"] .t3s-frame { outline-color: var(--app-theme-accent); }
  .t3s-panel .t3s-name { display: block; font-size: 13px; font-weight: 500; margin-top: 7px; }
  .t3s-panel footer { display: flex; align-items: center; gap: 12px; margin: 6px 0 4px; padding-bottom: 14px; border-bottom: 1px solid var(--border); font-size: 13px; color: var(--muted-foreground); }
  .t3s-panel footer input { flex: 1; max-width: 260px; accent-color: var(--app-theme-accent); }
  .t3s-panel footer output { min-width: 36px; font-variant-numeric: tabular-nums; color: var(--foreground); }
  .t3s-panel .t3s-checks { display: flex; flex-wrap: wrap; gap: 8px 20px; margin-top: 10px; font-size: 13px; color: var(--muted-foreground); }
  .t3s-panel .t3s-checks label { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; }
  .t3s-panel .t3s-checks input { accent-color: var(--app-theme-accent); margin: 0; }
  .t3s-panel h4 { font-size: 12.5px; font-weight: 500; margin: 14px 0 8px; color: var(--muted-foreground); }
  .t3s-panel .t3s-scenes-head, .t3s-panel .t3s-colour-head { display: flex; align-items: center; gap: 6px; margin: 18px 0 8px; }
  .t3s-panel .t3s-scenes-head h3, .t3s-panel .t3s-colour-head h3 { margin: 0; flex: 1; }
  .t3s-panel .t3s-colour-head { margin-top: 8px; }
  .t3s-panel .t3s-shuffle {
    font: inherit; font-size: 13px; font-weight: 600; border: 0; border-radius: 8px; padding: 6px 14px; cursor: pointer;
    background: var(--app-theme-accent); color: var(--app-theme-accent-foreground);
  }
  .t3s-panel button:disabled { opacity: 0.4; cursor: default; }
  .t3s-panel .t3s-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .t3s-panel .t3s-chip {
    font: inherit; font-size: 12.5px; color: var(--foreground); display: inline-flex; align-items: center; gap: 7px;
    padding: 4px 11px 4px 5px; border-radius: 999px; border: 1px solid var(--border); background: transparent; cursor: pointer;
  }
  .t3s-panel .t3s-chip:hover { border-color: color-mix(in srgb, var(--app-theme-accent) 50%, transparent); }
  .t3s-panel .t3s-chip[aria-pressed="true"] { border-color: var(--app-theme-accent); }
  .t3s-panel .t3s-sw { width: 16px; height: 16px; border-radius: 50%; background: linear-gradient(135deg, var(--c) 50%, var(--a) 50%); box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.14); }
  .t3s-panel .t3s-chip-wrap { display: inline-flex; align-items: center; }
  .t3s-panel .t3s-chip-x { font: inherit; font-size: 14px; line-height: 1; color: var(--muted-foreground); background: none; border: 0; cursor: pointer; padding: 2px 5px; visibility: hidden; }
  .t3s-panel .t3s-chip-wrap:hover .t3s-chip-x { visibility: visible; }
  .t3s-panel .t3s-seg { display: inline-flex; flex-wrap: wrap; margin-top: 12px; border: 1px solid var(--border); border-radius: 9px; padding: 2px; gap: 2px; }
  .t3s-panel .t3s-seg button { font: inherit; font-size: 12.5px; color: var(--muted-foreground); background: none; border: 0; border-radius: 7px; padding: 4px 10px; cursor: pointer; }
  .t3s-panel .t3s-seg button[aria-pressed="true"] { background: var(--accent); color: var(--foreground); }
  .t3s-panel .t3s-sliders { display: grid; grid-template-columns: 70px minmax(0, 1fr); align-items: center; gap: 6px 12px; margin-top: 12px; max-width: 440px; font-size: 13px; color: var(--muted-foreground); }
  .t3s-panel .t3s-sliders input { width: 100%; accent-color: var(--app-theme-accent); margin: 0; }
  /* the hue slider shows the wheel it picks from */
  .t3s-panel .t3s-sliders input[data-k="hue"] {
    -webkit-appearance: none; appearance: none; height: 6px; border-radius: 3px;
    background: linear-gradient(90deg in oklch longer hue, oklch(0.75 0.13 0), oklch(0.75 0.13 359));
  }
  .t3s-panel .t3s-sliders input[data-k="hue"]::-webkit-slider-thumb {
    -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--foreground); border: 2px solid var(--app-theme-canvas); cursor: pointer;
  }
  .t3s-panel .t3s-note { font-size: 13px; color: var(--muted-foreground); margin: 10px 0 0; }
  #t3s-menu { position: fixed; inset: 0; z-index: 2147483001; }
  #t3s-menu .t3s-menu-list {
    position: fixed; min-width: 220px; max-width: 320px; padding: 5px; border-radius: 12px;
    background: color-mix(in srgb, var(--popover) 88%, transparent); backdrop-filter: blur(20px) saturate(150%);
    border: 1px solid var(--border); box-shadow: 0 14px 44px rgb(0 0 0 / 0.42); color: var(--foreground);
  }
  #t3s-menu .t3s-menu-item {
    display: flex; align-items: center; gap: 10px; width: 100%; height: 32px; padding: 0 10px; border: 0; border-radius: 7px;
    background: none; color: inherit; font: inherit; font-size: 13.5px; text-align: left; cursor: pointer; outline: none;
  }
  #t3s-menu .t3s-menu-item > svg:first-child, #t3s-menu .t3s-menu-item > span:first-child { width: 16px; height: 16px; flex: none; color: var(--muted-foreground); }
  #t3s-menu .t3s-menu-label { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  #t3s-menu .t3s-menu-tail { width: 15px; height: 15px; flex: none; color: var(--muted-foreground); }
  #t3s-menu .t3s-menu-item:focus, #t3s-menu .t3s-menu-item:hover { background: color-mix(in srgb, var(--foreground) 8%, transparent); }
  #t3s-menu .t3s-menu-item:disabled { opacity: 0.45; cursor: default; background: none; }
  #t3s-menu .t3s-menu-item.is-danger, #t3s-menu .t3s-menu-item.is-danger > svg { color: var(--app-theme-error, #f87171); }
  #t3s-menu .t3s-menu-item.is-danger:focus, #t3s-menu .t3s-menu-item.is-danger:hover { background: color-mix(in srgb, var(--app-theme-error, #f87171) 14%, transparent); }
  #t3s-menu .t3s-menu-sep { height: 1px; margin: 5px 8px; background: var(--border); }
  /* the pane a dragged chat would open in */
  html[data-t3-drop-blur] body > * { filter: blur(2.5px); }
  html[data-t3-drop-main] main[data-slot="sidebar-inset"] > * { filter: blur(2.5px); }
  /* T3's details card opens by itself on any pane wide enough and covers the text: the header button opens it instead */
  html:not([data-t3-details]) aside[data-thread-details-panel="inline"] { display: none !important; }
  html.t3s-dragging, html.t3s-dragging * { user-select: none !important; cursor: grabbing !important; }
  /* lane mode: no sidebar, see-through over the window's scene, a hairline on the left */
  html[data-t3-lane], html[data-t3-lane] body { background: transparent !important; }
  html[data-t3-lane] { --background: transparent !important; }
  html[data-t3-lane] #t3-scene { display: none; }
  html[data-t3-lane] header { background: transparent !important; }
  html[data-t3-lane] [data-slot="sidebar"], html[data-t3-lane] [class*="left-[var(--workspace-controls-left)]"] { display: none !important; }
  html[data-t3-lane] main[data-slot="sidebar-inset"] { box-shadow: inset 1px 0 0 var(--border); }
  html[data-t3-lane-last] header { padding-right: calc(150px / var(--t3-zoom, 1)) !important; }
  [data-t3-age] > * { display: none !important; }
  [data-t3-sorted] { display: flex !important; flex-direction: column; }
  [data-t3-age]::after { content: attr(data-t3-age); font-size: 12px; font-variant-numeric: tabular-nums; color: var(--muted-foreground); }
  #t3s-lane-grid { position: fixed; inset: 0; pointer-events: none; z-index: 2147482000; }
  #t3s-lane-grid .t3s-lane-handle { position: fixed; pointer-events: auto; }
  #t3s-lane-grid .t3s-lane-handle.is-col { cursor: col-resize; }
  #t3s-lane-grid .t3s-lane-handle.is-row { cursor: row-resize; }
  #t3s-lane-grid .t3s-lane-handle.is-corner { cursor: move; z-index: 1; }
  #t3s-lane-grid .t3s-lane-handle.is-corner::after { inset: 0; }
  #t3s-lane-grid .t3s-lane-handle::after { content: ""; position: absolute; border-radius: 2px; background: var(--app-theme-accent); opacity: 0; transition: opacity 120ms; }
  #t3s-lane-grid .t3s-lane-handle.is-col::after { top: 0; bottom: 0; left: calc(50% - 1px); width: 2px; }
  #t3s-lane-grid .t3s-lane-handle.is-row::after { left: 0; right: 0; top: calc(50% - 1px); height: 2px; }
  #t3s-lane-grid .t3s-lane-handle:hover::after, #t3s-lane-grid .t3s-lane-handle:active::after { opacity: 0.7; }
  #t3s-lane-grid .t3s-lane-outline { position: fixed; border-radius: 10px; border: 1px solid color-mix(in srgb, var(--app-theme-accent) 45%, transparent); background: color-mix(in srgb, var(--app-theme-canvas) 55%, transparent); }
  html.t3s-flash main[data-slot="sidebar-inset"] { box-shadow: inset 0 0 0 2px var(--app-theme-accent) !important; }
  /* the close button gets its own spot at the left of the lane's top bar */
  html[data-t3-lane] header { padding-left: 46px !important; }
  html[data-t3-has-lanes] main[data-slot="sidebar-inset"] header { padding-left: 46px !important; }
  #t3s-lane-close, #t3s-main-close {
    position: fixed; top: 8px; left: 8px; z-index: 2147483000; width: 30px; height: 30px; display: grid; place-items: center;
    border: 1px solid var(--border); border-radius: 8px; background: color-mix(in srgb, var(--app-theme-canvas, #111) 70%, transparent);
    color: var(--foreground); cursor: pointer;
    -webkit-app-region: no-drag; /* it sits over T3's top bar, a window-drag area that would swallow the click */
  }
  #t3s-main-close { left: calc(var(--t3-main-x, 0px) + 8px); }
  #t3s-lane-close:hover, #t3s-main-close:hover { background: color-mix(in srgb, var(--app-theme-error, #f87171) 22%, transparent); border-color: color-mix(in srgb, var(--app-theme-error, #f87171) 50%, transparent); }
  #t3s-working { margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--app-theme-sidebar-border, var(--border)); }
  #t3s-working .t3s-working-head { height: 32px; display: flex; align-items: center; padding: 0 var(--sidebar-row-content-inset, 8px); font-size: 14px; font-weight: 500; color: var(--sidebar-foreground, var(--foreground)); }
  #t3s-working [role="button"] { cursor: pointer; }
  #t3s-working .t3s-working-project { flex: none; max-width: 92px; margin-left: 8px; font-size: 12px; color: var(--muted-foreground); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .t3s-panel .t3s-drift { display: flex; align-items: center; gap: 16px; margin-top: 14px; font-size: 13px; color: var(--muted-foreground); }
  .t3s-panel .t3s-drift > span { width: 70px; }
  .t3s-panel .t3s-drift label { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; color: var(--foreground); }
  .t3s-panel .t3s-drift input { accent-color: var(--app-theme-accent); margin: 0; }
  .t3s-panel .t3s-speed { grid-template-columns: 70px minmax(0, 1fr) 92px; margin-top: 8px; max-width: 520px; }
  .t3s-panel .t3s-speed output { font-variant-numeric: tabular-nums; color: var(--foreground); }
`;

function start() {
  const w = window as any;
  if (typeof w.__t3scenes?.destroy === "function") w.__t3scenes.destroy(); // a re-inject swaps the running copy in place, no reload
  else if (w.__t3scenes) return; // a copy from before destroy() existed; the next page load replaces it

  const cleanup: Array<() => void> = [];
  const on = (t: EventTarget, type: string, fn: any, opts?: any) => { t.addEventListener(type, fn, opts); cleanup.push(() => t.removeEventListener(type, fn, opts)); };
  const root = document.documentElement;
  // a lane: one of the chats beside the main one, drawn see-through over the window's scene
  const IS_LANE = location.search.includes("t3lane");
  root.toggleAttribute("data-t3-lane", IS_LANE);
  if (hasExtra("dictation")) cleanup.push(startDictation());
  const [compactCleanup, compactToggle] = startCompact(IS_LANE);
  cleanup.push(compactCleanup);
  const [privacyCleanup, ensurePrivacy, privacy] = startPrivacy(IS_LANE);
  cleanup.push(privacyCleanup);
  const [syncCleanup, ensureSync] = IS_LANE ? [() => {}, () => {}] : startSync(compactToggle);
  cleanup.push(syncCleanup);
  // Recent (recent.ts) lists every chat by your last message, with its status: it takes the
  // place of the Working group, which listed only the running ones
  const [recentCleanup, ensureRecent] = startRecent(IS_LANE, projectHue);
  cleanup.push(recentCleanup);
  // what each account has left, in words, under the model picker (usage.ts)
  if (hasExtra("usage")) cleanup.push(startUsage());
  cleanup.push(startHealth(IS_LANE));

  const style = document.createElement("style");
  style.id = "t3-scene-style";
  // T3 keeps a browser preview the agent drives (no preview panel open) painting under the page
  // at the top-left corner, z-index -1, so it keeps rendering. T3's solid background hides it;
  // the see-through scene showed it through the chat. Near-zero opacity hides it and keeps it live.
  style.textContent = CSS + RING_CSS + `[data-preview-viewport][style*="z-index: -1"] { opacity: 0.004 !important; }`;
  document.head.append(style);

  const canvas = document.createElement("canvas");
  canvas.id = "t3-scene";
  document.body.prepend(canvas);
  const g = canvas.getContext("2d")!;

  let saved = load();
  let scene: Scene | null = null, state: any = null, cw = 0, ch = 0, t0 = 0, alive = true;
  const listeners = new Set<() => void>();

  const size = () => {
    if (IS_LANE) return; // a lane shows the window's scene through itself and never bakes its own
    cw = Math.max(1, root.clientWidth);
    ch = Math.max(1, root.clientHeight);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; state = null; }
    if (scene && !state) { state = scene.reset(cw, ch); t0 = performance.now(); kick(); } // a rebuilt scene fills in again
  };
  const glass = () => {
    root.toggleAttribute("data-t3-smooth", saved.smooth);
    root.toggleAttribute("data-t3-scene-glass", !!scene && !saved.smooth && root.style.getPropertyValue("--glass-opacity").trim() === "100%");
  };
  const pick = (name: string | null) => {
    scene = byName(name);
    state = null; t0 = performance.now();
    root.toggleAttribute("data-t3-scene", !!scene);
    // a theme's skin follows its scene, in the window and in every lane, and goes when the scene does
    const worn = THEMES.find((t) => t.scene === scene?.name);
    if (worn) root.dataset.t3Theme = worn.name; else delete root.dataset.t3Theme;
    glass();
    g.clearRect(0, 0, canvas.width, canvas.height);
    saved = { ...saved, scene: scene?.name ?? null }; save(saved);
    size();
    filterNow(performance.now()); kick();
    listeners.forEach((fn) => fn());
  };
  const strength = (pct: number) => {
    canvas.style.opacity = String(pct / 100);
    saved = { ...saved, strength: pct }; save(saved);
  };

  // Each project wears its own colour: the accent family turns to the project's hue, and the
  // scene is built from that accent, so selected rows, bubbles and the scene agree.
  const tintStyle = document.createElement("style");
  tintStyle.id = "t3-scene-tint";
  document.head.append(tintStyle);
  let tintFor = "";
  // every pane (the window and each lane) colours its top bar with its own project, so a glance
  // across the lanes says which project each chat belongs to
  let bandFor = "";
  const band = (project: string) => {
    const hue = saved.projectBand ? projectHue(project) : null;
    const key = String(hue);
    if (key === bandFor) return;
    bandFor = key;
    if (hue === null) { root.removeAttribute("data-t3-band"); root.style.removeProperty("--t3-band"); return; }
    root.style.setProperty("--t3-band", `oklch(0.66 0.14 ${hue.toFixed(1)})`);
    root.setAttribute("data-t3-band", "");
  };
  const tint = (force = false, later = false) => {
    const project = document.querySelector('header button[aria-label^="New thread in "]')?.getAttribute("aria-label")?.slice("New thread in ".length) ?? "";
    band(project);
    const on = saved.projectTint && !saved.look && !saved.driftApp; // a look or the whole-app drift owns the accent
    const key = `${on}|${project}|${root.style.getPropertyValue("--app-theme-accent")}`;
    if (key === tintFor && !force) return;
    tintFor = key;
    const hue = on ? projectHue(project) : null;
    tintStyle.textContent = hue === null ? "" : tintRules(hue);
    root.toggleAttribute("data-t3-tint", hue !== null);
    if (later) rethemeSoon(); else retheme();
  };

  // A colour look rewrites T3's whole theme around one canvas and one accent (see looks.ts).
  // CSS applies at once; the scene and thumbnails rebuild once a drag settles, not per tick.
  const lookStyle = document.createElement("style");
  lookStyle.id = "t3-scene-look";
  document.head.append(lookStyle);
  const history: Array<Look | null> = [];
  const colourSync = new Set<() => void>();
  let rethemeTimer = 0;
  const rethemeSoon = () => { clearTimeout(rethemeTimer); rethemeTimer = window.setTimeout(() => retheme(), 260); };
  // One drift clock for the scene filter and the whole-app turn, and for every pane: the window
  // and each lane read the hue off wall-clock time from a shared starting point (localStorage),
  // so all of them show the same colour at once. The window picks a fresh start each launch.
  // A speed change or Smooth re-anchors it, so the colour carries on from where it is.
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CLOCK_KEY = "t3drift";
  type Clock = { seed: number; epoch: number; held?: number };
  const readClock = (): Clock | null => {
    try { const c = JSON.parse(localStorage.getItem(CLOCK_KEY) || "null"); return c && Number.isFinite(c.seed) && Number.isFinite(c.epoch) ? c : null; } catch { return null; }
  };
  const writeClock = (c: Clock) => { clock = c; try { localStorage.setItem(CLOCK_KEY, JSON.stringify(c)); } catch {} };
  // a reload (a Kani switch, a re-inject) keeps the clock; only a fresh launch picks a new start
  const relaunch = !IS_LANE && !sessionStorage.getItem("t3drift-run");
  let clock: Clock = (relaunch ? null : readClock()) ?? { seed: Math.random() * 360, epoch: Date.now() };
  if (!IS_LANE) {
    sessionStorage.setItem("t3drift-run", "1");
    writeClock(saved.smooth ? { ...clock, held: clock.held ?? clock.seed } : clock);
  }
  // whether the T3 window (not this page) has focus: the main process says, so clicking into a
  // lane doesn't count as leaving T3
  let windowFocused: boolean | null = null;
  const away = () => saved.pauseAway && !(windowFocused ?? document.hasFocus());
  let paused = document.hidden || away();
  const turnMs = () => Math.max(TURN_FAST, saved.turnSec) * 1000;
  const wallDeg = () => (((clock.seed + ((Date.now() - clock.epoch) / turnMs()) * 360) % 360) + 360) % 360;
  const driftDeg = (_now?: number) => (clock.held ?? wallDeg());
  const reanchor = () => writeClock({ seed: driftDeg(), epoch: Date.now(), ...(saved.smooth ? { held: driftDeg() } : {}) });
  const moving = () => !paused && !saved.smooth;
  const appDrifting = () => saved.driftApp && !still;
  const effectiveLook = (): Look | null => saved.look ?? (saved.driftApp ? baseLook() : null);

  // The whole app turns by rewriting one number that every look colour adds to its hue. Each
  // step restyles all of T3 (about 60 ms on a long chat, measured 2026-10-31), so a step comes
  // at most once a second, and never within 0.8 s of typing, clicking or scrolling.
  const driftStyle = document.createElement("style");
  driftStyle.id = "t3-scene-drift";
  document.head.append(driftStyle);
  let lastInput = 0, appStepAt = 0, appDeg = -1;
  for (const type of ["keydown", "pointerdown", "wheel"]) on(window, type, () => { lastInput = performance.now(); }, { capture: true, passive: true });
  const appStepMs = () => Math.max(1000, turnMs() / 72);
  const setAppDeg = (deg: number) => {
    if (deg === appDeg) return;
    appDeg = deg;
    driftStyle.textContent = `html[data-t3-look] { --t3-drift: ${deg}; }`;
  };
  const stepApp = (now: number) => {
    if (!appDrifting() || !root.hasAttribute("data-t3-look") || now < appStepAt || now - lastInput < 800) return;
    appStepAt = now + appStepMs();
    setAppDeg(Math.round(driftDeg(now)));
  };

  // T3's built-in default theme sets none of the --app-theme-* colours a look rewrites. A look
  // then stands on Grid Night's palette (as T3 itself writes it) and turns on T3's own theme
  // mapping for as long as it is on; picking a real T3 theme hands the colours back to T3.
  const GRID_NIGHT: Record<string, string> = {
    canvas: "0.203611 0.030367 247.648", chrome: "0.203611 0.030367 247.648", toolbar: "0.203611 0.030367 247.648",
    "toolbar-foreground": "0.94991 0.023686 183.738", "toolbar-border": "0.343611 0.038835 183.188", "toolbar-control": "0.293611 0.027767 183.188",
    "toolbar-control-foreground": "0.94991 0.023686 183.738", "toolbar-control-hover": "0.343611 0.034175 183.188",
    surface: "0.218611 0.021359 183.188", "surface-raised": "0.253611 0.021359 183.188", "surface-overlay": "0.278611 0.021359 183.188",
    text: "0.94991 0.023686 183.738", "text-muted": "0.625729 0.0212 211.259", border: "0.363611 0.033981 183.188", input: "0.413611 0.038835 183.188",
    focus: "0.850549 0.097088 183.188", accent: "0.850549 0.097088 183.188", "accent-foreground": "0.222003 0.03479 328.979",
    secondary: "0.303611 0.048544 183.188", "secondary-foreground": "0.95 0.024272 183.188", muted: "0.263611 0.033981 183.188",
    "muted-foreground": "0.640722 0.028346 184.454", placeholder: "0.633717 0.021972 182.965", "secondary-label": "0.625729 0.0212 211.259",
    "icon-muted": "0.625729 0.0212 211.259", error: "0.655108 0.221148 23.473", "error-foreground": "0.702184 0.189226 22.228",
    "error-surface": "0.265948 0.034968 342.439", warning: "0.772406 0.172798 65.367", "warning-foreground": "0.829017 0.171221 81.038",
    "warning-surface": "0.297304 0.025739 91.085", update: "0.850549 0.097088 183.188", "update-foreground": "0.95 0.024272 183.188",
    "update-surface": "0.343611 0.053398 183.188", "accent-surface": "0.333611 0.053398 183.188", "accent-surface-foreground": "0.95 0.024272 183.188",
    "message-surface": "0.363611 0.058253 183.188", "message-foreground": "0.95 0.024272 183.188", "message-action": "0.849866 0.087254 233.299",
    "message-action-foreground": "0.222003 0.03479 328.979", "message-action-hover": "0.91 0.052327 233.188", "code-background": "0.238611 0.017087 183.188",
    "code-foreground": "0.94991 0.023686 183.738", "search-match-background": "0.423172 0.075221 183.342", "search-match-foreground": "0.990339 0.008411 325.64",
    "search-match-active-background": "0.603808 0.096934 183.26", "search-match-active-foreground": "0.222003 0.03479 328.979",
    sidebar: "0.248611 0.029903 183.188", "sidebar-foreground": "0.95 0.024272 183.188", "sidebar-muted-foreground": "0.655663 0.025995 185.001",
    "sidebar-control-surface": "0.303611 0.032039 183.188", "sidebar-row-hover": "0.283611 0.043689 183.188", "sidebar-row-active": "0.323611 0.053398 183.188",
    "sidebar-row-selected": "0.343611 0.058253 183.188", "sidebar-border": "0.373611 0.038835 183.188", "terminal-background": "0.203611 0.030367 247.648",
    "terminal-foreground": "0.94991 0.023686 183.738", "terminal-cursor": "0.850549 0.097088 183.188", "terminal-selection-background": "0.383611 0.053398 183.188",
    "terminal-scrollbar": "0.423611 0.021359 183.188", "terminal-scrollbar-hover": "0.503611 0.021359 183.188",
  };
  const fallbackBase = (() => {
    const st = document.createElement("div").style;
    for (const [k, v] of Object.entries(GRID_NIGHT)) st.setProperty(`--app-theme-${k}`, `oklch(${v})`);
    return st;
  })();
  const OWN_THEME = "t3s-look";
  const t3Themed = () => !!root.style.getPropertyValue("--app-theme-canvas").trim();
  const baseStyle = () => (t3Themed() ? root.style : fallbackBase);

  let lookKey = "";
  const refreshLook = (force = false) => {
    const look = effectiveLook();
    const rules = look ? lookRules(look, baseStyle(), appDrifting()) : "";
    // on T3's default theme, switch its theme mapping on while a look is on (and only then)
    const mine = root.dataset.themeId === OWN_THEME;
    if (rules && !t3Themed() && !root.dataset.themeId) root.dataset.themeId = OWN_THEME;
    else if (!rules && mine) delete root.dataset.themeId;
    if (rules === lookKey && !force) return;
    lookKey = rules;
    // the look and its drift position land in the same restyle
    if (rules && appDrifting()) setAppDeg(Math.round(driftDeg(performance.now())));
    else { appDeg = -1; driftStyle.textContent = ""; }
    lookStyle.textContent = rules;
    root.toggleAttribute("data-t3-look", !!rules);
    kick();
  };
  const sameLook = (a: Look | null, b: Look | null) => !a || !b ? a === b
    : ["canvasHue", "accentHue", "vibrance", "canvasL", "accentL"].every((k) => Math.abs((a as any)[k] - (b as any)[k]) < 1e-3);
  const applyLook = (look: Look | null, record = true) => {
    if (record && !sameLook(look, saved.look)) { history.push(saved.look); if (history.length > 12) history.shift(); }
    saved = { ...saved, look, ...(look ? { projectTint: false } : {}) }; save(saved);
    refreshLook();
    tint(true, true);
    colourSync.forEach((fn) => fn());
  };
  // T3's own theme read back into look terms: where a slider starts, and what the whole-app
  // drift turns when no look is picked
  function baseLook(): Look | null {
    const base = lookBase(baseStyle());
    if (!base) return null;
    const [Lc, , Hc] = base.canvas, [La, Ca, Ha] = base.accent;
    return { canvasHue: Hc, accentHue: Ha, vibrance: Math.min(1, Math.max(0, (Ca - 0.03) / 0.17)), canvasL: Lc, accentL: La };
  }
  const currentLook = (): Look | null => saved.look ?? baseLook();

  // A theme switch in T3 rewrites the variables on <html>; the scene rebuilds in the new colours.
  const retheme = () => {
    glass();
    const look = effectiveLook();
    if (!readTheme(look ? { canvas: lookCanvas(look), accent: lookAccent(look) } : undefined)) return;
    root.toggleAttribute("data-t3-scene-light", COLOR.light);
    state = null; size();
    listeners.forEach((fn) => fn());
  };
  readTheme(); root.toggleAttribute("data-t3-scene-light", COLOR.light);
  const themeWatch = new MutationObserver(() => { refreshLook(); tint(); retheme(); colourSync.forEach((fn) => fn()); });
  themeWatch.observe(root, { attributes: true, attributeFilter: ["style", "class", "data-theme-id"] });
  cleanup.push(() => themeWatch.disconnect());

  // the scene turns with its own drift, or in step with the whole app when that drifts
  let hueAt = 0;
  const filterNow = (now: number) => {
    const base = COLOR.light ? "invert(1) hue-rotate(180deg)" : "";
    const turn = (saved.drift || saved.driftApp) && !still ? ` hue-rotate(${driftDeg(now).toFixed(1)}deg)` : "";
    canvas.style.filter = (base + turn).trim();
  };

  // Frames are asked for only when something will move: the scene at 30 fps, or the next
  // whole-app step. A new or rebuilt scene draws for 2.5 s so it fills in, then a paused or
  // Smooth scene holds that frame and T3 gets no frames from us at all.
  const DEVELOP_MS = 2500;
  const CALM = 0.4; // Calm: the scene moves at 40% of its own pace
  let raf = 0, timer = 0;
  const drawing = (now: number) => !!scene && !IS_LANE && (moving() || now - t0 < DEVELOP_MS); // a lane shows the window's scene
  const appStepping = () => moving() && appDrifting() && root.hasAttribute("data-t3-look");
  const frame = (now: number) => {
    raf = 0;
    if (!alive) return;
    if (moving()) stepApp(now);
    if (drawing(now)) {
      if (moving() && now >= hueAt) { filterNow(now); hueAt = now + HUE_STEP_MS; }
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      try { scene!.frame(g, cw, ch, (now - t0) * (saved.calm ? CALM : 1), COLOR, state); } catch { /* a scene error never takes T3 down */ }
    }
    kick();
  };
  function kick() {
    if (!alive || timer || raf || document.hidden) return;
    const now = performance.now();
    const wait = drawing(now) ? 1000 / FPS - 4 : appStepping() ? Math.max(250, appStepAt - now) : -1;
    if (wait < 0) return;
    timer = window.setTimeout(() => { timer = 0; raf = requestAnimationFrame(frame); }, wait);
  }
  // Paused while T3 is hidden, or (unless he turns it off) while another window has focus:
  // gaming or a Unity build gets the GPU, and the colour picks up where it stopped.
  const setPaused = (p: boolean) => {
    if (p === paused) return;
    paused = p;
    // the window holds the drift while T3 is away and carries on from there; lanes follow by storage event
    if (!IS_LANE && !saved.smooth) {
      if (p) writeClock({ ...clock, held: driftDeg() });
      else writeClock({ seed: driftDeg(), epoch: Date.now() });
    }
    if (!p) { hueAt = 0; kick(); }
  };
  const checkPause = () => setPaused(document.hidden || away());
  w.__t3windowFocus = (focused: boolean) => { windowFocused = focused; checkPause(); };
  on(window, "blur", checkPause);
  on(window, "focus", checkPause);
  on(document, "visibilitychange", () => { checkPause(); kick(); });

  // a theme is a scene, its colour look and its strength in one pick; it moves (Smooth off, no
  // drift or tour, which would repaint its fixed palette)
  const wearTheme = (name: string) => {
    const th = THEMES.find((t) => t.name === name);
    if (!th) return pick(name);
    saved = { ...saved, smooth: false, drift: false, driftApp: false, tour: false, projectTint: false }; save(saved);
    writeClock({ seed: 0, epoch: Date.now() });
    root.dataset.t3Theme = th.name;
    pick(th.scene);
    strength(th.strength);
    applyLook(th.look);
    glass(); hueAt = 0; kick();
    colourSync.forEach((fn) => fn());
  };
  const step = (d: number) => {
    const i = SCENES.findIndex((s) => s === scene);
    pick(SCENES[(i + d + SCENES.length) % SCENES.length].name);
  };

  // ── the scene browser: one panel, shown as a pop-out or inside T3's surface pane ──
  const panels = new Set<{ el: HTMLElement; renderChips: () => void; stop: () => void }>();
  const buildPanel = (onClose: () => void) => {
    const panel = document.createElement("div");
    panel.className = "t3s-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Look");
    panel.innerHTML = `
      <header><h2>Look</h2><button class="t3s-text-btn" data-smooth title="Hold the scene still, stop the colour drift, and drop the blur">Smooth</button><button class="t3s-icon-btn" data-close aria-label="Close">${CLOSE_ICON}</button></header>
      <footer><span>Strength</span><input type="range" min="20" max="100" step="5" value="${saved.strength}" aria-label="Scene strength"><output>${saved.strength}%</output></footer>
      <section class="t3s-colour">
        <div class="t3s-colour-head"><h3>Colour</h3>
          <button class="t3s-text-btn" data-undo>Undo</button>
          <button class="t3s-text-btn" data-theme-reset title="Back to T3's own theme colours">T3 theme</button>
        </div>
        <div class="t3s-sliders">
          <span>Hue</span><input type="range" data-k="hue" min="0" max="359" step="1" aria-label="Hue">
          <span>Depth</span><input type="range" data-k="depth" min="0" max="100" step="1" aria-label="Depth" title="How deep the canvas sits">
        </div>
        <div class="t3s-drift">
          <span>Drift</span>
          <label><input type="checkbox" data-pref="drift" ${saved.drift ? "checked" : ""}>Scene</label>
          <label><input type="checkbox" data-pref="driftApp" ${saved.driftApp ? "checked" : ""}>Whole app</label>
        </div>
        <div class="t3s-sliders t3s-speed">
          <span>Speed</span><input type="range" data-speed min="0" max="100" step="1" value="${turnToSpeed(saved.turnSec).toFixed(0)}" aria-label="Drift speed"><output data-speed-out>${turnLabel(saved.turnSec)}</output>
        </div>
        <p class="t3s-note" data-note hidden>Colour looks work on T3's dark themes. Pick one in Settings → Appearance.</p>
      </section>
      <div class="t3s-scenes-head"><h3>Scene</h3><button class="t3s-text-btn" data-reseed title="The same scene from a fresh start">New seed</button><button class="t3s-text-btn" data-off>Off</button></div>
      <div class="t3s-drift t3s-tour">
        <span>Motion</span>
        <label title="The scene moves at 40% of its pace"><input type="checkbox" data-pref="calm" ${saved.calm ? "checked" : ""}>Calm</label>
        <label title="Every ${TOUR_MIN} minutes, fade to a fresh seed or the next Phase or Automata scene, in new colours"><input type="checkbox" data-pref="tour" ${saved.tour ? "checked" : ""}>Tour</label>
      </div>
      ${GROUPS.map((grp) => `<h4>${grp.title}</h4><div class="t3s-grid">${grp.names.map((n) =>
        `<button class="t3s-thumb" data-scene="${n}"><span class="t3s-frame"><canvas width="${TW}" height="${TH}"></canvas></span><span class="t3s-name">${n}</span></button>`).join("")}</div>`).join("")}
      <div class="t3s-checks">
        <label><input type="checkbox" data-pref="projectBand" ${saved.projectBand ? "checked" : ""}>Each chat's top bar shows its project's colour</label>
        <label><input type="checkbox" data-pref="projectTint" ${saved.projectTint ? "checked" : ""}>Each project wears its own colour</label>
        <label><input type="checkbox" data-pref="pauseAway" ${saved.pauseAway ? "checked" : ""}>Pause when T3 isn't in front</label>
      </div>`;
    const thumbs = [...panel.querySelectorAll<HTMLButtonElement>(".t3s-thumb")];
    (panel.querySelector("[data-reseed]") as HTMLButtonElement).addEventListener("click", () => tourStep(false));
    const offBtn = panel.querySelector("[data-off]") as HTMLButtonElement;
    let open = true;

    const mark = () => {
      thumbs.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.scene === scene?.name)));
      offBtn.setAttribute("aria-pressed", String(!scene));
    };
    // Thumbnails paint one per frame, and only once they scroll into view, the way The Grid's
    // picker does: 41 of them up front would hold the browser for seconds.
    const queue: HTMLButtonElement[] = [], onScreen = new Set<HTMLButtonElement>();
    let pumping = false;
    const pump = () => {
      const b = open ? queue.shift() : undefined;
      if (!b) { pumping = false; return; }
      const c = b.querySelector("canvas")!, sc = byName(b.dataset.scene!);
      c.style.background = COLOR.bg;
      if (sc) paintThumb(c, sc);
      requestAnimationFrame(pump);
    };
    const enqueue = (b: HTMLButtonElement) => {
      if (!queue.includes(b)) queue.push(b);
      if (!pumping) { pumping = true; requestAnimationFrame(pump); }
    };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const b = e.target as HTMLButtonElement;
        if (e.isIntersecting) { onScreen.add(b); enqueue(b); } else onScreen.delete(b);
      }
    }, { rootMargin: "240px" });
    thumbs.forEach((b) => io.observe(b));
    // a new theme repaints what's on screen; the rest repaint when scrolled to
    const develop = () => onScreen.forEach(enqueue);
    const refresh = () => { if (open) { mark(); develop(); } };

    // the card under the pointer runs live; the rest hold their developed frame
    let liveRaf = 0;
    thumbs.forEach((b) => {
      const c = b.querySelector("canvas")!, cg = c.getContext("2d")!, sc = byName(b.dataset.scene!)!;
      b.addEventListener("mouseenter", () => {
        cancelAnimationFrame(liveRaf);
        let st: any;
        try { st = sc.reset(TW, TH); } catch { return; }
        const begin = performance.now();
        const tick = (now: number) => {
          liveRaf = requestAnimationFrame(tick);
          cg.setTransform(1, 0, 0, 1, 0, 0); cg.globalAlpha = 1; cg.globalCompositeOperation = "source-over";
          cg.clearRect(0, 0, TW, TH);
          try { sc.frame(cg, TW, TH, 400 + now - begin, COLOR, st); } catch { cancelAnimationFrame(liveRaf); }
        };
        liveRaf = requestAnimationFrame(tick);
      });
      b.addEventListener("mouseleave", () => { cancelAnimationFrame(liveRaf); paintThumb(c, sc); });
      b.addEventListener("click", () => (THEMES.some((t) => t.scene === sc.name) ? wearTheme(sc.name) : pick(sc.name)));
    });
    offBtn.addEventListener("click", () => pick(null));
    panel.querySelector("[data-close]")!.addEventListener("click", onClose);
    const range = panel.querySelector("footer input") as HTMLInputElement, out = panel.querySelector("footer output")!;
    range.addEventListener("input", () => {
      strength(+range.value);
      panels.forEach((p) => { if (p.el !== panel) { (p.el.querySelector("footer input") as HTMLInputElement).value = range.value; p.el.querySelector("footer output")!.textContent = `${range.value}%`; } });
      out.textContent = `${range.value}%`;
    });
    panel.querySelectorAll<HTMLInputElement>("[data-pref]").forEach((cb) => cb.addEventListener("change", () => {
      const pref = cb.dataset.pref as "drift" | "driftApp" | "projectTint" | "projectBand" | "pauseAway" | "calm" | "tour";
      if (pref === "projectBand") { saved = { ...saved, projectBand: cb.checked }; save(saved); bandFor = "?"; tint(true, true); return; }
      if (pref === "calm" || pref === "tour") { saved = { ...saved, [pref]: cb.checked }; save(saved); return; }
      if (pref === "pauseAway") { saved = { ...saved, pauseAway: cb.checked }; save(saved); checkPause(); colourSync.forEach((fn) => fn()); return; }
      saved = { ...saved, [pref]: cb.checked }; save(saved);
      // the project colour and the whole-app drift both own the accent, so one turns the other off
      if (pref === "projectTint" && cb.checked) { saved = { ...saved, driftApp: false }; save(saved); if (saved.look) applyLook(null); }
      if (pref === "driftApp" && cb.checked) { saved = { ...saved, projectTint: false }; save(saved); }
      if (pref !== "drift") { refreshLook(true); tint(true, true); }
      hueAt = 0;
      colourSync.forEach((fn) => fn());
    }));

    // ── colour: one hue strip and one depth slider; undo and T3 theme ──
    const undoBtn = panel.querySelector("[data-undo]") as HTMLButtonElement;
    const smoothBtn = panel.querySelector("[data-smooth]") as HTMLButtonElement;
    smoothBtn.addEventListener("click", () => {
      // the drift clock holds while Smooth is on, so the colour resumes from the same place
      const deg = driftDeg();
      saved = { ...saved, smooth: !saved.smooth }; save(saved);
      writeClock(saved.smooth ? { ...clock, held: deg } : { seed: deg, epoch: Date.now() });
      hueAt = 0;
      glass(); kick();
      colourSync.forEach((fn) => fn());
    });
    const note = panel.querySelector("[data-note]") as HTMLElement;
    const sliders = [...panel.querySelectorAll<HTMLInputElement>(".t3s-sliders input[data-k]")];
    const speed = panel.querySelector("[data-speed]") as HTMLInputElement, speedOut = panel.querySelector("[data-speed-out]") as HTMLElement;
    speed.addEventListener("input", () => {
      reanchor(); // at the old speed, so the colour carries on from where it is
      saved = { ...saved, turnSec: speedToTurn(+speed.value) }; save(saved);
      writeClock({ ...clock, seed: driftDeg(), epoch: Date.now() });
      refreshLook(); hueAt = 0; appStepAt = 0; kick();
      colourSync.forEach((fn) => fn());
    });
    const [deepL, shallowL] = [RANGE.canvasL[0], RANGE.canvasL[1]];
    const depthOf = (l: Look) => Math.round(100 * (shallowL - l.canvasL) / (shallowL - deepL));
    const renderChips = () => {};
    const syncColour = () => {
      if (!open) return;
      const usable = !!lookBase(baseStyle());
      note.hidden = usable;
      panel.querySelectorAll<HTMLButtonElement>(".t3s-colour button, .t3s-colour input").forEach((el) => { if (!el.matches("[data-undo]")) el.disabled = !usable; });
      undoBtn.disabled = !usable || history.length === 0;
      panel.querySelectorAll<HTMLInputElement>("[data-pref]").forEach((cb) => { cb.checked = !!saved[cb.dataset.pref as "drift" | "driftApp" | "projectTint" | "projectBand" | "pauseAway" | "calm" | "tour"]; });
      smoothBtn.setAttribute("aria-pressed", String(saved.smooth));
      if (document.activeElement !== speed) speed.value = turnToSpeed(saved.turnSec).toFixed(0);
      speedOut.textContent = turnLabel(saved.turnSec);
      // the scene drift and its speed work on any theme; only the whole-app turn needs a dark one
      speed.disabled = false;
      (panel.querySelector('[data-pref="drift"]') as HTMLInputElement).disabled = false;
      (panel.querySelector("[data-theme-reset]") as HTMLButtonElement).setAttribute("aria-pressed", String(!saved.look && !saved.projectTint && !saved.driftApp));
      const cur = currentLook();
      if (!cur) return;
      const val: Record<string, number> = { hue: Math.round(cur.canvasHue), depth: depthOf(cur) };
      sliders.forEach((s) => { if (document.activeElement !== s) s.value = String(val[s.dataset.k!]); });
    };
    undoBtn.addEventListener("click", () => { if (history.length) applyLook(history.pop()!, false); });
    // all the way back: no look, no per-project accent, no whole-app turn
    panel.querySelector("[data-theme-reset]")!.addEventListener("click", () => { saved = { ...saved, projectTint: false, driftApp: false }; save(saved); applyLook(null); refreshLook(true); });
    // a hue paints canvas and accent in that one hue and holds it still: drift, the whole-app
    // turn and the per-project colour all let go of it. One undo step per drag, not per tick.
    sliders.forEach((s) => {
      let dragging = false;
      s.addEventListener("input", () => {
        const cur = currentLook();
        if (!cur) return;
        const { name: _n, ...l } = cur, v = +s.value;
        if (s.dataset.k === "hue") {
          l.canvasHue = v; l.accentHue = v; l.vibrance = Math.max(l.vibrance, 0.45);
          if (saved.drift || saved.driftApp || saved.projectTint) { saved = { ...saved, drift: false, driftApp: false, projectTint: false }; save(saved); hueAt = 0; }
        } else l.canvasL = shallowL - (v / 100) * (shallowL - deepL);
        applyLook(l, !dragging);
        dragging = true;
      });
      s.addEventListener("change", () => { dragging = false; });
    });

    const entry = { el: panel, renderChips, stop: () => { open = false; io.disconnect(); cancelAnimationFrame(liveRaf); listeners.delete(refresh); colourSync.delete(syncColour); panels.delete(entry); } };
    listeners.add(refresh);
    colourSync.add(syncColour);
    panels.add(entry);
    refresh();
    syncColour();
    return entry;
  };

  let modal: { wrap: HTMLElement; stop: () => void } | null = null;
  // lanes sit above this page, so they step aside while the pop-out is open
  // lanes make room for it: the grid ends where the dock begins
  let dockW = 0;
  const dockWidth = () => Math.max(300, Math.min(440, innerWidth - 32));
  let lanesAside = (_aside: boolean) => {};
  const closeBrowser = () => { if (!modal) return; modal.stop(); modal.wrap.remove(); modal = null; dockW = 0; lanesAside(false); };
  const openBrowser = () => {
    if (modal) { closeBrowser(); return; }
    dockW = dockWidth() + 16;
    lanesAside(true);
    const wrap = document.createElement("div");
    wrap.id = "t3s-modal";
    wrap.style.setProperty("--t3s-dock", `${dockWidth()}px`);
    const p = buildPanel(closeBrowser);
    wrap.append(p.el);
    document.body.append(wrap);
    modal = { wrap, stop: p.stop };
  };

  // Inside the surface pane the panel takes the place of T3's "Open a surface" list; when T3
  // swaps the pane for another surface, the list goes away and the panel follows it.
  let surface: { layer: HTMLElement; list: HTMLElement; stop: () => void } | null = null;
  const closeSurface = () => {
    if (!surface) return;
    surface.stop(); surface.layer.remove();
    surface.list.style.display = "";
    surface = null;
  };
  const openSurface = (list: HTMLElement) => {
    closeSurface();
    const layer = document.createElement("div");
    layer.id = "t3s-surface";
    const p = buildPanel(closeSurface);
    layer.append(p.el);
    list.style.display = "none";
    list.after(layer);
    surface = { layer, list, stop: p.stop };
  };
  const ensureSurfaceItem = () => {
    if (surface && !document.body.contains(surface.list)) closeSurface();
    const heading = [...document.querySelectorAll("h3")].find((h) => h.textContent?.trim() === "Open a surface");
    const device = heading && [...heading.parentElement!.querySelectorAll("button")].find((b) => b.textContent?.trim().startsWith("Device"));
    const wrapper = device?.parentElement, list = wrapper?.parentElement;
    if (!device || !wrapper || !list || list.querySelector("#t3s-surface-item")) return;
    const item = document.createElement("div");
    item.className = wrapper.className;
    item.innerHTML = `<button type="button" id="t3s-surface-item" class="${device.className}"><span class="relative inline-flex shrink-0">${INFINITY_ICON.replace('class="lucide"', 'class="lucide size-4"')}</span><span class="min-w-0 flex-1 truncate">Look</span></button>`;
    item.firstElementChild!.addEventListener("click", () => {
      // the scroll box that holds the whole empty state, heading and list
      const box = heading!.closest(".overflow-y-auto") as HTMLElement | null;
      if (box) openSurface(box);
    });
    // Pages served by the Kani helper (built by the media chat) open in T3's own Browser surface:
    // the media library on this project, and Kani, the record of every change made to T3.
    const pageItem = (id: string, icon: string, label: string, url: () => string) => {
      const el = document.createElement("div");
      el.className = wrapper.className;
      el.innerHTML = `<button type="button" id="${id}" class="${device.className}"><span class="relative inline-flex shrink-0">${icon}</span><span class="min-w-0 flex-1 truncate">${label}</span></button>`;
      el.firstElementChild!.addEventListener("click", () => openInBrowser(list, url()));
      return el;
    };
    const currentProject = () => document.querySelector('header button[aria-label^="New thread in "]')?.getAttribute("aria-label")?.slice("New thread in ".length) ?? "";
    wrapper.after(item, ...(hasExtra("library") ? [
      pageItem("t3s-library-item", IMAGES_ICON, "Library", () => `${LIBRARY_URL}/#p=${encodeURIComponent(currentProject())}`),
      pageItem("t3s-kani-item", HISTORY_ICON, "Kani", () => `${LIBRARY_URL}/kani`),
    ] : []));
  };

  const openInBrowser = async (list: Element, url: string) => {
    try { w.__t3scenesHost?.("ensure-library"); } catch { /* injector too old to start the server */ }
    [...list.querySelectorAll("button")].find((b) => b.textContent?.trim().startsWith("Browser"))?.click();
    const input = await waitFor(() => document.querySelector<HTMLInputElement>('input[aria-label="Search or enter URL"]'), 4000);
    if (!input) return;
    await waitFor(async () => { try { await fetch(LIBRARY_URL + "/", { mode: "no-cors" }); return true; } catch { return null; } }, 3000);
    // The address bar is a controlled React input: set it the way typing would, then submit its form.
    input.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, url);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => requestAnimationFrame(r));
    input.form?.requestSubmit();
  };

  // ── Working: every running chat, pinned above the first project folder ─────
  // Display only. T3's own working shelf is off in the folder sidebar, so the group mirrors the
  // rows whose status is Working, Goal, Approval or Input; each row's aria-label reads
  // "title, status, project". A click goes to the original row, so T3 still does the routing.
  // Chats inside a closed folder aren't in the page and can't be listed.
  const ACTIVE = new Set(["Working", "Goal", "Approval", "Input"]);
  let workingKey = "";
  // In a lane, T3's SnapShot refuses this window (it only trusts windows it opened itself) and
  // says so in a toast on every launch; that one error is dropped here.
  const dropLaneToasts = () => {
    if (!IS_LANE) return;
    // T3's toasts have been dialogs with data-position and sonner list items; match either
    document.querySelectorAll<HTMLElement>('[data-sonner-toast], [role="dialog"][data-position], [role="status"], [role="alert"]').forEach((el) => {
      if (el.style.display !== "none" && el.textContent?.includes("SnapShotIpcUnauthorizedSenderError")) el.style.display = "none";
    });
  };
  // Recency by what he actually did. T3 sorts by updatedAt, but un-settling and the chat sync
  // (2026-10-31) bumped that on chats untouched for months, so each folder is re-ordered here by
  // his last message, newest first (CSS order: display only, T3's data is untouched), and an idle
  // row says when that was instead of "Waiting". Real statuses (Working, Failed...) stay.
  const ago = (t: number) => {
    const m = (Date.now() - t) / 60000;
    if (m < 1) return "now";
    if (m < 60) return `${Math.floor(m)}m`;
    if (m < 24 * 60) return `${Math.floor(m / 60)}h`;
    if (m < 7 * 24 * 60) return `${Math.floor(m / 1440)}d`;
    return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };
  const lastActive = (li: Element): number => {
    const key = Object.keys(li).find((k) => k.startsWith("__reactFiber"));
    let f = key ? (li as any)[key] : null;
    for (let i = 0; i < 6 && f; i++, f = f.return) {
      const t = f.memoizedProps?.thread;
      if (t?.createdAt) return Date.parse(t.latestUserMessageAt ?? t.createdAt);
    }
    return NaN;
  };
  const showAges = () => {
    const lists = new Map<HTMLElement, Array<{ li: HTMLElement; at: number }>>();
    document.querySelectorAll<HTMLElement>("[data-thread-item]").forEach((li) => {
      if (li.closest("#t3s-working")) return;
      const at = lastActive(li);
      const list = li.parentElement!;
      if (!lists.has(list)) lists.set(list, []);
      lists.get(list)!.push({ li, at });
      const label = li.querySelector<HTMLElement>(".ml-auto > span:first-child");
      if (!label) return;
      const age = label.textContent?.trim() === "Waiting" && Number.isFinite(at) ? ago(at) : "";
      if (age) { if (label.dataset.t3Age !== age) label.dataset.t3Age = age; }
      else if (label.dataset.t3Age !== undefined) delete label.dataset.t3Age;
    });
    // folder headings and chats are siblings in one list: each heading keeps its place, and only
    // the run of chats under it is re-ordered
    const at = new Map<Element, number>();
    lists.forEach((rows) => rows.forEach((r) => at.set(r.li, r.at)));
    lists.forEach((_rows, list) => {
      list.dataset.t3Sorted = "";
      let n = 0, run: HTMLElement[] = [];
      const flush = () => {
        run.sort((a, b) => (at.get(b) || 0) - (at.get(a) || 0)).forEach((li) => { const o = String(n++); if (li.style.order !== o) li.style.order = o; });
        run = [];
      };
      for (const child of [...list.children] as HTMLElement[]) {
        if (child.hasAttribute("data-thread-item")) { run.push(child); continue; }
        flush();
        const o = String(n++);
        if (child.style.order !== o) child.style.order = o;
      }
      flush();
    });
  };
  const ageTimer = window.setInterval(() => { if (!document.hidden && !IS_LANE) showAges(); }, 60_000);
  cleanup.push(() => { clearInterval(ageTimer); document.querySelectorAll<HTMLElement>("[data-t3-age]").forEach((el) => delete el.dataset.t3Age); });
  const ensureWorking = () => {
    const firstFolder = document.querySelector('li[class*="project-folder"]');
    const folderList = firstFolder?.parentElement;
    let group = document.getElementById("t3s-working");
    if (!folderList) { group?.remove(); workingKey = ""; return; }
    const rows: Array<{ key: string; row: HTMLElement; status: string; project: string }> = [];
    document.querySelectorAll<HTMLElement>("[data-thread-item] > [role=treeitem]").forEach((row) => {
      const parts = (row.getAttribute("aria-label") ?? "").split(", ");
      if (parts.length < 3) return;
      const status = parts[parts.length - 2], project = parts[parts.length - 1];
      if (ACTIVE.has(status)) rows.push({ key: row.parentElement!.dataset.threadItem!, row, status, project });
    });
    const key = rows.map((r) => `${r.key}|${r.status}|${r.row.textContent}`).join("|");
    // nothing changed and the group (or its absence) is still in place
    if (key === workingKey && (rows.length === 0 ? !group : group?.nextElementSibling === folderList)) return;
    workingKey = key;
    if (rows.length === 0) { group?.remove(); return; }
    if (!group) {
      group = document.createElement("div");
      group.id = "t3s-working";
    }
    if (group.nextElementSibling !== folderList) folderList.before(group);
    const head = `<div class="t3s-working-head">Working</div>`;
    group.innerHTML = head;
    for (const r of rows) {
      const copy = r.row.cloneNode(true) as HTMLElement;
      for (const a of ["id", "data-sidebar-row", "data-sidebar-parent", "data-base-ui-tooltip-trigger", "data-slot", "aria-current", "aria-level", "aria-posinset", "aria-setsize", "data-testid"]) copy.removeAttribute(a);
      copy.setAttribute("role", "button");
      copy.tabIndex = 0;
      copy.querySelectorAll("button, [id]").forEach((el) => (el.tagName === "BUTTON" ? el.remove() : el.removeAttribute("id")));
      // the project goes where the status was: every row here is running, so "Working" is
      // the group's name; Approval and Input keep their label, since those wait on him
      const where = document.createElement("span");
      where.className = "t3s-working-project";
      where.textContent = r.project;
      const statusSlot = copy.querySelector(".ml-auto");
      if (statusSlot && (r.status === "Working" || r.status === "Goal")) statusSlot.replaceChildren(where);
      else copy.querySelector('[aria-hidden="true"][dir]')?.after(where);
      const open = () => (document.querySelector(`[data-thread-item="${window.CSS.escape(r.key)}"] > [role=treeitem]`) as HTMLElement | null)?.click();
      copy.addEventListener("click", open);
      copy.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
      group.append(copy);
    }
  };

  // ── menus and lanes, with main-patch.js in T3's main process ─────────────────
  // T3's context menus arrive here as plain items (window.__t3menu.show) and are drawn in the
  // Look style; the chosen id goes back and T3 runs its own action. A right-click on a chat also
  // offers "Open in new lane", and a chat dragged out of the sidebar into the chat area opens in
  // a lane: another chat beside this one, inside this window (main-patch.js places it).
  const T3_MARK = "⁣t3:";
  const tellMain = (kind: string, arg = "") => console.debug(`${T3_MARK}${kind}:${arg}`);
  const laneHash = (key: string) => {
    const cut = key.indexOf(":");
    return `#/${key.slice(0, cut)}/${encodeURIComponent(key.slice(cut + 1))}`;
  };
  const openLane = (key: string) => tellMain("lane", laneHash(key));

  // The window lays its chat area out as a grid, the way the Claude app does: two or three panes
  // side by side, four as two by two, five or six as two rows of three. Its own chat is the first
  // pane; lanes fill the rest. The gaps between panes are handles: drag to resize, double-click
  // to even out. While a handle is dragged the lanes step aside and outlines stand in, so the drag
  // stays smooth; on release they come back at the new size. Sizes are remembered per layout.
  const GAP = 6, MIN_W = 260, MIN_H = 200;
  let laneCount = 0;
  let overlayHid = false; // lanes stepped aside for a dialog of the window's (overlayCheck)
  let overlaySig = "";    // which lanes, so a menu that moves hides and shows the right ones
  // top: how many panes the first row holds, once he has placed a pane by hand (unset: the even grid)
  // main: the full-height layout's window-chat width, as a share of the chat area
  // mode: a layout picked from the grid button's menu ("cols": all side by side, "rows": two even rows); unset is auto
  type Split = { row: number; cols: Record<string, number[]>; top?: number; main?: number; mode?: "cols" | "rows" };
  let split: Split = { row: 0.5, cols: {} };
  try { split = { ...split, ...JSON.parse(localStorage.getItem("t3lanes") || "{}") }; } catch {}
  const saveSplit = () => { try { localStorage.setItem("t3lanes", JSON.stringify(split)); } catch {} };
  // A row layout he made by hand is kept only while it stays even: rows at most one pane apart, and
  // at most four side by side in one row. Anything lopsided (four over one after a close or a new
  // lane from the menu) goes back to the even grid.
  const customRows = (panes: number): number[] | null => {
    if (split.top === undefined) return null;
    const rows = split.top >= panes ? [panes] : [split.top, panes - split.top];
    return (rows.length === 1 ? panes <= 4 : Math.abs(rows[0] - rows[1]) <= 1) ? rows : null;
  };
  const shape = (panes: number) => split.mode === "cols" ? [panes]
    : split.mode === "rows" ? (panes < 2 ? [panes] : [Math.ceil(panes / 2), Math.floor(panes / 2)])
    : customRows(panes) ?? (panes <= 3 ? [panes] : [Math.ceil(panes / 2), Math.floor(panes / 2)]);
  const fullHeightMain = (panes: number) => !split.mode && !customRows(panes) && panes >= 5 && panes % 2 === 1;
  const fracs = (r: number, n: number) => {
    const f = split.cols[`${r}:${n}`];
    return f && f.length === n ? f : Array(n).fill(1 / n);
  };
  type Cell = { x: number; y: number; width: number; height: number; row: number; col: number };
  const areaLeft = () => {
    const inset = document.querySelector('main[data-slot="sidebar-inset"]') as HTMLElement | null;
    return inset ? Math.round(inset.getBoundingClientRect().left) : null;
  };
  const cellsFor = (left: number, n = laneCount + 1): Cell[] => {
    const rows = shape(n), W = innerWidth - dockW - left, H = innerHeight;
    // five or seven panes: the window's chat runs full height on the left and the lanes fill an
    // even grid beside it, so every column lines up (4 over 3 left a ragged bottom row)
    if (fullHeightMain(n)) {
      const cols = (n - 1) / 2, even = Math.round((W - GAP * cols) / (cols + 1));
      const mainW = split.main === undefined ? even : Math.round(Math.min(W - GAP * cols - MIN_W * cols, Math.max(MIN_W, split.main * W)));
      const top = Math.round((H - GAP) * split.row), hs = [top, H - GAP - top];
      const out: Cell[] = [{ x: left, y: 0, width: mainW, height: H, row: 0, col: 0 }];
      const usable = W - mainW - GAP * cols, f = fracs(-1, cols);
      for (let r = 0; r < 2; r++) {
        let x = left + mainW + GAP;
        for (let i = 0; i < cols; i++) {
          const width = i === cols - 1 ? left + W - x : Math.round(usable * f[i]);
          out.push({ x, y: r ? top + GAP : 0, width, height: hs[r], row: r, col: i + 1 });
          x += width + GAP;
        }
      }
      return out;
    }
    const top = rows.length === 1 ? H : Math.round((H - GAP) * split.row);
    const heights = rows.length === 1 ? [H] : [top, H - GAP - top];
    const cells: Cell[] = [];
    let y = 0;
    rows.forEach((inRow, r) => {
      const f = fracs(r, inRow), usable = W - GAP * (inRow - 1);
      let x = left;
      for (let i = 0; i < inRow; i++) {
        const width = i === inRow - 1 ? left + W - x : Math.round(usable * f[i]);
        cells.push({ x, y, width, height: heights[r], row: r, col: i });
        x += width + GAP;
      }
      y += heights[r] + GAP;
    });
    return cells;
  };
  const laneStyle = document.createElement("style");
  laneStyle.id = "t3-scene-lanes";
  document.head.append(laneStyle);
  const grid = document.createElement("div");
  grid.id = "t3s-lane-grid";
  let dragging = false;
  const drawGrid = (cells: Cell[], outlines: boolean) => {
    const main = cells[0];
    // T3 pins the chat's header buttons (thread details, terminal, right panel) to the window's
    // right edge, which is under the top-right lane: they follow the window chat's own right edge
    const controlsRight = Math.max(0, Math.round(innerWidth - (main.x + main.width) + 6));
    laneStyle.textContent = `main[data-slot="sidebar-inset"] { flex: 0 0 ${main.width}px !important; max-width: ${main.width}px !important; height: ${main.height}px !important; max-height: ${main.height}px !important; min-height: 0 !important; align-self: flex-start; overflow: hidden; }
      [class*="right-[var(--workspace-controls-right)]"].fixed { right: ${controlsRight}px !important; }`;
    grid.replaceChildren();
    if (!grid.isConnected) document.body.append(grid);
    const left = main.x, W = innerWidth - dockW - left, H = innerHeight, n = cells.length;
    // Nov 14: every line between panes drags, and so does every point where two lines meet
    // (both at once). Handles live in the gaps, the only part of the window not under a lane.
    const colMove = (row: number, col: number) => (ev: PointerEvent) => {
      // row -1: the full-height layout's lane columns, shared by both rows
      const lanes = row === -1, inRow = lanes ? (n - 1) / 2 : shape(n)[row];
      const x0 = lanes ? cells[1].x : left, span = lanes ? left + W - cells[1].x : W;
      const f = [...fracs(row, inRow)], usable = span - GAP * (inRow - 1);
      const before = f.slice(0, col).reduce((t, v) => t + v, 0), pair = f[col] + f[col + 1];
      const at = (ev.clientX - x0 - col * GAP) / usable - before, min = MIN_W / usable;
      f[col] = Math.min(pair - min, Math.max(min, at));
      f[col + 1] = pair - f[col];
      split.cols[`${row}:${inRow}`] = f;
    };
    const rowMove = (ev: PointerEvent) => { split.row = Math.min(1 - MIN_H / H, Math.max(MIN_H / H, ev.clientY / H)); };
    const mainMove = (ev: PointerEvent) => { split.main = (ev.clientX - left) / W; };
    const colReset = (row: number) => () => { delete split.cols[`${row}:${row === -1 ? (n - 1) / 2 : shape(n)[row]}`]; };
    const rowReset = () => { split.row = 0.5; };
    const both = (...fns: Array<(ev: PointerEvent) => void>) => (ev: PointerEvent) => fns.forEach((fn) => fn(ev));
    const corners: Array<[number, number, (ev: PointerEvent) => void, () => void]> = [];
    if (fullHeightMain(n)) {
      const top = cells[1].height, cols = (n - 1) / 2, rx = cells[1].x;
      grid.append(handle("col", main.x + main.width, 0, GAP, H, mainMove, () => { delete split.main; }));
      grid.append(handle("row", rx, top, left + W - rx, GAP, rowMove, rowReset));
      corners.push([main.x + main.width, top, both(mainMove, rowMove), () => { delete split.main; rowReset(); }]);
      for (let i = 0; i < cols - 1; i++) {
        const c = cells[1 + i], x = c.x + c.width;
        grid.append(handle("col", x, 0, GAP, H, colMove(-1, i), colReset(-1)));
        corners.push([x, top, both(colMove(-1, i), rowMove), () => { colReset(-1)(); rowReset(); }]);
      }
    } else {
      const rows = shape(n), top = cells[0].height;
      cells.forEach((c, i) => {
        const next = cells[i + 1];
        if (!next || next.row !== c.row) return;
        const x = c.x + c.width;
        grid.append(handle("col", x, c.y, GAP, c.height, colMove(c.row, c.col), colReset(c.row)));
        if (rows.length === 2) corners.push([x, top, both(colMove(c.row, c.col), rowMove), () => { colReset(c.row)(); rowReset(); }]);
      });
      if (rows.length === 2) grid.append(handle("row", left, top, W, GAP, rowMove, rowReset));
    }
    // a corner is a plus along the two gaps that meet there, so it is easy to land on
    const ARM = 26;
    for (const [x, y, move, reset] of corners) {
      grid.append(handle("corner", x, y - ARM, GAP, ARM * 2 + GAP, move, reset));
      grid.append(handle("corner", x - ARM, y, ARM * 2 + GAP, GAP, move, reset));
    }
    if (outlines) cells.slice(1).forEach((c) => {
      const o = document.createElement("div");
      o.className = "t3s-lane-outline";
      Object.assign(o.style, { left: `${c.x}px`, top: `${c.y}px`, width: `${c.width}px`, height: `${c.height}px` });
      grid.append(o);
    });
  };
  const handle = (kind: "col" | "row" | "corner", x: number, y: number, width: number, height: number, onMove: (ev: PointerEvent) => void, onReset: () => void) => {
    const h = document.createElement("div");
    h.className = `t3s-lane-handle is-${kind}`;
    Object.assign(h.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px` });
    h.addEventListener("dblclick", () => { onReset(); saveSplit(); layoutLanes(); });
    h.addEventListener("pointerdown", (e) => {
      const left = areaLeft();
      if (e.button !== 0 || left === null) return;
      e.preventDefault();
      dragging = true;
      // Nov 10: lanes stay drawn and follow the divider live. One layout per frame at most.
      let frame = 0, last: PointerEvent | null = null;
      const live = () => { frame = 0; if (last) onMove(last); const cells = cellsFor(left); drawGrid(cells, false); sendLayout(cells); };
      // the handle is redrawn on every move, so the drag listens on the window
      const move = (ev: PointerEvent) => { last = ev; if (!frame) frame = requestAnimationFrame(live); };
      const up = () => {
        window.removeEventListener("pointermove", move, true);
        window.removeEventListener("pointerup", up, true);
        if (frame) cancelAnimationFrame(frame);
        if (last) onMove(last);
        dragging = false;
        document.documentElement.style.cursor = "";
        saveSplit();
        layoutLanes();
      };
      document.documentElement.style.cursor = getComputedStyle(h).cursor;
      window.addEventListener("pointermove", move, true);
      window.addEventListener("pointerup", up, true);
    });
    return h;
  };
  // The window's own chat gets an × too when lanes are open, as every pane has in the Claude app.
  // Closing it hands its spot to the first lane: the window opens that chat, and that lane goes.
  const mainClose = document.createElement("button");
  mainClose.id = "t3s-main-close";
  mainClose.type = "button";
  mainClose.title = "Close this pane (Ctrl+Shift+W)";
  mainClose.setAttribute("aria-label", "Close this pane");
  mainClose.innerHTML = CLOSE_ICON;
  mainClose.addEventListener("click", () => tellMain("close-main"));
  const placeMainClose = (cell: Cell | null) => {
    root.toggleAttribute("data-t3-has-lanes", !!cell);
    if (!cell) { mainClose.remove(); return; }
    mainClose.style.setProperty("--t3-main-x", `${cell.x}px`);
    if (!mainClose.isConnected) document.body.append(mainClose);
  };
  if (!IS_LANE) on(window, "keydown", (e: KeyboardEvent) => {
    if (laneCount > 0 && e.ctrlKey && e.shiftKey && e.code === "KeyW") { e.preventDefault(); e.stopPropagation(); tellMain("close-main"); }
  }, true);
  cleanup.push(() => placeMainClose(null));
  const layoutLanes = () => {
    if (IS_LANE || dragging || overlayHid) return;
    const left = areaLeft();
    if (left === null && laneCount > 0) { window.setTimeout(layoutLanes, 200); return; } // T3 hasn't drawn its chat area yet
    if (left === null || laneCount === 0) { laneStyle.textContent = ""; grid.remove(); placeMainClose(null); return; }
    const cells = cellsFor(left);
    drawGrid(cells, false);
    placeMainClose(cells[0]);
    sendLayout(cells);
  };
  // the lane in the top-right corner sits under the window's buttons
  function sendLayout(cells: Cell[]) {
    tellMain("layout", JSON.stringify(cells.slice(1).map((c) => ({ x: c.x, y: c.y, width: c.width, height: c.height, corner: c.y === 0 && c.x + c.width >= innerWidth - 1 }))));
  }
  lanesAside = () => { if (!IS_LANE && laneCount > 0) layoutLanes(); };
  // Lanes are drawn above this page, so a dialog, menu or popover of the window's that reaches
  // into a lane would be cut off under it: the lanes step aside until it closes.
  const overlayCheck = () => {
    if (IS_LANE || (laneCount === 0 && !overlayHid)) return;
    const left = areaLeft();
    const cells = left === null ? [] : cellsFor(left).slice(1);
    // Nov 11: only the lanes it reaches step aside. A link's menu near a pane's edge used to blank every lane.
    const boxes = laneCount === 0 ? [] : [...document.querySelectorAll<HTMLElement>('[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"]')]
      .filter((el) => !el.closest("#t3s-modal"))
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0);
    const hits = cells.map((c, i) => (boxes.some((r) => r.left < c.x + c.width && r.right > c.x && r.top < c.y + c.height && r.bottom > c.y) ? i : -1)).filter((i) => i >= 0);
    const sig = hits.join(",");
    if (hits.length && sig !== overlaySig) { overlayHid = true; overlaySig = sig; tellMain("hide", JSON.stringify(hits)); }
    else if (!hits.length && overlayHid) { overlayHid = false; overlaySig = ""; layoutLanes(); }
  };
  // A pane placed by the drag goes into the row the drag showed; a pane that closes leaves its row.
  // Either way the panes then share the width evenly (count below).
  let placing: ((n: number) => void) | null = null;
  const paneClosed = (closed: number, n: number) => {
    const panes = n + 2, rows = shape(panes), pane = closed + 1;
    if (split.top === undefined || fullHeightMain(panes)) return;
    void rows; void pane;
    split.top = undefined; // Nov 14: the panes left go back to the even grid (three: three columns)
  };
  w.__t3lanes = { count(n: number, closed = -1) {
    if (n === 0) split.top = undefined;
    else if (placing && n === laneCount + 1) placing(n);
    else if (closed >= 0 && n === laneCount - 1) paneClosed(closed, n);
    placing = null;
    // a pane opening or closing evens every row out again: widths dragged by hand last until then
    if (n !== laneCount) split.cols = {};
    laneCount = n;
    saveSplit();
    layoutLanes();
  }, cells: () => { const l = areaLeft(); return l === null ? [] : cellsFor(l); }, nextCells: () => { const l = areaLeft(); return l === null ? [] : cellsFor(l, laneCount + 2); } };
  if (!IS_LANE) tellMain("hello"); // after a reload this page has forgotten its lanes; the main process says how many
  on(window, "resize", layoutLanes);
  const laneWatch = new ResizeObserver(() => layoutLanes());
  let sidebarEl: Element | null = null;
  // T3 may draw its sidebar after this runs, and redraw it later: watch whichever one is there
  const watchSidebar = () => {
    const el = IS_LANE ? null : document.querySelector('[data-slot="sidebar"]');
    if (el === sidebarEl) return;
    if (sidebarEl) laneWatch.unobserve(sidebarEl);
    sidebarEl = el;
    if (el) laneWatch.observe(el);
  };
  watchSidebar();
  cleanup.push(() => { laneWatch.disconnect(); laneStyle.remove(); grid.remove(); delete w.__t3lanes; });

  // lane mode: just the chat, with a close button where the sidebar toggle would be
  if (IS_LANE) {
    const close = document.createElement("button");
    close.id = "t3s-lane-close";
    close.type = "button";
    close.title = "Close lane";
    close.setAttribute("aria-label", "Close lane");
    close.innerHTML = CLOSE_ICON;
    close.title = "Close lane (Ctrl+Shift+W)";
    close.addEventListener("click", () => tellMain("close"));
    document.body.append(close);
    on(window, "keydown", (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === "KeyW") { e.preventDefault(); e.stopPropagation(); tellMain("close"); }
    }, true);
    // an empty lane: press this page's own New thread button (T3 may still be starting up)
    w.__t3laneNew = async (project: string) => {
      const label = project ? `New thread in ${project}` : "New thread";
      for (let i = 0; i < 80; i++) {
        const b = [...document.querySelectorAll<HTMLButtonElement>("button[aria-label]")].find((x) => x.getAttribute("aria-label") === label);
        if (b) { b.click(); return true; }
        await new Promise((r) => setTimeout(r, 150));
      }
      return false;
    };
    // asked to open a chat that's already here: this lane lights up instead
    w.__t3laneFlash = () => { root.classList.remove("t3s-flash"); void root.offsetWidth; root.classList.add("t3s-flash"); window.setTimeout(() => root.classList.remove("t3s-flash"), 700); };
    cleanup.push(() => close.remove());
  }
  // One chat, one pane: when the window's own pane opens a chat a lane already shows (a click in
  // the sidebar), that lane closes. The window's page says which chat it shows in localStorage.
  const MAIN_HASH = "t3mainhash";
  const dedupe = () => {
    if (IS_LANE) { try { if (Date.now() - Number(localStorage.getItem("t3swapping") || 0) > 4000 && localStorage.getItem(MAIN_HASH) === location.hash && /^#\/[^/]+\/[^/]+/.test(location.hash)) tellMain("close"); } catch {} }
    else try { localStorage.setItem(MAIN_HASH, location.hash); } catch {}
  };
  on(window, "hashchange", dedupe);
  on(window, "storage", (e: StorageEvent) => { if (IS_LANE && e.key === MAIN_HASH) dedupe(); });
  dedupe();
  // Right-click a pane's top bar: its project's colour, and Move left / Move right, which swap
  // this pane's chat with the next pane's (main-patch.js "swap"), so lanes can be put in any order.
  const HUES = [25, 55, 85, 130, 165, 200, 235, 265, 300, 335];
  let paneMenu: HTMLElement | null = null;
  const closePaneMenu = () => { paneMenu?.remove(); paneMenu = null; };
  on(document, "contextmenu", (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    if (!t.closest?.("header[data-chat-header]") || t.closest("a, input, textarea")) return;
    e.preventDefault(); e.stopPropagation();
    closePaneMenu();
    const project = document.querySelector('header button[aria-label^="New thread in "]')?.getAttribute("aria-label")?.slice("New thread in ".length) ?? "";
    const m = document.createElement("div");
    m.id = "t3s-ctl-pop";
    m.setAttribute("role", "menu");
    const row = (label: string, fn: () => void) => { const b = document.createElement("button"); b.type = "button"; b.textContent = label; b.addEventListener("click", (ev) => { ev.stopPropagation(); closePaneMenu(); fn(); }); m.append(b); };
    if (project) {
      const cur = projectHue(project), key = project.trim().toLowerCase();
      const head = document.createElement("div");
      head.textContent = `Colour for ${project}`;
      Object.assign(head.style, { padding: "4px 8px 6px", fontSize: "12px", color: "var(--muted-foreground)" });
      const sw = document.createElement("div");
      Object.assign(sw.style, { display: "grid", gridTemplateColumns: "repeat(5, 22px)", gap: "6px", padding: "0 8px 8px" });
      const setHue = (h: number | null) => {
        const o = hueOverrides();
        if (h === null) delete o[key]; else o[key] = h;
        try { localStorage.setItem(HUE_KEY, JSON.stringify(o)); } catch {}
        bandFor = ""; tint(true);
      };
      HUES.forEach((h) => {
        const b = document.createElement("button");
        b.type = "button"; b.title = `Hue ${h}`;
        Object.assign(b.style, { width: "22px", height: "22px", padding: "0", borderRadius: "6px", background: `oklch(0.66 0.14 ${h})`, border: cur !== null && Math.abs(cur - h) < 1 ? "2px solid var(--foreground)" : "1px solid transparent" });
        b.addEventListener("click", (ev) => { ev.stopPropagation(); closePaneMenu(); setHue(h); });
        sw.append(b);
      });
      m.append(head, sw);
      if (typeof hueOverrides()[key] === "number") row("Default colour", () => setHue(null));
    }
    if (root.hasAttribute("data-t3-has-lanes") || IS_LANE) {
      row("Move left", () => tellMain("swap", "-1"));
      row("Move right", () => tellMain("swap", "1"));
    }
    Object.assign(m.style, { left: `${Math.min(e.clientX, innerWidth - 200)}px`, top: `${e.clientY + 4}px` });
    document.body.append(m);
    paneMenu = m;
  }, true);
  on(document, "pointerdown", (e: Event) => { if (paneMenu && !paneMenu.contains(e.target as Node)) closePaneMenu(); }, true);
  on(window, "keydown", (e: KeyboardEvent) => { if (e.key === "Escape" && paneMenu) closePaneMenu(); }, true);
  on(window, "storage", (e: StorageEvent) => { if (e.key === HUE_KEY) { bandFor = ""; tint(true); } });
  const ICONS: Record<string, string> = {
    pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
    check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    sparkles: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/>',
    dot: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
    filter: '<path d="M10 20a1 1 0 0 0 .55.9l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .52-1.34L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.74 1.67l7.22 7.99A2 2 0 0 1 10 14z"/>',
    timer: '<path d="M10 2h4M12 14l3-3"/><circle cx="12" cy="14" r="8"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    archive: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
    trash: '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    lane: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/>',
    open: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  };
  const iconFor = (label: string) => {
    const l = label.toLowerCase();
    const key = /^(un)?pin/.test(l) ? "pin" : /^(un)?settle/.test(l) ? "check" : /snooze/.test(l) ? "clock" : /^rename/.test(l) ? "pencil"
      : /^regenerate/.test(l) ? "sparkles" : /^mark/.test(l) ? "dot" : /^filter/.test(l) ? "filter" : /auto-settle/.test(l) ? "timer"
      : /^copy/.test(l) ? "copy" : /settings/.test(l) ? "settings" : /^(un)?archive/.test(l) ? "archive" : /^(delete|remove)/.test(l) ? "trash"
      : /lane/.test(l) ? "lane" : /^(open|view)/.test(l) ? "open" : /^(reveal|show in)/.test(l) ? "folder" : "";
    return key ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[key]}</svg>` : "<span></span>";
  };
  type MenuItem = { id?: string; label?: string; enabled?: boolean; checked?: boolean; destructive?: boolean; separator?: boolean; children?: MenuItem[] };
  let pointer = { x: 0, y: 0 }, menuRow: string | null = null, menuFolder = "", menuLink = "";
  on(window, "contextmenu", (e: MouseEvent) => {
    tellMain("menu"); // T3 aims its menu at the window; whichever pane was right-clicked draws it
    pointer = { x: e.clientX, y: e.clientY };
    menuRow = (e.target as Element).closest?.("[data-thread-item]")?.getAttribute("data-thread-item") ?? null;
    const folder = menuRow ? null : (e.target as Element).closest?.('li[data-testid="sidebar-project-folder"]');
    menuFolder = folder ? privacy.folderTitle(folder) : "";
    // a web link or a file path in a chat: the menu also offers Kani and Atrium
    const a = (e.target as Element).closest?.("a[href]");
    const href = a && !a.closest('[data-slot="sidebar"]') ? a.getAttribute("href")! : "";
    menuLink = /^https?:\/\//i.test(href) || /^[a-z]:[\\/]/i.test(href) ? href : "";
  }, true);
  let closeMenu: ((id: string | null) => void) | null = null, openWith = "";
  const showMenu = (items: MenuItem[], x: number | null, y: number | null) => new Promise<string | null>((resolve) => {
    closeMenu?.(null);
    const row = menuRow, folder = menuFolder, link = menuLink;
    menuRow = null; menuFolder = ""; menuLink = "";
    if (link) {
      const file = /^[a-z]:[\\/]/i.test(link) ? link.replace(/:\d+(:\d+)?$/, "") : ""; // T3 adds :line to some paths
      const extra: MenuItem[] = [];
      if (!file || /\.(html?|xhtml|pdf|svg)$/i.test(file)) extra.push({ id: "__kani__", label: "Open in Kani" });
      if (file && hasExtra("atrium")) extra.push({ id: "__atrium__", label: "Show in Atrium" });
      if (extra.length) items = [...extra, { separator: true }, ...items];
      openWith = file || link;
    }
    const shareItem = (hidden: boolean): MenuItem => ({ id: "__private__", label: hidden ? "Show while sharing" : "Hide while sharing" });
    const shareMode: MenuItem = { id: "__sharing__", label: privacy.sharing() ? "End sharing mode (Ctrl+Alt+H)" : "Start sharing mode (Ctrl+Alt+H)" };
    if (row) items = [...items, { separator: true }, shareItem(privacy.threadHidden(row)), shareMode];
    else if (folder) items = [...items, { separator: true }, shareItem(privacy.projectHidden(folder)), shareMode];
    if (IS_LANE) items = [...items, { separator: true }, { id: "__close__", label: "Close lane (Ctrl+Shift+W)" }];
    if (row) { items = [{ id: "__lane__", label: "Open in new lane" }, { separator: true }, ...items]; tellMain("warm"); } // a lane is ready by the time he picks it
    const layer = document.createElement("div");
    layer.id = "t3s-menu";
    document.body.append(layer);
    const open: HTMLElement[] = [];
    const onBlur = () => done(null);
    const onKey = (e: KeyboardEvent) => {
      const list = [...(open[open.length - 1]?.querySelectorAll<HTMLButtonElement>(".t3s-menu-item:not(:disabled)") ?? [])];
      const i = list.indexOf(document.activeElement as HTMLButtonElement);
      if (e.key === "Escape") { if (open.length > 1) open.pop()!.remove(); else done(null); }
      else if (e.key === "ArrowDown") list[(i + 1) % list.length]?.focus();
      else if (e.key === "ArrowUp") list[(i - 1 + list.length) % list.length]?.focus();
      else if (e.key === "Enter" || e.key === " ") (document.activeElement as HTMLElement | null)?.click();
      else if (e.key === "ArrowRight") { const b = document.activeElement as HTMLElement | null; if (b?.dataset.sub) b.click(); } // opens a submenu, never runs an item
      else if (e.key === "ArrowLeft" && open.length > 1) open.pop()!.remove();
      else return;
      e.preventDefault(); e.stopPropagation();
    };
    function done(id: string | null) {
      if (closeMenu !== done) return;
      closeMenu = null;
      layer.remove();
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("keydown", onKey, true);
      if (id === "__lane__" && row) { if (laneHash(row) === location.hash) { root.classList.remove("t3s-flash"); void root.offsetWidth; root.classList.add("t3s-flash"); window.setTimeout(() => root.classList.remove("t3s-flash"), 700); } else openLane(row); id = null; } // the chat this pane shows lights up instead of nothing happening
      if (id === "__private__") { if (row) privacy.toggleThread(row); else if (folder) privacy.toggleProject(folder); id = null; }
      if (id === "__sharing__") { privacy.toggle(); id = null; }
      if ((id === "__kani__" || id === "__atrium__") && typeof w.__t3scenesHost === "function") { w.__t3scenesHost(`open-with:${JSON.stringify({ app: id === "__kani__" ? "kani" : "atrium", target: openWith })}`); id = null; }
      if (id === "__close__") { tellMain("close"); id = null; }
      resolve(id);
    }
    closeMenu = done;
    const build = (list: MenuItem[], left: number, top: number, depth: number) => {
      open.splice(depth).forEach((m) => m.remove());
      const m = document.createElement("div");
      m.className = "t3s-menu-list";
      m.setAttribute("role", "menu");
      for (const it of list) {
        if (it.separator) { m.insertAdjacentHTML("beforeend", '<div class="t3s-menu-sep"></div>'); continue; }
        const b = document.createElement("button");
        b.type = "button";
        // T3 marks Delete with an icon Windows menus don't get, so the label decides too
        b.className = "t3s-menu-item" + (it.destructive || /^(delete|remove)/i.test(it.label ?? "") ? " is-danger" : "");
        b.setAttribute("role", "menuitem");
        b.disabled = it.enabled === false;
        if (it.children) b.dataset.sub = "1";
        b.innerHTML = `${iconFor(it.label ?? "")}<span class="t3s-menu-label"></span>${it.checked ? ICON_CHECK : ""}${it.children ? ICON_MORE : ""}`;
        b.querySelector(".t3s-menu-label")!.textContent = it.label ?? "";
        const sub = () => { const r = b.getBoundingClientRect(); build(it.children!, r.right - 4, r.top - 5, depth + 1); };
        b.addEventListener("mouseenter", () => { b.focus({ preventScroll: true }); if (it.children) sub(); else open.splice(depth + 1).forEach((x) => x.remove()); });
        b.addEventListener("click", () => (it.children ? sub() : done(it.id ?? null)));
        m.append(b);
      }
      layer.append(m);
      // keep it on screen: a submenu flips to the left of its parent, a menu moves up
      const r = m.getBoundingClientRect(), parent = open[depth - 1]?.getBoundingClientRect();
      const lx = left + r.width > innerWidth - 8 ? (parent ? parent.left - r.width + 4 : innerWidth - r.width - 8) : left;
      m.style.left = `${Math.max(8, lx)}px`;
      m.style.top = `${Math.max(8, Math.min(top, innerHeight - r.height - 8))}px`;
      open.push(m);
      (m.querySelector(".t3s-menu-item:not(:disabled)") as HTMLElement | null)?.focus({ preventScroll: true });
    };
    layer.addEventListener("mousedown", (e) => { if (e.target === layer) done(null); });
    layer.addEventListener("contextmenu", (e) => { e.preventDefault(); if (e.target === layer) done(null); });
    window.addEventListener("blur", onBlur);
    document.addEventListener("keydown", onKey, true);
    build(items, x ?? pointer.x, y ?? pointer.y, 0);
    overlayCheck();
  });
  w.__t3menu = { show: showMenu };
  // the sidebar's grid button: pick how the panes are laid out, or pull in the Claude app's grid
  w.__t3laneLayout = async (x: number, y: number, mirror: () => void) => {
    const now = split.mode ?? "auto";
    const id = await showMenu([
      { id: "auto", label: "Auto layout", checked: now === "auto" },
      { id: "cols", label: "Side by side", checked: now === "cols" },
      { id: "rows", label: "Two rows", checked: now === "rows" },
      { separator: true },
      { id: "claude", label: "Open my Claude app grid here" },
    ], x, y);
    if (id === "claude") { mirror(); return; }
    if (id !== "auto" && id !== "cols" && id !== "rows") return;
    split = { ...split, mode: id === "auto" ? undefined : id, top: undefined, cols: {}, row: 0.5, main: undefined };
    saveSplit(); layoutLanes();
  };
  cleanup.push(() => { closeMenu?.(null); delete w.__t3menu; });
  // Right-click a New thread button (the pencil at the top, or a project's +): a new chat here or
  // in a new lane, instead of Chromium's Cut/Copy/Paste. Dragging the same button also makes a lane.
  if (!IS_LANE) on(window, "contextmenu", (e: MouseEvent) => {
    const b = (e.target as Element).closest?.('[data-slot="sidebar"] button[aria-label^="New thread"]') as HTMLButtonElement | null;
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const project = b.getAttribute("aria-label")!.replace(/^New thread( in )?/, "");
    tellMain("warm");
    void showMenu([{ id: "here", label: "Open new chat here" }, { id: "lane", label: "New chat in new lane" }], e.clientX, e.clientY).then((id) => {
      if (id === "here") b.click();
      else if (id === "lane") tellMain("lane-new", project);
    });
  }, true);

  // Drag a chat out of the sidebar onto the panes, as in the Claude app. Over the middle of a pane
  // it opens there ("Open here"). Near a pane's left or right edge the pane splits in two and the
  // chat takes that half ("Split view"). Near the bottom of a single row, it takes a new row of
  // its own. The box always shows exactly what the drop will do, around the pointer.
  // main-patch.js draws the box, pill and label above the panes.
  type Drop = { mode: "open" | "split"; pane: number; index: number; at: Cell; side?: "left" | "right" | "below"; ghosts?: Cell[] };
  type Drag = { key: string; title: string; x: number; y: number; started: boolean; cells: Cell[]; next: Cell[]; drop: Drop | null; sent: string; px: number; py: number; frame: number };
  let drag: Drag | null = null;
  // letting go after a drag isn't a click on whatever is under the pointer, even after Esc
  let noClickUntil = 0, releaseAfterEsc = false;
  const hashOf = (key: string) => (key.startsWith("new:") ? "" : laneHash(key));
  const paneAt = (x: number, y: number, cells: Cell[]) => cells.findIndex((c: Cell) => x >= c.x && x < c.x + c.width && y >= c.y && y < c.y + c.height);
  const dropAt = (d: Drag, x: number, y: number): Drop | null => {
    const pane = paneAt(x, y, d.cells);
    if (pane < 0) return null;
    const c = d.cells[pane], panes = laneCount + 1, open: Drop = { mode: "open", pane, index: -1, at: c };
    if (laneCount >= 7) return open;
    const sideBand = Math.min(c.width * 0.25, 180), lowBand = Math.min(c.height * 0.25, 180);
    const nearLeft = x < c.x + sideBand && pane > 0, nearRight = x >= c.x + c.width - sideBand;
    // the even grid with the window's chat at full height has fixed columns: a new pane takes the next spot
    if (fullHeightMain(panes)) {
      const at = d.next[pane];
      return (nearLeft || nearRight) && at ? { mode: "split", pane, index: nearLeft ? pane - 1 : pane, at, ghosts: d.next } : open;
    }
    const low = c.y + c.height - y, side = nearLeft ? x - c.x : c.x + c.width - x;
    // Nov 10: near the bottom of any pane in a single row, the chat goes below and every pane
    // re-flows (2 -> 2 over 1, 3 -> 2 over 2, 4 -> main beside 2x2, ...); the box shows where it lands
    if (shape(panes).length === 1 && low <= lowBand && (!(nearLeft || nearRight) || low / lowBand < side / sideBand)) {
      const ghosts = after(d, panes), at = ghosts[panes];
      if (at) return { mode: "split", pane, index: laneCount, side: "below", at, ghosts };
    }
    const half = Math.floor((c.width - GAP) / 2);
    if (half < MIN_W) return open;
    // the window's chat always comes first, so a lone chat splits to its right from anywhere
    const right = laneCount === 0 || (nearRight && !(nearLeft && x - c.x < c.x + c.width - x));
    if (!right && !nearLeft) return open;
    // Nov 10: the box shows where the chat really lands once every pane has re-flowed, and the
    // other panes show as outlines of where they will be (the half-pane box was not what happened)
    const rows = shape(panes), top = rows.length === 1 ? panes + 1 : c.row === 0 ? rows[0] + 1 : rows[0];
    const ghosts = after(d, top), lands = right ? pane + 1 : pane;
    const at = ghosts[lands] ?? (right ? { ...c, x: c.x + c.width - half, width: half } : { ...c, width: half });
    return right
      ? { mode: "split", pane, index: pane, side: "right", at, ghosts }
      : { mode: "split", pane, index: pane - 1, side: "left", at, ghosts };
  };
  // the panes after a drop that leaves `top` panes in the first row
  const after = (d: Drag, top: number): Cell[] => {
    const keep = split.top;
    split.top = top;
    try { return cellsFor(d.cells[0].x, laneCount + 2); } finally { split.top = keep; }
  };
  // the room for that pane, taken once the lane has really opened
  const placeDrop = (d: Drag, drop: Drop) => {
    const rows = shape(laneCount + 1);
    if (!drop.side) return;
    placing = (n: number) => {
      const panes = n + 1;
      split.mode = undefined; // a pane placed by hand leaves a picked layout
      if (drop.side === "below") { split.top = panes - 1; return; }
      const c = d.cells[drop.pane];
      split.top = rows.length === 1 ? panes : c.row === 0 ? rows[0] + 1 : rows[0];
    };
  };
  const stopDrag = () => {
    const d = drag;
    drag = null;
    root.removeAttribute("data-t3-drop-main");
    root.classList.remove("t3s-dragging");
    if (d?.started) { cancelAnimationFrame(d.frame); tellMain("drag-end"); }
  };
  const dragMove = (x: number, y: number) => {
    const d = drag;
    if (!d) return;
    const moved = Math.hypot(x - d.x, y - d.y);
    if (!d.started) {
      if (moved <= 12) return;
      // a drag, not a click: start a lane loading, stop text selection, and measure the panes once
      // (nothing moves while he drags, so no layout reads on every mouse move)
      d.started = true;
      tellMain("warm"); tellMain("drag-start");
      root.classList.add("t3s-dragging"); window.getSelection()?.removeAllRanges();
      d.cells = w.__t3lanes?.cells() ?? [];
      d.next = w.__t3lanes?.nextCells() ?? [];
    }
    d.px = x; d.py = y;
    if (d.frame) return;
    d.frame = requestAnimationFrame(() => {
      d.frame = 0;
      if (drag !== d) return;
      d.drop = dropAt(d, d.px, d.py);
      const drop = d.drop, label = !drop ? d.title : drop.mode === "split" ? "Open in split view" : "Open here";
      tellMain("drag-chip", `${d.px}:${d.py}:${label}`);
      const sig = drop ? `${drop.mode}:${drop.pane}:${drop.index}` : "";
      if (sig === d.sent) return;
      d.sent = sig;
      root.toggleAttribute("data-t3-drop-main", drop?.mode === "open" && drop.pane === 0);
      tellMain("drag-target", drop ? JSON.stringify({ x: drop.at.x, y: drop.at.y, width: drop.at.width, height: drop.at.height, pill: drop.mode === "split" ? "Split view" : "Open here", blur: drop.mode === "open" ? drop.pane : 0, hash: hashOf(d.key), ghosts: (drop.ghosts ?? []).map((g) => ({ x: g.x, y: g.y, width: g.width, height: g.height })) }) : "null");
    });
  };
  const dragUp = (x: number, y: number) => {
    const d = drag;
    if (!d?.started) {
      drag = null;
      if (releaseAfterEsc) { releaseAfterEsc = false; noClickUntil = Date.now() + 400; }
      return;
    }
    const drop = dropAt(d, x, y);
    if (drop) {
      root.dataset.t3DroppedAt = String(Date.now()); // the click that follows a drop opens nothing
      const fresh = d.key.startsWith("new:"), project = d.key.slice(4);
      if (drop.mode === "split") {
        placeDrop(d, drop);
        tellMain("drag-split", JSON.stringify(fresh ? { project, index: drop.index } : { hash: laneHash(d.key), index: drop.index }));
      } else if (drop.pane === 0) {
        tellMain("drag-end");
        if (fresh) [...document.querySelectorAll<HTMLButtonElement>('[data-slot="sidebar"] button[aria-label^="New thread"]')].find((b) => b.getAttribute("aria-label") === (project ? `New thread in ${project}` : "New thread"))?.click();
        else location.hash = laneHash(d.key);
      } else if (fresh) {
        tellMain("drag-end");
        tellMain("swap-new", `${drop.pane - 1}:${project}`);
      } else tellMain("drag-open", JSON.stringify({ lane: drop.pane - 1, hash: laneHash(d.key) }));
    }
    stopDrag();
    noClickUntil = Date.now() + 400;
  };
  const rowTitle = (row: Element) => {
    const leaf = [...row.querySelectorAll<HTMLElement>("span, div, p")].find((el) => el.children.length === 0 && el.textContent!.trim());
    return leaf?.textContent!.trim() ?? "Chat";
  };
  // a chat, or a New thread button (an empty lane), dragged out of the sidebar
  if (!IS_LANE) {
    on(window, "click", (e: MouseEvent) => { if (Date.now() < noClickUntil) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
    on(window, "pointerdown", (e: PointerEvent) => {
      stopDrag();
      releaseAfterEsc = false;
      if (e.button !== 0) return;
      const target = e.target as Element;
      const row = target.closest?.("[data-thread-item], [data-t3-key]"); // a sidebar row, or a Recent row
      const fresh = target.closest?.('[data-slot="sidebar"] button[aria-label^="New thread"]');
      const key = row ? (row.getAttribute("data-thread-item") ?? row.getAttribute("data-t3-key"))! : fresh ? `new:${fresh.getAttribute("aria-label")!.replace(/^New thread( in )?/, "")}` : null;
      if (key) drag = { key, title: row ? rowTitle(row) : "New thread", x: e.clientX, y: e.clientY, started: false, cells: [], next: [], drop: null, sent: "", px: 0, py: 0, frame: 0 };
    }, true);
    // no button down: he let go outside the window, where this page couldn't see it
    on(window, "pointermove", (e: PointerEvent) => { if (!drag) return; if (e.buttons === 0) stopDrag(); else dragMove(e.clientX, e.clientY); }, true);
    on(window, "pointerup", (e: PointerEvent) => dragUp(e.clientX, e.clientY), true);
    on(window, "pointercancel", stopDrag, true);
    on(window, "keydown", (e: KeyboardEvent) => { if (e.key === "Escape" && drag?.started) { e.preventDefault(); e.stopPropagation(); stopDrag(); releaseAfterEsc = true; } }, true);
    w.__t3dragPointer = (type: string, x: number, y: number) => { if (type === "cancel") stopDrag(); else if (type === "pointerup") dragUp(x, y); else dragMove(x, y); };
    cleanup.push(() => { stopDrag(); delete w.__t3dragPointer; });
  }

  // T3's details card stays shut until the header button asks for it, one chat at a time
  on(window, "click", (e: MouseEvent) => {
    const b = (e.target as Element).closest?.('button[aria-label="Toggle thread details panel"]');
    if (!b) return;
    const shut = !root.hasAttribute("data-t3-details");
    if (document.querySelector('aside[data-thread-details-panel="inline"]')) {
      e.preventDefault(); e.stopPropagation();
      root.toggleAttribute("data-t3-details", shut);
    } else if (b.getAttribute("data-slot") !== "popover-trigger") root.toggleAttribute("data-t3-details", shut); // T3 opens it from this click
  }, true);
  on(window, "hashchange", () => root.removeAttribute("data-t3-details"));

  // ── the button, bottom left beside Settings ─────────────────────────────────
  const ensureButton = () => {
    const settings = document.querySelector("svg.lucide-settings")?.closest("button");
    const li = settings?.closest("li"), row = li?.parentElement;
    if (!settings || !li || !row || row.querySelector("#t3s-button")) return;
    const item = document.createElement("li");
    item.className = li.className;
    item.innerHTML = `<button type="button" id="t3s-button" aria-label="Look" title="Look">${INFINITY_ICON}</button>`;
    const btn = item.firstElementChild as HTMLButtonElement;
    btn.className = settings.className;
    btn.addEventListener("click", openBrowser);
    row.append(item);
  };
  let pending = false;
  const domWatch = new MutationObserver(() => {
    dropLaneToasts(); // at once, before it paints
    overlayCheck();
    if (pending) return;
    pending = true;
    window.setTimeout(() => { pending = false; if (alive) { ensureSurfaceItem(); if (!IS_LANE) { ensureButton(); ensureSync(); ensureRecent(); showAges(); } dropLaneToasts(); watchSidebar(); tint(false, true); ensurePrivacy(); } }, 250); // a lane has no sidebar: it skips the sidebar extras // a streaming reply mutates the page constantly
  });
  // a row switching to Working may only change its text or label in place
  domWatch.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-label"] });
  cleanup.push(() => domWatch.disconnect());

  // Ctrl+Alt+] next scene, Ctrl+Alt+[ previous, Ctrl+Alt+\ off. Esc closes the browser.
  on(window, "keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape" && modal) {
      // a menu or one of T3's dialogs open beside the dock takes Esc first
      if (closeMenu || e.defaultPrevented || [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].some((d) => !modal!.wrap.contains(d))) return;
      closeBrowser(); e.preventDefault(); e.stopPropagation(); return;
    }
    if (!e.ctrlKey || !e.altKey) return;
    if (e.code === "BracketRight") step(1);
    else if (e.code === "BracketLeft") step(-1);
    else if (e.code === "Backslash") pick(null);
    else return;
    e.preventDefault(); e.stopPropagation();
  }, true);
  // a resize rebuilds the scene once it settles: some scenes bake for half a second, and a
  // window drag fires resize on every pixel (the canvas stretches to fit meanwhile)
  let resizeTimer = 0;
  on(window, "resize", () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(size, 220); });
  cleanup.push(() => clearTimeout(resizeTimer));

  // Look changes made in another pane (the window or a lane) arrive here as storage events
  on(window, "storage", (e: StorageEvent) => {
    if (e.key === CLOCK_KEY) { const c = readClock(); if (c) clock = c; hueAt = 0; appStepAt = 0; kick(); return; }
    if (e.key !== KEY) return;
    const was = saved;
    saved = load();
    if (saved.strength !== was.strength) canvas.style.opacity = String(saved.strength / 100);
    if (saved.scene !== scene?.name) pick(saved.scene);
    glass(); refreshLook(true); tint(true); checkPause();
    hueAt = 0; appStepAt = 0; kick();
    colourSync.forEach((fn) => fn());
  });

  // Tour: every few minutes the scene fades out, comes back from a fresh seed (every other step,
  // the next Phase or Automata scene instead), and the drift colour jumps ahead while it is dark.
  // New seed in the Look panel does one step now, on the same scene.
  let tourAt = performance.now(), tourN = 0, fading = false;
  const tourStep = (next: boolean) => {
    if (IS_LANE || fading || !scene) return;
    fading = true;
    canvas.style.transition = "opacity 1.4s ease";
    canvas.style.opacity = "0";
    window.setTimeout(() => {
      if (!alive) return;
      if (saved.drift && !saved.smooth) writeClock({ seed: (driftDeg() + 70 + Math.random() * 150) % 360, epoch: Date.now() });
      hueAt = 0;
      const here = TOUR.indexOf(scene?.name ?? "");
      if (next && here >= 0) pick(TOUR[(here + 1 + Math.floor(Math.random() * (TOUR.length - 1))) % TOUR.length]);
      else { state = null; size(); }
      canvas.style.opacity = String(saved.strength / 100);
      window.setTimeout(() => { canvas.style.transition = ""; fading = false; }, 1500);
    }, 1450);
  };
  const tourTimer = window.setInterval(() => {
    if (!saved.tour || paused || saved.smooth || !scene) { tourAt = performance.now(); return; }
    if (performance.now() - tourAt < TOUR_MIN * 60_000) return;
    tourAt = performance.now();
    tourStep(tourN++ % 2 === 1);
  }, 5000);
  cleanup.push(() => clearInterval(tourTimer));

  strength(saved.strength);
  refreshLook();
  tint(true);
  pick(saved.scene);
  ensureSurfaceItem();
  if (!IS_LANE) { ensureButton(); ensureSync(); ensureRecent(); showAges(); }
  kick();

  w.__t3scenes = {
    list: SCENES.map((s) => s.name),
    set: pick, theme: wearTheme, next: () => step(1), prev: () => step(-1), reseed: () => tourStep(false), tour: () => tourStep(true), open: openBrowser, close: closeBrowser,
    get current() { return scene?.name ?? null; },
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      closeBrowser(); closeSurface();
      document.getElementById("t3s-surface-item")?.parentElement?.remove();
      document.getElementById("t3s-library-item")?.parentElement?.remove();
      document.getElementById("t3s-kani-item")?.parentElement?.remove();
      document.getElementById("t3s-working")?.remove();
      cleanup.forEach((fn) => fn());
      clearTimeout(rethemeTimer); clearTimeout(timer); driftStyle.remove();
      style.remove(); tintStyle.remove(); lookStyle.remove(); canvas.remove();
      document.getElementById("t3s-button")?.closest("li")?.remove();
      ["data-t3-scene", "data-t3-scene-light", "data-t3-scene-glass", "data-t3-tint", "data-t3-look", "data-t3-theme"].forEach((a) => root.removeAttribute(a));
      delete w.__t3scenes;
    },
  };
}

if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
