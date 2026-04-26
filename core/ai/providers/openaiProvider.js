const axios = require("axios");
const { buildJsonResponseFormat } = require("../responseFormat");

async function requestOpenAiCompletion(config, prompt) {
  let endpoint = config.baseUrl || "https://api.openai.com/v1/chat/completions";
  if (config.baseUrl && !config.baseUrl.endsWith("/chat/completions")) {
    endpoint = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;
  }

  const response = await axios.post(
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
      response_format: buildJsonResponseFormat()
    },
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      timeout: 60000
    }
  );

  return response.data.choices?.[0]?.message?.content || "";
}

module.exports = {
  requestOpenAiCompletion
};
