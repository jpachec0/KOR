const fs = require("fs-extra");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const {
  CHATS_DIR,
  SESSION_FILE,
  MAX_RECENT_MESSAGES
} = require("./constants");

function getChatDir(chatId) {
  return path.join(CHATS_DIR, chatId);
}

function getChatFile(chatId, fileName) {
  return path.join(getChatDir(chatId), fileName);
}

async function ensureChatFiles(chatId, name = null) {
  const chatDir = getChatDir(chatId);
  await fs.ensureDir(chatDir);

  const metaFile = getChatFile(chatId, "meta.json");
  const historyFile = getChatFile(chatId, "history.json");
  const contextFile = getChatFile(chatId, "context.json");
  const filesFile = getChatFile(chatId, "files.json");
  const pendingChangesFile = getChatFile(chatId, "pending-changes.json");

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

async function createChat(name) {
  const chatId = uuidv4();
  await ensureChatFiles(chatId, name);
  await setActiveChat(chatId);
  return getChatMeta(chatId);
}

async function listChats() {
  if (!(await fs.pathExists(CHATS_DIR))) {
    return [];
  }

  const entries = await fs.readdir(CHATS_DIR);
  const chats = [];

  for (const entry of entries) {
    const metaFile = getChatFile(entry, "meta.json");
    if (await fs.pathExists(metaFile)) {
      chats.push(await fs.readJson(metaFile));
    }
  }

  return chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

async function getChatMeta(chatId) {
  await ensureChatFiles(chatId);
  return fs.readJson(getChatFile(chatId, "meta.json"));
}

async function getActiveChatId() {
  const session = await fs.readJson(SESSION_FILE);
  return session.activeChatId;
}

async function setActiveChat(chatId) {
  await ensureChatFiles(chatId);
  await fs.writeJson(SESSION_FILE, { activeChatId: chatId }, { spaces: 2 });
}

async function getActiveChatMeta() {
  const activeChatId = await getActiveChatId();
  if (!activeChatId) {
    return null;
  }

  return getChatMeta(activeChatId);
}

async function touchChat(chatId) {
  const meta = await getChatMeta(chatId);
  meta.updatedAt = new Date().toISOString();
  await fs.writeJson(getChatFile(chatId, "meta.json"), meta, { spaces: 2 });
}

async function readHistory(chatId) {
  await ensureChatFiles(chatId);
  return fs.readJson(getChatFile(chatId, "history.json"));
}

async function appendMessage(chatId, message) {
  const history = await readHistory(chatId);
  history.push({
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...message
  });
  await fs.writeJson(getChatFile(chatId, "history.json"), history, { spaces: 2 });
  await touchChat(chatId);
}

async function readContext(chatId) {
  await ensureChatFiles(chatId);
  return fs.readJson(getChatFile(chatId, "context.json"));
}

async function writeContext(chatId, context) {
  await fs.writeJson(getChatFile(chatId, "context.json"), context, { spaces: 2 });
  await touchChat(chatId);
}

async function readTrackedFiles(chatId) {
  await ensureChatFiles(chatId);
  return fs.readJson(getChatFile(chatId, "files.json"));
}

async function updateTrackedFiles(chatId, files) {
  const uniqueFiles = [...new Set(files)].slice(0, 30);
  await fs.writeJson(
    getChatFile(chatId, "files.json"),
    { trackedFiles: uniqueFiles, updatedAt: new Date().toISOString() },
    { spaces: 2 }
  );
  await touchChat(chatId);
}

async function readPendingChanges(chatId) {
  await ensureChatFiles(chatId);
  return fs.readJson(getChatFile(chatId, "pending-changes.json"));
}

async function writePendingChanges(chatId, payload) {
  await fs.writeJson(
    getChatFile(chatId, "pending-changes.json"),
    {
      ...payload,
      createdAt: payload.changes && payload.changes.length ? new Date().toISOString() : null
    },
    { spaces: 2 }
  );
  await touchChat(chatId);
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
