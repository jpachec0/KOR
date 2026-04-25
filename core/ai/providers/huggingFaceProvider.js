const axios = require("axios");

async function requestHuggingFaceCompletion(config, prompt) {
  const modelEndpoint = config.baseUrl || `https://api-inference.huggingface.co/models/${config.model}`;

  const response = await axios.post(
    modelEndpoint,
    {
      inputs: prompt,
      parameters: {
        max_new_tokens: config.maxTokens,
        temperature: config.temperature,
        return_full_text: false
      }
    },
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      timeout: 60000
    }
  );

  if (Array.isArray(response.data) && response.data[0]?.generated_text) {
    return response.data[0].generated_text;
  }

  if (typeof response.data?.generated_text === "string") {
    return response.data.generated_text;
  }

  return JSON.stringify(response.data);
}

module.exports = {
  requestHuggingFaceCompletion
};
