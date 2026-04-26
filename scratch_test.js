const axios = require("axios");

async function test() {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1", // The exact baseUrl in user's config
      {
        model: "x-ai/grok-4.1-fast:free",
        messages: [{ role: "user", content: "hello" }]
      },
      {
        headers: {
          Authorization: `Bearer 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`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log("RESPONSE HTTP:", response.status);
    console.log("RESPONSE DATA:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.log("ERROR STATUS:", error.response.status);
      console.log("ERROR DATA:", error.response.data);
    } else {
      console.log("ERROR:", error.message);
    }
  }
}

test();
