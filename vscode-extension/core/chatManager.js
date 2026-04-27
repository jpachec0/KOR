const fs = require("fs-extra");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { MAX_RECENT_MESSAGES } = require("./constants");
const { createRuntimeContext } = require("./runtimeContext");

function getChatDir(chatId, runtime = createRuntimeContext()) {
  return path.join(runtime.chatsDir, chatId);
}

function getChatFile(chatId, fileName, runtime = createRuntimeContext()) {
  return path.join(getChatDir(chatId, runtime), fileName);
}

async function ensureChatFiles(chatId, name = null, runtime = createRuntimeContext()) {
  const chatDir = getChatDir(chatId, runtime);
  await fs.ensureDir(chatDir);

  const metaFile = getChatFile(chatId, "meta.json", runtime);
  const historyFile = getChatFile(chatId, "history.json", runtime);
  const contextFile = getChatFile(chatId, "context.json", runtime);
  const filesFile = getChatFile(chatId, "files.json", runtime);
  const pendingChangesFile = getChatFile(chatId, "pending-changes.json", runtime);

  if (!(await fs.pathExists(metaFile))) {
    await fs.writeJson(
      metaFile,
      {
        id: chatId,
        name: name || `chat-${chatId.slice(0, 8)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      { spaces: 2 }
    );
  }

  const defaults = [
    [historyFile, []],
    [contextFile, { summary: "", lastSummarizedAt: null }],
    [filesFile, { trackedFiles: [] }],
    [pendingChangesFile, { changes: [], createdAt: null }]
  ];

  for (const [filePath, fallback] of defaults) {
    if (!(await fs.pathExists(filePath))) {
      await fs.writeJson(filePath, fallback, { spaces: 2 });
    }
  }
}

async function createChat(name, runtime = createRuntimeContext()) {
  const chatId = uuidv4();
  await ensureChatFiles(chatId, name, runtime);
  await setActiveChat(chatId, runtime);
  return getChatMeta(chatId, runtime);
}

async function listChats(runtime = createRuntimeContext()) {
  if (!(await fs.pathExists(runtime.chatsDir))) {
    return [];
  }

  const entries = await fs.readdir(runtime.chatsDir);
  const chats = [];

  for (const entry of entries) {
    const metaFile = getChatFile(entry, "meta.json", runtime);
    if (await fs.pathExists(metaFile)) {
      chats.push(await fs.readJson(metaFile));
    }
  }

  return chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

async function getChatMeta(chatId, runtime = createRuntimeContext()) {
  await ensureChatFiles(chatId, null, runtime);
  return fs.readJson(getChatFile(chatId, "meta.json", runtime));
}

async function getActiveChatId(runtime = createRuntimeContext()) {
  const session = await fs.readJson(runtime.sessionFile);
  return session.activeChatId;
}

async function setActiveChat(chatId, runtime = createRuntimeContext()) {
  await ensureChatFiles(chatId, null, runtime);
  await fs.writeJson(runtime.sessionFile, { activeChatId: chatId }, { spaces: 2 });
}

async function getActiveChatMeta(runtime = createRuntimeContext()) {
  const activeChatId = await getActiveChatId(runtime);
  if (!activeChatId) {
    return null;
  }

  return getChatMeta(activeChatId, runtime);
}

async function touchChat(chatId, runtime = createRuntimeContext()) {
  const meta = await getChatMeta(chatId, runtime);
  meta.updatedAt = new Date().toISOString();
  await fs.writeJson(getChatFile(chatId, "meta.json", runtime), meta, { spaces: 2 });
}

async function readHistory(chatId, runtime = createRuntimeContext()) {
  await ensureChatFiles(chatId, null, runtime);
  return fs.readJson(getChatFile(chatId, "history.json", runtime));
}

async function appendMessage(chatId, message, runtime = createRuntimeContext()) {
  const history = await readHistory(chatId, runtime);
  history.push({
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...message
  });
  await fs.writeJson(getChatFile(chatId, "history.json", runtime), history, { spaces: 2 });
  await touchChat(chatId, runtime);
}

async function readContext(chatId, runtime = createRuntimeContext()) {
  await ensureChatFiles(chatId, null, runtime);
  return fs.readJson(getChatFile(chatId, "context.json", runtime));
}

async function writeContext(chatId, context, runtime = createRuntimeContext()) {
  await fs.writeJson(getChatFile(chatId, "context.json", runtime), context, { spaces: 2 });
  await touchChat(chatId, runtime);
}

async function readTrackedFiles(chatId, runtime = createRuntimeContext()) {
  await ensureChatFiles(chatId, null, runtime);
  return fs.readJson(getChatFile(chatId, "files.json", runtime));
}

async function updateTrackedFiles(chatId, files, runtime = createRuntimeContext()) {
  const uniqueFiles = [...new Set(files)].slice(0, 30);
  await fs.writeJson(
    getChatFile(chatId, "files.json", runtime),
    { trackedFiles: uniqueFiles, updatedAt: new Date().toISOString() },
    { spaces: 2 }
  );
  await touchChat(chatId, runtime);
}

async function readPendingChanges(chatId, runtime = createRuntimeContext()) {
  await ensureChatFiles(chatId, null, runtime);
  return fs.readJson(getChatFile(chatId, "pending-changes.json", runtime));
}

async function writePendingChanges(chatId, payload, runtime = createRuntimeContext()) {
  await fs.writeJson(
    getChatFile(chatId, "pending-changes.json", runtime),
    {
      ...payload,
      createdAt: payload.changes && payload.changes.length ? new Date().toISOString() : null
    },
    { spaces: 2 }
  );
  await touchChat(chatId, runtime);
}

function getRecentMessages(history) {
  return history.slice(-MAX_RECENT_MESSAGES);
}

module.exports = {
  createChat,
  listChats,
  getActiveChatId,
  getActiveChatMeta,
  setActiveChat,
  getChatMeta,
  readHistory,
  appendMessage,
  readContext,
  writeContext,
  readTrackedFiles,
  updateTrackedFiles,
  readPendingChanges,
  writePendingChanges,
  getRecentMessages
};
