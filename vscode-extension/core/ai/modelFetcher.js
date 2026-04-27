const axios = require("axios");

async function fetchOpenRouterModels(apiKey) {
  try {
    const response = await axios.get("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      timeout: 10000
    });

    const models = response.data.data || [];
    const formatted = models.map((m) => {
      const isFree = m.pricing?.prompt === "0" && m.pricing?.completion === "0";
      return {
        id: m.id,
        name: isFree ? `${m.name} -free` : m.name,
        isFree,
        contextLength: m.context_length || 0
      };
    });

    // Ordenar: primeiro free, depois por context_length (proxy para estabilidade/capacidade), depois alfabetico
    formatted.sort((a, b) => {
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;
      if (b.contextLength !== a.contextLength) return b.contextLength - a.contextLength;
      return a.name.localeCompare(b.name);
    });

    return formatted;
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    throw new Error(`Falha ao buscar modelos do OpenRouter: ${msg}`);
  }
}

async function fetchOpenAiModels(apiKey) {
  try {
    const response = await axios.get("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      timeout: 10000
    });

    const models = response.data.data || [];
    // Filtro basico para modelos de chat
    const chatModels = models.filter((m) => m.id.startsWith("gpt-"));
    const formatted = chatModels.map((m) => ({
      id: m.id,
      name: m.id,
      isFree: false,
      contextLength: 0
    }));

    formatted.sort((a, b) => b.name.localeCompare(a.name));

    return formatted;
  } catch (error) {
    const msg = error.response?.error?.message || error.message;
    throw new Error(`Falha ao buscar modelos da OpenAI: ${msg}`);
  }
}

async function fetchHuggingFaceModels() {
  // A API do HF não fornece um jeito simples de listar apenas os LLMs viáveis
  // Retornaremos uma lista dos mais populares. O usuário ainda pode digitar manualmente na CLI/JSON se quiser outro.
  const popularModels = [
    "meta-llama/Llama-2-7b-chat-hf",
    "meta-llama/Llama-2-13b-chat-hf",
    "mistralai/Mistral-7B-Instruct-v0.2",
    "mistralai/Mixtral-8x7B-Instruct-v0.1",
    "HuggingFaceH4/zephyr-7b-beta",
    "google/gemma-7b-it",
    "google/gemma-2b-it"
  ];

  return popularModels.map((m) => ({
    id: m,
    name: m,
    isFree: true, // na HF inference api, boa parte é gratuita
    contextLength: 0
  }));
}

async function fetchModels(provider, apiKey) {
  switch (provider.toLowerCase()) {
    case "openrouter":
      return fetchOpenRouterModels(apiKey);
    case "openai":
      return fetchOpenAiModels(apiKey);
    case "huggingface":
      return fetchHuggingFaceModels();
    default:
      throw new Error(`Provider desconhecido ou não suporta busca de modelos: ${provider}`);
  }
}

module.exports = {
  fetchModels
};
