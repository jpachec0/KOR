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

  return parts.filter(Boolean).join("\n\n");
}

module.exports = {
  buildQuestionWithEditorContext
};
