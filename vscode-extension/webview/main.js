(function () {
  const vscode = acquireVsCodeApi();
  const state = {
    connected: true,
    busy: false,
    busyLabel: "",
    error: "",
    chats: [],
    activeChat: null,
    messages: [],
    pendingDiffPreview: [],
    pendingCount: 0,
    editorContext: {},
    draft: ""
  };

  const app = document.getElementById("app");

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function formatTimestamp(iso) {
    try {
      return new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (_error) {
      return "";
    }
  }

  function render() {
    const connectionClass = state.connected ? "status-pill" : "status-pill offline";
    const contextFile = state.editorContext.activeFile
      ? `<span class="context-chip">${escapeHtml(state.editorContext.activeFile)}</span>`
      : "";
    const selectionChip = state.editorContext.selectedText
      ? `<span class="context-chip">${state.editorContext.selectedText.length} chars selected</span>`
      : "";
    const chatItems = state.chats
      .map((chat) => {
        const isActive = state.activeChat && chat.id === state.activeChat.id;
        return `<button class="chat-item ${isActive ? "active" : ""}" data-action="switch-chat" data-chat-id="${chat.id}">
          <span class="chat-name">${escapeHtml(chat.name)}</span>
          <span class="chat-date">${formatTimestamp(chat.updatedAt)}</span>
        </button>`;
      })
      .join("");

    const messageItems = state.messages.length
      ? state.messages
          .map(
            (message) => `<article class="message ${message.role}">
              <div class="message-meta">
                <span>${message.role === "user" ? "You" : "KOR"}</span>
                <span>${formatTimestamp(message.timestamp)}</span>
              </div>
              <div class="message-body">${message.html}</div>
            </article>`
          )
          .join("")
      : `<div class="empty-state">
          <h2>Converse com o agente</h2>
          <p>Abra um arquivo, selecione codigo quando fizer sentido e envie sua pergunta.</p>
        </div>`;

    const pendingPanel = state.pendingCount
      ? `<section class="pending-panel">
          <div class="pending-header">
            <div>
              <strong>${state.pendingCount} alteracao(oes) pronta(s)</strong>
              <span>Revise antes de aplicar no editor</span>
            </div>
            <button class="primary-button" data-action="apply-changes">Apply</button>
          </div>
          <div class="pending-list">
            ${state.pendingDiffPreview
              .map(
                (item) => `<div class="pending-item">
                  <div class="pending-path">${escapeHtml(item.path)}</div>
                  <div class="pending-badges">
                    <span class="badge">${escapeHtml(item.action)}</span>
                    ${item.reason ? `<span class="pending-reason">${escapeHtml(item.reason)}</span>` : ""}
                  </div>
                </div>`
              )
              .join("")}
          </div>
        </section>`
      : "";

    const busyLine = state.busy ? `<div class="busy-line">${escapeHtml(state.busyLabel || "IA pensando...")}</div>` : "";
    const errorLine = state.error ? `<div class="error-line">${escapeHtml(state.error)}</div>` : "";

    app.innerHTML = `
      <div class="shell">
        <header class="topbar">
          <div class="brand-block">
            <div class="brand-mark">K</div>
            <div>
              <div class="brand-title">KOR Local Agent</div>
              <div class="${connectionClass}">${state.connected ? "Backend conectado" : "Backend offline"}</div>
            </div>
          </div>
          <div class="topbar-actions">
            <button class="ghost-button" data-action="refresh">Refresh</button>
            <button class="primary-button" data-action="new-chat">New</button>
          </div>
        </header>

        <section class="chat-strip">
          ${chatItems}
        </section>

        <section class="context-bar">
          ${contextFile}
          ${selectionChip}
        </section>

        ${pendingPanel}

        <main class="messages">
          ${messageItems}
        </main>

        <footer class="composer">
          ${busyLine}
          ${errorLine}
          <div class="composer-box">
            <textarea id="promptInput" placeholder="Pergunte sobre o projeto, o arquivo atual ou a selecao..." ${
              state.busy || !state.connected ? "disabled" : ""
            }>${escapeHtml(state.draft)}</textarea>
            <button class="send-button" data-action="send-prompt" ${state.busy || !state.connected ? "disabled" : ""}>Send</button>
          </div>
        </footer>
      </div>
    `;

    const input = document.getElementById("promptInput");
    if (input) {
      input.addEventListener("input", () => {
        state.draft = input.value;
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          sendPrompt();
        }
      });
    }

    const messages = document.querySelector(".messages");
    if (messages) {
      messages.scrollTop = messages.scrollHeight;
    }
  }

  function sendPrompt() {
    const input = document.getElementById("promptInput");
    const draft = input ? input.value.trim() : state.draft.trim();
    if (!draft) {
      return;
    }

    vscode.postMessage({
      type: "sendPrompt",
      question: draft
    });
    state.draft = "";
    if (input) {
      input.value = "";
    }
  }

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (message.type === "state") {
      state.chats = message.state.chats;
      state.activeChat = message.state.activeChat;
      state.messages = message.state.messages;
      state.pendingDiffPreview = message.state.pendingDiffPreview;
      state.pendingCount = message.state.pendingCount;
      state.editorContext = message.state.editorContext || {};
      state.error = "";
      render();
    }

    if (message.type === "busy") {
      state.busy = message.busy;
      state.busyLabel = message.label || "";
      render();
    }

    if (message.type === "connection") {
      state.connected = message.connected;
      if (!message.connected) {
        state.error = "Inicie o backend com npm run api";
      }
      render();
    }

    if (message.type === "error") {
      state.error = message.message;
      render();
    }
  });

  document.addEventListener("click", (event) => {
    const baseTarget = event.target;
    if (!baseTarget || typeof baseTarget.closest !== "function") {
      return;
    }

    const target = baseTarget.closest("[data-action]");
    if (!target) {
      return;
    }

    const action = target.getAttribute("data-action");

    if (action === "refresh") {
      vscode.postMessage({ type: "refresh" });
      return;
    }

    if (action === "new-chat") {
      vscode.postMessage({ type: "newChat" });
      return;
    }

    if (action === "send-prompt") {
      sendPrompt();
      return;
    }

    if (action === "apply-changes") {
      vscode.postMessage({ type: "applyChanges" });
      return;
    }

    if (action === "switch-chat") {
      vscode.postMessage({
        type: "switchChat",
        chatId: target.getAttribute("data-chat-id")
      });
    }
  });

  render();
  vscode.postMessage({ type: "ready" });
}());
