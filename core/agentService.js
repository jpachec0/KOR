const {
  appendMessage,
  readHistory,
  readContext,
  writeContext,
  readTrackedFiles,
  updateTrackedFiles,
  writePendingChanges,
  readPendingChanges,
  getRecentMessages
} = require("./chatManager");
const { buildContextSummary } = require("./contextManager");
const { buildProjectIndex } = require("./projectIndexer");
const { selectRelevantFiles } = require("./fileSelector");
const { loadFilesForPrompt } = require("./fileContextService");
const { buildPrompt } = require("./promptBuilder");
const { loadAiConfig } = require("./configService");
const { askModel } = require("./ai/aiClient");
const { normalizeAiResponse } = require("./jsonExtractor");
const { buildDiffPreview, applyChanges } = require("./diffManager");
const {
  createCacheKey,
  hashContent,
  getCachedResponse,
  setCachedResponse
} = require("./responseCache");
const { createRuntimeContext } = require("./runtimeContext");
const { buildQuestionWithEditorContext } = require("./editorContext");

async function askAgent(chatId, question, options = {}) {
  const runtime = options.runtime || createRuntimeContext();
  const enrichedQuestion = buildQuestionWithEditorContext(question, options.editorContext);
  const providerConfig = await loadAiConfig(runtime);
  await appendMessage(chatId, { role: "user", content: enrichedQuestion }, runtime);

  const [history, context, trackedFiles, projectIndex] = await Promise.all([
    readHistory(chatId, runtime),
    readContext(chatId, runtime),
    readTrackedFiles(chatId, runtime),
    buildProjectIndex(runtime)
  ]);

  const relevantFiles = selectRelevantFiles(enrichedQuestion, projectIndex, trackedFiles.trackedFiles || []);
  const fileBundle = await loadFilesForPrompt(relevantFiles, runtime);
  const recentMessages = getRecentMessages(history);
  const computedSummary = buildContextSummary(history, context.summary);
  const prompt = buildPrompt({
    question: enrichedQuestion,
    projectIndex,
    contextSummary: context.summary || computedSummary,
    recentMessages,
    files: fileBundle.files
  });

  const cacheKey = createCacheKey({
    chatId,
    question,
    providerConfig: {
      provider: providerConfig.provider,
      model: providerConfig.model
    },
    files: fileBundle.files.map((file) => ({
      path: file.path,
      size: file.size,
      contentHash: hashContent(file.content)
    }))
  });

  let normalizedResponse = await getCachedResponse(cacheKey, runtime);

  if (!normalizedResponse) {
    const rawResponse = await askModel(providerConfig, prompt);
    normalizedResponse = normalizeAiResponse(rawResponse);
    await setCachedResponse(cacheKey, normalizedResponse, runtime);
  }

  const mergedTrackedFiles = [
    ...(trackedFiles.trackedFiles || []),
    ...relevantFiles,
    ...normalizedResponse.relevantFiles
  ];

  await updateTrackedFiles(chatId, mergedTrackedFiles, runtime);
  await writeContext(chatId, {
    summary: normalizedResponse.summary || computedSummary,
    lastSummarizedAt: new Date().toISOString()
  }, runtime);

  const diffPreview = await buildDiffPreview(normalizedResponse.proposedChanges, runtime);
  await writePendingChanges(chatId, {
    changes: normalizedResponse.proposedChanges,
    diffPreview,
    projectRoot: runtime.rootDir
  }, runtime);

  await appendMessage(chatId, {
    role: "assistant",
    content: normalizedResponse.answer
  }, runtime);

  return {
    answer: normalizedResponse.answer,
    relevantFiles,
    diffPreview,
    usedCache: Boolean(normalizedResponse.cachedAt)
  };
}

async function applyPendingChanges(chatId, options = {}) {
  const runtime = options.runtime || createRuntimeContext();
  const pending = await readPendingChanges(chatId, runtime);
  if (!pending.changes || !pending.changes.length) {
    return {
      applied: false,
      message: "Nao ha alteracoes pendentes para aplicar."
    };
  }

  await applyChanges(pending.changes, runtime);
  await writePendingChanges(chatId, {
    changes: [],
    diffPreview: [],
    projectRoot: runtime.rootDir
  }, runtime);

  return {
    applied: true,
    message: `${pending.changes.length} alteracao(oes) aplicada(s) com sucesso.`
  };
}

async function getPendingChanges(chatId, options = {}) {
  const runtime = options.runtime || createRuntimeContext();
  const pending = await readPendingChanges(chatId, runtime);
  return pending.diffPreview || [];
}

module.exports = {
  askAgent,
  applyPendingChanges,
  getPendingChanges
};
