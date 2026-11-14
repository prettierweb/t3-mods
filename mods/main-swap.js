// Runs in T3's main process beside main-patch.js (sent the same way, by t3-scenes.mjs). It adds
// two things without touching the lanes main-patch.js owns, so open lanes survive installing it.
// The window's page sends
//   t3:swap-new:<lane index>:<project>  a new chat in lane <index> (all panes open, New thread dropped on it)
//   t3:close-main:                  the window's own chat closes: it takes the first lane's chat
//                                   and that lane goes, so the panes close up as in the Claude app
// Lanes are the window's child views, in the order main-patch.js keeps them. Its spare view and
// its drag overlay are only children during a drag, and both of these come after the drag ends.
(() => {
  const { BrowserWindow } = require("electron");
  const g = globalThis;
  const VERSION = 4;
  if (g.__t3swap?.version === VERSION) return "swap already on";
  g.__t3swap?.uninstall();

  const MARK = "⁣t3:";
  const isT3 = (w) => w && !w.isDestroyed() && w.webContents.getURL().startsWith("t3code://app/");
  const host = () => BrowserWindow.getAllWindows().find(isT3);
  const laneWcs = () => {
    const win = host();
    if (!win) return [];
    return win.contentView.children.map((v) => v.webContents).filter((wc) => wc && !wc.isDestroyed() && wc !== win.webContents);
  };
  const run = (wc, js) => wc.executeJavaScript(js).catch(() => {});
  const closeMain = () => {
    const win = host(), first = laneWcs()[0];
    if (!win || !first) return;
    const url = first.getURL(), at = url.indexOf("#");
    run(win.webContents, `location.hash = ${JSON.stringify(at >= 0 ? url.slice(at) : "#/")}`);
    run(first, `console.debug("\u2063t3:close:")`); // main-patch.js closes the lane that asks
  };
  const onConsole = (ev, _level, message) => {
    const text = typeof ev?.message === "string" ? ev.message : message;
    if (typeof text !== "string" || !text.startsWith(MARK)) return;
    const [kind, idx, ...rest] = text.slice(MARK.length).split(":");
    if (kind === "close-main") closeMain();
    else if (kind === "swap-new") { const wc = laneWcs()[Number(idx)]; if (wc) run(wc, `window.__t3laneNew?.(${JSON.stringify(rest.join(":"))})`); }
  };
  let bound = null;
  const bind = () => {
    const wc = host()?.webContents;
    if (!wc || wc === bound) return;
    bound?.off("console-message", onConsole);
    bound = wc;
    wc.on("console-message", onConsole);
  };
  bind();
  const timer = setInterval(bind, 3000); // a new window (T3 reopened its own) gets bound too

  g.__t3swap = {
    version: VERSION,
    uninstall() { clearInterval(timer); bound?.off("console-message", onConsole); delete g.__t3swap; },
  };
  return "swap on";
})()
