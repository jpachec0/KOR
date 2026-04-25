const path = require("path");

function createRuntimeContext(rootDir = process.cwd()) {
  const normalizedRootDir = path.resolve(rootDir);
  const runtimeDir = path.join(normalizedRootDir, ".ai-agent");
  const memoryDir = path.join(runtimeDir, "memory");
  const indexDir = path.join(runtimeDir, "index");

  return {
    rootDir: normalizedRootDir,
    runtimeDir,
    chatsDir: path.join(runtimeDir, "chats"),
    memoryDir,
    indexDir,
    sessionFile: path.join(runtimeDir, "session.json"),
    cacheFile: path.join(memoryDir, "response-cache.json"),
    indexFile: path.join(indexDir, "project-index.json"),
    aiConfigFile: path.join(normalizedRootDir, "config", "ai.json")
  };
}

module.exports = {
  createRuntimeContext
};
