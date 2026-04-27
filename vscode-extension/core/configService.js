const fs = require("fs-extra");
const path = require("path");
const { createRuntimeContext } = require("./runtimeContext");
const { getApiKey, saveCredential } = require("./credentialStore");

const DEFAULT_BASE_URLS = {
  openrouter: "https://openrouter.ai/api/v1",
  openai: "https://api.openai.com/v1",
  huggingface: "https://api-inference.huggingface.co/models"
};

/**
 * Loads AI config with fallback: workspace → global.
 * Workspace config takes priority if it exists.
 */
async function loadAiConfig(runtime = createRuntimeContext()) {
  let config = null;
  let configSource = null;

  // Try workspace-local config first
  if (await fs.pathExists(runtime.aiConfigFile)) {
    config = await fs.readJson(runtime.aiConfigFile);
    configSource = "workspace";
  }
  // Fall back to global config
  else if (await fs.pathExists(runtime.globalAiConfigFile)) {
    config = await fs.readJson(runtime.globalAiConfigFile);
    configSource = "global";
  }

  if (!config) {
    throw new Error(
      "Nenhuma configuracao de IA encontrada. Execute 'kor setup' para configurar provider e modelo."
    );
  }

  if (!config.provider) {
    throw new Error("Configuracao de IA precisa informar o provider.");
  }

  if (!config.model) {
    throw new Error("Configuracao de IA precisa informar o model.");
  }

  const apiKey = await getApiKey(config.provider, runtime);

  if (!apiKey || apiKey === "COLOCAR_AQUI") {
    throw new Error("Configure sua chave de API via setup antes de usar o ask.");
  }

  const defaultBaseUrl = DEFAULT_BASE_URLS[config.provider.toLowerCase()];

  return {
    maxTokens: 4096,
    temperature: 0.2,
    baseUrl: config.baseUrl || defaultBaseUrl,
    ...config,
    apiKey,
    _configSource: configSource
  };
}

/**
 * Saves AI config to global directory by default (shared across workspaces).
 * If localOnly is true, saves to workspace-local config instead.
 */
async function saveAiConfig(configOverrides, runtime = createRuntimeContext(), localOnly = false) {
  const targetConfigFile = localOnly ? runtime.aiConfigFile : runtime.globalAiConfigFile;

  let existingConfig = {};
  if (await fs.pathExists(targetConfigFile)) {
    existingConfig = await fs.readJson(targetConfigFile);
  }

  const newConfig = {
    ...existingConfig,
    ...configOverrides
  };

  if (newConfig.apiKey) {
    await saveCredential(newConfig.provider || existingConfig.provider || "openrouter", newConfig.apiKey, runtime);
    delete newConfig.apiKey;
  }

  // Ensure directory exists
  await fs.ensureDir(path.dirname(targetConfigFile));

  const finalProvider = newConfig.provider || existingConfig.provider || "openrouter";
  const defaultBaseUrl = DEFAULT_BASE_URLS[finalProvider.toLowerCase()];
  
  if (newConfig.baseUrl === defaultBaseUrl) {
    delete newConfig.baseUrl;
  }

  await fs.writeJson(targetConfigFile, newConfig, { spaces: 2 });
  
  try {
    return await loadAiConfig(runtime);
  } catch (err) {
    // Return partial if validation fails
    return { ...newConfig, apiKey: await getApiKey(finalProvider, runtime) };
  }
}

module.exports = {
  loadAiConfig,
  saveAiConfig,
  DEFAULT_BASE_URLS
};
