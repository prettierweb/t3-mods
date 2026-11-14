// Sharing mode, for a screen share or a stream. Right-click a chat or a project and choose
// "Hide while sharing"; Ctrl+Alt+H turns sharing mode on and off in every pane at once. While it is
// on, those chats and projects (with every chat inside them) are gone from the sidebar and
// Recent, and a pane that shows one is covered. One quiet line at the foot of the sidebar says
// sharing mode is on and how to end it, which names nothing hidden.
// localStorage: t3private = { threads: ["<env>:<thread>"], projects: ["<project title>"] },
// t3sharing = "on".

const LIST_KEY = "t3private", MODE_KEY = "t3sharing";
type List = { threads: string[]; projects: string[] };

const CSS = `
  html[data-t3-sharing] [data-t3-private] { display: none !important; }
  html[data-t3-private-here] body::before {
    content: "Hidden while sharing"; position: fixed; inset: 0; z-index: 2147483600; display: grid; place-items: center;
    background: var(--app-theme-canvas, #0d0f12); color: var(--muted-foreground); font-size: 13px;
  }
  #t3s-sharing { padding: 6px 14px; font-size: 12px; color: var(--muted-foreground); cursor: pointer; }
  #t3s-sharing:hover { color: var(--foreground); }
`;

export function startPrivacy(isLane: boolean): [() => void, () => void, typeof api] {
  const root = document.documentElement;
  const style = Object.assign(document.createElement("style"), { id: "t3-scene-privacy", textContent: CSS });
  document.head.append(style);

  const list = (): List => {
    try { const l = JSON.parse(localStorage.getItem(LIST_KEY) || "null"); return { threads: l?.threads ?? [], projects: l?.projects ?? [] }; } catch { return { threads: [], projects: [] }; }
  };
  const save = (l: List) => { try { localStorage.setItem(LIST_KEY, JSON.stringify(l)); } catch {} draw(); };
  const sharing = () => { try { return localStorage.getItem(MODE_KEY) === "on"; } catch { return false; } };
  const flip = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const threadKey = () => { const m = location.hash.match(/^#\/([^/]+)\/(.+)$/); return m ? `${m[1]}:${decodeURIComponent(m[2])}` : null; };
  // the project of the chat on screen: the first crumb of T3's top bar (compact hides it, it's still there)
  // a project's name in T3's markup: the first plain text that isn't its two-letter badge or a count
  const nameIn = (el: Element | null) => {
    for (const span of el ? [...el.querySelectorAll("span")] : []) {
      if (span.children.length) continue;
      const t = span.textContent?.trim() ?? "";
      if (t && !/^[A-Z0-9]{1,3}$/.test(t) && !/^\d+$/.test(t) && !/^,/.test(t)) return t;
    }
    return "";
  };
  const hereProject = () => nameIn(document.querySelector("header[data-chat-header] nav ol > li"));
  const folderTitle = (li: Element) => nameIn(li.querySelector(":scope > [data-sidebar-row]"));

  let bar: HTMLElement | null = null;
  const draw = () => {
    const l = list(), on = sharing();
    root.toggleAttribute("data-t3-sharing", on);
    const t = new Set(l.threads), p = new Set(l.projects);
    // marks are set whether or not sharing is on, so turning it on hides at once
    document.querySelectorAll<HTMLElement>("[data-thread-item], [data-t3-key]").forEach((el) => {
      const k = el.getAttribute("data-thread-item") ?? el.getAttribute("data-t3-key")!;
      el.toggleAttribute("data-t3-private", t.has(k) || p.has(el.dataset.t3Project ?? ""));
    });
    document.querySelectorAll('li[data-testid="sidebar-project-folder"]').forEach((li) => li.toggleAttribute("data-t3-private", p.has(folderTitle(li))));
    const key = threadKey();
    root.toggleAttribute("data-t3-private-here", on && !!key && (t.has(key) || p.has(hereProject())));
    if (isLane) return;
    const n = l.threads.length + l.projects.length;
    const foot = document.querySelector('[data-slot="sidebar"] [data-slot="sidebar-footer"]') ?? document.querySelector('[data-slot="sidebar"] [data-sidebar="footer"]');
    if (on && foot) {
      if (!bar) { bar = document.createElement("div"); bar.id = "t3s-sharing"; bar.title = "End sharing mode"; bar.addEventListener("click", toggle); }
      bar.textContent = `Sharing mode, ${n} hidden. Ctrl+Alt+H ends it`;
      if (bar.nextElementSibling !== foot) foot.before(bar);
    } else bar?.remove();
  };
  const toggle = () => { try { if (sharing()) localStorage.removeItem(MODE_KEY); else localStorage.setItem(MODE_KEY, "on"); } catch {} draw(); };

  const api = {
    sharing,
    threadHidden: (k: string) => list().threads.includes(k),
    projectHidden: (title: string) => list().projects.includes(title),
    toggleThread: (k: string) => { const l = list(); save({ ...l, threads: flip(l.threads, k) }); },
    toggleProject: (title: string) => { const l = list(); save({ ...l, projects: flip(l.projects, title) }); },
    folderTitle,
    toggle,
  };

  (window as any).__t3privacy = api; // Recent's own menu asks here
  const onKey = (e: KeyboardEvent) => { if (e.ctrlKey && e.altKey && !e.shiftKey && e.code === "KeyH") { toggle(); e.preventDefault(); e.stopPropagation(); } };
  const onStorage = (e: StorageEvent) => { if (e.key === LIST_KEY || e.key === MODE_KEY) draw(); };
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("storage", onStorage);
  window.addEventListener("hashchange", draw);
  const tick = window.setInterval(draw, 1500); // the sidebar redraws its rows; marks are put back
  draw();
  return [() => {
    clearInterval(tick); window.removeEventListener("keydown", onKey, true); window.removeEventListener("storage", onStorage); window.removeEventListener("hashchange", draw);
    delete (window as any).__t3privacy; bar?.remove(); style.remove(); root.removeAttribute("data-t3-sharing"); root.removeAttribute("data-t3-private-here");
    document.querySelectorAll("[data-t3-private]").forEach((el) => el.removeAttribute("data-t3-private"));
  }, draw, api];
}
