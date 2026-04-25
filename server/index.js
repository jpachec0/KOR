const express = require("express");
const {
  createChat,
  listChats,
  setActiveChat,
  getActiveChatMeta,
  getChatMeta,
  readHistory,
  readPendingChanges,
  writePendingChanges
} = require("../core/chatManager");
const { ensureRuntime } = require("../core/runtime");
const { askAgent } = require("../core/agentService");
const logger = require("../core/logger");

function buildQuestionWithEditorContext(question, editorContext = {}) {
  const parts = [question.trim()];

  if (editorContext.activeFile) {
    parts.push(`Arquivo ativo no editor: ${editorContext.activeFile}`);
  }

  if (editorContext.selectedText) {
    parts.push([
      "Trecho selecionado no editor:",
      "```",
      editorContext.selectedText,
      "```"
    ].join("\n"));
  }

  if (editorContext.surroundingText) {
    parts.push([
      "Contexto adicional do editor:",
      "```",
      editorContext.surroundingText,
      "```"
    ].join("\n"));
  }

  return parts.filter(Boolean).join("\n\n");
}

async function ensureActiveChat() {
  let active = await getActiveChatMeta();
  if (!active) {
    active = await createChat("chat-inicial");
  }
  return active;
}

async function buildSidebarState(chatId = null) {
  const active = chatId ? await getChatMeta(chatId) : await ensureActiveChat();
  const [chats, history, pending] = await Promise.all([
    listChats(),
    readHistory(active.id),
    readPendingChanges(active.id)
  ]);

  return {
    activeChat: active,
    chats,
    history,
    pendingChanges: pending.changes || [],
    pendingDiffPreview: pending.diffPreview || []
  };
}

async function startServer() {
  await ensureRuntime();
  await ensureActiveChat();

  const app = express();
  const port = Number(process.env.AI_AGENT_API_PORT || 3000);

  app.use(express.json({ limit: "2mb" }));

  app.get("/health", async (_req, res) => {
    const active = await ensureActiveChat();
    res.json({
      ok: true,
      activeChatId: active.id
    });
  });

  app.get("/api/state", async (_req, res, next) => {
    try {
      res.json(await buildSidebarState());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/chats", async (_req, res, next) => {
    try {
      const active = await ensureActiveChat();
      const chats = await listChats();
      res.json({
        chats,
        activeChatId: active.id
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/chats", async (req, res, next) => {
    try {
      const chat = await createChat(req.body?.name);
      res.status(201).json(await buildSidebarState(chat.id));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/chats/:chatId/activate", async (req, res, next) => {
    try {
      await setActiveChat(req.params.chatId);
      res.json(await buildSidebarState(req.params.chatId));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/chats/:chatId", async (req, res, next) => {
    try {
      res.json(await buildSidebarState(req.params.chatId));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/chats/:chatId/ask", async (req, res, next) => {
    try {
      const question = (req.body?.question || "").trim();
      if (!question) {
        res.status(400).json({ error: "Pergunta obrigatoria." });
        return;
      }

      await setActiveChat(req.params.chatId);
      const result = await askAgent(
        req.params.chatId,
        buildQuestionWithEditorContext(question, req.body?.editorContext)
      );

      res.json({
        result,
        state: await buildSidebarState(req.params.chatId)
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/chats/:chatId/pending", async (req, res, next) => {
    try {
      const pending = await readPendingChanges(req.params.chatId);
      res.json(pending);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/chats/:chatId/pending/clear", async (req, res, next) => {
    try {
      await writePendingChanges(req.params.chatId, {
        changes: [],
        diffPreview: [],
        projectRoot: process.cwd()
      });
      res.json(await buildSidebarState(req.params.chatId));
    } catch (error) {
      next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    logger.error(error.message);
    res.status(500).json({
      error: error.message || "Erro interno do servidor."
    });
  });

  app.listen(port, () => {
    logger.info(`API do agente disponivel em http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  logger.error(error.message);
  process.exit(1);
});
