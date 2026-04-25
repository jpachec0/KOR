function renderMonitorPage(port) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KOR API Monitor</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0b0f14;
        --panel: #121923;
        --panel-2: #0f141d;
        --border: #223041;
        --text: #e6edf3;
        --muted: #8aa0b6;
        --accent: #2f81f7;
        --ok: #3fb950;
        --warn: #d29922;
        --bad: #f85149;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: linear-gradient(180deg, #0d1117 0%, var(--bg) 100%);
        color: var(--text);
        font: 13px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .shell {
        max-width: 1100px;
        margin: 0 auto;
        padding: 20px;
      }
      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 18px;
      }
      .title {
        font-size: 18px;
        font-weight: 700;
      }
      .sub {
        color: var(--muted);
        font-size: 12px;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: rgba(47,129,247,0.08);
        color: var(--muted);
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: var(--ok);
        box-shadow: 0 0 14px rgba(63,185,80,0.8);
      }
      .list {
        display: grid;
        gap: 12px;
      }
      .card {
        border: 1px solid var(--border);
        background: linear-gradient(180deg, var(--panel), var(--panel-2));
        border-radius: 10px;
        overflow: hidden;
      }
      .card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 12px 14px;
        border-bottom: 1px solid var(--border);
      }
      .route {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .method {
        min-width: 52px;
        text-align: center;
        padding: 4px 8px;
        border-radius: 999px;
        font-weight: 700;
        background: rgba(47,129,247,0.12);
        color: #79c0ff;
      }
      .path {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .meta {
        color: var(--muted);
        font-size: 12px;
        white-space: nowrap;
      }
      .status.ok { color: var(--ok); }
      .status.warn { color: var(--warn); }
      .status.bad { color: var(--bad); }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
      .block {
        min-width: 0;
        padding: 12px 14px;
      }
      .block + .block {
        border-left: 1px solid var(--border);
      }
      .label {
        margin-bottom: 8px;
        color: var(--muted);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: .04em;
      }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .empty {
        padding: 40px 18px;
        text-align: center;
        border: 1px dashed var(--border);
        border-radius: 10px;
        color: var(--muted);
      }
      @media (max-width: 820px) {
        .grid { grid-template-columns: 1fr; }
        .block + .block {
          border-left: 0;
          border-top: 1px solid var(--border);
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="topbar">
        <div>
          <div class="title">KOR API Monitor</div>
          <div class="sub">Requisicoes locais e respostas recebidas em tempo real</div>
        </div>
        <div class="pill"><span class="dot"></span><span>http://localhost:${port}</span></div>
      </div>
      <div id="list" class="list">
        <div class="empty">Nenhuma requisicao ainda.</div>
      </div>
    </div>

    <script>
      const list = document.getElementById("list");

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      }

      function pretty(value) {
        if (typeof value === "undefined") return "vazio";
        if (typeof value === "string") return value;
        try { return JSON.stringify(value, null, 2); } catch { return String(value); }
      }

      function statusClass(status) {
        if (status >= 500) return "bad";
        if (status >= 400) return "warn";
        return "ok";
      }

      function renderEvent(item) {
        return \`
          <article class="card">
            <div class="card-head">
              <div class="route">
                <span class="method">\${escapeHtml(item.method)}</span>
                <span class="path">\${escapeHtml(item.path)}</span>
              </div>
              <div class="meta">
                <span class="status \${statusClass(item.statusCode)}">\${item.statusCode}</span>
                <span> · </span>
                <span>\${escapeHtml(item.createdAt)}</span>
                <span> · </span>
                <span>\${item.durationMs}ms</span>
              </div>
            </div>
            <div class="grid">
              <section class="block">
                <div class="label">Request</div>
                <pre>\${escapeHtml(pretty(item.requestBody))}</pre>
              </section>
              <section class="block">
                <div class="label">Response</div>
                <pre>\${escapeHtml(pretty(item.responseBody))}</pre>
              </section>
            </div>
          </article>
        \`;
      }

      function render(events) {
        if (!events.length) {
          list.innerHTML = '<div class="empty">Nenhuma requisicao ainda.</div>';
          return;
        }

        list.innerHTML = events.map(renderEvent).join("");
      }

      const source = new EventSource("/__monitor/events");
      source.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        if (payload.type === "bootstrap") {
          render(payload.events || []);
          return;
        }

        if (payload.type === "event") {
          const current = Array.from(document.querySelectorAll(".card")).map((node) => node.outerHTML);
          list.innerHTML = [renderEvent(payload.event), ...current].join("");
        }
      };
    </script>
  </body>
</html>`;
}

module.exports = {
  renderMonitorPage
};
