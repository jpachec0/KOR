const express = require("express");
const { createKorCore } = require("../core");
const logger = require("../core/logger");
const { createMonitorStore } = require("./monitorStore");
const { renderMonitorPage } = require("./monitorPage");

async function startServer() {
  const kor = createKorCore(process.cwd());
  await kor.ensureRuntime();
  await kor.ensureActiveChat();

  const app = express();
  const port = Number(process.env.AI_AGENT_API_PORT || 3000);
  const monitor = createMonitorStore();

  app.use(express.json({ limit: "2mb" }));
  app.use((req, res, next) => {
    if (req.path === "/" || req.path === "/__monitor/events" || req.path.startsWith("/favicon")) {
      next();
      return;
    }

    const startedAt = Date.now();
    let responseBody;
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = function patchedJson(body) {
      responseBody = body;
      return originalJson(body);
    };

    res.send = function patchedSend(body) {
      responseBody = typeof responseBody === "undefined" ? body : responseBody;
      return originalSend(body);
    };

    res.on("finish", () => {
      monitor.pushEvent({
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        createdAt: new Date().toLocaleTimeString("pt-BR"),
        requestBody: req.body,
        responseBody
      });
    });

    next();
  });

  app.get("/", (_req, res) => {
    res.type("html").send(renderMonitorPage(port));
  });

  app.get("/__monitor/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    monitor.addClient(res);

    req.on("close", () => {
      monitor.removeClient(res);
    });
  });

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
    const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : null;
    logger.error(errorDetail ? `API Error: ${errorDetail}` : error.message);
    res.status(500).json({
      error: errorDetail || error.message || "Erro interno do servidor."
    });
  });

  app.listen(port, () => {
    logger.info(`API do agente disponivel em http://localhost:${port}`);
    logger.info(`Monitor local disponivel em http://localhost:${port}/`);
  });
}

startServer().catch((error) => {
  logger.error(error.message);
  process.exit(1);
});
