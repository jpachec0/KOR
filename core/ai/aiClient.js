const { requestOpenAiCompletion } = require("./providers/openaiProvider");
const { requestOpenRouterCompletion } = require("./providers/openRouterProvider");
const { requestHuggingFaceCompletion } = require("./providers/huggingFaceProvider");

async function askModel(config, prompt) {
  switch (config.provider) {
    case "openai":
      return requestOpenAiCompletion(config, prompt);
    case "openrouter":
      return requestOpenRouterCompletion(config, prompt);
    case "huggingface":
      return requestHuggingFaceCompletion(config, prompt);
    default:
      throw new Error(`Provider nao suportado: ${config.provider}`);
  }
}

module.exports = {
  askModel
};
