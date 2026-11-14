// What each Claude account has left, in words, under T3's model picker, as the Kani browser shows it:
// "38% left this week, resets 6 PM", "Fable: none left until 6 PM". T3's own Limits page stays as it is.
// T3's Limits page (Usage, Limits) keeps its own bars and gets the same plain lines under them.
// The picker's numbers come from the injector (t3-scenes.mjs, "usage" request), which asks Anthropic the same
// way kani-browser/usage.js does; the page never sees a sign-in.

type Limit = { name: string; left: number; resets: string; week: boolean };
type Account = { id: string; name: string; limits?: Limit[]; error?: string };

const CSS = `
  #t3s-usage { border-top: 1px solid var(--border); padding: 4px; display: flex; flex-direction: column; gap: 2px; }
  #t3s-usage .use { display: flex; align-items: flex-start; gap: 10px; padding: 9px 10px 10px 6px; border-radius: 6px; }
  #t3s-usage .mono { flex: none; width: 24px; height: 24px; border-radius: 6px; display: grid; place-items: center;
    font-size: 10px; font-weight: 600; background: var(--muted); color: var(--foreground); }
  #t3s-usage .use > div { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; padding-top: 1px; }
  #t3s-usage .lim { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 5px 8px; font-size: 12px; color: var(--foreground); }
  #t3s-usage .lim i { font-style: normal; color: var(--muted-foreground); }
  #t3s-usage .lim u { grid-column: 1 / -1; height: 2px; border-radius: 2px; background: var(--border); text-decoration: none; overflow: hidden; }
  #t3s-usage .lim u::before { content: ''; display: block; height: 100%; width: var(--w); background: var(--foreground); opacity: .7; }
  #t3s-usage .lim.gone span { color: var(--muted-foreground); }
  .t3s-limits { display: grid; grid-template-columns: 20px auto minmax(60px, 1fr) auto; align-items: center;
    gap: 9px 12px; margin-top: 14px; font-size: 12px; color: var(--foreground); font-variant-numeric: tabular-nums; }
  .t3s-limits .mono { width: 20px; height: 20px; border-radius: 5px; display: grid; place-items: center;
    font-size: 9px; font-weight: 600; background: var(--muted); }
  .t3s-limits b { font-weight: 500; min-width: 7.5em; }
  .t3s-limits u { height: 2px; border-radius: 2px; background: var(--border); text-decoration: none; overflow: hidden; }
  .t3s-limits u::before { content: ''; display: block; height: 100%; width: var(--w); background: var(--foreground); opacity: .75; }
  .t3s-limits i { font-style: normal; color: var(--muted-foreground); text-align: right; }
  .t3s-limits .gone b { color: var(--muted-foreground); }
  .t3s-limits > div { display: contents; }
  #t3s-usage .note { font-size: 12px; color: var(--muted-foreground); padding: 3px 0; }
`;

// "Fri 7 PM": when a limit starts again (today's resets show the hour only)
const resetsAt = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(+d)) return "";
  const hour = d.toLocaleTimeString("en-US", d.getMinutes() ? { hour: "numeric", minute: "2-digit" } : { hour: "numeric" });
  return (d.toDateString() === new Date().toDateString() ? "" : d.toLocaleDateString("en-US", { weekday: "short" }) + " ") + hour;
};
const twoLetters = (name: string) => {
  const w = String(name || "").trim().split(/[\s\-_.]+/).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[1][0] : w[0] ? w[0][0] + w[0].slice(-1) : "?").toUpperCase();
};
const el = (tag: string, cls: string, text = "") => Object.assign(document.createElement(tag), { className: cls, textContent: text });

function limitRow(l: Limit) {
  const own = l.name === "All models" ? "" : l.name + ": ";
  const till = resetsAt(l.resets);
  const say = l.left <= 0
    ? (own ? own + "none left" : "None left") + (till ? " until " + till : "")
    : own + Math.round(l.left) + "% left" + (l.week ? " this week" : "");
  const row = el("div", "lim" + (l.left <= 0 ? " gone" : ""));
  row.append(el("span", "", say));
  if (l.left > 0 && till) row.append(el("i", "", "resets " + till));
  const bar = el("u", "");
  bar.style.setProperty("--w", Math.round(l.left) + "%");
  row.append(bar);
  return row;
}

export function startUsage(): () => void {
  const w = window as any;
  const style = Object.assign(document.createElement("style"), { id: "t3-scene-usage", textContent: CSS });
  document.head.append(style);
  let data: Account[] | null = null, asked = 0;

  const draw = (box: HTMLElement) => {
    box.replaceChildren(
      ...(data === null
        ? [el("p", "note", "Checking what is left…")]
        : data.map((a) => {
            const lims = (a.limits ?? []).filter((l) => l.week || l.left < 25);
            const lines = a.error || !lims.length
              ? [el("p", "note", a.error || "Anthropic gave no numbers for this account.")]
              : lims.map(limitRow);
            const row = el("div", "use");
            const inner = el("div", "");
            inner.append(...lines);
            row.append(el("span", "mono", twoLetters(a.name)), inner);
            return row;
          })),
    );
  };
  w.__t3usage = (u: Account[]) => {
    if (Array.isArray(u)) data = u;
    const box = document.getElementById("t3s-usage");
    if (box) draw(box);
  };

  // T3's picker: the column holding "Search models..." and the model and reasoning lists
  const place = () => {
    const input = document.querySelector('input[placeholder="Search models..."]');
    const root = input?.closest('[class*="max-h-(--available-height)"]') as HTMLElement | null;
    if (!root || root.querySelector(":scope > #t3s-usage")) return;
    const box = el("div", "");
    box.id = "t3s-usage";
    root.append(box);
    draw(box);
    // usage.js keeps answers a minute, so asking on every open costs nothing
    if (Date.now() - asked > 30000) { asked = Date.now(); try { w.__t3scenesHost?.("usage"); } catch {} }
  };
  // T3's Limits page: under T3's own bars, one quiet line per account, read from the sentence each bar
  // carries for screen readers ("KS: 38% left, resets in 6h 37m, ..."): how much is left, and the clock time it resets.
  const at = (rel: string) => {
    const n = (u: string) => +(new RegExp("([0-9]+)" + u).exec(rel)?.[1] ?? 0);
    const ms = ((n("d") * 24 + n("h")) * 60 + n("m")) * 60000;
    if (!ms) return /now|momentarily/i.test(rel) ? "resets now" : "";
    const step = n("d") ? 3600000 : 900000; // the page rounds to hours past a day, so the clock time does too
    return "resets " + resetsAt(new Date(Math.round((Date.now() + ms) / step) * step).toISOString());
  };
  const plain = () => {
    for (const pool of document.querySelectorAll<HTMLElement>('[class*="@container/pool"]')) {
      const bars = [...pool.querySelectorAll("button[aria-label]")].map((b) => b.getAttribute("aria-label") ?? "");
      const sig = bars.join("|");
      if (!bars.length || pool.dataset.t3sPlain === sig) continue;
      pool.dataset.t3sPlain = sig;
      let box = pool.querySelector<HTMLElement>(":scope > .t3s-limits");
      if (!box) { box = el("div", "t3s-limits"); pool.append(box); }
      box.replaceChildren(...bars.flatMap((t) => {
        const m = /^(.*?): (\d+)% left(?:, ([^,]*reset[^,]*|Resets momentarily))?/i.exec(t);
        if (!m) return [];
        const [, who, pct, when] = m, left = +pct;
        const row = el("div", left <= 0 ? "gone" : "");
        const bar = el("u", ""); bar.style.setProperty("--w", left + "%");
        row.append(el("span", "mono", twoLetters(who)), el("b", "", left <= 0 ? "None left" : left + "% left"), bar, el("i", "", when ? at(when) : ""));
        return [row];
      }));
    }
  };
  const mo = new MutationObserver(() => { place(); plain(); });
  mo.observe(document.body, { childList: true, subtree: true });
  place(); plain();
  return () => {
    mo.disconnect(); style.remove(); document.getElementById("t3s-usage")?.remove(); delete w.__t3usage;
    document.querySelectorAll(".t3s-limits").forEach((n) => n.remove());
    document.querySelectorAll<HTMLElement>("[data-t3s-plain]").forEach((n) => delete n.dataset.t3sPlain);
  };
}
