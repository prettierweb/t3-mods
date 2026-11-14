// Starts T3 Code with the mods: lanes, the head bar, menus, themes and scenes.
// T3 runs with a local-only DevTools port; this process feeds every T3 window the scene script.
//   node t3-scenes.mjs            start T3 with scenes, exit when it closes (--restart closes a T3 open without the port)
//   node t3-scenes.mjs --watch    stay in the background (login item): keep T3's shortcuts carrying the port,
//                                 and attach to T3 whenever it opens
import { spawn, execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { appendFileSync, closeSync, openSync, readdirSync, readFileSync, readSync, statSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const PORT = 9350; // what the shortcuts carry (9339 until Nov 2: a dead T3 left it held)
const PORT_ARGS = `--remote-debugging-port=${PORT} --remote-debugging-address=127.0.0.1`;
// A T3 that died can leave its port held by a leftover child process: the port accepts but never
// answers, and a new T3 can't open it. So the port in use is read from the running T3, and a
// restart picks the first port nobody is listening on.
let port = PORT;
const portArgs = (p) => [`--remote-debugging-port=${p}`, "--remote-debugging-address=127.0.0.1"];
function runningPort() {
  const ps = "(Get-CimInstance Win32_Process -Filter \"Name='T3 Code (Beta).exe'\" | Where-Object { $_.CommandLine -notmatch '--type=' -and $_.CommandLine -match 'remote-debugging-port' } | Select-Object -First 1).CommandLine";
  try { return Number(/remote-debugging-port=(\d+)/.exec(execFileSync("powershell", ["-NoProfile", "-Command", ps], { encoding: "utf8" }))?.[1]) || null; } catch { return null; }
}
function freePort() {
  const out = execFileSync("netstat", ["-ano", "-p", "TCP"], { encoding: "utf8" });
  for (let p = PORT; p < PORT + 40; p++) if (!new RegExp(`:${p}\\s+\\S+\\s+LISTENING`).test(out)) return p;
  return PORT;
}
const T3_EXE = join(process.env.LOCALAPPDATA, "Programs", "t3code", "T3 Code (Beta).exe");
const HERE = dirname(fileURLToPath(import.meta.url));
const BUNDLE = join(HERE, "dist", "t3-scenes.js");
const LIVE = join(HERE, "dist", "t3-mods.live.js");
// Optional extras live in config.json beside this file (see config.example.json). Without it the
// core mods run and everything that needs another program stays hidden.
const CONFIG = (() => { try { return JSON.parse(readFileSync(join(HERE, "..", "config.json"), "utf8").replace(/^﻿/, "")); } catch { return {}; } })();
const has = (file) => { try { return !!file && statSync(file).isFile(); } catch { return false; } };
// what the page may show: sent ahead of the bundle as window.__t3modsCfg
const t3Version = () => { try { return readFileSync(join(homedir(), ".t3", "userdata", "desktop-last-started-version"), "utf8").trim(); } catch { return ""; } };
const PAGE_CFG = { t3Version: t3Version(), update: null, kani: has(CONFIG.kaniExe), atrium: has(CONFIG.atriumExe), library: has(CONFIG.libraryServer), usage: has(CONFIG.usageModule), dictation: !!CONFIG.dictation, accounts: CONFIG.accounts ?? {} };
const WATCH = process.argv.includes("--watch");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LOG = join(HERE, "t3-mods.log");
const log = (line) => { console.log(line); try { appendFileSync(LOG, `${new Date().toISOString()} ${line}\n`); } catch {} };

// A rebuilt bundle is picked up by the next window that opens, without restarting this process.
let source = "", sourceTime = 0;
function currentSource() {
  const t = statSync(BUNDLE).mtimeMs;
  if (t !== sourceTime) {
    // the page's settings go ahead of the bundle; T3's main process reads the same file for new lanes
    source = `window.__t3modsCfg=${JSON.stringify(PAGE_CFG)};` + readFileSync(BUNDLE, "utf8"); sourceTime = t;
    try { writeFileSync(LIVE, source); } catch {}
  }
  return source;
}

async function targets() {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(2000) });
    return (await res.json()).filter((t) => t.type === "page" && /^(t3code:\/\/app\/|https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/)/.test(t.url) && !/:878\d\//.test(t.url)); // 878x is Wobble Brawl, a game served on localhost, not T3
  } catch {
    return null;
  }
}

function t3Running() {
  const out = execFileSync("tasklist", ["/FI", "IMAGENAME eq T3 Code (Beta).exe", "/FO", "CSV", "/NH"], { encoding: "utf8" });
  return out.includes("T3 Code (Beta).exe");
}

// T3's taskbar, Start menu and desktop shortcuts launch it with the port. An update that
// rewrites a shortcut loses the arguments, so watch mode puts them back each time it starts.
function fixShortcuts() {
  const ps = `
    $shell = New-Object -ComObject WScript.Shell
    $places = "$env:APPDATA\\Microsoft\\Internet Explorer\\Quick Launch\\User Pinned\\TaskBar", "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs", "$env:USERPROFILE\\Desktop"
    Get-ChildItem $places -Filter 'T3 Code*.lnk' -ErrorAction SilentlyContinue | ForEach-Object {
      $s = $shell.CreateShortcut($_.FullName)
      if ($s.TargetPath -like '*T3 Code (Beta).exe' -and $s.Arguments -notlike '*remote-debugging-port=${PORT} *') {
        $rest = ($s.Arguments -replace '--remote-debugging-(port|address)=\\S+', '').Trim()
        $s.Arguments = ('${PORT_ARGS} ' + $rest).Trim(); $s.Save(); "fixed $($_.Name)"
      }
    }`;
  try { process.stdout.write(execFileSync("powershell", ["-NoProfile", "-Command", ps], { encoding: "utf8" })); } catch {}
}

async function ensureT3() {
  port = runningPort() ?? PORT;
  if ((await targets()) !== null) return;
  if (t3Running()) {
    if (!process.argv.includes("--restart")) {
      console.log("T3 is open without scene support. Close it, or run again with --restart.");
      process.exit(1);
    }
    // T3 can refuse a polite close (it keeps running in the tray), so a refusal falls through to a forced one.
    try { execFileSync("taskkill", ["/IM", "T3 Code (Beta).exe", "/T"], { stdio: "ignore" }); } catch {}
    for (let i = 0; i < 40 && t3Running(); i++) await sleep(250);
    if (t3Running()) try { execFileSync("taskkill", ["/IM", "T3 Code (Beta).exe", "/T", "/F"], { stdio: "ignore" }); } catch {}
    for (let i = 0; i < 40 && t3Running(); i++) await sleep(250);
    await sleep(1000); // its single-instance lock goes a moment after the process
  }
  port = freePort();
  // a start can vanish (the old instance's lock was still held): try again until a window answers
  for (let attempt = 1; attempt <= 3; attempt++) {
    log(`starting T3 on port ${port} (try ${attempt})`);
    spawn(T3_EXE, portArgs(port), { detached: true, stdio: "ignore" }).unref();
    for (let i = 0; i < 60; i++) { await sleep(500); if ((await targets())?.length) return; } // first start after an update is slow
  }
  log("T3 did not come up");
}

// The page can't start programs, so it asks through a CDP binding. The media library server
// (the sync chat's serve.mjs) exits on its own when it is already up.
const LIBRARY_SERVER = CONFIG.libraryServer;
// Claude chats made outside T3 (the Claude app, the CLI) are copied in with T3's own import:
// on the sidebar's refresh button, and every syncEveryMinutes (15) while T3 is open.
let syncing = null, lastSync = Date.now();
// The first run lets T3 scan every transcript (a couple of minutes of work for its server). After
// that only chats created since the last run are handed over, so a sync with nothing new is free.
const SYNC_STATE = join(HERE, "..", "sync-state.json");
function newTranscripts(since) {
  const out = [];
  for (const root of TRANSCRIPT_ROOTS) {
    let dirs = [];
    try { dirs = readdirSync(root); } catch { continue; }
    for (const d of dirs) {
      let files = [];
      try { files = readdirSync(join(root, d)); } catch { continue; }
      for (const name of files) {
        if (!name.endsWith(".jsonl")) continue;
        const file = join(root, d, name);
        try { if (statSync(file).birthtimeMs > since) out.push(file); } catch {}
      }
    }
  }
  return out;
}
function syncChats() {
  lastSync = Date.now();
  return (syncing ??= new Promise((resolve) => {
    let since = 0;
    try { since = JSON.parse(readFileSync(SYNC_STATE, "utf8")).at ?? 0; } catch {}
    const started = Date.now(), args = [join(HERE, "..", "tools", "sync-claude-chats.mjs")];
    if (since) {
      const files = newTranscripts(since);
      if (files.length === 0) { syncing = null; resolve({ ok: true, imported: 0 }); return; }
      const listFile = join(HERE, "..", "sync-new.txt");
      writeFileSync(listFile, files.join("\n"));
      args.push("--new", listFile);
    }
    const child = spawn(process.execPath, args, { windowsHide: true });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => {
      syncing = null;
      const n = /New chats: ([0-9]+)/.exec(out)?.[1];
      log(`chat sync: ${out.trim().split("\n").pop()}`);
      if (code === 0) try { writeFileSync(SYNC_STATE, JSON.stringify({ at: started })); } catch {}
      resolve(code === 0 ? { ok: true, imported: +(n ?? 0) } : { error: "Could not sync chats; see t3-mods.log" });
    });
  }));
}
// Updates: once a day (and at start) ask the repo whether main has moved on. Needs git and a
// copy that was cloned; a copy without .git just never shows the notice. "Update now" pulls,
// then hands over to a fresh copy of this script, which loads the new files into every window.
const REPO = join(HERE, "..");
const git = (args) => execFileSync("git", ["-C", REPO, ...args], { encoding: "utf8", windowsHide: true, timeout: 60000, stdio: ["ignore", "pipe", "pipe"] }).trim();
let updateCheck = 0;
async function checkUpdate(list) {
  if (CONFIG.checkUpdates === false || Date.now() - updateCheck < 24 * 3600 * 1000) return;
  updateCheck = Date.now();
  let update = null;
  try {
    git(["fetch", "--quiet", "origin", "main"]);
    const behind = Number(git(["rev-list", "--count", "HEAD..origin/main"])) || 0;
    if (behind > 0) update = { behind, subject: git(["log", "-1", "--format=%s", "origin/main"]).slice(0, 80) };
  } catch (e) { log(`update check: ${String(e.message).split("\n")[0]}`); return; }
  PAGE_CFG.update = update; sourceTime = 0; // new windows learn it from the bundle's settings
  for (const t of list) evaluate(t, `window.__t3modsUpdate?.(${JSON.stringify(update)})`).catch(() => {});
  if (update) log(`update ready: ${update.behind} behind, ${update.subject}`);
}
function applyUpdate(reply) {
  try {
    if (git(["status", "--porcelain", "--untracked-files=no"])) { reply(`window.__t3modsUpdated?.(${JSON.stringify({ error: "This copy of the mods has been edited by hand, so it can't update itself. Ask a chat to merge the latest t3-mods from GitHub." })})`); return; }
    git(["pull", "--ff-only", "--quiet", "origin", "main"]);
  } catch (e) {
    log(`update: ${e.message}`);
    reply(`window.__t3modsUpdated?.(${JSON.stringify({ error: "Could not download the update; see t3-mods.log" })})`);
    return;
  }
  log("update: pulled, handing over to the new launcher");
  reply(`window.__t3modsUpdated?.({ ok: true })`);
  setTimeout(() => {
    spawn(process.execPath, [join(HERE, "t3-mods.mjs"), "--watch"], { detached: true, stdio: "ignore", windowsHide: true }).unref();
    process.exit(0);
  }, 400);
}
async function host(request, reply) {
  if (request === "mods-update") { applyUpdate(reply); return; }
  // a right-click menu's "Open in Kani" / "Show in Atrium" (src/entry.ts): start that app with the link or path
  if (request.startsWith("open-with:")) {
    try {
      const { app, target: what } = JSON.parse(request.slice(10));
      const exe = app === "kani" ? CONFIG.kaniExe : CONFIG.atriumExe;
      if (!has(exe)) return;
      const args = app === "kani" ? [what] : ["--here", what.split("/").join("\\")];
      spawn(exe, args, { detached: true, stdio: "ignore" }).unref();
      log(`open-with ${app}: ${what}`);
    } catch (e) { log(`open-with: ${e.message}`); }
    return;
  }
  // the head bar's model label (src/compact.ts): what this chat and each helper it started really
  // run, read from T3's own database (read-only), so the check doesn't trust the message box
  if (request.startsWith("helpers:")) {
    const id = request.slice(8);
    let out;
    try {
      const db = new DatabaseSync(join(homedir(), ".t3", "userdata", "statev2.sqlite"), { readOnly: true });
      const pick = (p) => {
        const j = JSON.parse(p.payload_json), m = j.modelSelection ?? {};
        const effort = (m.options ?? []).find((o) => o.id === "effort")?.value ?? "";
        // its latest run says where it stands: running, completed, failed, cancelled, interrupted (no run yet: queued)
        const run = lastRun.get(p.thread_id);
        return { id: p.thread_id, title: j.title ?? "", model: m.model ?? "", effort, account: (CONFIG.accounts ?? {})[m.instanceId ?? j.providerInstanceId] ?? "", at: run?.completed_at || run?.requested_at || j.updatedAt || "", status: run?.status ?? "queued" };
      };
      const lastRun = db.prepare("select status, requested_at, completed_at from orchestration_v2_projection_runs where thread_id = ? order by ordinal desc limit 1");
      const self = db.prepare("select thread_id, payload_json from orchestration_v2_projection_threads where thread_id = ?").get(id);
      const kids = db.prepare("select thread_id, payload_json from orchestration_v2_projection_threads where deleted_at is null and json_extract(payload_json, '$.lineage.parentThreadId') = ? order by created_at desc limit 40").all(id);
      out = { self: self ? pick(self) : null, helpers: kids.map(pick) };
      db.close();
    } catch (e) { out = { error: e.message }; log(`helpers: ${e.message}`); }
    reply(`window.__t3helpersDone?.(${JSON.stringify(out)})`);
    return;
  }
  // the sidebar's refresh button: the Kani helper copies new Claude app chats in now
  if (request === "sync-chats") {
    let answer;
    if (CONFIG.helperUrl) {
      try { answer = await (await fetch(`${CONFIG.helperUrl}/api/sync-now`, { method: "POST" })).json(); }
      catch { answer = { error: "The sync helper isn't running" }; }
    } else answer = await syncChats();
    reply(`window.__t3syncDone?.(${JSON.stringify(answer)})`);
    return;
  }
  // the sidebar's grid button: the chats on screen in the Claude app's split view, which all
  // carry the same lastFocusedAt (the app stamps every pane it shows at once). Lanes open now
  // are closed first; the page then opens these as its own pane and lanes.
  if (request === "claude-grid") {
    reply(`window.__t3mirror?.(${JSON.stringify(claudeGrid())})`);
    return;
  }
  // a lane's task list: "plan:<transcript id>" answers with the chat's latest plan
  if (request.startsWith("plan:")) {
    const id = request.slice(5);
    if (/^[0-9a-f-]{36}$/.test(id)) reply(`window.__t3plan?.(${JSON.stringify(id)}, ${JSON.stringify(planOf(id))})`);
    else if (/^t3:[\w:%.-]{1,400}$/.test(id)) { const native = nativeSessionOf(id.slice(3)); reply(`window.__t3plan?.(${JSON.stringify(id)}, ${JSON.stringify(native ? planOf(native, false) : null)})`); }
    return;
  }
  // the model picker's "what is left" block (src/usage.ts): kani-browser/usage.js does the asking,
  // for the Claude accounts T3 is set up with. Only numbers go back to the page.
  if (request === "usage") {
    let answer = [];
    try {
      const t3 = JSON.parse(readFileSync(join(homedir(), ".t3", "userdata", "settings.json"), "utf8"));
      const first = t3.defaultModelSelection?.instanceId || "claudeAgent";
      const list = Object.entries(t3.providerInstances || {}).filter(([, v]) => v && v.driver === "claudeAgent" && v.enabled !== false);
      list.sort(([a], [b]) => (b === first) - (a === first));
      const accounts = list.map(([id, v]) => ({ id, name: String(v.displayName || id).slice(0, 20), home: String(v.config?.homePath || "") }));
      answer = await createRequire(import.meta.url)(CONFIG.usageModule).usage(accounts.length ? accounts : [{ id: "claudeAgent", name: "Claude", home: "" }]);
    } catch (e) { log(`usage: ${e.message}`); }
    reply(`window.__t3usage?.(${JSON.stringify(answer)})`);
    return;
  }
  // the sidebar's refresh button (src/sync.ts): settle finished chats so Recent stays short.
  // tidy-recent.mjs writes tidy/last-settled.json; "node tidy-recent.mjs --undo" brings them back.
  if (request === "tidy-recent") {
    const script = join(HERE, "..", "tools", "tidy-recent.mjs");
    const child = spawn(process.execPath, [script], { windowsHide: true });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => {
      const n = /Settled ([0-9]+)/.exec(out)?.[1];
      log(`tidy-recent: ${out.trim().split("\n").pop()}`);
      reply(`window.__t3tidyDone?.(${JSON.stringify(code === 0 && n !== undefined ? { settled: +n } : { error: "Could not tidy Recent; see t3-scenes.log" })})`);
    });
    return;
  }
  if (request === "close-lanes") {
    for (const t of (await targets()) ?? []) if (t.url.includes("t3lane")) await evaluate(t, `console.debug("\\u2063t3:close:")`).catch(() => {});
    reply(`window.__t3lanesClosed?.()`);
    return;
  }
  if (request !== "ensure-library" || !has(LIBRARY_SERVER)) return;
  try { await fetch(CONFIG.helperUrl ?? "http://127.0.0.1:8790"); return; } catch {}
  spawn(process.execPath, [LIBRARY_SERVER], { detached: true, stdio: "ignore", windowsHide: true }).unref();
}

// The task list a Claude app chat keeps (its mcp__ccd_turn__update_plan calls), replayed from the
// end of its transcript: the last full list, then each advance/done/start after it. Also the last
// wrap-up recap. Transcripts run to tens of MB, so only the last 3 MB are read.
const TRANSCRIPT_ROOTS = [join(homedir(), ".claude", "projects"), join(homedir(), ".claude-account2", "projects")];
const transcriptPath = new Map();
function findTranscript(id) {
  const known = transcriptPath.get(id);
  if (known) return known;
  for (const root of TRANSCRIPT_ROOTS) {
    let dirs = [];
    try { dirs = readdirSync(root); } catch { continue; }
    for (const d of dirs) {
      const p = join(root, d, `${id}.jsonl`);
      try { statSync(p); transcriptPath.set(id, p); return p; } catch {}
    }
  }
  return null;
}
// A T3-run chat's Claude session id, from T3's own database (read-only), so its transcript gives
// the context count T3 no longer shows in the message box (Nov 10)
let stateDb = null;
function nativeSessionOf(threadId) {
  try {
    if (!stateDb) stateDb = new DatabaseSync(join(homedir(), ".t3", "userdata", "statev2.sqlite"), { readOnly: true });
    const row = stateDb.prepare("select payload_json from orchestration_v2_projection_run_attempts where thread_id = ? order by rowid desc limit 1").get(threadId);
    const id = row ? JSON.parse(row.payload_json).nativeThreadId : null;
    return typeof id === "string" && /^[0-9a-f-]{36}$/.test(id) ? id : null;
  } catch { stateDb = null; return null; }
}
function planOf(id, staleCheck = true) {
  const file = findTranscript(id);
  if (!file) return null;
  let text = "";
  try {
    const size = statSync(file).size, take = Math.min(size, 3 * 1024 * 1024);
    const buf = Buffer.alloc(take), fd = openSync(file, "r");
    readSync(fd, buf, 0, take, size - take); closeSync(fd);
    text = buf.toString("utf8");
  } catch { return null; }
  const calls = [];
  let tokens = 0; // context of the last model call: its input, read and written cache
  for (const line of text.split("\n")) {
    const usage = line.includes('"usage"') && line.includes('"assistant"');
    if (!line.includes("ccd_turn__") && !usage) continue;
    let rec;
    try { rec = JSON.parse(line); } catch { continue; }
    const u = rec?.message?.usage;
    if (u && !rec.isSidechain) tokens = (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) || tokens;
    for (const c of rec?.message?.content ?? []) {
      if (c?.type === "tool_use" && /ccd_turn__(update_plan|wrap_up)$/.test(c.name)) calls.push({ kind: c.name.endsWith("wrap_up") ? "wrap" : "plan", input: c.input ?? {} });
    }
  }
  let items = null, recap = "";
  for (const { kind, input } of calls) {
    // wrap-up checks the whole list off, as the Claude app shows it
    if (kind === "wrap") { recap = String(input.recap ?? ""); if (items) items.forEach((i) => { i.status = "completed"; }); continue; }
    if (Array.isArray(input.items)) { items = input.items.map((i) => ({ content: String(i.content ?? ""), status: String(i.status ?? "pending") })); recap = ""; continue; }
    if (!items) continue;
    for (const n of input.done ?? []) if (items[n - 1]) items[n - 1].status = "completed";
    if (input.advance) {
      const cur = items.findIndex((i) => i.status === "in_progress");
      if (cur >= 0) items[cur].status = "completed";
      const next = items.findIndex((i) => i.status === "pending");
      if (next >= 0) items[next].status = "in_progress";
    }
    if (input.start && items[input.start - 1]) items[input.start - 1].status = "in_progress";
  }
  // a transcript nobody has written to lately is an old account's chat T3 now runs: its count is stale
  if (staleCheck) try { if (Date.now() - statSync(file).mtimeMs > 20 * 60_000) tokens = 0; } catch {}
  return items || tokens ? { items: items ?? [], recap, tokens } : null;
}

const CLAUDE_SESSIONS = join(process.env.APPDATA, "Claude", "claude-code-sessions");
function claudeGrid() {
  const all = [];
  try {
    for (const a of readdirSync(CLAUDE_SESSIONS)) for (const b of readdirSync(join(CLAUDE_SESSIONS, a))) for (const f of readdirSync(join(CLAUDE_SESSIONS, a, b))) {
      if (!f.startsWith("local_") || !f.endsWith(".json")) continue;
      try {
        const d = JSON.parse(readFileSync(join(CLAUDE_SESSIONS, a, b, f), "utf8"));
        if (!d.isArchived && d.cliSessionId && d.lastFocusedAt) all.push({ title: d.title ?? "", cli: d.cliSessionId, at: d.lastFocusedAt });
      } catch {}
    }
  } catch { return []; }
  const top = Math.max(0, ...all.map((s) => s.at));
  // MAIN first, then by title; T3 shows eight panes at most
  return all.filter((s) => top - s.at < 5000)
    .sort((x, y) => Number(/\bMAIN\b/.test(y.title)) - Number(/\bMAIN\b/.test(x.title)) || x.title.localeCompare(y.title))
    .slice(0, 8).map(({ title, cli }) => ({ title, cli }));
}

// Kani's switches (the media chat's page) change T3 device settings through this connection:
// T3 takes client settings only from its own renderer. The Kani helper writes t3-requests.json;
// each new id is applied once in the main window, and answered in t3-requests.done.json.
const REQUESTS = join(HERE, "..", "t3-requests.json");
const REQUESTS_DONE = join(HERE, "..", "t3-requests.done.json");
// a writer may start the file with a byte-order mark (PowerShell does)
const readJson = (file) => JSON.parse(readFileSync(file, "utf8").replace(/^﻿/, ""));
let lastRequest = (() => { try { return readJson(REQUESTS_DONE).id ?? null; } catch { return null; } })();

// Runs inside T3. Any program can write the request file, so it only takes settings T3 already
// has, with a plain value of the same type.
async function applyClientSettings(patch) {
  const bridge = window.desktopBridge;
  if (!bridge?.getClientSettings || !bridge?.setClientSettings) return { ok: false, error: "T3's settings bridge is missing" };
  const current = await bridge.getClientSettings();
  if (!current) return { ok: false, error: "T3 has no client settings yet" };
  for (const [key, value] of Object.entries(patch)) {
    if (!Object.prototype.hasOwnProperty.call(current, key)) return { ok: false, error: `unknown setting ${key}` };
    if (value === null || typeof value === "object" || typeof value !== typeof current[key]) return { ok: false, error: `${key} takes a ${typeof current[key]}` };
  }
  await bridge.setClientSettings({ ...current, ...patch });
  // the page's settings store re-reads from disk; its old copy would otherwise write the old value back
  setTimeout(() => location.reload(), 100);
  return { ok: true };
}

function evaluate(target, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    const timeout = setTimeout(() => { ws.close(); reject(new Error("T3 did not answer")); }, 10_000);
    ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression, awaitPromise: true, returnByValue: true } }));
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id !== 1) return;
      clearTimeout(timeout); ws.close();
      const r = m.result;
      if (m.error || r?.exceptionDetails) reject(new Error(m.error?.message ?? r.exceptionDetails.exception?.description ?? "script error"));
      else resolve(r.result.value);
    };
    ws.onerror = () => { clearTimeout(timeout); reject(new Error("could not reach T3")); };
  });
}

async function checkRequests(list) {
  let request;
  try { request = readJson(REQUESTS); } catch { return; }
  if (!request?.id || request.id === lastRequest || list.length === 0) return;
  lastRequest = request.id;
  let result;
  try {
    const patch = request.clientSettings && typeof request.clientSettings === "object" ? request.clientSettings : {};
    // the window itself, not a lane beside it
    result = await evaluate(list.find((t) => !t.url.includes("t3lane")) ?? list[0], `(${applyClientSettings.toString()})(${JSON.stringify(patch)})`);
  } catch (e) {
    result = { ok: false, error: String(e.message ?? e) };
  }
  writeFileSync(REQUESTS_DONE, JSON.stringify({ id: request.id, ...result, at: new Date().toISOString() }));
  console.log(`request ${request.id}: ${result.ok ? "applied" : result.error}`);
}

// The page can't replace T3's native menus or open windows, so main-patch.js does that inside
// T3's main process (by choice, 2026-10-31). Node's inspector is switched on in that
// process just long enough to install it, then closed; it is re-applied whenever T3 starts.
const MAIN_PATCH = join(dirname(fileURLToPath(import.meta.url)), "main-patch.js");
const MAIN_SWAP = join(dirname(fileURLToPath(import.meta.url)), "main-swap.js"); // drop a chat onto a lane
const MAIN_WCO = join(dirname(fileURLToPath(import.meta.url)), "main-wco.js"); // window buttons as tall as the compact bar
let patchedPid = null;
function t3MainPid() {
  const ps = "(Get-CimInstance Win32_Process -Filter \"Name='T3 Code (Beta).exe'\" | Where-Object { $_.CommandLine -notmatch '--type=' -and $_.CommandLine -match 'remote-debugging-port' } | Select-Object -First 1).ProcessId";
  try { return Number(execFileSync("powershell", ["-NoProfile", "-Command", ps], { encoding: "utf8" }).trim()) || null; } catch { return null; }
}
async function inspectorTarget() {
  for (let i = 0; i < 20; i++) {
    try {
      const list = await (await fetch("http://127.0.0.1:9229/json/list", { signal: AbortSignal.timeout(1000) })).json();
      const t = list.find((x) => x.title?.includes(`remote-debugging-port=${port}`));
      if (t) return t;
    } catch {}
    await sleep(150);
  }
  return null;
}
function mainEval(target, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    const timeout = setTimeout(() => { ws.close(); reject(new Error("main process did not answer")); }, 8000);
    ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression, includeCommandLineAPI: true, replMode: true, returnByValue: true } }));
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id !== 1) return;
      clearTimeout(timeout); ws.close();
      const r = m.result;
      if (m.error || r?.exceptionDetails) reject(new Error(m.error?.message ?? r.exceptionDetails.exception?.description ?? "script error"));
      else resolve(r.result.value);
    };
    ws.onerror = () => { clearTimeout(timeout); reject(new Error("could not reach the main process")); };
  });
}
// Ctrl+D only works while the dictation helper runs. Started from a chat inside T3 it dies with T3,
// so it is checked here and, when gone, started by Windows from its Startup shortcut (not a child of
// anything that can close). Its own lock stops a second copy.
const DICTATION_LNK = join(process.env.APPDATA, "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "T3 dictation.lnk");
let dictationCheck = 0;
function ensureDictation() {
  if (!CONFIG.dictation || !has(DICTATION_LNK)) return;
  if (Date.now() - dictationCheck < 30000) return;
  dictationCheck = Date.now();
  const sock = createConnection({ host: "127.0.0.1", port: 9341 });
  sock.setTimeout(1500);
  const done = (alive) => {
    sock.destroy();
    if (alive) return;
    log("dictation helper was not running: starting it");
    try { spawn("explorer.exe", [DICTATION_LNK], { detached: true, stdio: "ignore" }).unref(); } catch (e) { log(`could not start dictation: ${e.message}`); }
  };
  sock.once("connect", () => done(true));
  sock.once("error", () => done(false));
  sock.once("timeout", () => sock.destroy()); // busy is not gone
}

// Reveal in File Explorer opens Atrium, for T3 only (server-reveal.js, Nov 10). Same inspector route,
// into T3's server process, which is the one that launches the file manager.
const SERVER_REVEAL = join(dirname(fileURLToPath(import.meta.url)), "server-reveal.js");
let revealPid = null, revealCheck = 0;
async function patchServer() {
  if (!has(SERVER_REVEAL)) return;
  if (Date.now() - revealCheck < 60000) return; // a PowerShell lookup: once a minute is plenty
  revealCheck = Date.now();
  const ps = "(Get-CimInstance Win32_Process -Filter \"Name='T3 Code (Beta).exe'\" | Where-Object { $_.CommandLine -match 'server.asar.apps.server.dist.bin.mjs' } | Select-Object -First 1).ProcessId";
  let pid = null;
  try { pid = Number(execFileSync("powershell", ["-NoProfile", "-Command", ps], { encoding: "utf8" }).trim()) || null; } catch {}
  if (!pid || pid === revealPid) return;
  let target = null;
  try {
    process._debugProcess(pid);
    for (let i = 0; i < 20 && !target; i++) {
      try { target = (await (await fetch("http://127.0.0.1:9229/json/list", { signal: AbortSignal.timeout(1000) })).json()).find((x) => x.title?.includes("bin.mjs")) ?? null; } catch {}
      if (!target) await sleep(150);
    }
    if (!target) throw new Error("inspector did not open");
    const result = await mainEval(target, readFileSync(SERVER_REVEAL, "utf8"));
    revealPid = pid;
    log(`server process ${pid}: ${result}`);
  } catch (e) {
    log(`server process ${pid}: ${e.message}`);
  } finally {
    if (target) await mainEval(target, "require('inspector').close()").catch(() => {});
  }
}

async function patchMain() {
  const pid = t3MainPid();
  if (!pid || pid === patchedPid) return;
  let target = null;
  try {
    process._debugProcess(pid);
    target = await inspectorTarget();
    if (!target) throw new Error("inspector did not open");
    const result = await mainEval(target, readFileSync(MAIN_PATCH, "utf8").replace("__SCENES_JS__", LIVE.split("\\").join("/")));
    const swap = await mainEval(target, readFileSync(MAIN_SWAP, "utf8")).catch((e) => e.message);
    const wco = await mainEval(target, readFileSync(MAIN_WCO, "utf8")).catch((e) => e.message);
    patchedPid = pid;
    log(`main process ${pid}: ${result}, ${swap}, ${wco}`);
  } catch (e) {
    log(`main process ${pid}: ${e.message}`);
  } finally {
    if (target) await mainEval(target, "require('inspector').close()").catch(() => {});
  }
}

function inject(target) {
  return new Promise((resolve) => {
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let id = 0;
    const send = (method, params = {}) => ws.send(JSON.stringify({ id: ++id, method, params }));
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.method === "Runtime.bindingCalled" && m.params.name === "__t3scenesHost") host(m.params.payload, (expression) => send("Runtime.evaluate", { expression }));
    };
    ws.onopen = () => {
      const src = currentSource();
      send("Runtime.enable");
      send("Runtime.addBinding", { name: "__t3scenesHost" });
      send("Page.enable");
      // Registered scripts live as long as this connection, so it stays open for the window's life.
      send("Page.addScriptToEvaluateOnNewDocument", { source: src });
      send("Runtime.evaluate", { expression: src });
      console.log(`scenes on: ${target.url}`);
    };
    ws.onclose = () => resolve();
    ws.onerror = () => resolve();
  });
}

if (WATCH) fixShortcuts(); else await ensureT3();
const live = new Map();
let seen = false, misses = 0;
for (;;) {
  const list = await targets();
  if (list === null) {
    if (seen && !WATCH) break; // T3 closed
    patchedPid = null; // patch the next T3 when it starts
    if (WATCH && ++misses % 5 === 0) port = runningPort() ?? port; // T3 may have opened on another port
  } else {
    seen = true;
    for (const t of list) {
      if (live.has(t.id)) continue;
      live.set(t.id, inject(t).then(() => live.delete(t.id)));
    }
    await checkRequests(list);
    if (list.length) checkUpdate(list);
    if (!CONFIG.helperUrl && CONFIG.syncChats !== false && list.length && Date.now() - lastSync > (CONFIG.syncEveryMinutes ?? 15) * 60000) syncChats();
    ensureDictation();
    if (list.length && !patchedPid) await patchMain();
    if (list.length) await patchServer();
  }
  await sleep(WATCH ? 2000 : 1500);
}
