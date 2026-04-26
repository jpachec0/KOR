const { loadAiConfig, saveAiConfig } = require("./core/configService");
const { getApiKey, loadCredentials } = require("./core/credentialStore");
const { createRuntimeContext } = require("./core/runtimeContext");

async function run() {
  console.log("=== Testing Config & Credential Separation ===");
  const runtime = createRuntimeContext();
  
  // 1. Save config with an API key
  console.log("Saving new config...");
  await saveAiConfig({
    provider: "openai",
    model: "gpt-4",
    apiKey: "sk-test-123",
    baseUrl: "https://api.openai.com/v1" // Default
  });

  // 2. Read config back
  console.log("Loading config...");
  const config = await loadAiConfig();
  console.log("Loaded Config:", config);

  // 3. Read raw ai.json to ensure no apiKey
  const rawAiJson = require("fs").readFileSync(runtime.aiConfigFile, "utf8");
  console.log("Raw ai.json:", rawAiJson);

  // 4. Verify credentials
  const apiKey = await getApiKey("openai");
  console.log("Saved API Key:", apiKey);
  console.log("Matches?", apiKey === "sk-test-123");
}

run().catch(console.error);
