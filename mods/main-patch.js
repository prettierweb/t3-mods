// Runs inside T3's main (Electron) process, sent by t3-scenes.mjs over the Node inspector, which
// it opens only for this and closes right after. Two things T3 can't do from its page:
//  1. Context menus: T3 shows a native Windows menu. Each popup's items are handed to the page,
//     drawn there as a Look-styled menu (window.__t3menu), and the chosen item's own click runs,
//     so T3 acts exactly as if the native menu were used. No page menu, or an error: native menu.
//  2. Lanes, the way the Claude app has them: more chats side by side inside the one window. Each
//     lane is a see-through view with T3's own preload (so it signs in like the window), loaded in
//     lane mode (no sidebar, a close button). The window's page splits its chat area into columns
//     and reports where each lane goes; the scene behind shows through all of them.
// The pages talk to this through console messages, since T3's page bridge is fixed.
(() => {
  const { app, BrowserWindow, Menu, WebContentsView } = require("electron");
  const path = require("path");
  const g = globalThis;
  // re-sent on every helper start: the same version stays put, so open lanes survive
  const VERSION = 24;
  if (g.__t3patch?.version === VERSION) return "already patched";
  // a new version closes the lanes: they are opened again below, in the same order
  const reopen = g.__t3patch?.laneHashes ? g.__t3patch.laneHashes() : g.__t3patch ? (BrowserWindow.getAllWindows().find((w) => !w.isDestroyed() && w.webContents.getURL().startsWith("t3code://app/"))?.contentView.children ?? []).map((v) => v.webContents?.getURL() ?? "").filter((u) => u.includes("t3lane") && u.includes("#")).map((u) => u.slice(u.indexOf("#"))) : [];
  g.__t3patch?.uninstall();

  const MARK = "⁣t3:";
  const SCENES_JS = "__SCENES_JS__";
  const MAX_LANES = 7; // eight panes with the window's own chat: two rows of four
  const isT3 = (w) => w && !w.isDestroyed() && w.webContents.getURL().startsWith("t3code://app/");
  const host = () => BrowserWindow.getAllWindows().find(isT3);
  const lanes = []; // { view, wc }
  const laneOf = (wc) => lanes.find((l) => l.wc === wc);
  let menuFrom = null; // { wc, at }: the lane that was just right-clicked

  // ── 1. menus ────────────────────────────────────────────────────────────────
  const nativePopup = Menu.prototype.popup;
  Menu.prototype.popup = function (opts = {}) {
    if (!isT3(opts.window) || typeof opts.callback !== "function") return nativePopup.call(this, opts);
    // T3 aims every menu at its window; a menu asked for inside a lane is drawn in that lane
    const inLane = menuFrom && Date.now() - menuFrom.at < 1500 && !menuFrom.wc.isDestroyed() ? menuFrom.wc : null;
    menuFrom = null;
    const wc = inLane ?? opts.window.webContents;
    const clicks = {};
    const describe = (menu, prefix) => menu.items.filter((it) => it.visible !== false).map((it, i) => {
      const id = prefix + i;
      if (it.type === "separator") return { separator: true };
      if (it.submenu) return { id, label: it.label, enabled: it.enabled, children: describe(it.submenu, id + ".") };
      clicks[id] = it;
      return { id, label: it.label, enabled: it.enabled, checked: it.type === "checkbox" ? it.checked : undefined, destructive: !!it.icon };
    });
    const items = describe(this, "");
    const at = !inLane && Number.isFinite(opts.x) ? `${opts.x}, ${opts.y}` : "null, null";
    wc.executeJavaScript(`window.__t3menu ? window.__t3menu.show(${JSON.stringify(items)}, ${at}) : "__native__"`, true)
      .then((id) => {
        if (id === "__native__") return nativePopup.call(this, opts);
        if (id && clicks[id]) clicks[id].click(); else opts.callback();
      })
      .catch(() => opts.callback()); // the pane closed or reloaded with the menu open: nothing to show
  };

  // ── 2. lanes ────────────────────────────────────────────────────────────────
  const preload = path.join(path.dirname(process.mainModule?.filename ?? require.main.filename), "preload.cjs");
  // whether the T3 window has focus, told to every pane: a page losing focus to a lane beside it
  // isn't T3 losing focus, so only the window's own focus pauses the scenes
  const sendFocus = () => {
    const win = host();
    if (!win) return;
    const f = win.isFocused();
    [win.webContents, ...lanes.map((l) => l.wc)].forEach((wc) => { if (!wc.isDestroyed()) wc.executeJavaScript(`window.__t3windowFocus?.(${f})`).catch(() => {}); });
  };
  const tellHost = (closed = -1) => {
    const win = host();
    win?.webContents.executeJavaScript(`window.__t3lanes?.count(${lanes.length}, ${closed})`).catch(() => {});
    sendFocus();
  };
  // A lane is a whole T3 page, which takes a few seconds to start. One is kept loaded in the
  // background (warmed when he starts dragging a chat or opens a chat's menu) and only switches
  // route when it becomes a lane, so a lane appears at once. With no lanes open it is let go.
  const laneUrl = (hash) => host().webContents.getURL().split("#")[0].split("?")[0] + "?t3lane=1" + hash;
  // T3 keeps one empty draft per project and reads which one from shared storage, so a lane would
  // reopen the window's draft. A lane reads that storage without the project-to-draft links (set
  // before T3's own code runs), so "New thread" in a lane starts a draft of its own. When the lane
  // saves, the window's links are kept: the window's own draft for a project wins.
  const OWN_DRAFTS = `(() => {
    const KEY = "t3code:composer-drafts:v1", get = Storage.prototype.getItem, set = Storage.prototype.setItem;
    const LINKS = ["logicalProjectDraftThreadKeyByLogicalProjectKey", "projectDraftThreadIdByProjectKey", "projectDraftThreadIdByProjectId"];
    // Each pane writes its whole drafts list. A lane keeps drafts it never knew about (the window's,
    // another lane's) instead of writing over them; one it knew and dropped (sent) stays dropped.
    const DRAFTS = ["draftsByThreadKey", "draftThreadsByThreadKey"], seen = { draftsByThreadKey: new Set(), draftThreadsByThreadKey: new Set() };
    const note = (st) => { for (const f of DRAFTS) for (const key of Object.keys((st && st[f]) || {})) seen[f].add(key); };
    Storage.prototype.setItem = function (k, v) {
      if (k === KEY && this === window.localStorage) {
        try {
          const mine = JSON.parse(v), was = JSON.parse(get.call(this, k) || "null");
          if (mine && mine.state && was && was.state) {
            for (const f of LINKS) if (was.state[f]) mine.state[f] = { ...(mine.state[f] || {}), ...was.state[f] };
            note(mine.state);
            for (const f of DRAFTS) {
              const theirs = was.state[f] || {}, ours = (mine.state[f] = mine.state[f] || {});
              for (const key of Object.keys(theirs)) if (!(key in ours) && !seen[f].has(key)) ours[key] = theirs[key];
            }
          }
          v = JSON.stringify(mine);
        } catch {}
      }
      return set.call(this, k, v);
    };
    Storage.prototype.getItem = function (k) {
      const v = get.call(this, k);
      if (k !== KEY || !v || this !== window.localStorage) return v;
      try {
        const j = JSON.parse(v), st = j && j.state;
        if (!st) return v;
        note(st);
        for (const f of LINKS) if (st[f]) st[f] = {};
        return JSON.stringify(j);
      } catch { return v; }
    };
  })()`;
  const shows = (l, hash) => !l.wc.isDestroyed() && (l.wc.getURL().endsWith(hash) || (l.opening === hash && Date.now() - l.openedAt < 3000));
  const opening = (l, hash) => { l.opening = hash; l.openedAt = Date.now(); };
  const laneHashes = () => lanes.map((l) => { const u = l.wc.isDestroyed() ? "" : l.wc.getURL(), at = u.indexOf("#"); return at >= 0 ? u.slice(at) : l.opening; }).filter(Boolean);
  const makeView = () => {
    const view = new WebContentsView({ webPreferences: { preload, sandbox: true, contextIsolation: true, nodeIntegration: false, transparent: true } });
    view.setBackgroundColor("#00000000");
    const lane = { view, wc: view.webContents };
    laneWcs.add(lane.wc);
    // the script can only be set once the view has a page, so it starts on a blank one
    const ready = lane.wc.loadURL("about:blank")
      .then(() => { lane.wc.debugger.attach("1.3"); return lane.wc.debugger.sendCommand("Page.enable"); })
      .then(() => lane.wc.debugger.sendCommand("Page.addScriptToEvaluateOnNewDocument", { source: OWN_DRAFTS }))
      .then(() => {
        let source = "";
        try { source = require("fs").readFileSync(SCENES_JS, "utf8"); } catch {}
        if (source) return lane.wc.debugger.sendCommand("Page.addScriptToEvaluateOnNewDocument", { source });
      })
      .catch(() => {});
    lane.loaded = false;
    lane.load = (url) => (lane.loading = ready.then(() => lane.wc.loadURL(url)).then(() => { lane.loaded = true; }, () => {}));
    watch(lane.wc);
    lane.wc.on("did-finish-load", () => { lane.corner = null; lane.zoomed = null; tellHost(); }); // a reloaded lane needs its flags again
    const gone = () => { if (spare === lane) spare = null; if (dragState?.prepared === lane) dragState.prepared = null; closeLane(lane.wc); };
    lane.wc.on("render-process-gone", gone);
    lane.wc.once("destroyed", gone);
    return lane;
  };
  let spare = null, spareTimer = null;
  const warm = (force) => {
    if (!host() || (force !== true && lanes.length >= MAX_LANES)) return;
    // warmed by a menu or a drag that came to nothing: with no lanes open it goes after 20 s
    clearTimeout(spareTimer);
    if (lanes.length === 0) spareTimer = setTimeout(() => { if (lanes.length === 0) dropSpare(); }, 20000);
    if (spare) return;
    spare = makeView();
    spare.load(laneUrl("#/"));
  };
  const warmNext = () => setTimeout(() => { if (lanes.length > 0) warm(); }, 1500); // the next one, once this one has started
  const dropSpare = () => { clearTimeout(spareTimer); if (spare) { if (!spare.wc.isDestroyed()) spare.wc.close({ waitForBeforeUnload: false }); spare = null; } };
  const openLane = (hash, at = lanes.length) => {
    const win = host();
    if (!win || typeof hash !== "string" || !/^#\/[\w%:.\-]+\/[\w%:.\-]+$/.test(hash) || lanes.length >= MAX_LANES) return;
    // a chat already on screen isn't opened twice: its lane flashes instead
    const shown = lanes.find((l) => shows(l, hash));
    if (shown) { shown.wc.executeJavaScript("window.__t3laneFlash?.()").catch(() => {}); return; }
    if (win.webContents.getURL().endsWith(hash)) return;
    let lane = spare;
    spare = null;
    const prepared = !!lane && dragState?.prepared === lane && dragState?.hash === hash;
    if (dragState?.prepared === lane) dragState.prepared = null;
    if (lane && !lane.wc.isDestroyed() && (lane.loaded || lane.loading)) {
      const go = () => lane.wc.executeJavaScript(`location.hash = ${JSON.stringify(hash)}`).catch(() => {}); // T3 routes by hash: no reload
      if (lane.loaded) go(); else lane.loading.then(go);
    } else {
      if (lane) lane.wc.close({ waitForBeforeUnload: false });
      lane = makeView();
      lane.load(laneUrl(hash));
    }
    if (!prepared) lane.view.setBounds({ x: 0, y: 0, width: 0, height: 0 }); // placed once the window's page reports the columns
    opening(lane, hash);
    lanes.splice(at, 0, lane);
    lanes.forEach((l) => win.contentView.addChildView(l.view)); // on top, and in lane order for main-swap.js
    tellHost();
    warmNext();
  };
  // an empty lane: a lane page presses its own "New thread" (or "New thread in <project>"), so T3
  // starts a fresh draft exactly as it would from the sidebar
  const openNewLane = (project, at = lanes.length) => {
    const win = host();
    if (!win || lanes.length >= MAX_LANES) return;
    // the page's scene script may still be on its way: wait for it rather than miss the press
    const press = (l) => l.wc.executeJavaScript(`new Promise((done) => { let i = 0; const t = setInterval(() => { if (window.__t3laneNew) { clearInterval(t); done(window.__t3laneNew(${JSON.stringify(typeof project === "string" ? project : "")})); } else if (++i > 100) { clearInterval(t); done(false); } }, 100); })`).catch(() => {});
    let lane = spare;
    spare = null;
    if (dragState?.prepared === lane) dragState.prepared = null;
    if (lane && !lane.wc.isDestroyed() && lane.loaded) press(lane);
    else if (lane && !lane.wc.isDestroyed() && lane.loading) lane.loading.then(() => press(lane));
    else {
      if (lane) lane.wc.close({ waitForBeforeUnload: false });
      lane = makeView();
      lane.load(laneUrl("#/")).then(() => press(lane));
    }
    lane.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    lanes.splice(at, 0, lane);
    lanes.forEach((l) => win.contentView.addChildView(l.view));
    tellHost();
    warmNext();
  };
  const closeLane = (wc) => {
    const i = lanes.findIndex((l) => l.wc === wc);
    if (i < 0) return;
    const [lane] = lanes.splice(i, 1);
    host()?.contentView.removeChildView(lane.view);
    if (!lane.wc.isDestroyed()) lane.wc.close({ waitForBeforeUnload: false });
    if (lanes.length === 0) dropSpare();
    tellHost(i);
  };
  // Dragging a chat, the way the Claude app shows it: one see-through view above every pane draws
  // a blue box on the spot the chat will land (it slides between spots), a pill in the box and a
  // label on the pointer. The target pane dims and blurs itself. Out of sight the
  // spare lane opens that chat at that size, so the drop only has to bring it to the front.
  const DRAG_UI = "data:text/html;charset=utf-8," + encodeURIComponent(`<!doctype html><style>
    html,body{margin:0;height:100%;background:transparent;overflow:hidden;font:500 12px system-ui,"Segoe UI",sans-serif;user-select:none}
    #box{position:fixed;box-sizing:border-box;border:1.5px solid #2f81e4;border-radius:10px;background:rgba(10,10,12,.55);opacity:0;transition:left 90ms ease-out,top 90ms ease-out,width 90ms ease-out,height 90ms ease-out,opacity 90ms}
    #pill{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:4px 11px;border-radius:999px;background:#2f81e4;color:#fff;white-space:nowrap}
    .ghost{position:fixed;box-sizing:border-box;border:1px dashed rgba(255,255,255,.35);border-radius:10px;background:rgba(10,10,12,.35);transition:left 90ms ease-out,top 90ms ease-out,width 90ms ease-out,height 90ms ease-out}
    #chip{position:fixed;left:0;top:0;max-width:260px;padding:3px 8px;border-radius:6px;background:#26262a;color:#f2f2f3;box-shadow:0 2px 8px rgba(0,0,0,.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:0}
    </style><div id=ghosts></div><div id=box><div id=pill></div></div><div id=chip></div><script>
    const box=document.getElementById("box"),pill=document.getElementById("pill"),chip=document.getElementById("chip"),gh=document.getElementById("ghosts"),px=(v)=>v+"px";
    const ghosts=(list)=>{while(gh.children.length>list.length)gh.lastChild.remove();while(gh.children.length<list.length){const g=document.createElement("div");g.className="ghost";gh.append(g)}
      list.forEach((r,i)=>Object.assign(gh.children[i].style,{left:px(r.x),top:px(r.y),width:px(r.width),height:px(r.height)}))};
    window.__show=(r,text,g)=>{ghosts(r&&g?g:[]);if(!r){box.style.opacity=0;return}
      if(box.style.opacity!=="1"){box.style.transition="none";Object.assign(box.style,{left:px(r.x),top:px(r.y),width:px(r.width),height:px(r.height)});void box.offsetWidth;box.style.transition=""}
      Object.assign(box.style,{left:px(r.x),top:px(r.y),width:px(r.width),height:px(r.height),opacity:1});pill.textContent=text};
    window.__chip=(x,y,text)=>{chip.style.transform="translate("+(x+12)+"px,"+(y+14)+"px)";chip.textContent=text;chip.style.opacity=1};
    window.__reset=()=>{ghosts([]);box.style.opacity=0;chip.style.opacity=0;idle=0;ix=iy=-1};
    const say=(t)=>console.debug("\u2063t3:"+t);
    let idle=0,ix=-1,iy=-1;
    addEventListener("pointermove",(e)=>{if(e.buttons){idle=0;say("drag-pointer:pointermove:"+e.clientX+":"+e.clientY);return}
      if(e.clientX===ix&&e.clientY===iy)return;ix=e.clientX;iy=e.clientY;if(++idle>=3){idle=0;say("drag-cancel:")}});
    addEventListener("pointerup",(e)=>say("drag-pointer:pointerup:"+e.clientX+":"+e.clientY));
    addEventListener("pointerdown",()=>say("drag-cancel:"));
    </script>`);
  let dragUi = null;
  let dragState = null; // { hash, blurred, prepared, order: the lanes when the drag began, which the page's pane numbers refer to }
  let lastShow = null;
  const uiRun = (js) => { if (dragUi && !dragUi.wc.isDestroyed()) dragUi.wc.executeJavaScript(js).catch(() => {}); };
  const ensureDragUi = () => {
    if (dragUi && !dragUi.wc.isDestroyed()) return dragUi;
    const view = new WebContentsView({ webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, transparent: true } });
    view.setBackgroundColor("#00000000");
    dragUi = { view, wc: view.webContents };
    watch(dragUi.wc);
    dragUi.wc.once("did-finish-load", () => { if (dragState && lastShow) uiRun(lastShow); }); // asked before the page was there
    dragUi.wc.loadURL(DRAG_UI).catch(() => {});
    return dragUi;
  };
  const zoomOf = () => host()?.webContents.getZoomFactor() ?? 1;
  const setBlur = (lane) => {
    if (dragState?.blurred === lane) return;
    const was = dragState?.blurred;
    if (was && !was.wc.isDestroyed()) was.wc.executeJavaScript(`document.documentElement.removeAttribute("data-t3-drop-blur")`).catch(() => {});
    if (dragState) dragState.blurred = lane;
    if (lane && !lane.wc.isDestroyed()) lane.wc.executeJavaScript(`document.documentElement.setAttribute("data-t3-drop-blur", "")`).catch(() => {});
  };
  const onScreen = (hash) => !!hash && (lanes.some((l) => shows(l, hash)) || host()?.webContents.getURL().endsWith(hash));
  const dragStart = () => {
    const win = host();
    if (!win || dragState) return;
    const ui = ensureDragUi(), [width, height] = win.getContentSize();
    ui.view.setBounds({ x: 0, y: 0, width, height });
    win.contentView.addChildView(ui.view);
    uiRun("window.__reset?.()");
    dragState = { hash: "", blurred: null, prepared: null, order: [...lanes] };
    lastShow = null;
  };
  // the spare lane loads the chat out of sight (lanes are see-through, so it cannot just sit behind one), at the size it will have
  const prepare = (hash, r) => {
    const win = host();
    if (!win || !dragState) return;
    if (!hash || onScreen(hash)) return;
    warm(true);
    clearTimeout(spareTimer);
    const lane = spare;
    if (!lane || lane.wc.isDestroyed()) return;
    const paint = () => {
      if (!dragState || spare !== lane || lane.wc.isDestroyed()) return;
      const z = zoomOf();
      if (dragState.hash !== hash) { dragState.hash = hash; lane.wc.executeJavaScript(`location.hash = ${JSON.stringify(hash)}`).catch(() => {}); }
      if (Math.abs(lane.wc.getZoomFactor() - z) > 0.001) lane.wc.setZoomFactor(z);
      lane.view.setBounds({ x: Math.round(r.x * z), y: Math.round(r.y * z), width: Math.round(r.width * z), height: Math.round(r.height * z) });
      if (dragState.prepared !== lane) { dragState.prepared = lane; lane.view.setVisible(false); win.contentView.addChildView(lane.view, 0); }
    };
    if (lane.loaded) paint(); else lane.loading?.then(paint);
  };
  const dragTarget = (t) => {
    if (!dragState) dragStart();
    if (!dragState) return;
    const z = zoomOf();
    if (!t) { lastShow = null; uiRun("window.__show(null)"); setBlur(null); return; }
    const r = { x: t.x * z, y: t.y * z, width: t.width * z, height: t.height * z };
    // the other panes as dashed outlines where they will be after the drop (the new pane is the box)
    const g = (t.ghosts ?? []).filter((c) => Math.abs(c.x - t.x) > 1 || Math.abs(c.y - t.y) > 1).map((c) => ({ x: c.x * z, y: c.y * z, width: c.width * z, height: c.height * z }));
    lastShow = `window.__show(${JSON.stringify(r)}, ${JSON.stringify(t.pill)}, ${JSON.stringify(g)})`;
    uiRun(lastShow);
    const target = t.blur > 0 ? dragState.order[t.blur - 1] : null;
    setBlur(target && lanes.includes(target) ? target : null);
    prepare(t.hash, t);
  };
  const dragEnd = () => {
    if (!dragState) return;
    const win = host(), { prepared } = dragState;
    setBlur(null);
    dragState = null;
    uiRun("window.__reset?.()");
    if (dragUi) win?.contentView.removeChildView(dragUi.view);
    if (prepared && !lanes.includes(prepared)) win?.contentView.removeChildView(prepared.view);
    if (lanes.length === 0 && spare) { clearTimeout(spareTimer); spareTimer = setTimeout(() => { if (lanes.length === 0) dropSpare(); }, 20000); }
  };
  // the drop into a lane: the prepared spare takes its place, so nothing has to load
  const replaceLane = (i, hash) => {
    const win = host(), old = lanes[i];
    if (!win || !old) return;
    if (win.webContents.getURL().endsWith(hash)) return;
    const shown = lanes.find((l) => shows(l, hash));
    if (shown) { shown.wc.executeJavaScript("window.__t3laneFlash?.()").catch(() => {}); return; }
    if (dragState?.prepared === spare && dragState?.hash === hash && spare) {
      const lane = spare;
      spare = null;
      dragState.prepared = null;
      opening(lane, hash);
      lanes[i] = lane;
      win.contentView.removeChildView(old.view);
      if (!old.wc.isDestroyed()) old.wc.close({ waitForBeforeUnload: false });
      lanes.forEach((l) => win.contentView.addChildView(l.view)); // main-swap.js reads lanes in child order
      tellHost();
      warmNext();
    } else { opening(old, hash); old.wc.executeJavaScript(`location.hash = ${JSON.stringify(hash)}`).catch(() => {}); }
  };
  // a reload of the window's page forgets its columns: tell it again
  const hostLoaded = () => { dragEnd(); tellHost(); }; // a page that reloaded mid-drag has forgotten the drag
  let hostWc = null, hostWin = null;
  const bindHost = () => {
    const win = host(), wc = win?.webContents;
    if (!wc || wc === hostWc) return;
    // T3 made a new window: the lanes sat in the old one, so they open again in this one
    const moved = hostWc ? laneHashes() : [];
    if (hostWc) { dragEnd(); [...lanes].forEach((l) => closeLane(l.wc)); }
    if (!hostWc?.isDestroyed()) hostWc?.off("did-finish-load", hostLoaded);
    hostWin?.off("focus", sendFocus); hostWin?.off("blur", sendFocus);
    hostWc = wc; hostWin = win;
    wc.on("did-finish-load", hostLoaded);
    win.on("focus", sendFocus); win.on("blur", sendFocus);
    moved.forEach((hash) => openLane(hash));
  };
  bindHost();
  // rects from the window's page: one per lane, in order. "corner" marks the lane under the
  // window's minimise/maximise/close buttons, which makes room for them.
  // The page measures in its own CSS pixels, which Ctrl+= / Ctrl+- zoom stretches: the rects are
  // scaled to window pixels, and each lane takes the window's zoom so its text matches.
  const place = (rects) => lanes.forEach((l, i) => {
    const r = rects[i];
    if (!r) return;
    const z = host()?.webContents.getZoomFactor() ?? 1;
    if (!l.wc.isDestroyed() && Math.abs(l.wc.getZoomFactor() - z) > 0.001) l.wc.setZoomFactor(z);
    l.view.setBounds({ x: Math.round(r.x * z), y: Math.round(r.y * z), width: Math.round(r.width * z), height: Math.round(r.height * z) });
    l.view.setVisible(true);
    if (l.zoomed !== z && !l.wc.isDestroyed()) { l.zoomed = z; l.wc.executeJavaScript(`document.documentElement.style.setProperty("--t3-zoom", "${z}")`).catch(() => {}); }
    if (l.corner !== !!r.corner) { l.corner = !!r.corner; l.wc.executeJavaScript(`document.documentElement.toggleAttribute("data-t3-lane-last", ${l.corner})`).catch(() => {}); }
  });
  // while he drags a divider, lanes step aside (the page shows outlines) so the drag stays smooth
  const hideLanes = () => lanes.forEach((l) => l.view.setVisible(false));

  const onConsole = (ev, _level, message) => {
    const text = typeof ev?.message === "string" ? ev.message : message;
    if (typeof text !== "string" || !text.startsWith(MARK)) return;
    const [kind, ...rest] = text.slice(MARK.length).split(":");
    const arg = rest.join(":");
    const from = ev?.sender ?? null;
    if (kind === "lane") openLane(arg);
    else if (kind === "lane-new") openNewLane(arg);
    else if (kind === "layout") { try { place(JSON.parse(arg)); } catch {} }
    else if (kind === "close" && from) closeLane(from); // only the lane that asked
    else if (kind === "menu" && from) menuFrom = laneOf(from) ? { wc: from, at: Date.now() } : null;
    else if (kind === "warm") warm();
    else if (kind === "drag-start") dragStart();
    else if (kind === "drag-chip") { const z = zoomOf(), cut = arg.indexOf(":"), cut2 = arg.indexOf(":", cut + 1); uiRun(`window.__chip(${Number(arg.slice(0, cut)) * z}, ${Number(arg.slice(cut + 1, cut2)) * z}, ${JSON.stringify(arg.slice(cut2 + 1))})`); }
    else if (kind === "drag-target") { try { dragTarget(JSON.parse(arg)); } catch {} }
    else if (kind === "drag-end") dragEnd();
    else if (kind === "drag-open") { try { const d = JSON.parse(arg), target = dragState?.order[d.lane], i = target ? lanes.indexOf(target) : d.lane; if (i >= 0) replaceLane(i, d.hash); } catch {} dragEnd(); }
    else if (kind === "drag-split") { try { const d = JSON.parse(arg), before = d.index > 0 ? dragState?.order[d.index - 1] : null, at = d.index === 0 ? 0 : before && lanes.includes(before) ? lanes.indexOf(before) + 1 : lanes.length; if (d.project !== undefined) openNewLane(d.project, at); else openLane(d.hash, at); } catch {} dragEnd(); }
    else if (kind === "drag-cancel") { host()?.webContents.executeJavaScript(`window.__t3dragPointer?.("cancel", 0, 0)`).catch(() => {}); dragEnd(); }
    else if (kind === "drag-pointer") { // the pointer ended up over this view after all: hand it to the window's page
      const [type, x, y] = arg.split(":"), z = zoomOf();
      host()?.webContents.executeJavaScript(`window.__t3dragPointer?.(${JSON.stringify(type)}, ${Number(x) / z}, ${Number(y) / z})`).catch(() => {});
    }
    else if (kind === "hide") { // with a list, only those lanes step aside (a menu of the window's that reaches into them); bare, all of them
      let only = null;
      try { only = arg ? JSON.parse(arg) : null; } catch {}
      if (Array.isArray(only)) lanes.forEach((l, i) => l.view.setVisible(!only.includes(i))); else hideLanes();
    }
    else if (kind === "swap" && from) { // Move left / right from a pane's top bar: two panes trade chats (v22)
      const panes = [host()?.webContents, ...lanes.map((l) => l.wc)].filter(Boolean);
      const i = panes.indexOf(from), j = i + Number(arg);
      if (i < 0 || j < 0 || j >= panes.length || panes[i].isDestroyed() || panes[j].isDestroyed()) return;
      const hashOf = (wc) => { const u = wc.getURL(), at = u.indexOf("#"); return at >= 0 ? u.slice(at) : ""; };
      const a = hashOf(panes[i]), b = hashOf(panes[j]);
      if (!a || !b) return;
      const go = (wc, h) => wc.executeJavaScript(`localStorage.setItem("t3swapping", String(Date.now())); location.hash = ${JSON.stringify(h)}`).catch(() => {});
      const li = lanes.findIndex((l) => l.wc === panes[i]), lj = lanes.findIndex((l) => l.wc === panes[j]);
      if (li >= 0) opening(lanes[li], b);
      if (lj >= 0) opening(lanes[lj], a);
      go(panes[i], b); go(panes[j], a);
    }
    else if (kind === "hello" && from && !laneOf(from)) { bindHost(); tellHost(); } // the window's page (re)started: give it the columns
  };
  const watched = new Set();
  const watch = (wc) => {
    if (watched.has(wc)) return;
    watched.add(wc);
    // which page sent a message: the listener is per page, so bind the sender here
    const listener = (ev, ...args) => onConsole(Object.assign(ev ?? {}, { sender: wc }), ...args);
    wc.on("console-message", listener);
    wc.once("destroyed", () => watched.delete(wc));
    wc.__t3listener = listener;
  };
  BrowserWindow.getAllWindows().filter(isT3).forEach((w) => watch(w.webContents));
  const onCreated = (_e, w) => w.webContents.once("did-finish-load", () => { if (isT3(w)) { watch(w.webContents); bindHost(); } });
  app.on("browser-window-created", onCreated);

  // ── 3. lanes may use T3's page bridge ────────────────────────────────────────
  // Since T3 0.1.9 the main process answers its page bridge (settings, connection list, sign-in)
  // only when the call comes from the window's own page; a lane got "Something went wrong,
  // fetch-session-state (HTTP 500)". A lane is the same T3 page, so a call from a lane's top frame
  // is handed to T3 as the window's own. Calls from anything else are passed on untouched.
  const { ipcMain } = require("electron");
  const laneWcs = new WeakSet();
  const asHost = (event) => {
    try {
      const from = event?.sender, hw = host()?.webContents;
      if (!from || !hw || !laneWcs.has(from) || from.isDestroyed() || event.senderFrame !== from.mainFrame) return event;
      return new Proxy(event, {
        get: (t, k) => (k === "sender" ? hw : k === "senderFrame" ? hw.mainFrame : typeof t[k] === "function" ? t[k].bind(t) : t[k]),
        set: (t, k, v) => { t[k] = v; return true; }, // a sync call's answer goes on the real event
      });
    } catch { return event; }
  };
  const asHostFn = (fn) => {
    if (typeof fn !== "function" || fn.__t3orig) return fn;
    const w = function (event, ...args) { return fn.call(this, asHost(event), ...args); };
    w.__t3orig = fn;
    return w;
  };
  const nativeHandle = ipcMain.handle, nativeOn = ipcMain.on;
  const invokes = ipcMain._invokeHandlers instanceof Map ? ipcMain._invokeHandlers : null;
  let bridged = 0;
  if (invokes) for (const [channel, fn] of [...invokes]) { invokes.set(channel, asHostFn(fn)); bridged++; }
  const desktopChannels = ipcMain.eventNames().filter((n) => typeof n === "string" && n.startsWith("desktop:"));
  for (const channel of desktopChannels) for (const fn of ipcMain.listeners(channel)) { ipcMain.off(channel, fn); nativeOn.call(ipcMain, channel, asHostFn(fn)); bridged++; }
  // handlers T3 registers later (it re-registers on some reloads) are wrapped the same way
  ipcMain.handle = function (channel, fn) { return nativeHandle.call(this, channel, asHostFn(fn)); };
  ipcMain.on = function (channel, fn) { return nativeOn.call(this, channel, typeof channel === "string" && channel.startsWith("desktop:") ? asHostFn(fn) : fn); };
  const unbridge = () => {
    ipcMain.handle = nativeHandle; ipcMain.on = nativeOn;
    if (invokes) for (const [channel, fn] of [...invokes]) if (fn.__t3orig) invokes.set(channel, fn.__t3orig);
    for (const channel of ipcMain.eventNames()) for (const fn of ipcMain.listeners(channel)) if (fn.__t3orig) { ipcMain.off(channel, fn); nativeOn.call(ipcMain, channel, fn.__t3orig); }
  };

  g.__t3patch = {
    version: VERSION,
    lanes: () => lanes.length,
    laneHashes,
    uninstall() {
      Menu.prototype.popup = nativePopup;
      unbridge();
      app.off("browser-window-created", onCreated);
      dragEnd();
      if (dragUi && !dragUi.wc.isDestroyed()) dragUi.wc.close({ waitForBeforeUnload: false });
      [...lanes].forEach((l) => closeLane(l.wc));
      dropSpare();
      if (!hostWc?.isDestroyed()) hostWc?.off("did-finish-load", hostLoaded);
      if (!hostWin?.isDestroyed()) { hostWin?.off("focus", sendFocus); hostWin?.off("blur", sendFocus); }
      watched.forEach((wc) => { if (!wc.isDestroyed() && wc.__t3listener) wc.off("console-message", wc.__t3listener); });
      delete g.__t3patch;
    },
  };
  ensureDragUi(); // loaded ahead, so the first drag after a start shows its box
  reopen.forEach((hash) => openLane(hash));
  return `patched (lanes use the page bridge: ${bridged} channels)`;
})()
