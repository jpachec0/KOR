const DEFAULT_IGNORE_DIRS = new Set([
  ".git",
  ".ai-agent",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  ".idea",
  ".vscode"
]);

const DEFAULT_IGNORE_FILES = new Set([
  ".DS_Store",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock"
]);

const MAX_RECENT_MESSAGES = 8;
const MAX_CONTEXT_CHARS = 200000;
const MAX_FILE_BYTES = 100000;
const MAX_RELEVANT_FILES = 50;
const MAX_HISTORY_SUMMARY_ITEMS = 12;
const MAX_INDEX_FILES_IN_PROMPT = 100;

module.exports = {
  DEFAULT_IGNORE_DIRS,
  DEFAULT_IGNORE_FILES,
  MAX_RECENT_MESSAGES,
  MAX_CONTEXT_CHARS,
  MAX_FILE_BYTES,
  MAX_RELEVANT_FILES,
  MAX_HISTORY_SUMMARY_ITEMS,
  MAX_INDEX_FILES_IN_PROMPT
};

