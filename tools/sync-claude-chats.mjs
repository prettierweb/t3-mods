// Pulls Claude chats made outside T3 (the Claude app, the CLI) into T3, then un-settles the
// recent new ones so their project folders show in the sidebar. Uses T3's own import RPC, the
// one its welcome wizard runs; no model calls. Chats T3 already has are left as they are.
//   node sync-claude-chats.mjs           import and un-settle
//   node sync-claude-chats.mjs --dry     list what the scan sees, change nothing
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const DRY = process.argv.includes("--dry");
const UNSETTLE_WITHIN_DAYS = 14;

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
  const issued = JSON.parse(t3(["auth", "session", "issue", "--ttl", "10m", "--label", "claude chat sync", "--json", ...args]));
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

// --new <list>: the Kani helper passes only Claude app chats created since its last sync, so T3
// imports just those projects and skips its scan of every transcript (about two minutes of work
// for T3's server).
const NEW_AT = process.argv.indexOf("--new");
const slugOf = (p) => p.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

async function syncNew(listFile) {
  const files = readFileSync(listFile, "utf8").split(/\r?\n/).map((f) => f.trim()).filter(Boolean);
  if (files.length === 0) return;
  const projects = call("t3_project_list", { limit: 100 }).projects
    .map((p) => ({ id: p.id, title: p.title, root: p.workspaceRoot, slug: slugOf(p.workspaceRoot.replace(/[\\/]+$/, "")) }))
    .sort((a, b) => b.slug.length - a.slug.length);
  const account2 = join(homedir(), ".claude-account2", "projects").toLowerCase();
  const touched = new Map();
  const threadIds = [];
  for (const file of files) {
    const slug = file.split(/[\\/]/).at(-2).toLowerCase();
    let project = projects.find((p) => slug === p.slug || slug.startsWith(`${p.slug}-`));
    if (!project) continue;
    // A chat the Claude app ran in a worktree of a project (<root>\.claude\worktrees\<name>, its
    // own copy of the repo for a parallel lane) lives under its own folder name, which T3 only
    // imports from a project registered at that folder. Register the worktree as its own project,
    // "myapp lane3", the first time one of its chats comes in.
    const wt = slug.slice(project.slug.length).match(/^--claude-worktrees-(.+)$/);
    if (wt && slug !== project.slug) {
      const root = join(project.root, ".claude", "worktrees", wt[1]);
      if (existsSync(root)) {
        // MCP may not change projects; the app's own socket (a full-access client) may
        rpc ??= await openRpc();
        const id = crypto.randomUUID(), title = `${project.title} ${wt[1].replace(/-[0-9a-f]{6}$/, "")}`;
        await rpc.request("projects.mutate", { type: "project.create", commandId: crypto.randomUUID(), projectId: id, title, workspaceRoot: root }, 30_000);
        console.log(`Added ${title} for ${root}`);
        project = { id, title, root, slug };
        projects.unshift(project);
      }
    }
    touched.set(project.id, project);
    const instance = file.toLowerCase().startsWith(account2) ? "claudeAccount2" : "claudeAgent";
    threadIds.push(`import:${instance}:${file.split(/[\\/]/).at(-1).replace(/\.jsonl$/, "")}`);
  }
  if (touched.size === 0) {
    console.log(`New chats: ${files.length}, none in a T3 project.`);
    return;
  }
  rpc ??= await openRpc();
  for (const p of touched.values()) {
    const r = await rpc.request("agentSessions.import", { projectId: p.id, expectedWorkspaceRoot: p.root });
    console.log(`${p.title}: imported ${r.importedCount}, skipped ${r.skippedCount}`);
  }
  let shown = 0;
  for (const threadId of threadIds) {
    try {
      await rpc.request("orchestration.dispatchCommand", { type: "thread.unsettle", commandId: crypto.randomUUID(), threadId, reason: "user" }, 15_000);
      shown++;
    } catch {
      // Not imported (empty or unresumable chat): nothing to show.
    }
  }
  console.log(`New chats: ${threadIds.length} in ${touched.size} project(s), ${shown} now in the sidebar.`);
}

let rpc;
try {
  if (NEW_AT !== -1) {
    await syncNew(process.argv[NEW_AT + 1]);
    process.exitCode = 0;
  } else {
  const before = listThreads();
  const known = new Set(before.map((t) => t.threadId));
  rpc = await openRpc();

  const scan = await rpc.request("agentSessions.scan", {});
  const inT3 = scan.candidates.filter((c) => c.projectId !== undefined);
  for (const c of scan.candidates) {
    const where = c.projectId === undefined ? "not a T3 project" : c.projectId;
    console.log(`${c.title.padEnd(28)} ${String(c.threadCount).padStart(4)} chats  ${where}`);
  }
  if (DRY) {
    console.log(`Dry run: ${before.length} chats in T3 now; would import into ${inT3.length} projects.`);
  } else {
    for (const c of inT3) {
      const r = await rpc.request("agentSessions.import", { projectId: c.projectId, expectedWorkspaceRoot: c.path });
      console.log(`${c.title}: imported ${r.importedCount}, skipped ${r.skippedCount}`);
    }

    const cutoff = Date.now() - UNSETTLE_WITHIN_DAYS * 24 * 60 * 60 * 1000;
    const fresh = listThreads().filter((t) => !known.has(t.threadId));
    const recent = fresh.filter((t) => t.settled && Date.parse(t.updatedAt) >= cutoff && !t.title.startsWith("Scribe"));
    for (const t of recent) {
      await rpc.request("orchestration.dispatchCommand", {
        type: "thread.unsettle",
        commandId: crypto.randomUUID(),
        threadId: t.threadId,
        reason: "user",
      });
    }
    console.log(`New chats: ${fresh.length}. Un-settled the ${recent.length} from the last ${UNSETTLE_WITHIN_DAYS} days.`);
  }
  }
} finally {
  rpc?.close();
  for (const id of sessions) t3(["auth", "session", "revoke", id]);
}
