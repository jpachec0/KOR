function extractJsonBlock(text) {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
  const raw = fencedMatch ? fencedMatch[1] : text;
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Resposta da IA nao contem JSON valido.");
  }

  return raw.slice(firstBrace, lastBrace + 1);
}

function normalizeAiResponse(text) {
  const parsed = JSON.parse(extractJsonBlock(text));
  return {
    answer: parsed.answer || "Sem resposta textual.",
    summary: parsed.summary || "",
    relevantFiles: Array.isArray(parsed.relevantFiles) ? parsed.relevantFiles : [],
    proposedChanges: Array.isArray(parsed.proposedChanges) ? parsed.proposedChanges : []
  };
}

module.exports = {
  normalizeAiResponse
};
