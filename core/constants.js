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
const MAX_CONTEXT_CHARS = 16000;
const MAX_FILE_BYTES = 20000;
const MAX_RELEVANT_FILES = 6;
const MAX_HISTORY_SUMMARY_ITEMS = 12;

module.exports = {
  DEFAULT_IGNORE_DIRS,
  DEFAULT_IGNORE_FILES,
  MAX_RECENT_MESSAGES,
  MAX_CONTEXT_CHARS,
  MAX_FILE_BYTES,
  MAX_RELEVANT_FILES,
  MAX_HISTORY_SUMMARY_ITEMS
};
