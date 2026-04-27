const crypto = require("crypto");
const fs = require("fs-extra");
const { createRuntimeContext } = require("./runtimeContext");

function createCacheKey(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function hashContent(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function readCache(runtime = createRuntimeContext()) {
  return fs.readJson(runtime.cacheFile);
}

async function getCachedResponse(cacheKey, runtime = createRuntimeContext()) {
  const cache = await readCache(runtime);
  return cache.responses[cacheKey] || null;
}

async function setCachedResponse(cacheKey, response, runtime = createRuntimeContext()) {
  const cache = await readCache(runtime);
  cache.responses[cacheKey] = {
    ...response,
    cachedAt: new Date().toISOString()
  };
  await fs.writeJson(runtime.cacheFile, cache, { spaces: 2 });
}

module.exports = {
  createCacheKey,
  hashContent,
  getCachedResponse,
  setCachedResponse
};
