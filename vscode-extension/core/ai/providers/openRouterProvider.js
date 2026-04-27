const axios = require("axios");
const { buildJsonResponseFormat } = require("../responseFormat");
const { withRetry } = require("../httpRetry");

async function requestOpenRouterCompletion(config, prompt) {
  let endpoint = config.baseUrl || "https://openrouter.ai/api/v1/chat/completions";
  if (config.baseUrl && !config.baseUrl.endsWith("/chat/completions")) {
    endpoint = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;
  }

  const response = await withRetry(
    () => axios.post(
      endpoint,
      {
        model: config.model,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        plugins: [
          { id: "response-healing" }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost",
          "X-Title": "KOR Local AI Agent"
        },
        timeout: 60000
      }
    ),
    { label: "OpenRouter", maxRetries: 3 }
  );

  return response.data.choices?.[0]?.message?.content || "";
}

module.exports = {
  requestOpenRouterCompletion
};
