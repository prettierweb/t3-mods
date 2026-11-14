// Dictation in T3's own message box, the way the Claude app does it. dictate.pyw owns the mic and
// the model and talks to every T3 page (the window and each lane) over a local socket. Ctrl+D or
// the mic button starts it; the words stream into the box at the cursor as you speak, with the
// part still being heard dimmer. Ctrl+D, Esc or the check stops and keeps them. Nov 4: nothing here
// ever takes words back out of the box (Esc used to, and a paragraph was lost); the cross stops at
// once and keeps what is already in the box. The box is also backed up per chat (right-click the mic).

const PORT = 9341;
const STEP_MS = 40;            // one waveform bar per level message
const BAR_W = 3, BAR_GAP = 3;

const MIC_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></svg>`;
const X_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
const CHECK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

const DICT_CSS = `
  [data-chat-composer-footer] { position: relative; }
  [data-chat-composer-footer][data-t3dict] > :not(#t3dict-bar) { visibility: hidden; }
  #t3dict-bar {
    position: absolute; inset: 0 8px; display: flex; align-items: center; gap: 10px; color: var(--foreground);
  }
  #t3dict-bar canvas { flex: 1; min-width: 0; height: 28px; display: block; }
  #t3dict-bar .t3dict-time { font-size: 12.5px; font-variant-numeric: tabular-nums; color: var(--muted-foreground); min-width: 32px; text-align: right; }
  #t3dict-bar button {
    flex: none; width: 32px; height: 32px; border-radius: 999px; border: 0; padding: 0; cursor: pointer;
    display: grid; place-items: center; font: inherit; color: var(--muted-foreground); background: transparent;
  }
  #t3dict-bar button:hover { color: var(--foreground); background: color-mix(in srgb, var(--foreground) 9%, transparent); }
  #t3dict-bar .t3dict-done { color: var(--app-theme-accent-foreground, var(--primary-foreground)); background: var(--app-theme-accent, var(--primary)); }
  #t3dict-bar .t3dict-done:hover { color: var(--app-theme-accent-foreground, var(--primary-foreground)); background: var(--app-theme-accent, var(--primary)); filter: brightness(1.1); }
  #t3dict-bar .t3dict-done:disabled { opacity: 0.5; cursor: default; filter: none; }
  #t3dict-mic { display: none; }
  html[data-t3dict-ready] #t3dict-mic { display: inline-flex; }
  #t3dict-hist {
    position: fixed; z-index: 2147483000; width: min(460px, calc(100vw - 24px)); max-height: 60vh; overflow-y: auto;
    padding: 4px; border-radius: 10px; border: 1px solid var(--border); background: var(--popover, var(--background));
    color: var(--foreground); font-size: 13px; box-shadow: 0 8px 28px rgba(0,0,0,.35);
  }
  #t3dict-hist button {
    display: block; width: 100%; text-align: left; border: 0; background: transparent; color: inherit; font: inherit;
    padding: 7px 10px; border-radius: 6px; cursor: pointer; line-height: 1.4;
  }
  #t3dict-hist button:hover { background: color-mix(in srgb, var(--foreground) 8%, transparent); }
  #t3dict-hist button span { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  #t3dict-hist small { display: block; font-size: 11.5px; color: var(--muted-foreground); margin-bottom: 1px; }
  #t3dict-hist p { margin: 0; padding: 8px 10px; color: var(--muted-foreground); }
  ::highlight(t3dict-hearing) { color: color-mix(in srgb, var(--foreground) 48%, transparent); }
`;

type Session = {
  sid: number;
  ed: any;                      // the TipTap editor of this page's message box
  from: number; to: number;     // where our words sit in the box
  written: string;              // what we last wrote there
  prefix: string;               // a space when the cursor sat right after a word
  started: number;
  stopped: number;
  levels: number[];
  lastStep: number;
  bar: HTMLElement;
  footer: HTMLElement;
  canvas: HTMLCanvasElement;
  time: HTMLElement;
  done: HTMLButtonElement;
  raf: number;
  unhook: () => void;
  detached: boolean;            // the box changed under us or the bar went: wait for the final text, then place it
};

// ── a draft backup of the message box, per chat, in localStorage ──────────────────────────
const draftKey = () => "t3draft:" + location.pathname + location.hash;
type Draft = { text: string; at: number };
const readDrafts = (key = draftKey()): Draft[] => {
  try { const v = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};
const saveDraft = (text: string, key = draftKey()) => {
  text = text.trim();
  if (!text) return;               // an empty box never overwrites a backup
  const list = readDrafts(key);
  const top = list[0];
  if (top && top.text === text) return;
  // the same draft growing or being edited replaces its entry; a different one is kept beside it
  const n = Math.min(24, text.length, top?.text.length ?? 0);
  if (top && n > 0 && top.text.slice(0, n) === text.slice(0, n)) list[0] = { text, at: Date.now() };
  else list.unshift({ text, at: Date.now() });
  try { localStorage.setItem(key, JSON.stringify(list.slice(0, 6))); } catch {}
};

export function startDictation(): () => void {
  const root = document.documentElement;
  let ws: WebSocket | null = null, alive = true, retry = 0, wait = 1000;
  let s: Session | null = null;

  const style = document.createElement("style");
  style.id = "t3dict-style";
  // Nov 10: T3 added its own voice input; only ours is wanted, so T3's mic is hidden
  style.textContent = DICT_CSS + 'button[aria-label$=" voice input"]{display:none!important}';
  document.head.append(style);

  const send = (msg: object) => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); };
  const editorEl = () => document.querySelector<HTMLElement>('form[data-chat-composer-form] [data-testid="composer-editor"]');
  const editor = () => (editorEl() as any)?.editor ?? null;
  const reportFocus = () => send({ t: "focus", on: document.hasFocus() && !!editorEl() });

  const connect = () => {
    if (!alive) return;
    const sock = new WebSocket(`ws://127.0.0.1:${PORT}`);
    ws = sock;
    sock.onopen = () => { wait = 1000; root.setAttribute("data-t3dict-ready", ""); reportFocus(); };
    sock.onmessage = (e) => { try { handle(JSON.parse(e.data)); } catch (err) { console.warn("t3 dictation", err); } };
    sock.onclose = () => {
      if (ws === sock) ws = null;
      root.removeAttribute("data-t3dict-ready");
      if (s) end(); // dictate.pyw went away: keep what was heard
      if (alive) { retry = window.setTimeout(connect, wait); wait = Math.min(wait * 2, 15000); }
    };
  };

  // ── the words in the box ───────────────────────────────────────────────
  const docText = (ed: any, a: number, b: number) => {
    const size = ed.state.doc.content.size;
    if (a < 0 || b > size || a > b) return null;
    return ed.state.doc.textBetween(a, b, "\n", "\n");
  };

  const highlight = (from: number, to: number) => {
    const reg = (window as any).CSS?.highlights;
    if (!reg) return;
    if (!s || to <= from) { reg.delete("t3dict-hearing"); return; }
    try {
      const a = s.ed.view.domAtPos(from), b = s.ed.view.domAtPos(to);
      const r = document.createRange();
      r.setStart(a.node, a.offset); r.setEnd(b.node, b.offset);
      reg.set("t3dict-hearing", new (window as any).Highlight(r));
    } catch { reg.delete("t3dict-hearing"); }
  };

  // T3 rewrites the whole box when an image is pasted or dropped in, which loses our place: find our
  // words again (the copy nearest where they were) and carry on from there, so dictation keeps going.
  const refind = (ed: any): boolean => {
    if (!s || !s.written) return false;
    let best = -1;
    ed.state.doc.descendants((n: any, pos: number) => {
      if (!n.isText) return true;
      for (let i = n.text.indexOf(s!.written); i >= 0; i = n.text.indexOf(s!.written, i + 1)) {
        const at = pos + i;
        if (best < 0 || Math.abs(at - s!.from) < Math.abs(best - s!.from)) best = at;
      }
      return true;
    });
    if (best < 0) return false;
    s.from = best;
    s.to = best + s.written.length;
    return true;
  };

  // Replace our words with new ones. False when the box changed under us (sent, cleared, typed into).
  const write = (text: string, hearing = 0): boolean => {
    if (!s) return false;
    const ed = s.ed;
    if (ed.isDestroyed || (docText(ed, s.from, s.to) !== s.written && !refind(ed))) return false;
    const full = text ? s.prefix + text : "";
    if (full !== s.written) {
      const tr = ed.state.tr;
      if (full) tr.insertText(full, s.from, s.to); else tr.delete(s.from, s.to);
      tr.setMeta("t3dict", true);
      tr.scrollIntoView();
      ed.view.dispatch(tr);
      s.to = s.from + full.length;
      s.written = full;
    }
    highlight(s.to - Math.min(hearing, full.length), s.to);
    return true;
  };

  const begin = (sid: number, asked: boolean) => {
    const ed = editor();
    const footer = editorEl()?.closest("form")?.querySelector<HTMLElement>("[data-chat-composer-footer]");
    // typing somewhere else (the terminal, a rename box): the pop-up pastes there as before
    const active = document.activeElement as HTMLElement | null;
    const elsewhere = !!active && active !== editorEl() && (!!active.closest(".xterm") || /^(INPUT|TEXTAREA)$/.test(active.tagName) || active.isContentEditable);
    if (!ed || !footer || (elsewhere && !asked)) { send({ t: "refuse", sid }); return; }
    if (s) end();
    const at = ed.state.selection.to;
    const before = docText(ed, Math.max(0, at - 1), at) ?? "";
    const bar = document.createElement("div");
    bar.id = "t3dict-bar";
    bar.innerHTML = `<button type="button" class="t3dict-cancel" aria-label="Stop dictation now, keep the words" title="Stop now, keep the words">${X_ICON}</button><canvas></canvas><span class="t3dict-time">0:00</span><button type="button" class="t3dict-done" aria-label="Finish dictation (Ctrl+D or Esc)" title="Done (Ctrl+D or Esc)">${CHECK_ICON}</button>`;
    // T3's form would take a click as a submit; these only talk to the dictation
    bar.addEventListener("mousedown", (e) => e.preventDefault());
    bar.querySelector(".t3dict-cancel")!.addEventListener("click", (e) => { e.preventDefault(); send({ t: "cancel" }); });
    const done = bar.querySelector<HTMLButtonElement>(".t3dict-done")!;
    done.addEventListener("click", (e) => { e.preventDefault(); send({ t: "stop" }); });
    footer.setAttribute("data-t3dict", "");
    footer.append(bar);
    // keep our place when something else edits the box (typing before our words shifts them)
    const onTr = ({ transaction: tr }: any) => {
      if (!s || tr.getMeta("t3dict") || !tr.docChanged) return;
      s.from = tr.mapping.map(s.from, 1);
      s.to = Math.max(s.from, tr.mapping.map(s.to, -1));
    };
    ed.on("transaction", onTr);
    const now = performance.now();
    s = {
      sid, ed, from: at, to: at, written: "", prefix: before && !/\s/.test(before) ? " " : "",
      started: now, stopped: 0, levels: [], lastStep: now, bar, footer,
      canvas: bar.querySelector("canvas")!, time: bar.querySelector(".t3dict-time")!, done, raf: 0,
      unhook: () => ed.off("transaction", onTr), detached: false,
    };
    ed.commands.focus();
    s.raf = requestAnimationFrame(draw);
  };

  // The final text: over our words when they are still where we left them, else over the same words
  // wherever they went, else added at the end of the box. An empty final keeps the live words.
  const place = (text: string) => {
    if (!s || s.ed.isDestroyed) return;   // the chat closed: the take is in dictate.pyw's history
    const ed = s.ed;
    if (!text.trim()) return;
    if (write(text)) return;
    const box = ed.getText?.() ?? "";
    if (box.includes(text.trim())) return;
    const was = s.written.trim();
    let at = -1;
    if (was) ed.state.doc.descendants((n: any, pos: number) => {
      if (at < 0 && n.isText && n.text.includes(was)) at = pos + n.text.indexOf(was);
      return at < 0;
    });
    const tr = ed.state.tr;
    if (at >= 0) tr.insertText(text.trim(), at, at + was.length);
    else {
      const endPos = Math.max(1, ed.state.doc.content.size - 1);
      tr.insertText((box && !/\s$/.test(box) ? " " : "") + text.trim(), endPos);
    }
    tr.setMeta("t3dict", true);
    ed.view.dispatch(tr);
  };

  // Stops the session on this page. Never removes words from the box.
  const end = (text?: string) => {
    if (!s) return;
    const cur = s;
    if (text !== undefined) place(text);
    if (!cur.ed.isDestroyed) saveDraft(cur.ed.getText?.() ?? "");
    cur.unhook();
    cancelAnimationFrame(cur.raf);
    highlight(0, 0);
    cur.bar.remove();
    cur.footer.removeAttribute("data-t3dict");
    s = null;
    if (!cur.ed.isDestroyed) cur.ed.commands.focus();
  };

  // ── recent takes: right-click the mic, click one to copy it ─────────────────────
  let hist: HTMLElement | null = null;
  const closeHist = () => { hist?.remove(); hist = null; };
  const showHist = (items: Array<{ text: string; at: string }>) => {
    const mic = document.getElementById("t3dict-mic");
    if (!mic) return;
    closeHist();
    hist = document.createElement("div");
    hist.id = "t3dict-hist";
    const drafts = readDrafts();
    for (const d of drafts) {
      const b = document.createElement("button");
      b.type = "button";
      b.title = d.text;
      const t = new Date(d.at);
      const when = `${t.getMonth() + 1}/${t.getDate()} ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
      b.append(Object.assign(document.createElement("small"), { textContent: `Draft backup ${when}, click to put it back in the box` }), Object.assign(document.createElement("span"), { textContent: d.text }));
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => {
        const ed = editor();
        if (ed && !ed.isDestroyed) {
          saveDraft(ed.getText?.() ?? "");   // what was in the box stays restorable too
          const esc = (l: string) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;");
          ed.chain().focus().setContent(d.text.split("\n").map((l) => `<p>${esc(l)}</p>`).join(""), true).run();
        }
        closeHist();
      });
      hist.append(b);
    }
    if (!items.length && !drafts.length) hist.append(Object.assign(document.createElement("p"), { textContent: "No takes yet" }));
    for (const it of items) {
      const b = document.createElement("button");
      b.type = "button";
      b.title = it.text;
      b.append(Object.assign(document.createElement("small"), { textContent: it.at.slice(5).replace("-", "/") }), Object.assign(document.createElement("span"), { textContent: it.text }));
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(it.text); } catch {
          const ta = Object.assign(document.createElement("textarea"), { value: it.text });
          document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove();
        }
        b.querySelector("small")!.textContent = "Copied";
        window.setTimeout(closeHist, 500);
      });
      hist.append(b);
    }
    document.body.append(hist);
    const r = mic.getBoundingClientRect(), w = hist.offsetWidth;
    hist.style.left = `${Math.max(12, Math.min(r.right - w, window.innerWidth - w - 12))}px`;
    hist.style.bottom = `${window.innerHeight - r.top + 6}px`;
  };
  const onDownHist = (e: Event) => { if (hist && !hist.contains(e.target as Node)) closeHist(); };
  const onEscHist = (e: KeyboardEvent) => { if (e.key === "Escape" && hist) { closeHist(); e.stopPropagation(); } };

  // The box changed under the words (a re-render, a send) or the bar was lost: finish the transcript
  // instead of dropping it, and place the final text when it comes.
  const detach = () => {
    if (!s || s.detached) return;
    s.detached = true;
    highlight(0, 0);
    send({ t: "stop" });
  };

  const handle = (m: any) => {
    if (m.t === "history") return showHist(Array.isArray(m.items) ? m.items : []);
    if (m.t === "begin") return begin(m.sid, !!m.asked);
    if (!s || (m.sid !== undefined && m.sid !== s.sid)) return;
    if (m.t === "lv") {
      s.levels.push(m.v);
      if (s.levels.length > 400) s.levels.splice(0, s.levels.length - 400);
      s.lastStep = performance.now();
    } else if (m.t === "live") {
      const text = [m.settled, m.speaking].filter(Boolean).join(" ");
      if (s.detached) return;
      if (!write(text, m.speaking ? m.speaking.length : 0)) detach();
    } else if (m.t === "stopping") {
      s.stopped = performance.now();
      s.done.disabled = true;
    } else if (m.t === "final") {
      end(typeof m.text === "string" ? m.text : undefined);
    } else if (m.t === "cancel") {
      end();                      // keep whatever is in the box
    }
  };

  // ── the waveform: newest bar at the right, sliding left, older bars fainter ─────────────
  const draw = (now: number) => {
    if (!s) return;
    s.raf = requestAnimationFrame(draw);
    const c = s.canvas, dpr = window.devicePixelRatio || 1;
    const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
    if (!w || !h) return;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext("2d")!;
    g.clearRect(0, 0, w, h);
    g.fillStyle = getComputedStyle(s.bar).color;
    const pitch = (BAR_W + BAR_GAP) * dpr, bw = BAR_W * dpr, mid = h / 2;
    const live = !s.stopped;
    const slide = live ? Math.min(1, (now - s.lastStep) / STEP_MS) * pitch : 0;
    const fade = live ? 1 : Math.max(0, 1 - (now - s.stopped) / 400);
    const n = s.levels.length, fit = Math.ceil(w / pitch) + 1;
    for (let i = Math.max(0, n - fit); i < n; i++) {
      const x = w - (n - i) * pitch - slide + pitch - bw;
      if (x < -bw) continue;
      const age = x / w;
      const bh = Math.max(bw, Math.sqrt(s.levels[i]) * (h - 2 * dpr) * (0.35 + 0.65 * fade));
      g.globalAlpha = (0.18 + 0.72 * age) * (live ? 1 : 0.6);
      g.beginPath();
      g.roundRect(x, mid - bh / 2, bw, bh, bw / 2);
      g.fill();
    }
    // the rest of the line, before anything was heard: a quiet row of dots
    g.globalAlpha = 0.18;
    for (let x = w - n * pitch - slide; x > -bw; x -= pitch) {
      g.beginPath(); g.roundRect(x, mid - bw / 2, bw, bw, bw / 2); g.fill();
    }
    g.globalAlpha = 1;
    const secs = Math.floor(((s.stopped || now) - s.started) / 1000);
    const label = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
    if (s.time.textContent !== label) s.time.textContent = label;
  };

  // ── the mic button, beside T3's send button ─────────────────────────────────────
  const ensureMic = () => {
    const actions = document.querySelector<HTMLElement>('form[data-chat-composer-form] [data-chat-composer-actions="right"]');
    if (!actions || actions.querySelector("#t3dict-mic")) return;
    const last = actions.lastElementChild;
    if (!last) return;
    const mic = document.createElement("button");
    mic.type = "button";
    mic.id = "t3dict-mic";
    mic.setAttribute("aria-label", "Dictate (Ctrl+D)");
    mic.title = "Dictate (Ctrl+D). Right-click for draft backups and recent takes";
    mic.addEventListener("contextmenu", (e) => { e.preventDefault(); if (hist) closeHist(); else send({ t: "history" }); });
    // T3's own small icon button look, borrowed from its attach button
    const like = document.querySelector<HTMLElement>('form[data-chat-composer-form] button[aria-label="Attach files"]');
    mic.className = like?.className ?? "";
    mic.style.cssText = "width:28px;height:28px;align-items:center;justify-content:center;flex:none";
    mic.innerHTML = MIC_ICON;
    mic.addEventListener("mousedown", (e) => e.preventDefault());
    mic.addEventListener("click", (e) => { e.preventDefault(); if (s) send({ t: "stop" }); else send({ t: "start" }); });
    actions.insertBefore(mic, last);
  };

  const onFocus = () => reportFocus();
  window.addEventListener("focus", onFocus);
  window.addEventListener("blur", onFocus);
  document.addEventListener("focusin", onFocus);
  window.addEventListener("pointerdown", onDownHist, true);
  window.addEventListener("keydown", onEscHist, true);
  // a chat switch changes the address before the box: skip the first look after one
  let lastKey = draftKey();
  const backup = () => {
    const key = draftKey();
    if (key !== lastKey) { lastKey = key; return; }
    const ed = editor();
    if (ed && !ed.isDestroyed) saveDraft(ed.getText?.() ?? "", key);
  };
  const tick = window.setInterval(() => { ensureMic(); if (s && !s.bar.isConnected) detach(); backup(); }, 700);
  window.addEventListener("blur", backup);
  document.addEventListener("visibilitychange", backup);
  window.addEventListener("pagehide", backup);
  ensureMic();
  connect();
  (window as any).__t3dict = { handle }; // for a test from DevTools: feed it begin / live / final

  return () => {
    alive = false;
    clearTimeout(retry); clearInterval(tick);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("blur", onFocus);
    document.removeEventListener("focusin", onFocus);
    window.removeEventListener("pointerdown", onDownHist, true);
    window.removeEventListener("keydown", onEscHist, true);
    window.removeEventListener("blur", backup);
    document.removeEventListener("visibilitychange", backup);
    window.removeEventListener("pagehide", backup);
    closeHist();
    backup();
    if (s) { send({ t: "stop" }); end(); }
    ws?.close();
    document.getElementById("t3dict-mic")?.remove();
    style.remove();
    root.removeAttribute("data-t3dict-ready");
    delete (window as any).__t3dict;
  };
}
