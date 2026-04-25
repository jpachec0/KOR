const express = require("express");
const { createKorCore } = require("../core");
const logger = require("../core/logger");

async function startServer() {
  const kor = createKorCore(process.cwd());
  await kor.ensureRuntime();
  await kor.ensureActiveChat();

  const app = express();
  const port = Number(process.env.AI_AGENT_API_PORT || 3000);

  app.use(express.json({ limit: "2mb" }));

  app.get("/health", async (_req, res) => {
    const active = await kor.ensureActiveChat();
    res.json({
      ok: true,
      activeChatId: active.id
    });
  });

  app.get("/api/state", async (_req, res, next) => {
    try {
      res.json(await kor.getState());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/chats", async (_req, res, next) => {
    try {
      const active = await kor.ensureActiveChat();
      const chats = await kor.listChats();
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
      const chat = await kor.createChat(req.body?.name);
      res.status(201).json(await kor.getState(chat.id));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/chats/:chatId/activate", async (req, res, next) => {
    try {
      await kor.useChat(req.params.chatId);
      res.json(await kor.getState(req.params.chatId));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/chats/:chatId", async (req, res, next) => {
    try {
      res.json(await kor.getState(req.params.chatId));
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

      await kor.useChat(req.params.chatId);
      const result = await kor.askAgent(
        req.params.chatId,
        question,
        {
          editorContext: req.body?.editorContext
        }
      );

      res.json({
        result,
        state: await kor.getState(req.params.chatId)
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/chats/:chatId/pending", async (req, res, next) => {
    try {
      const state = await kor.getState(req.params.chatId);
      res.json({
        changes: state.pendingChanges,
        diffPreview: state.pendingDiffPreview
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/chats/:chatId/pending/clear", async (req, res, next) => {
    try {
      res.json(await kor.clearPendingChanges(req.params.chatId));
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
