// Health and updates (Nov 14). Two things share one quiet line at the foot of the sidebar:
//  - a self-check. T3 updates itself, and an update can move the things the mods hook into. A
//    while after the page loads, each mod looks for the piece of T3 it stands on. When all are
//    there the line stays away; when one is missing the line names what needs a fix.
//  - an update notice. The launcher asks the mods' GitHub repo once a day whether there is
//    something newer (window.__t3modsUpdate); a click downloads it and reloads the mods.
// Nothing here calls a model.

type Check = { mod: string; needs: string; ok: () => boolean; when?: () => boolean };
const q = (s: string) => document.querySelector(s);
const chatOpen = () => /^#\/[^/]+\/[^/]+/.test(location.hash) && !location.hash.startsWith("#/draft");
const CHECKS: Check[] = [
  { mod: "Sidebar mods", needs: "the sidebar", ok: () => !!q('[data-slot="sidebar"]') },
  { mod: "New chat in a lane", needs: "the new-chat button", ok: () => !!q('[data-slot="sidebar"] button[aria-label^="New thread"]') },
  { mod: "Project colours", needs: "the project folders", ok: () => !!q('li[data-testid="sidebar-project-folder"]'), when: () => !!q("[data-thread-item]") },
  { mod: "Lanes", needs: "the chat area", ok: () => !!q('main[data-slot="sidebar-inset"]') },
  { mod: "Status bar", needs: "the chat's title", ok: () => !!q('[aria-label^="Thread actions for "]'), when: chatOpen },
  { mod: "Status bar", needs: "the chat's top bar", ok: () => !!q('header button[aria-label^="New thread in "]') || !!q("[data-chat-header]"), when: chatOpen },
  { mod: "Status bar", needs: "its own place in the top bar", ok: () => !!document.getElementById("t3s-lane-status"), when: () => chatOpen() && !!q('[aria-label^="Thread actions for "]') },
  { mod: "Sidebar foot line", needs: "the sidebar's foot", ok: () => !!q('[data-slot="sidebar"] [data-slot="sidebar-footer"], [data-slot="sidebar"] [data-sidebar="footer"]') },
];

const CSS = `
  #t3s-health { padding: 6px 14px; font-size: 12px; color: var(--muted-foreground); cursor: pointer; display: flex; gap: 6px; align-items: baseline; }
  #t3s-health:hover { color: var(--foreground); }
  #t3s-health b { font-weight: 600; color: var(--foreground); }
  #t3s-health[data-kind="broken"] b { color: var(--warning-foreground, #e5b567); }
  #t3s-health-pop { position: fixed; z-index: 2147483200; width: 320px; max-width: calc(100vw - 16px); padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--popover, #222327); color: var(--popover-foreground, #eee); font-size: 12.5px; line-height: 1.45; box-shadow: 0 10px 30px rgba(0,0,0,.4); }
  #t3s-health-pop h4 { margin: 0 0 6px; font-size: 13px; font-weight: 600; }
  #t3s-health-pop ul { margin: 0 0 8px; padding-left: 16px; }
  #t3s-health-pop p { margin: 0 0 8px; color: var(--muted-foreground); }
  #t3s-health-pop button { font: inherit; padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--primary); color: var(--primary-foreground, #fff); cursor: pointer; }
  #t3s-health-pop button[disabled] { opacity: .6; cursor: default; }
`;

export function startHealth(isLane: boolean): () => void {
  if (isLane) return () => {};
  const w = window as any;
  const style = Object.assign(document.createElement("style"), { id: "t3-scene-health", textContent: CSS });
  document.head.append(style);
  let broken: Check[] = [], update: { behind: number; subject?: string } | null = null, note = "";
  const bar = document.createElement("div");
  bar.id = "t3s-health";

  const closePop = () => document.getElementById("t3s-health-pop")?.remove();
  const openPop = () => {
    if (document.getElementById("t3s-health-pop")) { closePop(); return; }
    const pop = document.createElement("div");
    pop.id = "t3s-health-pop";
    const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
    let html = "";
    if (broken.length) {
      const t3 = w.__t3modsCfg?.t3Version ? ` (T3 ${esc(String(w.__t3modsCfg.t3Version))})` : "";
      html += `<h4>These mods can't find their place in T3${t3}</h4><ul>${broken.map((c) => `<li>${esc(c.mod)}: looking for ${esc(c.needs)}</li>`).join("")}</ul><p>T3 probably moved something in an update. The rest of the mods keep working.</p>`;
    }
    if (update) html += `<h4>A newer version of the mods is ready</h4><p>${update.behind} change${update.behind === 1 ? "" : "s"}${update.subject ? `, latest: ${esc(update.subject)}` : ""}</p><button type="button" data-update>Update now</button>`;
    if (note) html += `<p style="margin-top:8px">${esc(note)}</p>`;
    pop.innerHTML = html;
    const r = bar.getBoundingClientRect();
    pop.style.left = `${Math.max(8, r.left + 8)}px`;
    pop.style.bottom = `${Math.max(8, innerHeight - r.top + 6)}px`;
    pop.querySelector<HTMLButtonElement>("[data-update]")?.addEventListener("click", (e) => {
      const b = e.currentTarget as HTMLButtonElement;
      if (typeof w.__t3scenesHost !== "function") { note = "Restart T3 with the mods to update."; closePop(); openPop(); return; }
      b.disabled = true; b.textContent = "Updating…";
      w.__t3scenesHost("mods-update");
    });
    document.body.append(pop);
  };
  bar.addEventListener("click", openPop);
  const outside = (e: Event) => { const t = e.target as Node; if (!bar.contains(t) && !document.getElementById("t3s-health-pop")?.contains(t)) closePop(); };
  window.addEventListener("pointerdown", outside, true);

  const draw = () => {
    const foot = q('[data-slot="sidebar"] [data-slot="sidebar-footer"]') ?? q('[data-slot="sidebar"] [data-sidebar="footer"]');
    const mods = [...new Set(broken.map((c) => c.mod))];
    if ((!mods.length && !update) || !foot) { bar.remove(); return; }
    bar.dataset.kind = mods.length ? "broken" : "update";
    bar.innerHTML = mods.length
      ? `<b>${mods.length === 1 ? mods[0] : `${mods.length} mods`}</b><span>${mods.length === 1 ? "needs a fix" : "need a fix"}${update ? " · update ready" : ""}</span>`
      : `<b>Mods update</b><span>ready, click to install</span>`;
    if (bar.nextElementSibling !== foot) foot.before(bar);
  };

  // T3 draws its page over a few seconds, and a chat's parts only exist while one is open: a check
  // counts as failed only after it has failed on three looks in a row.
  const misses = new Map<Check, number>();
  const look = () => {
    for (const c of CHECKS) {
      if (c.when && !c.when()) { misses.delete(c); continue; }
      let ok = false;
      try { ok = c.ok(); } catch {}
      misses.set(c, ok ? 0 : (misses.get(c) ?? 0) + 1);
    }
    const now = CHECKS.filter((c) => (misses.get(c) ?? 0) >= 3);
    if (now.map((c) => c.needs).join() !== broken.map((c) => c.needs).join()) { broken = now; closePop(); }
    draw();
  };
  const first = window.setTimeout(look, 8000);
  const timer = window.setInterval(look, 20000);

  w.__t3modsUpdate = (u: { behind: number; subject?: string } | null) => { update = u && u.behind > 0 ? u : null; closePop(); draw(); };
  w.__t3modsUpdated = (r: { ok?: boolean; error?: string }) => {
    note = r.ok ? "" : r.error ?? "Could not update.";
    if (r.ok) update = null;
    closePop(); draw(); if (!r.ok) openPop();
  };
  w.__t3modsHealth = () => ({ broken: broken.map((c) => `${c.mod}: ${c.needs}`), update });
  if (w.__t3modsCfg?.update) w.__t3modsUpdate(w.__t3modsCfg.update);

  return () => {
    clearTimeout(first); clearInterval(timer);
    window.removeEventListener("pointerdown", outside, true);
    closePop(); bar.remove(); style.remove();
    delete w.__t3modsUpdate; delete w.__t3modsUpdated; delete w.__t3modsHealth;
  };
}
