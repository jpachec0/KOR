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

async function ensureCredentialsFile(runtime = createRuntimeContext()) {
  if (!(await fs.pathExists(runtime.credentialsFile))) {
    await fs.ensureDir(require("path").dirname(runtime.credentialsFile));
    await fs.writeJson(runtime.credentialsFile, EMPTY_CREDENTIALS, { spaces: 2 });
  }
}

async function loadCredentials(runtime = createRuntimeContext()) {
  await ensureCredentialsFile(runtime);
  try {
    const creds = await fs.readJson(runtime.credentialsFile);
    return { ...EMPTY_CREDENTIALS, ...creds };
  } catch (_error) {
    return { ...EMPTY_CREDENTIALS };
  }
}

async function saveCredential(provider, apiKey, runtime = createRuntimeContext()) {
  const creds = await loadCredentials(runtime);
  creds[provider.toLowerCase()] = apiKey;
  await fs.writeJson(runtime.credentialsFile, creds, { spaces: 2 });
  return creds;
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
