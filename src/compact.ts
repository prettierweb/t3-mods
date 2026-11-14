// Compact panes: each pane gives its room to the text. Thinner top bar, no side gutters or
// minimap, the full pane width for the reply, tighter lines, and a short message box that still
// grows as you type and still takes dropped files. On by default; the sidebar's compact button
// or Ctrl+Alt+C turns it off and on in every pane at once (localStorage "t3compact").
//
// Each pane's top bar also says what its chat is doing, read from T3's own chat view (React
// props of the timeline: isWorking, activeTurnStartedAt, awaitingUser, pendingApprovals, plans):
// Working 4m and the step it is on, Needs approval, Needs your answer, Failed, or Done at the time
// it finished with how long it worked. When the chat keeps a plan, a hairline along the bottom of
// the bar fills as its steps complete.

const COMPACT_CSS = `
  html[data-t3-compact] { --workspace-topbar-height: 30px !important; --chat-content-max-width: 100% !important; }
  html[data-t3-compact] header[data-chat-header] { height: 30px !important; min-height: 30px !important; }
  html[data-t3-compact] [data-panel-layout-controls] [data-slot] button { height: 22px; width: 22px; }
  html[data-t3-compact] [data-panel-layout-controls] span[data-slot] { height: 30px; align-items: center; }
  html[data-t3-lane][data-t3-compact] header { padding-left: 32px !important; }
  html[data-t3-compact] #t3s-lane-close { top: 4px; left: 5px; width: 22px; height: 22px; border-radius: 6px; }
  html[data-t3-compact] #t3s-main-close { top: 4px; left: calc(var(--t3-main-x, 0px) + 5px); width: 22px; height: 22px; border-radius: 6px; }
  html[data-t3-compact] :is(#t3s-lane-close, #t3s-main-close) svg { width: 13px; height: 13px; }
  html[data-t3-has-lanes][data-t3-compact] main[data-slot="sidebar-inset"] header { padding-left: 32px !important; }

  html[data-t3-compact] .messages-timeline-scroll { padding-inline: 14px !important; }
  html[data-t3-compact] [data-testid="timeline-minimap"] { display: none !important; }
  html[data-t3-compact] .chat-markdown { line-height: 1.5 !important; }
  html[data-t3-compact] .chat-markdown p, html[data-t3-compact] .chat-markdown ul, html[data-t3-compact] .chat-markdown ol { margin-top: 6px !important; }
  html[data-t3-compact] .chat-markdown li { margin-top: 2px !important; }
  html[data-t3-compact] .chat-markdown h1, html[data-t3-compact] .chat-markdown h2, html[data-t3-compact] .chat-markdown h3 { margin-top: 10px !important; }

  html[data-t3-compact] [data-chat-composer-overlay] { padding-top: 4px !important; }
  html[data-t3-compact] .chat-composer-lane { padding-inline: 8px !important; }
  html[data-t3-compact] [data-slot="composer-shell"] + div { height: 6px !important; }
  html[data-t3-compact] [data-chat-composer-body] { padding: 7px 10px 0 !important; }
  html[data-t3-compact] [data-composer-rich-text] { min-height: calc(1lh + 8px) !important; }
  html[data-t3-compact] [data-chat-composer-footer] { padding: 0 4px 3px !important; }

  /* Nov 13: the status is pinned to the bar's right end in every pane, in one order (state, step,
     model note, context), and the context keeps one width, so the bars line up across lanes */
  #t3s-lane-status em:last-child:not(.off):not(.model) { min-width: 8.5ch; text-align: right; }
  #t3s-lane-status em.model, #t3s-lane-status em.off { cursor: pointer; -webkit-app-region: no-drag; border-radius: 4px; padding: 1px 4px; margin: -1px -4px; }
  #t3s-lane-status em.model:hover, #t3s-lane-status em.off:hover { background: var(--accent); color: var(--foreground); }
  #t3s-helpers { position: fixed; z-index: 2147483000; width: min(500px, calc(100vw - 16px)); max-height: 70vh; overflow: auto; padding: 6px; border-radius: 8px; border: 1px solid var(--border); background: var(--popover, var(--app-theme-canvas, #16181d)); color: var(--popover-foreground, var(--foreground)); box-shadow: 0 6px 20px rgba(0,0,0,.3); font-size: 12.5px; }
  #t3s-helpers h4 { margin: 6px 8px 3px; font-size: 12px; font-weight: 600; color: var(--muted-foreground); }
  #t3s-helpers .row { display: flex; width: 100%; align-items: baseline; gap: 10px; padding: 4px 8px; border: 0; border-radius: 5px; background: none; color: inherit; font: inherit; text-align: left; }
  #t3s-helpers button.row { cursor: pointer; }
  #t3s-helpers button.row:hover { background: var(--accent); }
  #t3s-helpers .row span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #t3s-helpers .row i { flex: none; font-style: normal; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  #t3s-helpers .row { align-items: center; }
  #t3s-helpers .mark { flex: none; width: 14px; height: 14px; display: inline-grid; place-items: center; font-size: 11px; font-weight: 700; line-height: 1; color: var(--muted-foreground); }
  #t3s-helpers .mark.completed { color: var(--success, #4ade80); }
  #t3s-helpers .mark.failed { color: var(--app-theme-error, #f87171); }
  #t3s-helpers .mark.queued { color: var(--app-theme-accent, var(--foreground)); }
  #t3s-helpers .mark.running { width: 9px; height: 9px; margin-inline: 2.5px; border-radius: 50%; border: 1.5px solid var(--app-theme-accent, var(--foreground)); border-right-color: transparent; animation: t3s-turn 1s linear infinite; }
  @keyframes t3s-turn { to { transform: rotate(1turn); } }
  @media (prefers-reduced-motion: reduce) { #t3s-helpers .mark.running { animation: none; border-right-color: var(--app-theme-accent, var(--foreground)); } }
  #t3s-helpers .row time { flex: none; width: 3ch; text-align: right; font-size: 11.5px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  #t3s-helpers .row.bad i { color: var(--app-theme-error, #f87171); font-weight: 600; }
  /* compact sidebar (Nov 13): one line per chat, tighter rows, so more chats fit on a 1080p screen.
     Recent drops its project line; the coloured bar at each row's left already says the project. */
  html[data-t3-compact] #t3s-recent .t3s-recent-sub { display: none; }
  html[data-t3-compact] #t3s-recent .t3s-recent-row { padding: 3px 8px 3px 14px; }
  html[data-t3-compact] #t3s-recent .t3s-recent-row::before { top: 5px; bottom: 5px; }
  html[data-t3-compact] #t3s-recent .t3s-recent-top { font-size: 12.5px; }
  html[data-t3-compact] #t3s-recent .t3s-recent-head { height: 26px; font-size: 13px; }
  html[data-t3-compact] [data-slot="sidebar"] [data-thread-item] { contain-intrinsic-size: auto 26px; }
  html[data-t3-compact] [data-slot="sidebar"] [data-thread-item] > div { height: 26px; padding-block: 0 !important; display: flex; align-items: center; }
  html[data-t3-compact] [data-slot="sidebar"] [data-thread-item] > div > div > span:nth-child(2) { font-size: 12.5px; }
  html[data-t3-compact] [data-slot="sidebar"] li[data-testid="sidebar-project-folder"] > button { height: 28px; font-size: 13px; }
  #t3s-lane-status span { flex: 0 1 auto; max-width: 260px; }
  #t3s-lane-status { flex: none; min-width: 0; margin-left: auto; padding-left: 12px; display: flex; align-items: baseline; gap: 8px; font-size: 12px; white-space: nowrap; font-variant-numeric: tabular-nums; }
  #t3s-lane-status b { flex: none; font-weight: 600; }
  #t3s-lane-status span { min-width: 0; overflow: hidden; text-overflow: ellipsis; color: var(--muted-foreground); }
  #t3s-lane-status[data-state="working"] b { color: var(--app-theme-accent, var(--foreground)); }
  #t3s-lane-status[data-state="you"] b { color: var(--warning-foreground, #f5c04f); }
  #t3s-lane-status[data-state="failed"] b { color: var(--app-theme-error, #f87171); }
  #t3s-lane-status[data-state="done"] b { color: var(--foreground); font-weight: 500; opacity: 0.75; }
  html[data-t3-compact] header[data-chat-header] nav { flex: 0 1 auto !important; min-width: 40px; max-width: none !important; }
  #t3s-lane-status b[hidden], #t3s-lane-status em[hidden] { display: none !important; }
  /* T3's three header buttons (thread details, terminal, right panel) fold behind one; they stay
     laid out, out of sight, under it, so a panel T3 anchors to its button opens under this one */
  html[data-t3-compact] [data-workspace-titlebar-controls] > div { position: relative; }
  html[data-t3-compact] [data-workspace-titlebar-controls] [data-panel-layout-controls] { position: absolute !important; top: 0; right: 0; width: 24px; height: 100%; overflow: hidden; opacity: 0; pointer-events: none; }
  #t3s-ctl-btn { display: none; }
  html[data-t3-compact] #t3s-ctl-btn { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 6px; background: none; color: var(--foreground); opacity: 0.8; cursor: pointer; -webkit-app-region: no-drag; }
  html[data-t3-compact] #t3s-ctl-btn:hover, html[data-t3-compact] #t3s-ctl-btn[aria-expanded="true"] { background: var(--accent); opacity: 1; }
  #t3s-ctl-btn svg { width: 15px; height: 15px; }
  #t3s-ctl-pop { position: fixed; z-index: 2147483000; min-width: 170px; padding: 4px; border-radius: 8px; border: 1px solid var(--border); background: var(--popover, var(--app-theme-canvas, #16181d)); color: var(--popover-foreground, var(--foreground)); box-shadow: 0 6px 20px rgba(0,0,0,.3); }
  #t3s-ctl-pop button { display: flex; width: 100%; align-items: center; gap: 9px; padding: 5px 8px; border: 0; border-radius: 5px; background: none; color: inherit; font-size: 12.5px; line-height: 18px; text-align: left; cursor: pointer; }
  #t3s-ctl-pop button:hover { background: var(--accent); }
  #t3s-ctl-pop svg { width: 15px; height: 15px; flex: none; opacity: 0.8; }
  #t3s-ctl-pop button i { margin-left: auto; font-style: normal; color: var(--muted-foreground); }
  /* the strip under the window's own minimise/maximise/close buttons, where a pane's bar ends */
  #t3s-wco-pad { position: fixed; top: 0; right: 0; z-index: 40; pointer-events: none; background: var(--app-theme-canvas, #16181d); }
  html[data-t3-compact] header[data-chat-header] { box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--app-theme-accent, var(--border)) 40%, transparent); }
  #t3s-lane-trail { flex: 1 1 0; min-width: 0; margin-left: 14px; display: flex; align-items: center; gap: 5px; overflow: hidden; font-size: 11.5px; white-space: nowrap; }
  #t3s-lane-trail i { font-style: normal; flex: none; max-width: 190px; overflow: hidden; text-overflow: ellipsis; padding: 1px 7px; border-radius: 5px; line-height: 17px; }
  #t3s-lane-trail i.done { color: var(--muted-foreground); }
  #t3s-lane-trail i.done::before { content: "✓ "; color: var(--app-theme-accent, var(--muted-foreground)); }
  #t3s-lane-trail i.open { color: var(--foreground); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--app-theme-accent, var(--foreground)) 50%, transparent); }
  [data-t3-reminder] { display: none !important; }
  html[data-t3-compact] [data-timeline-root] .sticky.rounded-t-lg { position: static !important; }
  /* T3's placeholder under a message that is only an image */
  [data-t3-attach-note] { display: none !important; }
  /* terminal style: flat, left-aligned, one rhythm; mono only for tool lines and code */
  html[data-t3-cli] { --t3-mono: ui-monospace, "Cascadia Mono", Consolas, monospace; }
  html[data-t3-cli] .chat-markdown { font-size: 13px !important; line-height: 1.45 !important; }
  html[data-t3-cli] .chat-markdown h1, html[data-t3-cli] .chat-markdown h2, html[data-t3-cli] .chat-markdown h3 { font-size: 13px !important; font-weight: 700 !important; margin: 8px 0 2px !important; }
  html[data-t3-cli] [data-message-role="user"] *:not(img):not(video) { background: transparent !important; box-shadow: none !important; border-color: transparent !important; border-radius: 0 !important; }
  html[data-t3-cli] [data-message-role="user"], html[data-t3-cli] [data-message-role="user"] *:not(svg):not(path) { justify-content: flex-start !important; align-items: flex-start !important; margin-left: 0 !important; margin-inline-start: 0 !important; text-align: left !important; max-width: 100% !important; }
  html[data-t3-cli] [data-message-role="user"] > * { padding-left: 0 !important; }
  html[data-t3-cli] [data-user-message-body] { position: relative; padding: 0 0 0 16px !important; font-size: 13px !important; color: var(--app-theme-accent, var(--foreground)) !important; -webkit-mask-image: none !important; mask-image: none !important; max-height: none !important; }
  html[data-t3-cli] [data-user-message-body]::before { content: "›"; position: absolute; left: 0; top: 0; font-family: var(--t3-mono); font-weight: 700; }
  html[data-t3-cli] [data-user-message-footer] { display: none !important; }
  html[data-t3-cli] [data-timeline-row-kind="message"] { padding-block: 2px !important; }
  html[data-t3-compact] [data-workspace-area="conversation"] > [data-assistant-citation-viewport] { height: auto !important; flex: 1 1 0; min-height: 0; }
  #t3s-activity { flex: none; padding: 6px 16px; border-bottom: 1px solid var(--border); font-size: 12.5px; line-height: 1.45; color: var(--foreground); }
  #t3s-activity > div { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  #t3s-activity b { font-weight: 600; color: var(--app-theme-accent, var(--foreground)); margin-right: 8px; }
  html[data-t3-compact] [data-timeline-row-kind="work-toggle"] { display: none !important; }
  html[data-t3-compact] [data-timeline-row-kind="work-live"] [class*="min-h-6"] { min-height: 18px !important; font-size: 12px !important; line-height: 18px !important; opacity: 0.6; }
  html[data-t3-compact] [data-timeline-row-kind="work-live"] { padding-bottom: 0 !important; }
  html[data-t3-compact] [data-timeline-row-kind="assistant-meta"] { display: none !important; }
  html[data-t3-compact] [data-timeline-row-kind="working"], html[data-t3-compact] [data-timeline-row-kind="turn-fold"] { font-size: 12px !important; opacity: 0.75; }
  /* the chat's title gets the room: the project shows in the sidebar and the bar's colour */
  html[data-t3-compact] header[data-chat-header] nav ol > li:nth-child(-n+2) { display: none !important; }
  #t3s-lane-trail { cursor: pointer; }
  #t3s-lane-trail i.count { color: var(--muted-foreground); font-variant-numeric: tabular-nums; padding-inline: 2px; }
  #t3s-lane-trail i.now { color: var(--app-theme-accent, var(--foreground)); font-weight: 600; }
  #t3s-lane-status em { font-style: normal; font-size: 11.5px; color: var(--muted-foreground); }
  #t3s-lane-status em.filling { color: var(--warning-foreground, #f5c04f); }
  #t3s-lane-status em.full { color: var(--app-theme-error, #f87171); font-weight: 600; }
  #t3s-plan-pop { position: fixed; top: 34px; left: 12px; right: 12px; max-width: 560px; z-index: 2147483000; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border); background: color-mix(in srgb, var(--app-theme-canvas, #111) 94%, transparent); box-shadow: 0 8px 28px rgba(0,0,0,.35); font-size: 13px; color: var(--foreground); }
  #t3s-plan-pop ul { margin: 0; padding: 0; list-style: none; }
  #t3s-plan-pop li { padding: 3px 0 3px 20px; position: relative; line-height: 1.4; }
  #t3s-plan-pop li::before { position: absolute; left: 2px; }
  #t3s-plan-pop li.done { color: var(--muted-foreground); }
  #t3s-plan-pop li.done::before { content: "✓"; color: var(--app-theme-accent, var(--muted-foreground)); }
  #t3s-plan-pop li.now { font-weight: 600; }
  #t3s-plan-pop li.now::before { content: "→"; color: var(--app-theme-accent, var(--foreground)); }
  #t3s-plan-pop li.open::before { content: "○"; color: var(--muted-foreground); }
  #t3s-plan-pop p { margin: 10px 0 0; padding-top: 10px; border-top: 1px solid var(--border); color: var(--muted-foreground); line-height: 1.45; }
  /* denser: the resting message box is one row (the model picker shows once you click in), status
     rows that repeat the top bar are gone, and T3's shimmer on the running step (a repaint every
     frame, ~10% of a core per pane) is still */
  html[data-t3-compact] [data-chat-composer-mobile-collapsed] > div:has(> div > [data-chat-composer-resting-controls]) { display: none !important; }
  html[data-t3-compact] [data-chat-composer-mobile-collapsed] { padding-bottom: 0 !important; min-height: 0 !important; }
  html[data-t3-compact] [data-chat-composer-mobile-collapsed] > div:first-child { min-height: 0 !important; padding-block: 4px !important; }
  html[data-t3-compact] .live-tool-shine { animation: none !important; }
  html[data-t3-compact] [data-timeline-row-kind="working"] { display: none !important; }
  html[data-t3-compact] [data-timeline-row-kind="work"] { padding-block: 0 !important; }
  html[data-t3-compact] [data-timeline-row-kind="work"] [class*="min-h-"], html[data-t3-compact] [data-timeline-row-kind="work-live"] [class*="min-h-"] { min-height: 18px !important; }
  html[data-t3-compact] [data-timeline-row-kind="turn-fold"] { padding-block: 2px !important; }
  #t3s-activity { padding: 4px 14px !important; }
  #t3s-activity > div { -webkit-line-clamp: 1 !important; }
  html[data-t3-compact] [data-timeline-row-kind] > .pb-2 { padding-bottom: 2px !important; }
  html[data-t3-compact] [data-timeline-row-kind="work"] .text-sm, html[data-t3-compact] [data-timeline-row-kind="work-live"] .text-sm { font-size: 12px !important; line-height: 18px !important; }
  #t3s-lane-progress { position: absolute; left: 0; bottom: 0; height: 2px; background: var(--app-theme-accent, var(--foreground)); opacity: 0.7; transition: width 500ms ease-out; pointer-events: none; }
  /* denser still (Nov 9): replies get the room. Your own messages are small and fold at four lines, their pictures are thumbnails, the changed-files card is one line, rows sit closer */
  html[data-t3-compact] .chat-markdown { font-size: 13px !important; line-height: 1.45 !important; }
  html[data-t3-compact] [data-timeline-row-kind="message"] { padding-bottom: 6px !important; }
  html[data-t3-compact] [data-user-message-body] { font-size: 13px !important; line-height: 19px !important; }
  html[data-t3-compact] [data-user-message-body][data-user-message-collapsed="true"] { max-height: 76px !important; }
  html[data-t3-compact] [data-message-role="user"] > div > div[class*="rounded-2xl"] { padding: 6px 10px !important; }
  html[data-t3-compact] [data-message-role="user"] > div > div[class*="tabular-"] { display: none !important; }
  html[data-t3-compact] [data-message-role="user"] img[class*="h-48"] { height: 84px !important; }
  html[data-t3-compact] [data-changed-files-state] { margin-top: 6px !important; }
  html[data-t3-compact] [data-changed-files-state] > div:not([data-changed-files-header]) { display: none !important; }
  html[data-t3-compact] [data-changed-files-header] { height: 26px !important; min-height: 0 !important; padding-block: 0 !important; border-radius: 8px !important; }
  html[data-t3-compact] [data-changed-files-header] button[data-scroll-anchor-ignore] { display: none !important; }
  /* one-row message box at rest; it opens to full width when you click in or dictate */
  html[data-t3-compact] [data-chat-composer-surface] { display: flex !important; flex-wrap: wrap; align-items: flex-end; }
  html[data-t3-compact] [data-chat-composer-body] { flex: 1 1 140px; min-width: 0; padding: 4px 10px !important; }
  /* every pane rests and types in the same one row: the controls stay on the right and the text grows upward; only dictation takes the full width */
  html[data-t3-compact] [data-chat-composer-surface]:has([data-chat-composer-footer][data-t3dict]) [data-chat-composer-body] { flex-basis: 100%; }
  html[data-t3-compact] [data-chat-composer-body] [data-composer-rich-text] + * , html[data-t3-compact] [data-chat-composer-body] .text-placeholder { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  html[data-t3-compact] [data-chat-composer-footer] { flex: 0 1 auto; margin-left: auto; padding: 0 4px 2px !important; }
  html[data-t3-compact] [data-chat-composer-footer][data-t3dict] { flex-basis: 100%; }
  html[data-t3-compact] [data-chat-composer-footer] > div:first-child { margin-inline-end: 0 !important; }
  html[data-t3-compact] [data-chat-composer-footer] :is([data-chat-composer-actions], [data-chat-composer-controls]) { flex: 0 1 auto !important; gap: 1px !important; }
  html[data-t3-compact] [data-chat-composer-footer] button { height: 24px !important; min-height: 0 !important; }
  html[data-t3-compact] [data-chat-composer-footer] button:not([data-chat-provider-model-picker]) { width: 24px !important; }
  html[data-t3-compact] [data-chat-composer-footer] [data-chat-provider-model-picker] { font-size: 12px !important; padding-inline: 5px !important; }
  html[data-t3-compact] [data-chat-composer-footer] [data-chat-provider-model-picker] span { line-height: 18px !important; }
  html[data-t3-compact] [data-composer-rich-text] { font-size: 12.5px !important; line-height: 18px !important; min-height: calc(1lh + 8px) !important; }
  /* smaller text */
  html[data-t3-compact] .chat-markdown { font-size: 12px !important; line-height: 1.42 !important; }
  html[data-t3-compact] .chat-markdown :is(h1, h2, h3) { font-size: 12.5px !important; }
  html[data-t3-compact] .chat-markdown :is(code, pre) { font-size: 11.5px !important; }
  html[data-t3-compact] [data-user-message-body] { font-size: 12px !important; line-height: 17px !important; }
  html[data-t3-compact] [data-user-message-body][data-user-message-collapsed="true"] { max-height: 68px !important; }
  /* a softer dark for T3's own dark theme: charcoal, no tint */
  html.dark:not([data-theme-id]) { background-color: #1a1b1e !important; --card: #222327; --popover: #222327; --surface-raised: #222327; --sidebar: #16171a; }
  html.dark:not([data-theme-id]):not([data-t3-lane]) { --background: #1a1b1e; }
`;

const MODE_KEY = "t3compact";
const DONE_KEY = "t3done:";
const NEEDS_YOU: Record<string, string> = { Approval: "Needs approval", Input: "Needs your answer" };

const threadKey = () => {
  const m = location.hash.match(/^#\/([^/]+)\/(.+)$/);
  return m ? `${m[1]}:${decodeURIComponent(m[2])}` : null;
};
// the sidebar row's status, for Failed and as a fallback when the chat view isn't drawn yet
const rowStatus = (key: string) => {
  const row = document.querySelector<HTMLElement>(`[data-thread-item="${CSS.escape(key)}"] > [role=treeitem]`);
  const parts = (row?.getAttribute("aria-label") ?? "").split(", ");
  return parts.length >= 3 ? parts[parts.length - 2] : "";
};
// T3's chat view props, found by walking up from the timeline's root element
const chatView = (): any => {
  const el = document.querySelector("[data-timeline-root]") as any;
  if (!el) return null;
  const k = Object.keys(el).find((x) => x.startsWith("__reactFiber"));
  let f = k ? el[k] : null;
  for (let i = 0; f && i < 60; i++, f = f.return) {
    const p = f.memoizedProps;
    if (p && typeof p === "object" && "isWorking" in p && "entriesInput" in p) return p;
  }
  return null;
};
const timeOf = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" ? Date.parse(v) : NaN);
const since = (t: number) => {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
};
const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const textOf = (s: any) => String(s?.step ?? s?.text ?? s?.content ?? s?.title ?? s?.description ?? "").trim();

// the chat's latest plan, if it keeps one: how far along, and the step it is on
const planOf = (view: any): { done: number; total: number; current: string } | null => {
  const plan = view?.entriesInput?.plans?.at?.(-1);
  const steps = Array.isArray(plan) ? plan : plan && [plan.steps, plan.items, plan.entries, plan.plan, plan.todos].find(Array.isArray);
  if (!steps?.length) return null;
  const done = steps.filter((s: any) => /complete|done/i.test(String(s?.status))).length;
  const now = steps.find((s: any) => /progress|active|running/i.test(String(s?.status)));
  return { done, total: steps.length, current: textOf(now) };
};
// the newest activity row of the turn that is running ("Ran …", "Edited …"), first line only
const latestStep = () => {
  const rows = document.querySelectorAll<HTMLElement>('[data-timeline-row-kind="work"]');
  const last = rows[rows.length - 1];
  // only a row after your last message belongs to this turn
  const you = [...document.querySelectorAll('[data-message-role="user"]')].at(-1);
  if (last && you && !(you.compareDocumentPosition(last) & Node.DOCUMENT_POSITION_FOLLOWING)) return "";
  return last ? last.innerText.split("\n").map((l) => l.trim()).find(Boolean)?.slice(0, 140) ?? "" : "";
};
// "Worked for 3m 36s 9:23 a.m." on the last finished turn
const lastFold = () => {
  const folds = document.querySelectorAll<HTMLElement>('[data-timeline-row-kind="turn-fold"]');
  const m = folds[folds.length - 1]?.innerText.replace(/\s+/g, " ").match(/Worked for ([^0-9]*[\dhms ]+?)\s+(\d{1,2}:\d{2}\s*[ap]\.?m\.?)/i);
  return m ? { took: m[1].trim(), at: m[2] } : null;
};

// The last reply's closing line, "✅ Closed: a · b ⬜ Open: c · d": what got done and what is
// still open, shown along the top bar
const closedOpen = () => {
  const msg = [...document.querySelectorAll<HTMLElement>('[data-message-role="assistant"]')].at(-1);
  const line = msg?.innerText.split("\n").reverse().find((l) => /\b(Closed|Open):/.test(l));
  if (!line) return null;
  const items = (part: string | undefined) => (part ?? "").replace(/[✅⬜☐🔲✔]/gu, "").split(/\s+[·•]\s+/).map((x) => x.trim().replace(/[.;]$/, "")).filter(Boolean).slice(0, 8);
  return { done: items(line.match(/Closed:\s*(.*?)(?=\s*(?:[⬜☐🔲]|Open:)|$)/u)?.[1]), open: items(line.match(/Open:\s*(.*)$/u)?.[1]) };
};

// the first sentence of a reply, as one step of the strip
const firstSentence = (row: Element) => {
  const text = (row.querySelector(".chat-markdown") as HTMLElement | null)?.innerText.trim().split("\n").find((l) => l.trim()) ?? "";
  const cut = text.search(/[.!?](\s|$)/);
  return (cut > 0 ? text.slice(0, cut + 1) : text).replace(/[:]$/, "").slice(0, 320);
};
// this turn's replies: the message rows after your last real message (not an app note)
const turnSteps = () => {
  const rows = [...document.querySelectorAll<HTMLElement>('[data-timeline-row-kind="message"]')];
  let start = -1;
  rows.forEach((r, i) => { if (r.dataset.messageRole === "user" && !r.hasAttribute("data-t3-reminder")) start = i; });
  return rows.slice(start + 1).filter((r) => r.dataset.messageRole === "assistant").map(firstSentence).filter(Boolean);
};
const FOLD_KEY = "t3activity";

export function startCompact(isLane: boolean): [() => void, () => void] {
  const root = document.documentElement;
  const style = document.createElement("style");
  style.id = "t3-scene-compact";
  style.textContent = COMPACT_CSS;
  document.head.append(style);
  // three styles, in turn on the sidebar button or Ctrl+Alt+C: off, compact, and terminal (compact
  // laid out like a terminal: no bubbles, your messages as › lines, tool rows in mono)
  const mode = () => { try { const m = localStorage.getItem(MODE_KEY); return m === "off" ? "off" : m === "cli" ? "cli" : "on"; } catch { return "on"; } };
  const wanted = () => mode() !== "off";
  let open = wanted();
  root.toggleAttribute("data-t3-compact", open);
  root.toggleAttribute("data-t3-cli", mode() === "cli");

  // the task list of a chat copied in from the Claude app, read from its transcript by the
  // injector (t3-scenes.mjs planOf), asked for at most every 15 s per chat
  type TPlan = { items: Array<{ content: string; status: string }>; recap: string; tokens?: number };
  const plans = new Map<string, TPlan | null>(), asked = new Map<string, number>();
  const w = window as any;
  w.__t3plan = (id: string, p: TPlan | null) => { plans.set(id, p); last = ""; draw(); };
  const transcriptPlan = (key: string): TPlan | null => {
    // Nov 10: T3 dropped its context ring from the message box, so T3-run chats are looked up too
    // ("t3:<thread>"; the injector finds the chat's Claude session in T3's own database)
    const id = key.match(/import:claude\w*:([0-9a-f-]{36})$/)?.[1] ?? (key.includes(":") ? `t3:${key.slice(key.indexOf(":") + 1)}` : undefined);
    if (!id) return null;
    if (Date.now() - (asked.get(id) ?? 0) > 15_000 && typeof w.__t3scenesHost === "function") { asked.set(id, Date.now()); w.__t3scenesHost(`plan:${id}`); }
    return plans.get(id) ?? null;
  };

  // the whole list, dropped down from the bar
  let pop: HTMLElement | null = null;
  const drawPop = () => {
    const key = threadKey(), raw = key ? transcriptPlan(key) : null, tp = raw?.items.length ? raw : null, co = tp ? null : closedOpen();
    if (!pop) return;
    const li = (cls: string, text: string) => Object.assign(document.createElement("li"), { className: cls, textContent: text });
    const list = document.createElement("ul");
    if (tp) tp.items.forEach((i) => list.append(li(i.status === "completed" ? "done" : i.status === "in_progress" ? "now" : "open", i.content)));
    else if (co) { co.done.forEach((t) => list.append(li("done", t))); co.open.forEach((t) => list.append(li("open", t))); }
    pop.replaceChildren(list, ...(tp?.recap ? [Object.assign(document.createElement("p"), { textContent: tp.recap })] : []));
  };
  const closePop = () => { pop?.remove(); pop = null; };
  const togglePop = () => {
    if (pop) { closePop(); return; }
    pop = document.createElement("div");
    pop.id = "t3s-plan-pop";
    document.body.append(pop);
    drawPop();
  };
  const onDown = (e: Event) => { if (pop && !pop.contains(e.target as Node)) closePop(); };
  const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape" && pop) { closePop(); e.stopPropagation(); } };

  // The Claude app writes its own notes into a chat ("<system-reminder> Linked sessions now …");
  // T3 shows them as your messages. They are hidden here.
  const hideReminders = () => {
    // the list recycles row elements, so each drawn row is checked again every time
    document.querySelectorAll<HTMLElement>('[data-message-role="user"]').forEach((m) => {
      const body = m.querySelector("[data-user-message-body]")?.textContent ?? "";
      m.closest<HTMLElement>("[data-timeline-row-id]")?.toggleAttribute("data-t3-reminder", /^\s*<system-reminder>/.test(body));
      m.querySelector("[data-user-message-body]")?.toggleAttribute("data-t3-attach-note", /^\s*\[User attached one or more files without additional text\./.test(body));
    });
  };

  const folded = () => { try { return localStorage.getItem(FOLD_KEY) === "folded"; } catch { return false; } };
  let actSig = "";
  const drawActivity = (working: boolean) => {
    const area = document.querySelector<HTMLElement>('[data-workspace-area="conversation"]');
    let strip = document.getElementById("t3s-activity");
    if (!area) { strip?.remove(); return; }
    const steps = turnSteps();
    const open = working ? [] : closedOpen()?.open ?? [];
    if (!steps.length && !open.length && !working) { strip?.remove(); actSig = ""; return; }
    const sig = JSON.stringify([steps, open, working, folded()]);
    if (strip && strip.parentElement === area && strip === area.firstElementChild && sig === actSig) return;
    actSig = sig;
    if (!strip) {
      strip = document.createElement("div");
      strip.id = "t3s-activity";
      strip.title = "Click to fold or unfold";
      strip.addEventListener("click", () => { try { localStorage.setItem(FOLD_KEY, folded() ? "open" : "folded"); } catch {} actSig = ""; draw(); });
    }
    // one line: while it works, the step it is on; once done, what is next. The chat itself is
    // the record of what was done, so the strip never repeats it.
    const line = document.createElement("div");
    const label = (t: string) => Object.assign(document.createElement("b"), { textContent: t });
    // Nov 13: while it works, the step it is on sits in the top bar instead, so panes keep one height
    if (working) { strip.remove(); actSig = ""; return; }
    else if (open.length) line.append(label("Next"), open.slice(0, 3).join("  ·  "));
    else { strip.remove(); actSig = ""; return; }
    strip.replaceChildren(line);
    if (area.firstElementChild !== strip) area.prepend(strip);
  };

  let wasWorking = new Map<string, boolean>();
  let last = "";
  // ── the top bar's right end ──────────────────────────────────────────────────
  // T3's three header buttons fold behind one button with a small list under it
  const LABELS: Record<string, string> = { "Toggle thread details panel": "Thread details", "Toggle terminal drawer": "Terminal", "Toggle right panel": "Right panel" };
  let ctlPop: HTMLElement | null = null;
  const ctlBtn = document.createElement("button");
  ctlBtn.id = "t3s-ctl-btn";
  ctlBtn.type = "button";
  ctlBtn.title = "Thread details, terminal, right panel";
  ctlBtn.setAttribute("aria-label", ctlBtn.title);
  ctlBtn.setAttribute("aria-expanded", "false");
  ctlBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  const closeCtl = () => { ctlPop?.remove(); ctlPop = null; ctlBtn.setAttribute("aria-expanded", "false"); };
  ctlBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (ctlPop) { closeCtl(); return; }
    const originals = [...document.querySelectorAll<HTMLButtonElement>("[data-workspace-titlebar-controls] [data-panel-layout-controls] button")];
    if (!originals.length) return;
    ctlPop = document.createElement("div");
    ctlPop.id = "t3s-ctl-pop";
    ctlPop.setAttribute("role", "menu");
    for (const o of originals) {
      const label = o.getAttribute("aria-label") ?? "";
      const row = document.createElement("button");
      row.type = "button";
      row.setAttribute("role", "menuitem");
      const svg = o.querySelector("svg")?.cloneNode(true);
      if (svg) row.append(svg);
      row.append(Object.assign(document.createElement("span"), { textContent: LABELS[label] ?? label.replace(/^Toggle\s+/i, "") }));
      if (o.getAttribute("aria-pressed") === "true" || o.getAttribute("aria-expanded") === "true") row.append(Object.assign(document.createElement("i"), { textContent: "open" }));
      row.addEventListener("click", (ev) => { ev.stopPropagation(); closeCtl(); o.click(); });
      ctlPop.append(row);
    }
    const r = ctlBtn.getBoundingClientRect();
    Object.assign(ctlPop.style, { top: `${Math.round(r.bottom + 4)}px`, right: `${Math.max(4, Math.round(innerWidth - r.right))}px` });
    document.body.append(ctlPop);
    ctlBtn.setAttribute("aria-expanded", "true");
  });
  const onCtlDown = (e: Event) => { if (ctlPop && !ctlPop.contains(e.target as Node) && e.target !== ctlBtn && !ctlBtn.contains(e.target as Node)) closeCtl(); };
  const onCtlEsc = (e: KeyboardEvent) => { if (e.key === "Escape" && ctlPop) { closeCtl(); e.stopPropagation(); } };

  // The bar stops where the window's own buttons begin (the pane in the top-right corner, or the
  // window chat with no lanes), and a plain strip sits under those buttons; the bar's content
  // keeps clear of the folded button. Measured every draw, so a resize or zoom keeps it right.
  let wcoPad: HTMLElement | null = null;
  const placeBar = (header: HTMLElement | null) => {
    const ctl = document.querySelector<HTMLElement>("[data-workspace-titlebar-controls]");
    const panel = ctl?.querySelector("[data-panel-layout-controls]");
    const holder = panel?.parentElement as HTMLElement | null;
    if (open && holder && panel && ctlBtn.parentElement !== holder) holder.insertBefore(ctlBtn, panel);
    if (!open || !header) {
      ctlBtn.remove(); closeCtl(); wcoPad?.remove(); wcoPad = null;
      const h = document.querySelector<HTMLElement>("header[data-chat-header]");
      h?.style.removeProperty("margin-right"); h?.style.removeProperty("padding-right");
      (h?.querySelector("nav")?.parentElement as HTMLElement | null)?.style.removeProperty("padding-right");
      return;
    }
    // window buttons: the title bar area ends where they begin
    const wco = (navigator as any).windowControlsOverlay;
    const area = wco?.visible ? wco.getTitlebarAreaRect?.() : null;
    const edge = area && area.width > 0 ? area.x + area.width : innerWidth;
    const full = header.parentElement?.getBoundingClientRect().right ?? header.getBoundingClientRect().right;
    const cut = Math.round(full - edge);
    if (cut > 0) {
      header.style.setProperty("margin-right", `${cut}px`, "important");
      header.style.setProperty("padding-right", "6px", "important");
      if (!wcoPad) { wcoPad = document.createElement("div"); wcoPad.id = "t3s-wco-pad"; }
      Object.assign(wcoPad.style, { left: `${Math.round(edge)}px`, height: `${Math.round(area?.height ?? 30)}px` });
      if (!wcoPad.isConnected) document.body.append(wcoPad);
    } else {
      header.style.removeProperty("margin-right");
      header.style.removeProperty("padding-right");
      wcoPad?.remove(); wcoPad = null;
    }
    // the bar's row (title and status) ends before the folded button
    const row = header.querySelector("nav")?.parentElement as HTMLElement | null;
    const btn = ctlBtn.isConnected ? ctlBtn.getBoundingClientRect() : ctl?.getBoundingClientRect();
    if (row && btn && btn.width > 0) {
      const rr = row.getBoundingClientRect();
      const pad = Math.max(0, Math.round(rr.right - btn.left + 8));
      if (row.style.getPropertyValue("padding-right") !== `${pad}px`) row.style.setProperty("padding-right", `${pad}px`, "important");
    }
  };
  // the title gets its room first: the status shortens, then drops its word, then its percent
  const fitStatus = (el: HTMLElement, header: HTMLElement, word: string, short: string) => {
    const title = header.querySelector<HTMLElement>('nav ol > li:last-child [data-slot="workspace-breadcrumb-text"]') ?? header.querySelector<HTMLElement>("nav ol > li:last-child");
    const b = el.querySelector("b"), em = el.querySelector<HTMLElement>("em:not(.off):not(.model)"), model = el.querySelector<HTMLElement>("em.model");
    if (!b) return;
    b.hidden = false; b.textContent = word;
    if (model) model.hidden = false;
    if (em) { em.hidden = false; if (em.dataset.full) em.textContent = em.dataset.full; }
    if (!title) return;
    // and the status itself must fit its room (Nov 13: pinned right, it could run under the menu button)
    const enough = () => title.clientWidth >= Math.min(title.scrollWidth, 130) - 1 && el.scrollWidth <= el.clientWidth + 1;
    if (enough()) return;
    if (model) { model.hidden = true; if (enough()) return; } // the model name goes first: the message box shows it too
    if (short !== word) { b.textContent = short; if (enough()) return; }
    b.hidden = true; if (enough() || !em) return;
    // Nov 11: how full the chat is stays on the bar (the last pane, under the window buttons, lost
    // it). It drops its token count first ("155k · 15%" to "15%") and goes only when the title
    // would be left with under 60 px.
    if (em.dataset.short) { em.textContent = em.dataset.short; if (enough()) return; }
    if (title.clientWidth >= 60) return;
    em.hidden = true;
  };
  const shortWord = (word: string, state: string) =>
    state === "done" ? "Done" : state === "working" ? word.replace(/^Working\s*/, "") || "Working" : word === NEEDS_YOU.Approval ? "Approval" : word === NEEDS_YOU.Input ? "Answer" : word;

  // ── a click on blank space in the chat ───────────────────────────────────────
  // T3 folds a narrow pane's message box to one line when it loses focus, and a click on blank
  // chat space took the focus to the chat's scroller: the box folded and typing went nowhere.
  // A click there now leaves the focus in the message box (or opens it). Words, links, buttons,
  // code and pictures keep their own click, and dragging over text still selects it.
  const OWN_CLICK = 'a,button,input,textarea,select,label,summary,[contenteditable],[role=button],[role=menuitem],[role=option],[role=link],[role=tab],[role=checkbox],[role=switch],[role=slider],[role=textbox],[role=dialog],[draggable=true],.chat-markdown,[data-user-message-body],pre,code,img,video,canvas,svg,[data-chat-composer-form],header,#t3s-activity,[data-scroll-to-end]';
  const onText = (x: number, y: number) => {
    const r = document.caretRangeFromPoint?.(x, y);
    const node = r?.startContainer;
    if (!node || node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) return false;
    const range = document.createRange();
    range.selectNodeContents(node);
    return [...range.getClientRects()].some((b) => x >= b.left - 2 && x <= b.right + 2 && y >= b.top - 2 && y <= b.bottom + 2);
  };
  const focusBox = () => {
    const surface = document.querySelector<HTMLElement>("[data-chat-composer-surface]");
    if (!surface) return;
    if (surface.getAttribute("data-chat-composer-mobile-collapsed") === "true") {
      surface.querySelector<HTMLElement>("[data-chat-composer-transition-prompt]")?.click();
      return;
    }
    const editor = surface.querySelector<HTMLElement>('[contenteditable="true"]');
    if (editor && document.activeElement !== editor && !editor.contains(document.activeElement)) editor.focus();
  };
  // the box opens on a click or a key in it, not on focus alone: a pane can take focus as the mouse
  // passes over it, and the box opened and closed under the pointer
  const setBoxOpen = (on: boolean) => document.querySelectorAll<HTMLElement>("[data-chat-composer-surface]").forEach((el) => el.toggleAttribute("data-t3open", on));
  const onBoxDown = (e: PointerEvent) => { setBoxOpen(!!(e.target as Element | null)?.closest?.("[data-chat-composer-surface]")); };
  const onBoxKey = (e: KeyboardEvent) => { if ((e.target as Element | null)?.closest?.("[data-chat-composer-surface]") && !e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) setBoxOpen(true); };
  const onBoxBlur = () => setBoxOpen(false);
  const onBlankDown = (e: MouseEvent) => {
    if (!open || e.button !== 0 || e.detail > 1) return; // a double or triple click selects words
    const t = e.target as Element | null;
    if (!t?.closest?.('[data-workspace-area="conversation"]') || t.closest(OWN_CLICK)) return;
    if (onText(e.clientX, e.clientY)) return;
    e.preventDefault(); // the focus stays where it is: in the message box
    focusBox();
    setBoxOpen(true);
  };

  const clear = () => { document.getElementById("t3s-activity")?.remove(); actSig = ""; document.getElementById("t3s-lane-trail")?.remove(); document.getElementById("t3s-lane-status")?.remove(); document.getElementById("t3s-lane-progress")?.remove(); last = ""; };
  const draw = () => {
    hideReminders();
    placeBar(open ? document.querySelector<HTMLElement>("header[data-chat-header]") : null);
    const key = threadKey();
    if (!open || !key) { clear(); return; }
    const view = chatView();
    const status = rowStatus(key);
    const working = view ? !!view.isWorking : status === "Working" || status === "Goal";
    const plan = planOf(view);
    let word = "", detail = "", state = "";
    if (working) {
      const t = timeOf(view?.activeTurnStartedAt);
      word = Number.isFinite(t) ? `Working ${since(t)}` : "Working";
      detail = plan?.current || latestStep();
      if (plan) detail = `${plan.done}/${plan.total}${detail ? `  ${detail}` : ""}`;
      state = "working";
    } else if (view?.pendingApprovals?.length || status === "Approval") { word = NEEDS_YOU.Approval; state = "you"; }
    else if (view?.awaitingUser || status === "Input") { word = NEEDS_YOU.Input; state = "you"; }
    else if (status === "Failed") { word = "Failed"; state = "failed"; }
    else {
      if (wasWorking.get(key)) try { localStorage.setItem(DONE_KEY + key, String(Date.now())); } catch {}
      const fold = lastFold();
      let at = 0;
      try { at = Number(localStorage.getItem(DONE_KEY + key)) || 0; } catch {}
      // Nov 13: just "Done" on the bar, so every pane's bar reads the same; the time is on hover
      if (fold) { word = "Done"; detail = `at ${fold.at.replace(/\s*([ap])\.?m\.?/i, (_, x) => ` ${x.toUpperCase()}M`)}, worked ${fold.took}`; state = "done"; }
      else if (at) { word = "Done"; detail = `at ${clock(at)}`; state = "done"; }
    }
    wasWorking.set(key, working);
    if (working) try { localStorage.removeItem(DONE_KEY + key); } catch {}

    const header = document.querySelector<HTMLElement>("header[data-chat-header]");
    const nav = header?.querySelector("nav");
    if (!word || !header || !nav) { clear(); return; }
    // the plan's hairline along the bar's bottom edge
    let bar = document.getElementById("t3s-lane-progress");
    if (working && plan) {
      if (!bar) { bar = document.createElement("div"); bar.id = "t3s-lane-progress"; }
      if (bar.parentElement !== header) header.append(bar);
      bar.style.width = `${(100 * plan.done) / plan.total}%`;
    } else bar?.remove();

    // The task strip at the top of the chat: what this turn has done (the first sentence of each
    // reply since your last message), the step it is on while it works, and what is next (the
    // last reply's "Open:" items). Click it to fold it to one line.
    const tp = transcriptPlan(key);
    drawActivity(working);
    document.getElementById("t3s-lane-trail")?.remove();
    const row = nav.parentElement!;

    // how full the chat's context is, from T3's own ring in the message box
    // or, for a Claude app chat, the token count of its last turn out of its 1M window: amber
    // past 500k, red past 800k, where a chat starts to lose the thread
    const ctx = Number(document.querySelector('button[aria-label^="Context window"]')?.getAttribute("aria-label")?.match(/(\d+)%/)?.[1]);
    const tok = tp?.tokens ?? 0;
    // Delegation check: a helper's title names the model it was meant to run ("[Fable low, KS]").
    // When the chat actually runs something else (a handoff or a wrong pick), say so in red;
    // when they agree, nothing shows, since the message box already names the model.
    const runs = document.querySelector('button[aria-label^="Claude "]');
    const got = /^Claude (\w+) [\d.]+, (\w+)/.exec(runs?.getAttribute("aria-label") ?? "");
    const gotAcct = /^(KS|SK)/.exec(runs?.textContent?.trim() ?? "")?.[1];
    const named = header.querySelector('[aria-label^="Thread actions for "]')?.getAttribute("aria-label")?.slice(19) ?? "";
    const want = /\[(Fable|Opus|Sonnet|Haiku)\s+(low|medium|high|xhigh|max)(?:,\s*(KS|SK))?\]/i.exec(named);
    const off = want && got ? [want[1].toLowerCase() !== got[1].toLowerCase() && "model", want[2].toLowerCase() !== got[2].toLowerCase() && "effort", want[3] && gotAcct && want[3].toUpperCase() !== gotAcct && "account"].filter(Boolean) : [];
    // only what differs, so it fits a narrow pane: "Runs Opus", "Runs medium", "Runs on SK"
    const offText = off.length && got ? ["Runs", off.includes("model") && got[1], off.includes("effort") && got[2].toLowerCase(), off.includes("account") && `on ${gotAcct}`].filter(Boolean).join(" ") : "";
    // every pane names what it runs, quietly; a mismatch with the title replaces it with the red note
    const modelText = got ? `${got[1]} ${got[2].toLowerCase()}` : "";
    const sig = state + word + detail + ctx + tok + offText + modelText + "|" + header.clientWidth;
    let el = document.getElementById("t3s-lane-status");
    if (el && el.parentElement === row && !el.nextElementSibling && last === sig) return;
    if (!el) { el = document.createElement("div"); el.id = "t3s-lane-status"; }
    el.dataset.state = state;
    const em = (text: string, tip: string, cls: string) => [Object.assign(document.createElement("em"), { textContent: text, title: tip, className: cls })];
    const ctxEl = Number.isFinite(ctx) ? em(`${ctx}%`, `Context ${ctx}% full`, ctx >= 80 ? "full" : ctx >= 60 ? "filling" : "")
      : tok ? em(`${Math.round(tok / 1000)}k · ${Math.round(tok / 10_000)}%`, `Context: ${tok.toLocaleString()} of about 1,000,000 tokens`, tok >= 800_000 ? "full" : tok >= 500_000 ? "filling" : "") : [];
    if (ctxEl[0] && !Number.isFinite(ctx)) { ctxEl[0].dataset.full = ctxEl[0].textContent ?? ""; ctxEl[0].dataset.short = `${Math.round(tok / 10_000)}%`; }
    const offEl = offText && want && got ? em(offText, `The title says ${want[1]} ${want[2]}${want[3] ? `, ${want[3]}` : ""}, but this chat runs ${got[1]} ${got[2].toLowerCase()}${gotAcct ? `, ${gotAcct}` : ""}`, "full off") : modelText ? em(modelText, `This chat runs ${modelText}${gotAcct ? ` on ${gotAcct}` : ""}`, "model") : [];
    // the step it is on stays in the hover text: in the bar it was often a raw command and crowded the rest
    el.replaceChildren(Object.assign(document.createElement("b"), { textContent: word }), ...offEl, ...ctxEl);
    el.title = detail ? `${word}  ${detail}` : word;
    if (el.parentElement !== row || el.nextElementSibling) row.append(el);
    fitStatus(el, header, word, shortWord(word, state));
    last = sig;
  };

  // the window's minimise/maximise/close strip is made as tall as the compact bar (main-wco.js)
  const tellWco = () => { if (!isLane) console.debug(`⁣t3:wco:${open ? 30 : 0}`); };
  w.__t3wcoAsk = tellWco;
  let resizeTimer = 0;
  const onResize = () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(() => { tellWco(); draw(); }, 150); };
  const apply = (on: boolean) => { open = on; root.toggleAttribute("data-t3-compact", on); root.toggleAttribute("data-t3-cli", on && mode() === "cli"); draw(); tellWco(); };
  const toggle = () => {
    const next = mode() === "off" ? "on" : "off"; // two states; a saved "cli" still shows as terminal until switched off
    try { localStorage.setItem(MODE_KEY, next); } catch {}
    apply(next !== "off");
  };
  const onStorage = (e: StorageEvent) => { if (e.key === MODE_KEY) apply(wanted()); };
  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.altKey && !e.shiftKey && e.code === "KeyC") { toggle(); e.preventDefault(); e.stopPropagation(); }
  };

  // ── click the model label: this chat and every helper it started, from T3's own records ──
  // Each helper's title says what it was meant to run ("[Opus low, KS]"); the list puts that next to
  // what it really runs, so a wrong pick shows at a glance. A click on a helper opens it in a lane.
  let helpersPop: HTMLElement | null = null;
  const closeHelpers = () => { helpersPop?.remove(); helpersPop = null; };
  // titles are stored cut short ("[Fable low..."), so the closing bracket is optional
  const TAG = /\s*\[(Fable|Opus|Sonnet|Haiku)\s+(low|medium|high|xhigh|max)(?:,\s*(KS|SK))?(?:\]|\.{3}|…|$)/i;
  const modelName = (m: string) => (/fable/.test(m) ? "Fable" : /opus/.test(m) ? "Opus" : /sonnet/.test(m) ? "Sonnet" : /haiku/.test(m) ? "Haiku" : m);
  type Rec = { id: string; title: string; model: string; effort: string; account: string; at: string; status?: string };
  const recLine = (r: Rec) => {
    const runs = `${modelName(r.model)} ${r.effort || "default"}, ${r.account}`;
    const t = TAG.exec(r.title);
    const bad = t ? [t[1].toLowerCase() !== modelName(r.model).toLowerCase(), t[2].toLowerCase() !== r.effort.toLowerCase(), !!t[3] && t[3].toUpperCase() !== r.account].some(Boolean) : false;
    return { runs, asked: t ? `${t[1]} ${t[2].toLowerCase()}${t[3] ? `, ${t[3].toUpperCase()}` : ""}` : "", bad };
  };
  const onHelpersClick = (e: MouseEvent) => {
    const label = (e.target as Element).closest?.("#t3s-lane-status em.model, #t3s-lane-status em.off") as HTMLElement | null;
    if (!label) return;
    e.preventDefault(); e.stopPropagation();
    if (helpersPop) { closeHelpers(); return; }
    if (typeof w.__t3scenesHost !== "function") return;
    const [, env, raw] = location.hash.split("/");
    if (!raw) return;
    const r = label.getBoundingClientRect();
    const pop = document.createElement("div");
    pop.id = "t3s-helpers";
    pop.style.top = `${r.bottom + 6}px`;
    // kept inside this pane: a lane is its own small page, so nothing can hang past its edges
    const pw = Math.min(500, innerWidth - 16);
    pop.style.width = `${pw}px`;
    pop.style.left = `${Math.max(8, Math.min(r.right + 40 - pw, innerWidth - pw - 8))}px`;
    pop.style.maxHeight = `${innerHeight - r.bottom - 14}px`;
    pop.textContent = "Reading T3's records…";
    document.body.append(pop);
    helpersPop = pop;
    w.__t3helpersDone = (d: { self?: Rec | null; helpers?: Rec[]; error?: string }) => {
      if (helpersPop !== pop) return;
      pop.replaceChildren();
      if (d.error) { pop.textContent = `Could not read T3's records: ${d.error}`; return; }
      const head = (txt: string) => pop.append(Object.assign(document.createElement("h4"), { textContent: txt }));
      const row = (rec: Rec, click: boolean) => {
        const l = recLine(rec);
        const b = document.createElement(click ? "button" : "div");
        b.className = "row" + (l.bad ? " bad" : "");
        const name = Object.assign(document.createElement("span"), { textContent: rec.title.replace(TAG, "").trim() || "Untitled" });
        const runs = Object.assign(document.createElement("i"), { textContent: l.bad ? `runs ${l.runs}, asked ${l.asked}` : l.runs });
        // where it stands: a ring while it works, a tick once done, a cross if it failed, a dash if
        // it was stopped, a plus while it waits for its first run; then how long ago
        const st = rec.status ?? "";
        const mark = Object.assign(document.createElement("b"), { className: `mark ${st}`, textContent: st === "running" ? "" : st === "completed" ? "✓" : st === "failed" ? "✕" : st === "queued" ? "+" : "–", title: st === "completed" ? "Done" : st === "running" ? "Working" : st === "queued" ? "Not started yet" : st[0]?.toUpperCase() + st.slice(1) });
        const t = Date.parse(rec.at), s = (Date.now() - t) / 1000;
        const when = Object.assign(document.createElement("time"), { textContent: !(s >= 0) ? "" : s < 60 ? "now" : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d` });
        b.append(mark, name, runs, when);
        if (click) b.addEventListener("click", () => { closeHelpers(); console.debug(`⁣t3:lane:#/${env}/${encodeURIComponent(rec.id)}`); });
        pop.append(b);
      };
      if (d.self) { head("This chat"); row(d.self, false); }
      const kids = d.helpers ?? [];
      const bad = kids.filter((k) => recLine(k).bad).length;
      head(kids.length ? `Helpers it started: ${kids.length}${bad ? `, ${bad} not as asked` : ", all as asked"}` : "No helpers started from this chat");
      kids.forEach((k) => row(k, true));
    };
    w.__t3scenesHost(`helpers:${decodeURIComponent(raw)}`);
  };
  const onHelpersAway = (e: Event) => { if (helpersPop && !helpersPop.contains(e.target as Node) && !(e.target as Element).closest?.("#t3s-lane-status em")) closeHelpers(); };
  const onHelpersKey = (e: KeyboardEvent) => { if (e.key === "Escape" && helpersPop) { closeHelpers(); e.stopPropagation(); } };
  window.addEventListener("click", onHelpersClick, true);
  window.addEventListener("pointerdown", onHelpersAway, true);
  window.addEventListener("keydown", onHelpersKey, true);
  window.addEventListener("hashchange", closeHelpers);

  let pending = false;
  const watch = new MutationObserver(() => {
    if (pending) return;
    pending = true;
    window.setTimeout(() => { pending = false; draw(); }, 300);
  });
  watch.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-label"] });
  const tick = window.setInterval(draw, 5000); // the "Working 4m" count
  window.addEventListener("hashchange", draw);
  window.addEventListener("storage", onStorage);
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("pointerdown", onDown, true);
  window.addEventListener("keydown", onEsc, true);
  window.addEventListener("hashchange", closePop);
  window.addEventListener("pointerdown", onCtlDown, true);
  window.addEventListener("keydown", onCtlEsc, true);
  window.addEventListener("hashchange", closeCtl);
  window.addEventListener("mousedown", onBlankDown, true);
  window.addEventListener("pointerdown", onBoxDown, true);
  window.addEventListener("keydown", onBoxKey, true);
  window.addEventListener("blur", onBoxBlur);
  window.addEventListener("resize", onResize);
  draw();
  tellWco();

  const cleanup = () => {
    watch.disconnect(); clearInterval(tick);
    closeHelpers(); delete w.__t3helpersDone;
    window.removeEventListener("click", onHelpersClick, true); window.removeEventListener("pointerdown", onHelpersAway, true);
    window.removeEventListener("keydown", onHelpersKey, true); window.removeEventListener("hashchange", closeHelpers);
    window.removeEventListener("hashchange", draw); window.removeEventListener("storage", onStorage); window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("pointerdown", onDown, true); window.removeEventListener("keydown", onEsc, true); window.removeEventListener("hashchange", closePop);
    window.removeEventListener("pointerdown", onCtlDown, true); window.removeEventListener("keydown", onCtlEsc, true); window.removeEventListener("hashchange", closeCtl);
    window.removeEventListener("mousedown", onBlankDown, true); window.removeEventListener("resize", onResize);
    window.removeEventListener("pointerdown", onBoxDown, true); window.removeEventListener("keydown", onBoxKey, true); window.removeEventListener("blur", onBoxBlur);
    open = false; placeBar(null); tellWco(); delete w.__t3wcoAsk;
    closePop(); delete w.__t3plan;
    document.querySelectorAll("[data-t3-reminder]").forEach((r) => r.removeAttribute("data-t3-reminder"));
    clear(); style.remove(); root.removeAttribute("data-t3-compact");
  };
  return [cleanup, toggle];
}
