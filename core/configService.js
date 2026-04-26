const fs = require("fs-extra");
const path = require("path");
const { createRuntimeContext } = require("./runtimeContext");
const { getApiKey, saveCredential } = require("./credentialStore");

const DEFAULT_BASE_URLS = {
  openrouter: "https://openrouter.ai/api/v1",
  openai: "https://api.openai.com/v1",
  huggingface: "https://api-inference.huggingface.co/models"
};

async function loadAiConfig(runtime = createRuntimeContext()) {
  if (!(await fs.pathExists(runtime.aiConfigFile))) {
    throw new Error(`Arquivo de configuracao nao encontrado em ${runtime.aiConfigFile}`);
  }

  const config = await fs.readJson(runtime.aiConfigFile);

  if (!config.provider) {
    throw new Error("config/ai.json precisa informar o provider.");
  }

  if (!config.model) {
    throw new Error("config/ai.json precisa informar o model.");
  }

  const apiKey = await getApiKey(config.provider, runtime);

  if (!apiKey || apiKey === "COLOCAR_AQUI") {
    throw new Error("Configure sua chave de API via setup antes de usar o ask.");
  }

  const defaultBaseUrl = DEFAULT_BASE_URLS[config.provider.toLowerCase()];

  return {
    maxTokens: 2000,
    temperature: 0.2,
    baseUrl: config.baseUrl || defaultBaseUrl,
    ...config,
    apiKey
  };
}

async function saveAiConfig(configOverrides, runtime = createRuntimeContext()) {
  let existingConfig = {};
  if (await fs.pathExists(runtime.aiConfigFile)) {
    existingConfig = await fs.readJson(runtime.aiConfigFile);
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
  await fs.ensureDir(path.dirname(runtime.aiConfigFile));

  const finalProvider = newConfig.provider || existingConfig.provider || "openrouter";
  const defaultBaseUrl = DEFAULT_BASE_URLS[finalProvider.toLowerCase()];
  
  if (newConfig.baseUrl === defaultBaseUrl) {
    delete newConfig.baseUrl;
  }

  await fs.writeJson(runtime.aiConfigFile, newConfig, { spaces: 2 });
  
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
