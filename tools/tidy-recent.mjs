// tidy-recent.mjs
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";


const appDir = join(process.env.LOCALAPPDATA, "Programs", "t3code");
const exe = join(appDir, "T3 Code (Beta).exe");
const bin = join(appDir, "resources", "server.asar", "apps", "server", "dist", "bin.mjs");
const baseEnv = {
  ...process.env,
  ELECTRON_RUN_AS_NODE: "1",
  T3CODE_DESKTOP_CLI_LAUNCHER: "1",
  T3CODE_HOME: join(homedir(), ".t3"),
};

function t3(args, env = baseEnv) {
  const r = spawnSync(exe, [bin, ...args], { env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`t3 ${args.slice(0, 3).join(" ")} failed: ${r.stderr || r.stdout}`);
  return r.stdout;
}

const runtime = JSON.parse(readFileSync(join(homedir(), ".t3", "userdata", "server-runtime.json"), "utf8"));
const sessions = [];
function issue(args) {
  const issued = JSON.parse(t3(["auth", "session", "issue", "--ttl", "10m", "--label", "tidy recent", "--json", ...args]));
  sessions.push(issued.sessionId);
  return issued.token;
}

// Reads go through MCP, the same tools the `t3 thread` commands use.
let mcpEnv;
function call(tool, args) {
  mcpEnv ??= {
    ...baseEnv,
    T3_ACP_MCP_ENDPOINT: new URL("/mcp", runtime.origin).href,
    T3_ACP_MCP_AUTHORIZATION: `Bearer ${issue(["--subject", "mcp-client", "--scope", "orchestration:read", "--scope", "orchestration:operate"])}`,
  };
  const out = JSON.parse(t3(["acp-mcp-call", tool, JSON.stringify(args)], mcpEnv));
  if (out.isError) throw new Error(`${tool}: ${JSON.stringify(out.content ?? out)}`);
  return out.structuredContent;
}

function listThreads() {
  const threads = [];
  let cursor = 0;
  while (cursor !== null) {
    const page = call("t3_thread_list", { allProjects: true, includeSubagents: false, limit: 100, cursor });
    threads.push(...page.threads);
    cursor = page.nextCursor;
  }
  return threads;
}

// Writes go through the app's WebSocket RPC: MCP refuses full-access chats above its ceiling.
async function openRpc() {
  const url = new URL("/ws", runtime.origin);
  url.protocol = "ws:";
  url.searchParams.set("orchestrationProtocol", "2");
  const ws = new WebSocket(url, { headers: { authorization: `Bearer ${issue([])}` } });
  const pending = new Map();
  let nextId = 0;
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = (e) => reject(new Error(`WebSocket failed: ${e.message ?? e.type}`));
  });
  ws.onmessage = (event) => {
    for (const line of String(event.data).split("\n")) {
      if (!line.trim()) continue;
      const parsed = JSON.parse(line);
      for (const m of Array.isArray(parsed) ? parsed : [parsed]) {
        if (m._tag === "Ping") ws.send(JSON.stringify({ _tag: "Pong" }));
        if (m._tag !== "Exit") continue;
        const p = pending.get(String(m.requestId));
        if (!p) continue;
        pending.delete(String(m.requestId));
        m.exit?._tag === "Success" ? p.resolve(m.exit.value) : p.reject(new Error(JSON.stringify(m.exit).slice(0, 400)));
      }
    }
  };
  const request = (tag, payload, timeoutMs = 120_000) => {
    const id = String(++nextId);
    const result = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    ws.send(JSON.stringify({ _tag: "Request", id, tag, payload, headers: [] }));
    return Promise.race([
      result,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${tag} timed out`)), timeoutMs)),
    ]);
  };
  return { request, close: () => ws.close() };
}


// Settles finished T3 chats (hides them from Recent; nothing is deleted). Running chats and any
// chat touched in the last 30 minutes are left alone. Writes an undo list next to this file.
//   node tidy-recent.mjs           settle
//   node tidy-recent.mjs --dry     list what would be settled
//   node tidy-recent.mjs --undo    un-settle everything the last run settled
const DRY = process.argv.includes("--dry");
const UNDO = process.argv.includes("--undo");
const KEEP_MINUTES = 30;
const undoFile = new URL("./last-settled.json", import.meta.url);
const FINISHED = new Set(["completed", "cancelled", "interrupted", "failed", "idle", "rolled_back"]);
let rpc;
try {
  rpc = DRY ? null : await openRpc();
  if (UNDO) {
    const ids = JSON.parse(readFileSync(undoFile, "utf8"));
    for (const threadId of ids) await rpc.request("orchestration.dispatchCommand", { type: "thread.unsettle", commandId: crypto.randomUUID(), threadId, reason: "user" });
    console.log(`Un-settled ${ids.length} chats.`);
  } else {
    const cutoff = Date.now() - KEEP_MINUTES * 60 * 1000;
    const pick = listThreads().filter((t) => !t.settled && FINISHED.has(t.status) && Date.parse(t.updatedAt) < cutoff);
    if (DRY) { for (const t of pick) console.log(t.updatedAt.slice(0, 16), t.title); }
    else {
      const done = [];
      for (const t of pick) {
        try { await rpc.request("orchestration.dispatchCommand", { type: "thread.settle", commandId: crypto.randomUUID(), threadId: t.threadId, reason: "user" }); done.push(t.threadId); }
        catch (e) { console.log(`skip ${t.title}: ${e.message.slice(0, 120)}`); }
      }
      writeFileSync(undoFile, JSON.stringify(done, null, 1));
      console.log(`Settled ${done.length} of ${pick.length} chats. Undo: node tidy-recent.mjs --undo`);
    }
  }
} finally {
  rpc?.close();
  for (const id of sessions) t3(["auth", "session", "revoke", id]);
}
