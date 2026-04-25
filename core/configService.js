const fs = require("fs-extra");
const { createRuntimeContext } = require("./runtimeContext");

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
