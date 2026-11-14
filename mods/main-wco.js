// Runs in T3's main process beside main-patch.js (sent the same way, by t3-scenes.mjs). The
// window's minimise/maximise/close buttons are drawn by Windows in a strip T3 makes 40 px tall;
// compact panes have a 30 px top bar, so the buttons hung below the bar and their X sat lower than
// the bar's own buttons. While compact is on, the window's page sends
//   t3:wco:<css px>   the strip's height in page pixels (0 = give T3 its own height back)
// and the strip is set to that, in window pixels. T3's own later calls (a theme change) keep it.
(() => {
  const { BrowserWindow } = require("electron");
  const g = globalThis;
  const VERSION = 1;
  if (g.__t3wco?.version === VERSION) return "wco already on";
  g.__t3wco?.uninstall();

  const MARK = "⁣t3:";
  const isT3 = (w) => w && !w.isDestroyed() && w.webContents.getURL().startsWith("t3code://app/");
  const host = () => BrowserWindow.getAllWindows().find(isT3);
  let want = 0; // page pixels, 0 = T3's own
  let t3Height = 40; // what T3 last asked for (its default)
  let wrapped = null, nativeSet = null;
  const apply = () => {
    const win = host();
    if (!win || !nativeSet) return;
    const z = win.webContents.getZoomFactor() || 1;
    try { nativeSet.call(win, { height: want > 0 ? Math.round(want * z) : t3Height }); } catch {}
  };
  const onConsole = (ev, _level, message) => {
    const text = typeof ev?.message === "string" ? ev.message : message;
    if (typeof text !== "string" || !text.startsWith(MARK + "wco:")) return;
    const n = Number(text.slice(MARK.length + 4));
    if (!Number.isFinite(n)) return;
    want = Math.max(0, Math.min(60, n));
    apply();
  };
  let bound = null;
  const bind = () => {
    const win = host();
    const wc = win?.webContents;
    if (!wc || wc === bound) return;
    bound?.off("console-message", onConsole);
    bound = wc;
    wc.on("console-message", onConsole);
    // T3 sets the strip again on theme changes: keep its colours, but our height while compact
    if (wrapped && !wrapped.isDestroyed() && nativeSet) wrapped.setTitleBarOverlay = nativeSet;
    wrapped = win;
    nativeSet = win.setTitleBarOverlay;
    win.setTitleBarOverlay = function (opts = {}) {
      if (Number.isFinite(opts.height)) t3Height = opts.height;
      const z = win.webContents.getZoomFactor() || 1;
      return nativeSet.call(win, want > 0 ? { ...opts, height: Math.round(want * z) } : opts);
    };
    win.webContents.executeJavaScript(`window.__t3wcoAsk?.()`).catch(() => {});
  };
  bind();
  const timer = setInterval(bind, 3000); // a new window (T3 reopened its own) gets bound too

  g.__t3wco = {
    version: VERSION,
    uninstall() {
      clearInterval(timer);
      bound?.off("console-message", onConsole);
      if (wrapped && !wrapped.isDestroyed() && nativeSet) { wrapped.setTitleBarOverlay = nativeSet; try { nativeSet.call(wrapped, { height: t3Height }); } catch {} }
      delete g.__t3wco;
    },
  };
  return "wco on";
})()
