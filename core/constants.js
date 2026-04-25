const path = require("path");

const ROOT_DIR = process.cwd();
const RUNTIME_DIR = path.join(ROOT_DIR, ".ai-agent");
const CHATS_DIR = path.join(RUNTIME_DIR, "chats");
const MEMORY_DIR = path.join(RUNTIME_DIR, "memory");
const INDEX_DIR = path.join(RUNTIME_DIR, "index");
const SESSION_FILE = path.join(RUNTIME_DIR, "session.json");
const CACHE_FILE = path.join(MEMORY_DIR, "response-cache.json");
const INDEX_FILE = path.join(INDEX_DIR, "project-index.json");
const AI_CONFIG_FILE = path.join(ROOT_DIR, "config", "ai.json");

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
  ROOT_DIR,
  RUNTIME_DIR,
  CHATS_DIR,
  MEMORY_DIR,
  INDEX_DIR,
  SESSION_FILE,
  CACHE_FILE,
  INDEX_FILE,
  AI_CONFIG_FILE,
  DEFAULT_IGNORE_DIRS,
  DEFAULT_IGNORE_FILES,
  MAX_RECENT_MESSAGES,
  MAX_CONTEXT_CHARS,
  MAX_FILE_BYTES,
  MAX_RELEVANT_FILES,
  MAX_HISTORY_SUMMARY_ITEMS
};
