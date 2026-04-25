const axios = require("axios");
const { buildJsonResponseFormat } = require("../responseFormat");

async function requestOpenRouterCompletion(config, prompt) {
  const response = await axios.post(
    config.baseUrl || "https://openrouter.ai/api/v1/chat/completions",
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
      response_format: buildJsonResponseFormat(),
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
  );

  return response.data.choices?.[0]?.message?.content || "";
}

module.exports = {
  requestOpenRouterCompletion
};
