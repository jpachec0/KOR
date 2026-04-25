const fs = require("fs-extra");
const {
  RUNTIME_DIR,
  CHATS_DIR,
  MEMORY_DIR,
  INDEX_DIR,
  SESSION_FILE,
  CACHE_FILE
} = require("./constants");

async function ensureJsonFile(filePath, fallback) {
  if (!(await fs.pathExists(filePath))) {
    await fs.writeJson(filePath, fallback, { spaces: 2 });
  }
}

async function ensureRuntime() {
  await fs.ensureDir(RUNTIME_DIR);
  await fs.ensureDir(CHATS_DIR);
  await fs.ensureDir(MEMORY_DIR);
  await fs.ensureDir(INDEX_DIR);
  await ensureJsonFile(SESSION_FILE, { activeChatId: null });
  await ensureJsonFile(CACHE_FILE, { responses: {} });
}

module.exports = {
  ensureRuntime
};
