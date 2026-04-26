const path = require("path");
const os = require("os");
const crypto = require("crypto");

function createRuntimeContext(rootDir = process.cwd()) {
  const normalizedRootDir = path.resolve(rootDir);
  const pathHash = crypto.createHash("md5").update(normalizedRootDir).digest("hex");
  const runtimeDir = path.join(os.homedir(), ".kor", "workspaces", pathHash);
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
    aiConfigFile: path.join(runtimeDir, "ai.json"),
    credentialsFile: path.join(runtimeDir, "credentials.json")
  };
}

module.exports = {
  createRuntimeContext
};
