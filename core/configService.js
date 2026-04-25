const fs = require("fs-extra");
const { AI_CONFIG_FILE } = require("./constants");

async function loadAiConfig() {
  if (!(await fs.pathExists(AI_CONFIG_FILE))) {
    throw new Error(`Arquivo de configuracao nao encontrado em ${AI_CONFIG_FILE}`);
  }

  const config = await fs.readJson(AI_CONFIG_FILE);

  if (!config.provider) {
    throw new Error("config/ai.json precisa informar o provider.");
  }

  if (!config.model) {
    throw new Error("config/ai.json precisa informar o model.");
  }

  if (!config.apiKey || config.apiKey === "COLOCAR_AQUI") {
    throw new Error("Configure sua chave de API em config/ai.json antes de usar o ask.");
  }

  return {
    maxTokens: 2000,
    temperature: 0.2,
    ...config
  };
}

module.exports = {
  loadAiConfig
};
