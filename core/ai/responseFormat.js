const RESPONSE_JSON_SCHEMA = {
  name: "kor_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      answer: { type: "string" },
      summary: { type: "string" },
      relevantFiles: {
        type: "array",
        items: { type: "string" }
      },
      proposedChanges: {
        type: "array",
        items: {
          type: "object",
          properties: {
            path: { type: "string" },
            action: { type: "string" },
            content: { type: "string" },
            reason: { type: "string" }
          },
          required: ["path", "action", "content", "reason"],
          additionalProperties: false
        }
      }
    },
    required: ["answer", "summary", "relevantFiles", "proposedChanges"],
    additionalProperties: false
  }
};

function buildJsonResponseFormat() {
  return {
    type: "json_schema",
    json_schema: RESPONSE_JSON_SCHEMA
  };
}

module.exports = {
  buildJsonResponseFormat
};
