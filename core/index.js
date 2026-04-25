const {
  createChat,
  listChats,
  setActiveChat,
  getActiveChatMeta,
  getChatMeta,
  readHistory,
  readPendingChanges,
  writePendingChanges
} = require("./chatManager");
const { ensureRuntime } = require("./runtime");
const { askAgent, applyPendingChanges, getPendingChanges } = require("./agentService");
const { createRuntimeContext } = require("./runtimeContext");

async function ensureActiveChat(runtime) {
  let active = await getActiveChatMeta(runtime);
  if (!active) {
    active = await createChat("chat-inicial", runtime);
  }
  return active;
}

async function buildState(runtime, chatId = null) {
  await ensureRuntime(runtime);
  const activeChat = chatId ? await getChatMeta(chatId, runtime) : await ensureActiveChat(runtime);
  const [chats, history, pending] = await Promise.all([
    listChats(runtime),
    readHistory(activeChat.id, runtime),
    readPendingChanges(activeChat.id, runtime)
  ]);

  return {
    activeChat,
    chats,
    history,
    pendingChanges: pending.changes || [],
    pendingDiffPreview: pending.diffPreview || []
  };
}

function createKorCore(rootDir = process.cwd()) {
  const runtime = createRuntimeContext(rootDir);

  return {
    runtime,
    ensureRuntime: () => ensureRuntime(runtime),
    ensureActiveChat: () => ensureActiveChat(runtime),
    createChat: (name) => createChat(name, runtime),
    listChats: () => listChats(runtime),
    useChat: async (chatId) => {
      await setActiveChat(chatId, runtime);
      return getChatMeta(chatId, runtime);
    },
    getActiveChat: () => getActiveChatMeta(runtime),
    getState: (chatId = null) => buildState(runtime, chatId),
    askAgent: async (chatId, question, options = {}) => {
      await ensureRuntime(runtime);
      return askAgent(chatId, question, {
        ...options,
        runtime
      });
    },
    applyChanges: async (chatId) => applyPendingChanges(chatId, { runtime }),
    getPendingChanges: async (chatId) => getPendingChanges(chatId, { runtime }),
    clearPendingChanges: async (chatId) => {
      await writePendingChanges(chatId, {
        changes: [],
        diffPreview: [],
        projectRoot: runtime.rootDir
      }, runtime);
      return buildState(runtime, chatId);
    }
  };
}

function getRootDir(options = {}) {
  return options.rootDir || process.cwd();
}

async function createChatEntry(name, options = {}) {
  return createKorCore(getRootDir(options)).createChat(name);
}

async function listChatsEntry(options = {}) {
  return createKorCore(getRootDir(options)).listChats();
}

async function useChatEntry(chatId, options = {}) {
  return createKorCore(getRootDir(options)).useChat(chatId);
}

async function askAgentEntry(chatId, question, options = {}) {
  return createKorCore(getRootDir(options)).askAgent(chatId, question, options);
}

async function applyChangesEntry(chatId, options = {}) {
  return createKorCore(getRootDir(options)).applyChanges(chatId);
}

module.exports = {
  createKorCore,
  createChat: createChatEntry,
  listChats: listChatsEntry,
  useChat: useChatEntry,
  askAgent: askAgentEntry,
  applyChanges: applyChangesEntry
};
