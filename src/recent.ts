// Recent: one list at the top of the sidebar, every chat across all folders, newest message first.
// Each row wears its project's colour (a bar at its left edge), says what the chat is doing
// (Working 3m, Needs you, Failed, or how long ago you last wrote), and names its project, with
// "in lane" when a lane shows it. A click opens the chat in this pane. The folders stay below.
//
// The list reads T3's own thread records, which the sidebar keeps in React state (all chats,
// closed folders included): title, projectId, runtime, pending approvals and input, and
// latestUserMessageAt. Lanes say which chat they show through localStorage heartbeats.

const RECENT_CSS = `
  #t3s-recent { margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--app-theme-sidebar-border, var(--border)); }
  #t3s-recent .t3s-recent-head { height: 30px; display: flex; align-items: center; gap: 8px; padding: 0 var(--sidebar-row-content-inset, 8px); font-size: 14px; font-weight: 500; color: var(--sidebar-foreground, var(--foreground)); cursor: pointer; user-select: none; }
  #t3s-recent .t3s-recent-head span { margin-left: auto; font-size: 12px; font-weight: 400; color: var(--muted-foreground); }
  #t3s-recent .t3s-recent-row { position: relative; display: block; width: 100%; text-align: left; padding: 4px 8px 5px 14px; border-radius: 7px; cursor: pointer; color: var(--sidebar-foreground, var(--foreground)); background: none; border: 0; }
  #t3s-recent .t3s-recent-row:hover, #t3s-recent .t3s-recent-row:focus-visible { background: color-mix(in srgb, var(--foreground) 7%, transparent); outline: none; }
  #t3s-recent .t3s-recent-row[aria-current="true"] { background: color-mix(in srgb, var(--foreground) 10%, transparent); }
  #t3s-recent .t3s-recent-row::before { content: ""; position: absolute; left: 5px; top: 6px; bottom: 6px; width: 3px; border-radius: 2px; background: var(--hue); }
  #t3s-recent .t3s-recent-top { display: flex; align-items: baseline; gap: 8px; font-size: 13px; line-height: 18px; }
  #t3s-recent .t3s-recent-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #t3s-recent .t3s-recent-state { flex: none; font-size: 11.5px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  #t3s-recent .t3s-recent-state[data-s="working"] { color: var(--app-theme-accent, var(--foreground)); font-weight: 600; }
  #t3s-recent .t3s-recent-state[data-s="you"] { color: var(--warning-foreground, #f5c04f); font-weight: 600; }
  #t3s-recent .t3s-recent-state[data-s="failed"] { color: var(--app-theme-error, #f87171); }
  #t3s-recent .t3s-recent-sub { font-size: 11.5px; line-height: 15px; color: var(--muted-foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #t3s-recent .t3s-recent-more { display: block; margin: 2px 0 0 14px; font-size: 12px; color: var(--muted-foreground); background: none; border: 0; padding: 2px 0; cursor: pointer; }
  #t3s-recent .t3s-recent-more:hover { color: var(--foreground); }
  #t3s-recent[data-closed] .t3s-recent-row, #t3s-recent[data-closed] .t3s-recent-more { display: none; }
`;

const LANE_KEY = "t3lanehash:";
const OPEN_KEY = "t3recent";
const SHORT = 10, LONG = 30;

type Thread = {
  id: string; environmentId: string; projectId: string; title: string; latestUserMessageAt?: string; createdAt: string;
  archivedAt?: string | null; deletedAt?: string | null; hasPendingApprovals?: boolean; hasPendingUserInput?: boolean;
  runtime?: { status?: string; activityStartedAt?: string | null; lastError?: string | null } | null;
};
type Project = { id: string; title: string };

const ago = (t: number) => {
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  return new Date(t).toLocaleDateString([], { month: "short", day: "numeric" });
};
const since = (t: number) => {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
};

// the sidebar's thread and project records, found by walking up from a folder heading
export const records = (): { threads: Thread[]; projects: Project[] } | null => {
  const el = document.querySelector('li[class*="project-folder"]') as any;
  if (!el) return null;
  const k = Object.keys(el).find((x) => x.startsWith("__reactFiber"));
  let f = k ? el[k] : null, threads: Thread[] | null = null, projects: Project[] | null = null;
  // the longest list wins: a folder also carries a short list of just its own folded chats (hiddenThreads)
  for (let i = 0; f && i < 150; i++, f = f.return) {
    const bags: any[] = [f.memoizedProps];
    for (let h = f.memoizedState, j = 0; h && j < 30; j++, h = h.next) bags.push(h.memoizedState);
    for (const p of bags) {
      if (!p || typeof p !== "object") continue;
      for (const v of Array.isArray(p) ? [p] : Object.values(p)) {
        if (!Array.isArray(v) || !v[0] || typeof v[0] !== "object") continue;
        if ("latestUserMessageAt" in v[0] && v.length > (threads?.length ?? 0)) threads = v;
        if (!projects && "workspaceRoot" in v[0] && !("latestUserMessageAt" in v[0])) projects = v;
      }
    }
  }
  return threads && projects ? { threads, projects } : null;
};

// isLane: a lane only reports which chat it shows. Returns [cleanup, ensure].
export function startRecent(isLane: boolean, hueOf: (name: string) => number | null): [() => void, () => void] {
  if (isLane) {
    const me = Math.random().toString(36).slice(2, 8);
    const beat = () => { try { localStorage.setItem(LANE_KEY + me, JSON.stringify({ hash: location.hash, at: Date.now() })); } catch {} };
    beat();
    const t = window.setInterval(beat, 5000);
    window.addEventListener("hashchange", beat);
    return [() => { clearInterval(t); window.removeEventListener("hashchange", beat); try { localStorage.removeItem(LANE_KEY + me); } catch {} }, () => {}];
  }

  const style = document.createElement("style");
  style.id = "t3-scene-recent";
  style.textContent = RECENT_CSS;
  document.head.append(style);
  let long = false, sig = "";
  const closed = () => { try { return localStorage.getItem(OPEN_KEY) === "closed"; } catch { return false; } };

  const laneHashes = () => {
    const out = new Set<string>();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!;
        if (!k.startsWith(LANE_KEY)) continue;
        const v = JSON.parse(localStorage.getItem(k) || "null");
        if (v && Date.now() - v.at < 15_000) out.add(v.hash); else localStorage.removeItem(k);
      }
    } catch {}
    return out;
  };

  const ensure = () => {
    const firstFolder = document.querySelector('li[class*="project-folder"]');
    const folderList = firstFolder?.parentElement;
    let group = document.getElementById("t3s-recent");
    const data = folderList ? records() : null;
    if (!folderList || !data) { group?.remove(); sig = ""; return; }

    // a worktree project ("myapp lane3") wears its parent's colour
    const byId = new Map(data.projects.map((p) => [p.id, p.title]));
    const titles = data.projects.map((p) => p.title).sort((a, b) => b.length - a.length);
    const familyOf = (t: string) => titles.find((x) => x !== t && t.startsWith(`${x} `)) ?? t;
    const lanes = laneHashes();
    const at = (t: Thread) => Date.parse(t.latestUserMessageAt ?? t.createdAt);
    const list = data.threads.filter((t) => !t.archivedAt && !t.deletedAt).sort((a, b) => at(b) - at(a)).slice(0, long ? LONG : SHORT);

    const rows = list.map((t) => {
      const project = byId.get(t.projectId) ?? "";
      const hash = `#/${t.environmentId}/${t.id}`;
      const status = t.runtime?.status;
      let state = "", s = "";
      if (status === "running" || status === "starting") { const st = Date.parse(t.runtime?.activityStartedAt ?? ""); state = Number.isFinite(st) ? `Working ${since(st)}` : "Working"; s = "working"; }
      else if (t.hasPendingApprovals || t.hasPendingUserInput) { state = "Needs you"; s = "you"; }
      else if (status === "error" || t.runtime?.lastError) { state = "Failed"; s = "failed"; }
      else state = ago(at(t));
      const hue = hueOf(familyOf(project));
      return { t, project, hash, state, s, hue, lane: lanes.has(hash), here: location.hash === hash };
    });
    const key = `${closed()}|${long}|` + rows.map((r) => `${r.hash}|${r.t.title}|${r.state}|${r.lane}|${r.here}|${r.project}`).join("\n");
    if (group && key === sig && group.nextElementSibling === folderList) return;
    sig = key;
    if (!group) { group = document.createElement("div"); group.id = "t3s-recent"; }
    if (group.nextElementSibling !== folderList) folderList.before(group);
    group.toggleAttribute("data-closed", closed());

    const head = document.createElement("div");
    head.className = "t3s-recent-head";
    head.setAttribute("role", "button");
    head.tabIndex = 0;
    head.title = "Show or hide";
    const working = rows.filter((r) => r.s === "working").length;
    head.append("Recent", Object.assign(document.createElement("span"), { textContent: working ? `${working} working` : "" }));
    const flip = () => { try { localStorage.setItem(OPEN_KEY, closed() ? "open" : "closed"); } catch {} sig = ""; ensure(); };
    head.addEventListener("click", flip);
    head.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });

    const items = rows.map((r) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "t3s-recent-row";
      if (r.here) b.setAttribute("aria-current", "true");
      b.style.setProperty("--hue", r.hue === null ? "var(--muted-foreground)" : `oklch(0.72 0.13 ${r.hue})`);
      b.title = `${r.t.title}\n${r.project}`;
      const top = document.createElement("div");
      top.className = "t3s-recent-top";
      top.append(Object.assign(document.createElement("span"), { className: "t3s-recent-title", textContent: r.t.title }));
      const st = Object.assign(document.createElement("span"), { className: "t3s-recent-state", textContent: r.state });
      if (r.s) st.dataset.s = r.s;
      top.append(st);
      const sub = Object.assign(document.createElement("div"), { className: "t3s-recent-sub", textContent: r.lane ? `${r.project} · in lane` : r.project });
      b.append(top, sub);
      // drag it into the chat area for a lane (entry.ts reads data-t3-key), right-click for a menu
      b.dataset.t3Key = `${r.t.environmentId}:${r.t.id}`;
      b.dataset.t3Project = r.project; // sharing mode hides a hidden project's chats here too
      b.addEventListener("click", () => { if (Date.now() - Number(document.documentElement.dataset.t3DroppedAt || 0) > 400) location.hash = r.hash; });
      b.addEventListener("contextmenu", async (e) => {
        e.preventDefault();
        const menu = (window as any).__t3menu;
        if (!menu) return;
        const pv = (window as any).__t3privacy, key = `${r.t.environmentId}:${r.t.id}`;
        const id = await menu.show([{ id: "here", label: "Open here" }, { id: "lane", label: "Open in new lane" }, ...(pv ? [{ separator: true }, { id: "private", label: pv.threadHidden(key) ? "Show while sharing" : "Hide while sharing" }] : [])], e.clientX, e.clientY);
        if (id === "private") pv?.toggleThread(key);
        if (id === "here") location.hash = r.hash;
        if (id === "lane") console.debug(`⁣t3:lane:${r.hash}`);
      });
      return b;
    });
    const more = Object.assign(document.createElement("button"), { type: "button", className: "t3s-recent-more", textContent: long ? "Fewer" : "More" });
    more.addEventListener("click", () => { long = !long; sig = ""; ensure(); });
    group.replaceChildren(head, ...items, more);
  };

  const tick = window.setInterval(() => { if (!document.hidden) ensure(); }, 5000);
  const onStorage = (e: StorageEvent) => { if (e.key?.startsWith(LANE_KEY)) ensure(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener("hashchange", ensure);
  return [() => {
    clearInterval(tick); window.removeEventListener("storage", onStorage); window.removeEventListener("hashchange", ensure);
    document.getElementById("t3s-recent")?.remove(); style.remove();
  }, ensure];
}
