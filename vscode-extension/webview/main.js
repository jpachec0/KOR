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
    draft: "",
    activeTab: "home", // "home", "chat", "setup", "settings"
    config: {
      provider: "openrouter",
      apiKey: "",
      model: "",
      maxTokens: 2000,
      temperature: 0.2
    },
    models: []
  };

  const app = document.getElementById("app");

  function escapeHtml(value) {
    if (value === undefined || value === null) return "";
    return String(value)
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
                  ${item.diff ? `<div class="diff-preview"><pre><code>${escapeHtml(item.diff)}</code></pre></div>` : ""}
                </div>`
              )
              .join("")}
          </div>
        </section>`
      : "";

    const busyLine = state.busy ? `<div class="busy-line">${escapeHtml(state.busyLabel || "IA pensando...")}</div>` : "";
    const errorLine = state.error ? `<div class="error-line">${escapeHtml(state.error)}</div>` : "";

    // Home Content
    const homeContent = `
      <div class="home-header">
        <h2>Seus Chats</h2>
      </div>
      <div class="chat-list">
        ${chatItems || `<div style="text-align:center; color: var(--muted); padding: 20px;">Nenhum chat salvo. Crie um novo!</div>`}
      </div>
    `;

    // Chat Content
    const chatContent = `
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
    `;

    const modelOptions = state.models.map(m => 
      `<option value="${escapeHtml(m.id)}" ${state.config.model === m.id ? 'selected' : ''}>${escapeHtml(m.name)}</option>`
    ).join("");

    const hasModels = state.models && state.models.length > 0;

    const setupContent = `
      <div style="padding: 16px; overflow-y: auto;">
        ${errorLine}
        ${busyLine}
        <h2>Setup do Provedor</h2>
        <div class="form-group">
          <label>Provedor</label>
          <select id="configProvider">
            <option value="openrouter" ${state.config.provider === 'openrouter' ? 'selected' : ''}>OpenRouter</option>
            <option value="openai" ${state.config.provider === 'openai' ? 'selected' : ''}>OpenAI</option>
            <option value="huggingface" ${state.config.provider === 'huggingface' ? 'selected' : ''}>HuggingFace</option>
          </select>
        </div>
        <div class="form-group">
          <label>API Key</label>
          <input type="password" id="configApiKey" value="${escapeHtml(state.config.apiKey)}" placeholder="sk-..." />
        </div>
        <div class="form-actions" style="margin-bottom: 20px;">
          <button class="ghost-button" data-action="fetch-models">Buscar Modelos</button>
        </div>
        <div class="form-group">
          <label>Modelo</label>
          <select id="configModel" ${!hasModels && !state.config.model ? 'disabled' : ''}>
            ${modelOptions || `<option value="${escapeHtml(state.config.model)}">${escapeHtml(state.config.model || 'Nenhum modelo carregado')}</option>`}
          </select>
        </div>
        <div class="form-actions">
          <button class="primary-button" data-action="save-setup" ${!hasModels && !state.config.model ? 'disabled' : ''}>Salvar Setup</button>
        </div>
      </div>
    `;

    const settingsContent = `
      <div class="settings-container">
        ${errorLine}
        <h2>Configurações Avançadas</h2>
        <div class="form-group">
          <label>Max Tokens</label>
          <input type="number" id="configMaxTokens" value="${escapeHtml(state.config.maxTokens)}" />
        </div>
        <div class="form-group">
          <label>Temperature</label>
          <input type="number" step="0.1" id="configTemperature" value="${escapeHtml(state.config.temperature)}" />
        </div>
        <div class="form-actions">
          <button class="primary-button" data-action="save-settings">Salvar Configurações</button>
        </div>
      </div>
    `;

    let topbarActions = "";
    if (state.activeTab === "chat") {
      topbarActions = `<button class="ghost-button" data-action="switch-tab" data-tab="home">⬅ Voltar</button>`;
    } else {
      topbarActions = `
        <button class="ghost-button" data-action="refresh">Refresh</button>
        <button class="primary-button" data-action="new-chat">New</button>
      `;
    }

    const tabsHtml = state.activeTab === "chat" ? "" : `
      <div class="tabs">
        <button class="tab ${state.activeTab === 'home' ? 'active' : ''}" data-action="switch-tab" data-tab="home">Chats</button>
        <button class="tab ${state.activeTab === 'setup' ? 'active' : ''}" data-action="switch-tab" data-tab="setup">Setup</button>
        <button class="tab ${state.activeTab === 'settings' ? 'active' : ''}" data-action="switch-tab" data-tab="settings">Avançado</button>
      </div>
    `;

    app.innerHTML = `
      <div class="shell">
        <header class="topbar">
          <div class="brand-block">
            <div class="brand-logo-space"><img src="${window.__KOR_LOGO_URI__ || ''}" alt="KOR" class="brand-logo-img" /></div>
            <div>
              <div class="brand-title">KOR Agent</div>
              <div class="${connectionClass}">${state.connected ? "Conectado" : "Desconectado"}</div>
            </div>
          </div>
          <div class="topbar-actions">
            ${topbarActions}
          </div>
        </header>

        ${tabsHtml}

        <div class="tab-content ${state.activeTab === 'home' ? 'active' : ''}">
          ${homeContent}
        </div>
        <div class="tab-content ${state.activeTab === 'chat' ? 'active' : ''}">
          ${chatContent}
        </div>
        <div class="tab-content ${state.activeTab === 'setup' ? 'active' : ''}">
          ${setupContent}
        </div>
        <div class="tab-content ${state.activeTab === 'settings' ? 'active' : ''}">
          ${settingsContent}
        </div>
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
        state.error = "Abra uma pasta do projeto no VS Code para usar o agente.";
      }
      render();
    }

    if (message.type === "error") {
      state.error = message.message;
      render();
    }

    if (message.type === "aiConfig") {
      const oldProvider = state.config.provider;
      state.config = { ...state.config, ...message.config };
      render();
      
      // Auto-fetch models on load if we have provider and apiKey but no models
      if (state.config.provider && state.config.apiKey && state.models.length === 0) {
        vscode.postMessage({
          type: "fetchModels",
          provider: state.config.provider,
          apiKey: state.config.apiKey
        });
      }
    }

    if (message.type === "modelsLoaded") {
      state.models = message.models;
      // Pre-select first free model if exists
      const freeModel = state.models.find(m => m.isFree);
      if (freeModel && !state.config.model) {
        state.config.model = freeModel.id;
      } else if (state.models.length > 0 && !state.config.model) {
        state.config.model = state.models[0].id;
      }
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
      vscode.postMessage({ type: "getAiConfig" });
      return;
    }

    if (action === "new-chat") {
      vscode.postMessage({ type: "newChat" });
      state.activeTab = "chat";
      render();
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
      state.activeTab = "chat";
      render();
    }

    if (action === "switch-tab") {
      state.activeTab = target.getAttribute("data-tab");
      render();
    }

    if (action === "fetch-models") {
      const provider = document.getElementById("configProvider").value;
      const apiKey = document.getElementById("configApiKey").value;
      
      state.config.provider = provider;
      state.config.apiKey = apiKey;

      if (!provider || !apiKey) {
        state.error = "Preencha Provedor e API Key para buscar modelos.";
        render();
        return;
      }

      state.error = "";
      vscode.postMessage({
        type: "fetchModels",
        provider,
        apiKey
      });
    }

    if (action === "save-setup") {
      const provider = document.getElementById("configProvider").value;
      const apiKey = document.getElementById("configApiKey").value;
      const model = document.getElementById("configModel").value;

      state.config.provider = provider;
      state.config.apiKey = apiKey;
      state.config.model = model;

      vscode.postMessage({
        type: "saveAiConfig",
        config: { provider, apiKey, model }
      });
    }

    if (action === "save-settings") {
      const maxTokens = parseInt(document.getElementById("configMaxTokens").value, 10);
      const temperature = parseFloat(document.getElementById("configTemperature").value);

      state.config.maxTokens = maxTokens;
      state.config.temperature = temperature;

      vscode.postMessage({
        type: "saveAiConfig",
        config: { maxTokens, temperature }
      });
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.id === "configProvider") {
      state.config.provider = event.target.value;
      state.models = []; // Clear models when provider changes
      render();
    }
  });

  render();
  vscode.postMessage({ type: "ready" });
  vscode.postMessage({ type: "getAiConfig" });
}());
