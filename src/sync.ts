// A refresh button in the sidebar's top row, beside Filter, Add project and New thread: it asks the
// Kani helper to copy the Claude app chats made since its last check into T3 now, instead of on
// its 15-minute clock. The page can't reach the helper itself (it answers this PC's own pages
// only), so the request goes through the injector's binding and the answer comes back as a call.
// New chats land in their project folders a few seconds later, newest first.

const REFRESH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>`;

// two text lines closing up, for the compact switch
const COMPACT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h16M4 15h16"/><path d="M12 2v4l-2-2M12 6l2-2M12 22v-4l-2 2M12 18l2 2"/></svg>`;

// two rows of three, like the Claude app's split view
const GRID_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 5v14M15 5v14M3 12h18"/></svg>`;

import { records } from "./recent";

const SYNC_CSS = `
  #t3s-grid[data-busy] { opacity: 0.5; }
  html[data-t3-compact] #t3s-compact { background: color-mix(in srgb, var(--foreground) 18%, transparent); color: var(--foreground); }
  #t3s-sync svg { transition: transform 200ms; }
  #t3s-sync[data-busy] svg { animation: t3s-sync-turn 900ms linear infinite; }
  @keyframes t3s-sync-turn { to { transform: rotate(360deg); } }
  #t3s-sync-note { position: absolute; left: var(--sidebar-row-content-inset, 8px); right: 8px; top: 100%; margin-top: 2px; font-size: 12px; color: var(--muted-foreground); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none; z-index: 5; }
`;

export function startSync(toggleCompact: () => void): [() => void, () => void] {
  const w = window as any;
  const style = document.createElement("style");
  style.id = "t3-scene-sync";
  style.textContent = SYNC_CSS;
  document.head.append(style);
  let noteTimer = 0;

  const note = (text: string) => {
    const row = document.getElementById("t3s-sync")?.parentElement;
    if (!row) return;
    const holder = row.parentElement as HTMLElement;
    if (getComputedStyle(holder).position === "static") holder.style.position = "relative";
    let el = document.getElementById("t3s-sync-note");
    if (!el) { el = document.createElement("div"); el.id = "t3s-sync-note"; holder.append(el); }
    el.textContent = text;
    clearTimeout(noteTimer);
    noteTimer = window.setTimeout(() => el!.remove(), 6000);
  };

  // The grid button: the chats on screen in the Claude app's split view open here, the first in
  // this pane and the rest as lanes (the lanes open now close first). A chat T3 doesn't have yet
  // is copied in, then the grid opens.
  let mirrorAfterSync = false;
  const laneOf = (hash: string) => console.debug(`⁣t3:lane:${hash}`);
  w.__t3mirror = (list: Array<{ title: string; cli: string }>) => {
    const data = records();
    const found = list.map((s) => ({ s, t: data?.threads.find((t) => t.id.endsWith(s.cli)) }));
    const missing = found.filter((x) => !x.t);
    if (missing.length && !mirrorAfterSync) {
      mirrorAfterSync = true;
      note(`Copying in ${missing.length} chat${missing.length === 1 ? "" : "s"} first`);
      document.getElementById("t3s-sync")?.setAttribute("data-busy", "");
      w.__t3scenesHost("sync-chats");
      return;
    }
    mirrorAfterSync = false;
    const hashes = found.filter((x) => x.t).map((x) => `#/${x.t!.environmentId}/${x.t!.id}`);
    if (!hashes.length) { document.getElementById("t3s-grid")?.removeAttribute("data-busy"); note(list.length ? "Those chats aren't in T3" : "No Claude app grid open"); return; }
    w.__t3lanesClosed = () => {
      location.hash = hashes[0];
      hashes.slice(1).forEach((h, i) => window.setTimeout(() => laneOf(h), 500 + i * 450));
      window.setTimeout(() => document.getElementById("t3s-grid")?.removeAttribute("data-busy"), 600 + hashes.length * 450);
      note(`Opened ${hashes.length} from the Claude app${missing.length ? `, ${missing.length} not found` : ""}`);
    };
    w.__t3scenesHost("close-lanes");
  };
  const mirror = () => {
    const b = document.getElementById("t3s-grid");
    if (!b || b.hasAttribute("data-busy")) return;
    if (typeof w.__t3scenesHost !== "function") { note("Restart T3 with scenes to use this"); return; }
    b.setAttribute("data-busy", "");
    w.__t3scenesHost("claude-grid");
  };

  w.__t3syncDone = (a: { imported?: number; ok?: boolean; error?: string }) => {
    document.getElementById("t3s-sync")?.removeAttribute("data-busy");
    if (mirrorAfterSync && !a.error) { window.setTimeout(() => w.__t3scenesHost("claude-grid"), 1500); return; }
    if (a.error) note(a.error);
    else if (!a.ok) note("The copy failed; see the Kani page");
    else note(a.imported ? `${a.imported} new chat${a.imported === 1 ? "" : "s"} copied in` : "Up to date with the Claude app");
  };

  // The refresh button tidies Recent: finished chats older than 30 minutes are settled (hidden, not
  // deleted) by tidy/tidy-recent.mjs, which keeps an undo list. Running and fresh chats stay.
  w.__t3tidyDone = (a: { settled?: number; error?: string }) => {
    document.getElementById("t3s-sync")?.removeAttribute("data-busy");
    if (a.error) note(a.error);
    else note(a.settled ? `Cleared ${a.settled} finished chat${a.settled === 1 ? "" : "s"} from Recent` : "Recent is already tidy");
  };
  const press = () => {
    const btn = document.getElementById("t3s-sync");
    if (!btn || btn.hasAttribute("data-busy")) return;
    if (typeof w.__t3scenesHost !== "function") { note("Restart T3 with scenes to use this"); return; }
    btn.setAttribute("data-busy", "");
    w.__t3scenesHost("tidy-recent");
  };

  // T3 redraws its sidebar, so this runs on every settle and puts the button back when it's gone
  const ensure = () => {
    const newThread = document.querySelector<HTMLElement>('[data-slot="sidebar"] button[aria-label="New thread"]');
    if (!newThread || document.getElementById("t3s-sync")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "t3s-sync";
    btn.className = newThread.className;
    btn.setAttribute("aria-label", "Clear finished chats from Recent (kept, not deleted)");
    btn.title = "Clear finished chats from Recent (kept, not deleted)";
    btn.innerHTML = REFRESH_ICON;
    btn.addEventListener("click", press);
    newThread.parentElement!.insertBefore(btn, newThread.parentElement!.firstChild);
    const compact = document.createElement("button");
    compact.type = "button";
    compact.id = "t3s-compact";
    compact.className = newThread.className;
    compact.setAttribute("aria-label", "Compact chats, lit when on (Ctrl+Alt+C)");
    compact.title = "Compact chats, lit when on (Ctrl+Alt+C)";
    compact.innerHTML = COMPACT_ICON;
    compact.addEventListener("click", toggleCompact);
    btn.after(compact);
    const grid = document.createElement("button");
    grid.type = "button";
    grid.id = "t3s-grid";
    grid.className = newThread.className;
    grid.setAttribute("aria-label", "Open my Claude app grid here");
    grid.title = "Open my Claude app grid here";
    grid.innerHTML = GRID_ICON;
    grid.addEventListener("click", mirror);
    compact.after(grid);
  };

  const cleanup = () => {
    clearTimeout(noteTimer);
    document.getElementById("t3s-sync")?.remove();
    document.getElementById("t3s-compact")?.remove();
    document.getElementById("t3s-grid")?.remove();
    delete w.__t3mirror; delete w.__t3lanesClosed;
    document.getElementById("t3s-sync-note")?.remove();
    style.remove();
    delete w.__t3syncDone;
    delete w.__t3tidyDone;
  };
  return [cleanup, ensure];
}
