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
    "Voce e um assistente de desenvolvimento avançado (KOR Agent) integrado ao editor do usuario.",
    "Se o usuario mandar apenas uma saudacao (ex: 'ola') ou conversa casual, aja de forma amigavel e natural, sem forçar respostas sobre programacao.",
    "Para qualquer interacao (seja codigo ou conversa casual), voce DEVE responder APENAS com um objeto JSON valido.",
    "Nao use markdown envolvendo o JSON. Nao adicione explicacoes ou textos fora do bloco JSON.",
    "A chave 'answer' deve conter a sua mensagem ou resposta final em markdown formatado para o usuario ler.",
    "Quando sugerir alteracoes de codigo, responda em JSON com as chaves answer, summary, relevantFiles e proposedChanges.",
    "Se a resposta nao exigir edicoes de arquivos (ex: tirar duvidas, saudacoes), mantenha proposedChanges como um array vazio [].",
    "Voce PODE e DEVE sugerir alteracoes simultaneas em VARIOS arquivos diferentes de uma vez, se a solicitacao exigir. Adicione cada arquivo como um objeto no array proposedChanges.",
    "Se for necessario criar novos arquivos (ex: testes, novos componentes), use action: 'create' e passe o caminho desejado em 'path'.",
    "Cada item de proposedChanges deve ter path, action (create|update|delete), content e reason.",
    "Use 'content' completo com o codigo final absoluto do arquivo (sem truncar).",
    'Exemplo obrigatorio de proposedChanges com multiplos arquivos: [{"path":"src/novo.js","action":"create","content":"...","reason":"..."}, {"path":"src/antigo.js","action":"update","content":"...","reason":"..."}]'
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
