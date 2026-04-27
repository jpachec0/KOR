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
    "Todos os caminhos do projeto:",
    ...projectIndex.entries.map((entry) => `- ${entry.path}`)
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
    "Se for necessario RODAR UM COMANDO no terminal (ex: git commit, npm install, tsc), use action: 'executeCommand' e coloque o comando exato na chave 'content' (a chave 'path' pode ser uma string vazia). O sistema rodará o comando, mostrará para o usuário aprovar, e devolverá o resultado (erro ou sucesso) para você em seguida.",
    "Cada item de proposedChanges deve ter path, action (create|update|delete|executeCommand), content e reason.",
    "Use 'content' completo com o codigo final absoluto do arquivo (sem truncar).",
    'Exemplo obrigatorio de proposedChanges com multiplos arquivos e comandos: [{"path":"src/novo.js","action":"create","content":"...","reason":"..."}, {"path":"","action":"executeCommand","content":"npm install axios","reason":"..."}]'
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
