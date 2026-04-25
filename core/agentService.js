const fs = require("fs-extra");
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
const { ROOT_DIR } = require("./constants");

async function askAgent(chatId, question) {
  const providerConfig = await loadAiConfig();
  await appendMessage(chatId, { role: "user", content: question });

  const [history, context, trackedFiles, projectIndex] = await Promise.all([
    readHistory(chatId),
    readContext(chatId),
    readTrackedFiles(chatId),
    buildProjectIndex()
  ]);

  const relevantFiles = selectRelevantFiles(question, projectIndex, trackedFiles.trackedFiles || []);
  const fileBundle = await loadFilesForPrompt(relevantFiles);
  const recentMessages = getRecentMessages(history);
  const computedSummary = buildContextSummary(history, context.summary);
  const prompt = buildPrompt({
    question,
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

  let normalizedResponse = await getCachedResponse(cacheKey);

  if (!normalizedResponse) {
    const rawResponse = await askModel(providerConfig, prompt);
    normalizedResponse = normalizeAiResponse(rawResponse);
    await setCachedResponse(cacheKey, normalizedResponse);
  }

  const mergedTrackedFiles = [
    ...(trackedFiles.trackedFiles || []),
    ...relevantFiles,
    ...normalizedResponse.relevantFiles
  ];

  await updateTrackedFiles(chatId, mergedTrackedFiles);
  await writeContext(chatId, {
    summary: normalizedResponse.summary || computedSummary,
    lastSummarizedAt: new Date().toISOString()
  });

  const diffPreview = await buildDiffPreview(normalizedResponse.proposedChanges);
  await writePendingChanges(chatId, {
    changes: normalizedResponse.proposedChanges,
    diffPreview,
    projectRoot: ROOT_DIR
  });

  await appendMessage(chatId, {
    role: "assistant",
    content: normalizedResponse.answer
  });

  return {
    answer: normalizedResponse.answer,
    relevantFiles,
    diffPreview,
    usedCache: Boolean(normalizedResponse.cachedAt)
  };
}

async function applyPendingChanges(chatId) {
  const pending = await readPendingChanges(chatId);
  if (!pending.changes || !pending.changes.length) {
    return {
      applied: false,
      message: "Nao ha alteracoes pendentes para aplicar."
    };
  }

  await applyChanges(pending.changes);
  await writePendingChanges(chatId, {
    changes: [],
    diffPreview: [],
    projectRoot: ROOT_DIR
  });

  return {
    applied: true,
    message: `${pending.changes.length} alteracao(oes) aplicada(s) com sucesso.`
  };
}

async function getPendingChanges(chatId) {
  const pending = await readPendingChanges(chatId);
  return pending.diffPreview || [];
}

module.exports = {
  askAgent,
  applyPendingChanges,
  getPendingChanges
};
