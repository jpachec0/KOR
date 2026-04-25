const fs = require("fs-extra");
const { createRuntimeContext } = require("./runtimeContext");

async function ensureJsonFile(filePath, fallback) {
  if (!(await fs.pathExists(filePath))) {
    await fs.writeJson(filePath, fallback, { spaces: 2 });
  }
}

async function ensureRuntime(runtime = createRuntimeContext()) {
  await fs.ensureDir(runtime.runtimeDir);
  await fs.ensureDir(runtime.chatsDir);
  await fs.ensureDir(runtime.memoryDir);
  await fs.ensureDir(runtime.indexDir);
  await ensureJsonFile(runtime.sessionFile, { activeChatId: null });
  await ensureJsonFile(runtime.cacheFile, { responses: {} });
}

module.exports = {
  ensureRuntime
};
