// Generic broker dashboard (wot-relay). A single-file, build-step-free page served
// at `/dashboard` on EVERY broker (box, server, future). Vanilla JS + inline CSS.
//
// Design: dark, calm, Beamer- AND phone-friendly (monitor.html aesthetic as the
// base). It consumes GET `/dashboard/data`:
//   - Hero + Performance from the public aggregates (connectionCount, connectedDids,
//     logStats.{totalEntries,docCount,personalDocCount,totalLogBytes}, uptimeSeconds,
//     memoryMB).
//   - Identities / Documents / Inbox from the ALWAYS-public server-SHORTENED
//     `display` block (dids / topDocs / inboxPendingByDid).
//   - If the FULL flag-gated maps are ALSO present (RELAY_DEBUG_STATS=1, i.e. box
//     operation) it prefers them and shows the FULL ids instead of the shortcuts.
//
// Security: `/dashboard/data` is unauthenticated + `ACAO:*`; the redaction is
// server-side (see relay.ts). This page still esc()'s EVERY interpolated string —
// including shortened/hashed ids — before it touches innerHTML (defence in depth;
// a full docId under the flag is a client-chosen string).
//
// Reactivity: one gated `tick()` fetch (`cache:no-store` + `AbortSignal.timeout`),
// polled every 2s, PAUSED while the tab is hidden; a later SSE upgrade swaps only
// the source, not the UI. On a failed/late fetch the live dot turns amber and shows
// "relay unreachable (Ns)".

const DASHBOARD_CSS = `
  :root {
    --bg: #0b1220;
    --card: #111a2e;
    --card-2: #0e1728;
    --ink: #e6edf7;
    --dim: #8a97ad;
    --line: #1e2a44;
    --accent: #4f8cff;
    --good: #3ddc84;
    --warn: #ffb84f;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: var(--bg); color: var(--ink);
    font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 28px 20px 48px; }

  /* Header */
  header { display: flex; align-items: baseline; justify-content: space-between;
    gap: 12px; flex-wrap: wrap; margin-bottom: 22px; }
  h1 { margin: 0; font-size: 1.55rem; letter-spacing: -.01em; display: flex; align-items: center; }
  h1 .dot { display: inline-block; width: .6em; height: .6em; border-radius: 50%;
    background: var(--good); margin-right: .45em; animation: pulse 2s infinite; }
  h1 .dot.off { background: var(--warn); animation: none; }
  @keyframes pulse { 50% { opacity: .35; } }
  .host { color: var(--ink); font-weight: 600; }
  .sub { color: var(--dim); font-size: .92rem; text-align: right; }
  .sub .offline { color: var(--warn); }

  /* Hero numbers */
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px 20px; }
  .label { color: var(--dim); font-size: .8rem; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
  .big { font-size: 3.4rem; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums;
    transition: color .5s ease; }
  .unit { font-size: 1rem; color: var(--dim); font-weight: 500; margin-left: .3em; }
  /* Subtle, non-bouncing pulse when a value changes. */
  .flash { animation: flash .6s ease; }
  @keyframes flash { 0% { color: var(--accent); } 100% { color: var(--ink); } }

  /* Two-column performance row */
  .row2 { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; margin-top: 14px; }
  @media (max-width: 760px) { .row2 { grid-template-columns: 1fr; } }
  canvas { width: 100%; height: 120px; display: block; }
  .vitals { font-size: .92rem; }
  .vrow { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px;
    margin: 10px 0; color: var(--dim); font-variant-numeric: tabular-nums; }
  .vrow code { color: var(--ink); font-family: inherit; }

  /* List cards (identities / documents / inbox) */
  .cards3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 14px; margin-top: 14px; }
  .list { margin-top: 4px; }
  .lrow { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px;
    margin: 9px 0; font-variant-numeric: tabular-nums; }
  .lrow .id { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .lrow code { color: var(--ink); font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace;
    font-size: .86rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lrow .meta { color: var(--dim); font-size: .86rem; white-space: nowrap; }
  .pdot { display: inline-block; width: .55em; height: .55em; border-radius: 50%; flex-shrink: 0;
    background: #33415a; }
  .pdot.on { background: var(--good); }

  /* Doc bars */
  .docrow { display: grid; grid-template-columns: 130px 1fr auto; align-items: center; gap: 10px;
    margin: 9px 0; color: var(--dim); font-variant-numeric: tabular-nums; }
  .docrow code { color: var(--ink); font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace;
    font-size: .82rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bar { height: 10px; border-radius: 6px; background: var(--accent); min-width: 4px;
    transition: width .5s ease; }
  .empty { color: var(--dim); font-size: .9rem; padding: 6px 0; }

  footer { margin-top: 24px; color: var(--dim); font-size: .84rem; line-height: 1.5; }
  footer code { color: var(--ink); }
`

export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>WoT Broker Dashboard</title>
<style>${DASHBOARD_CSS}</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1><span class="dot" id="dot"></span><span class="host" id="host">broker</span></h1>
    <div class="sub">end-to-end encrypted &middot; updates every 2s <span id="status"></span></div>
  </header>

  <!-- Hero -->
  <div class="grid">
    <div class="card"><div class="label">Connections</div><div class="big" id="connections">&ndash;</div></div>
    <div class="card"><div class="label">Identities online</div><div class="big" id="dids">&ndash;</div></div>
    <div class="card"><div class="label">Shared spaces</div><div class="big" id="spaces">&ndash;</div></div>
    <div class="card"><div class="label">Messages in the log</div><div class="big" id="entries">&ndash;</div></div>
  </div>

  <!-- Performance -->
  <div class="row2">
    <div class="card">
      <div class="label">Activity &mdash; messages per 10s (last 5 min)</div>
      <canvas id="spark" width="800" height="120"></canvas>
    </div>
    <div class="card">
      <div class="label">Performance</div>
      <div class="vitals">
        <div class="vrow"><span>Rate</span><code id="rate">&ndash;</code></div>
        <div class="vrow"><span>Log size</span><code id="bytes">&ndash;</code></div>
        <div class="vrow"><span>Memory</span><code id="mem">&ndash;</code></div>
        <div class="vrow"><span>Uptime</span><code id="uptime">&ndash;</code></div>
      </div>
    </div>
  </div>

  <!-- Identities / Documents / Inbox -->
  <div class="cards3">
    <div class="card">
      <div class="label">Identities <span id="didsCount"></span></div>
      <div class="list" id="idlist"></div>
    </div>
    <div class="card">
      <div class="label">Documents <span id="docsAgg"></span></div>
      <div class="list" id="doclist"></div>
    </div>
    <div class="card">
      <div class="label">Inbox <span id="inboxAgg"></span></div>
      <div class="list" id="inboxlist"></div>
    </div>
  </div>

  <footer>
    All payloads are end-to-end encrypted &mdash; this broker only sees ciphertext and
    recipient DIDs. Identifiers are shortened unless full-detail mode is enabled.
    <span id="brokerline"></span>
  </footer>
</div>

<script>
const $ = id => document.getElementById(id)
// EVERY interpolated string is escaped before innerHTML — including shortened /
// hashed ids and (under the debug flag) full client-chosen docIds.
const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const fmtBytes = b => b < 1024 ? b + ' B' : b < 1048576 ? (b/1024).toFixed(1) + ' KB' : (b/1048576).toFixed(1) + ' MB'
const fmtUp = s => s < 60 ? Math.floor(s) + 's' : s < 3600 ? Math.floor(s/60) + 'm' : s < 86400 ? Math.floor(s/3600) + 'h ' + Math.floor(s%3600/60) + 'm' : Math.floor(s/86400) + 'd ' + Math.floor(s%86400/3600) + 'h'
// Client-side prefix/hash shorteners MIRROR relay.ts, used ONLY to render the FULL
// maps under the debug flag; the default path already receives server-shortened ids.
const shortDid = d => { const p = 'did:key:'; if (!d.startsWith(p)) return d.length > 16 ? d.slice(0,10)+'…'+d.slice(-4) : d; const m = d.slice(p.length); return m.length <= 12 ? m : m.slice(0,8)+'…'+m.slice(-4) }

$('host').textContent = location.host || 'broker'
$('brokerline').innerHTML = '<code>' + esc(location.host || '') + '</code>'

// Pulse a hero number only when its rendered value actually changes (no bounce).
function setNum(el, val) {
  const s = String(val)
  if (el.textContent === s) return
  el.textContent = s
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash')
}

// Sparkline: one totalEntries-delta sample per 10s bucket, 5 min window (30 bars).
const hist = []
let lastEntries = null, lastSampleAt = 0, offlineSince = null

function draw() {
  const c = $('spark'), ctx = c.getContext('2d')
  ctx.clearRect(0, 0, c.width, c.height)
  const max = Math.max(1, ...hist)
  const w = c.width / 30
  ctx.fillStyle = '#4f8cff'
  hist.forEach((v, i) => {
    const h = Math.max(2, (v / max) * (c.height - 8))
    ctx.fillRect(i * w + 1, c.height - h, w - 2, h)
  })
}

function renderIdentities(d) {
  // Prefer FULL maps when present (debug flag / box), else the server-shortened array.
  const online = new Set(d.connectedDids || [])
  let rows
  if (d.devicesPerDid && Object.keys(d.devicesPerDid).length) {
    rows = Object.entries(d.devicesPerDid)
      .map(([did, n]) => ({ id: did, dev: Number(n), on: online.has(did) }))
      .sort((a, b) => b.dev - a.dev)
  } else {
    rows = ((d.display && d.display.dids) || [])
      .map(x => ({ id: x.idShort, dev: Number(x.deviceCount), on: !!x.online }))
  }
  $('didsCount').textContent = rows.length ? '(' + rows.length + ')' : ''
  $('idlist').innerHTML = rows.length
    ? rows.map(r =>
        '<div class="lrow"><span class="id"><span class="pdot' + (r.on ? ' on' : '') + '"></span>' +
        '<code>' + esc(r.id) + '</code></span>' +
        '<span class="meta">' + r.dev + (r.dev === 1 ? ' device' : ' devices') + '</span></div>'
      ).join('')
    : '<div class="empty">no identities connected</div>'
}

function renderDocuments(d) {
  const ls = d.logStats || {}
  const spaces = Math.max(0, (ls.docCount || 0) - (ls.personalDocCount || 0))
  $('docsAgg').textContent = '(' + spaces + ' spaces · ' + (ls.personalDocCount || 0) + ' personal)'
  let rows
  if (ls.entriesByDoc && Object.keys(ls.entriesByDoc).length) {
    const dev = ls.devicesByDoc || {}
    rows = Object.entries(ls.entriesByDoc)
      .sort((a, b) => b[1] - a[1]).slice(0, 12)
      .map(([id, n]) => ({ id, entries: Number(n), devices: Number(dev[id] || 0) }))
  } else {
    rows = ((d.display && d.display.topDocs) || [])
      .map(x => ({ id: x.idShort, entries: Number(x.entries), devices: Number(x.devices) }))
  }
  const max = Math.max(1, ...rows.map(r => r.entries))
  $('doclist').innerHTML = rows.length
    ? rows.map(r =>
        '<div class="docrow"><code>' + esc(r.id) + '</code>' +
        '<span class="bar" style="width:' + ((r.entries / max) * 100) + '%"></span>' +
        '<span>' + r.entries + ' · ' + r.devices + ' dev</span></div>'
      ).join('')
    : '<div class="empty">no documents yet — connect and create a space</div>'
}

function renderInbox(d) {
  const q = d.queueStats || {}
  $('inboxAgg').textContent = '(' + (q.messages || 0) + ' retained · ' + (q.total || 0) + ' pending)'
  let rows
  if (q.byDid && Object.keys(q.byDid).length) {
    rows = Object.entries(q.byDid).map(([did, n]) => ({ id: shortDid(did), pending: Number(n) }))
      .sort((a, b) => b.pending - a.pending)
  } else {
    rows = ((d.display && d.display.inboxPendingByDid) || [])
      .map(x => ({ id: x.idShort, pending: Number(x.pending) }))
  }
  $('inboxlist').innerHTML = rows.length
    ? rows.map(r =>
        '<div class="lrow"><span class="id"><code>' + esc(r.id) + '</code></span>' +
        '<span class="meta">' + r.pending + ' pending</span></div>'
      ).join('')
    : '<div class="empty">no pending deliveries</div>'
}

function render(d) {
  const ls = d.logStats || {}
  setNum($('connections'), d.connectionCount || 0)
  setNum($('dids'), (d.connectedDids || []).length)
  setNum($('spaces'), Math.max(0, (ls.docCount || 0) - (ls.personalDocCount || 0)))
  setNum($('entries'), ls.totalEntries || 0)

  $('bytes').textContent = fmtBytes(ls.totalLogBytes || 0)
  $('mem').textContent = (typeof d.memoryMB === 'number' ? d.memoryMB.toFixed(1) : '?') + ' MB'
  $('uptime').textContent = fmtUp(d.uptimeSeconds || 0)

  // Rate: totalEntries delta per 10s bucket.
  const now = Date.now()
  if (lastEntries !== null && now - lastSampleAt >= 10000) {
    hist.push(Math.max(0, (ls.totalEntries || 0) - lastEntries))
    if (hist.length > 30) hist.shift()
    lastEntries = ls.totalEntries || 0
    lastSampleAt = now
    draw()
  } else if (lastEntries === null) {
    lastEntries = ls.totalEntries || 0
    lastSampleAt = now
  }
  $('rate').textContent = (hist.length ? hist[hist.length - 1] : 0) + ' msg/10s'

  renderIdentities(d)
  renderDocuments(d)
  renderInbox(d)
}

// One gated fetch — a later SSE upgrade replaces only this source.
let inFlight = false
async function tick() {
  if (document.hidden || inFlight) return
  inFlight = true
  try {
    const r = await fetch('/dashboard/data', { cache: 'no-store', signal: AbortSignal.timeout(4000) })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const d = await r.json()
    $('dot').classList.remove('off')
    $('status').textContent = ''
    offlineSince = null
    render(d)
  } catch {
    $('dot').classList.add('off')
    if (!offlineSince) offlineSince = Date.now()
    $('status').innerHTML = '<span class="offline">— relay unreachable (' + Math.round((Date.now() - offlineSince) / 1000) + 's)</span>'
  } finally {
    inFlight = false
  }
}

// Poll every 2s; a hidden tab produces zero load. Resume immediately on re-show.
setInterval(tick, 2000)
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick() })
tick()
</script>
</body>
</html>`
}
