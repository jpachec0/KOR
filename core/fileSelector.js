const path = require("path");
const { MAX_RELEVANT_FILES } = require("./constants");

function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_./-]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function scoreEntry(entry, tokens, trackedFiles) {
  let score = 0;
  const haystack = `${entry.path} ${entry.name} ${entry.imports.join(" ")}`.toLowerCase();

  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += entry.name.toLowerCase().includes(token) ? 6 : 3;
    }

    const basename = path.basename(entry.path, path.extname(entry.path)).toLowerCase();
    if (basename === token) {
      score += 10;
    }
  }

  if (trackedFiles.includes(entry.path)) {
    score += 4;
  }

  if (entry.path.startsWith("core/") || entry.path.startsWith("cli/")) {
    score += 1;
  }

  return score;
}

function selectRelevantFiles(question, index, trackedFiles = []) {
  const tokens = tokenize(question);
  const ranked = index.entries
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, tokens, trackedFiles)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RELEVANT_FILES)
    .map((item) => item.entry.path);

  if (!ranked.length) {
    return index.entries.slice(0, Math.min(MAX_RELEVANT_FILES, index.entries.length)).map((entry) => entry.path);
  }

  return ranked;
}

module.exports = {
  selectRelevantFiles
};
