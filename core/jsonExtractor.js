function fallbackResponse(text, summary = "fallback") {
  return {
    answer: typeof text === "string" && text.trim() ? text.trim() : "Sem resposta textual.",
    summary,
    relevantFiles: [],
    proposedChanges: []
  };
}

function normalizeParsedResponse(parsed, originalText = "") {
  return {
    answer: typeof parsed.answer === "string" ? parsed.answer : fallbackResponse(originalText).answer,
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    relevantFiles: Array.isArray(parsed.relevantFiles)
      ? parsed.relevantFiles.filter((item) => typeof item === "string")
      : [],
    proposedChanges: Array.isArray(parsed.proposedChanges)
      ? parsed.proposedChanges
          .filter((item) => item && typeof item === "object")
          .map((item) => ({
            path: typeof item.path === "string" ? item.path : "",
            action: typeof item.action === "string" ? item.action : "update",
            content: typeof item.content === "string" ? item.content : "",
            reason: typeof item.reason === "string" ? item.reason : ""
          }))
          .filter((item) => item.path)
      : []
  };
}

function validateNormalizedResponse(parsed) {
  return Boolean(
    parsed &&
      typeof parsed.answer === "string" &&
      typeof parsed.summary === "string" &&
      Array.isArray(parsed.relevantFiles) &&
      Array.isArray(parsed.proposedChanges)
  );
}

function extractBalancedJsonObject(text) {
  const start = text.indexOf("{");
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return null;
}

function extractCandidateJson(text) {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
  const raw = fencedMatch ? fencedMatch[1].trim() : text.trim();
  return extractBalancedJsonObject(raw) || extractBalancedJsonObject(text) || raw;
}

function safeParseJSON(text) {
  if (typeof text !== "string" || !text.trim()) {
    return {
      ok: false,
      recovered: false,
      value: fallbackResponse("", "empty-response"),
      error: new Error("Resposta vazia da IA.")
    };
  }

  const attempts = [text.trim(), extractCandidateJson(text)];
  let lastError = null;

  for (const candidate of attempts) {
    if (!candidate) {
      continue;
    }

    try {
      const normalized = normalizeParsedResponse(JSON.parse(candidate), text);
      if (validateNormalizedResponse(normalized)) {
        return {
          ok: true,
          recovered: candidate !== text.trim(),
          value: normalized,
          error: null
        };
      }
    } catch (error) {
      lastError = error;
    }
  }

  return {
    ok: false,
    recovered: false,
    value: fallbackResponse(text),
    error: lastError || new Error("Resposta da IA nao contem JSON valido.")
  };
}

function normalizeAiResponse(text, options = {}) {
  const result = safeParseJSON(text);
  if (!result.ok && options.throwOnFailure) {
    throw result.error || new Error("Resposta da IA nao contem JSON valido.");
  }

  return result.value;
}

module.exports = {
  safeParseJSON,
  normalizeAiResponse
};
