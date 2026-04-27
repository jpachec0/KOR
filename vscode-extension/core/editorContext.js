function buildQuestionWithEditorContext(question, editorContext = {}) {
  const parts = [question.trim()];

  if (editorContext.activeFile) {
    parts.push(`Arquivo ativo no editor: ${editorContext.activeFile}`);
  }

  if (editorContext.selectedText) {
    parts.push([
      "Trecho selecionado no editor:",
      "```",
      editorContext.selectedText,
      "```"
    ].join("\n"));
  }

  if (editorContext.surroundingText) {
    parts.push([
      "Contexto adicional do editor:",
      "```",
      editorContext.surroundingText,
      "```"
    ].join("\n"));
  }

  if (editorContext.openFiles && editorContext.openFiles.length > 0) {
    parts.push("O usuario tem os seguintes arquivos abertos ativamente no seu editor de codigo:");
    for (const file of editorContext.openFiles) {
      parts.push([
        `--- Arquivo: ${file.path} ---`,
        "```",
        file.content,
        "```"
      ].join("\n"));
    }
  }

  return parts.filter(Boolean).join("\n\n");
}

module.exports = {
  buildQuestionWithEditorContext
};
