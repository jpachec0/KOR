const fs = require("fs-extra");
const { createRuntimeContext } = require("./runtimeContext");

const EMPTY_CREDENTIALS = {
  openrouter: "",
  openai: "",
  huggingface: "",
  together: "",
  groq: "",
  anthropic: ""
};

/**
 * Ensures global credentials file exists.
 */
async function ensureCredentialsFile(runtime = createRuntimeContext()) {
  if (!(await fs.pathExists(runtime.globalCredentialsFile))) {
    await fs.ensureDir(require("path").dirname(runtime.globalCredentialsFile));
    await fs.writeJson(runtime.globalCredentialsFile, EMPTY_CREDENTIALS, { spaces: 2 });
  }
}

/**
 * Loads credentials with fallback: workspace → global.
 * Merges both sources so workspace can override specific providers.
 */
async function loadCredentials(runtime = createRuntimeContext()) {
  await ensureCredentialsFile(runtime);

  let globalCreds = { ...EMPTY_CREDENTIALS };
  let workspaceCreds = {};

  // Load global credentials
  try {
    if (await fs.pathExists(runtime.globalCredentialsFile)) {
      const raw = await fs.readJson(runtime.globalCredentialsFile);
      globalCreds = { ...EMPTY_CREDENTIALS, ...raw };
    }
  } catch (_error) {
    // ignore
  }

  // Load workspace credentials (override)
  try {
    if (await fs.pathExists(runtime.credentialsFile)) {
      workspaceCreds = await fs.readJson(runtime.credentialsFile);
    }
  } catch (_error) {
    // ignore
  }

  // Merge: workspace overrides global for non-empty values
  const merged = { ...globalCreds };
  for (const [key, value] of Object.entries(workspaceCreds)) {
    if (value) {
      merged[key] = value;
    }
  }

  return merged;
}

/**
 * Saves credential to global store by default (shared across workspaces).
 */
async function saveCredential(provider, apiKey, runtime = createRuntimeContext()) {
  await ensureCredentialsFile(runtime);

  // Always save to global
  let globalCreds = { ...EMPTY_CREDENTIALS };
  try {
    if (await fs.pathExists(runtime.globalCredentialsFile)) {
      globalCreds = { ...EMPTY_CREDENTIALS, ...await fs.readJson(runtime.globalCredentialsFile) };
    }
  } catch (_error) {
    // ignore
  }

  globalCreds[provider.toLowerCase()] = apiKey;
  await fs.writeJson(runtime.globalCredentialsFile, globalCreds, { spaces: 2 });

  return globalCreds;
}

async function getApiKey(provider, runtime = createRuntimeContext()) {
  const creds = await loadCredentials(runtime);
  return creds[provider.toLowerCase()] || "";
}

function maskApiKey(key) {
  if (!key || key.length < 8) return key ? "****" : "";
  return key.slice(0, 6) + "..." + key.slice(-4);
}

module.exports = {
  ensureCredentialsFile,
  loadCredentials,
  saveCredential,
  getApiKey,
  maskApiKey,
  EMPTY_CREDENTIALS
};
