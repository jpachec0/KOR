const { requestOpenAiCompletion } = require("./providers/openaiProvider");
const { requestOpenRouterCompletion } = require("./providers/openRouterProvider");
const { requestHuggingFaceCompletion } = require("./providers/huggingFaceProvider");
const { safeParseJSON } = require("../jsonExtractor");
const logger = require("../logger");

function buildRetryPrompt(prompt, attemptNumber) {
  return [
    prompt,
    "",
    `RETRY ${attemptNumber}: responda APENAS com JSON valido.`,
    "Nao use markdown.",
    "Nao escreva texto antes ou depois do objeto JSON.",
    'O objeto JSON precisa conter exatamente as chaves: answer, summary, relevantFiles, proposedChanges.'
  ].join("\n");
}

async function requestByProvider(config, prompt) {
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

async function askModel(config, prompt) {
  const maxAttempts = 3;
  let lastResponse = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const currentPrompt = attempt === 1 ? prompt : buildRetryPrompt(prompt, attempt);

    try {
      const rawResponse = await requestByProvider(config, currentPrompt);
      lastResponse = rawResponse;

      const parseResult = safeParseJSON(rawResponse);

      if (parseResult.ok) {
        return rawResponse;
      }

      if (attempt < maxAttempts) {
        logger.info(
          `[AI] Resposta invalida (tentativa ${attempt}/${maxAttempts}, ${rawResponse.length} chars). Retentando...`
        );
      } else {
        logger.info(
          `[AI] Resposta invalida apos ${maxAttempts} tentativas (${rawResponse.length} chars). Usando fallback.`
        );
      }
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      logger.info(
        `[AI] Erro na requisicao (tentativa ${attempt}/${maxAttempts}): ${error.message}. Retentando...`
      );
    }
  }

  return lastResponse;
}

module.exports = {
  askModel
};
