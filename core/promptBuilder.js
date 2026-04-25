function formatHistory(messages) {
  return messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");
}

function formatFiles(files) {
  if (!files.length) {
    return "Nenhum arquivo relevante selecionado.";
  }

  return files
    .map((file) => {
      return [
        `Arquivo: ${file.path}`,
        "```",
        file.content,
        "```"
      ].join("\n");
    })
    .join("\n\n");
}

function buildPrompt({ question, projectIndex, contextSummary, recentMessages, files }) {
  const projectSummary = [
    `Projeto localizado em: ${projectIndex.rootDir}`,
    `Arquivos indexados: ${projectIndex.fileCount}`,
    "Alguns caminhos indexados:",
    ...projectIndex.entries.slice(0, 20).map((entry) => `- ${entry.path}`)
  ].join("\n");

  const instructions = [
    "Voce e um engenheiro de software experiente.",
    "Nao invente codigo.",
    "Use apenas o contexto fornecido.",
    "Retorne codigo completo quando necessario.",
    "Voce DEVE responder APENAS com JSON valido.",
    "Nao use markdown.",
    "Nao adicione explicacoes fora do JSON.",
    "Quando sugerir alteracoes, responda em JSON puro com as chaves answer, summary, relevantFiles e proposedChanges.",
    "Cada item de proposedChanges deve ter path, action, content e reason.",
    "Use content completo para o estado final do arquivo.",
    "Se nenhuma alteracao for necessaria, proposedChanges deve ser um array vazio.",
    'O formato esperado e: {"answer":"string","summary":"string","relevantFiles":["file"],"proposedChanges":[{"path":"string","action":"create|update|delete","content":"string","reason":"string"}]}.'
  ].join(" ");

  return [
    instructions,
    "",
    "Resumo do projeto:",
    projectSummary,
    "",
    "Resumo do historico longo:",
    contextSummary || "Sem resumo acumulado ainda.",
    "",
    "Historico recente:",
    formatHistory(recentMessages),
    "",
    "Arquivos relevantes lidos em tempo real:",
    formatFiles(files),
    "",
    `Pergunta atual do usuario: ${question}`
  ].join("\n");
}

module.exports = {
  buildPrompt
};
