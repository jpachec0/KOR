const crypto = require("crypto");
const fs = require("fs-extra");
const { CACHE_FILE } = require("./constants");

function createCacheKey(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function hashContent(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function readCache() {
  return fs.readJson(CACHE_FILE);
}

async function getCachedResponse(cacheKey) {
  const cache = await readCache();
  return cache.responses[cacheKey] || null;
}

async function setCachedResponse(cacheKey, response) {
  const cache = await readCache();
  cache.responses[cacheKey] = {
    ...response,
    cachedAt: new Date().toISOString()
  };
  await fs.writeJson(CACHE_FILE, cache, { spaces: 2 });
}

module.exports = {
  createCacheKey,
  hashContent,
  getCachedResponse,
  setCachedResponse
};
