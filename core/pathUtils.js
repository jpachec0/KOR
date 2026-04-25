const path = require("path");
const { ROOT_DIR } = require("./constants");

function toRelative(projectPath) {
  return path.relative(ROOT_DIR, projectPath).replace(/\\/g, "/");
}

function resolveWithinRoot(targetPath) {
  const resolved = path.resolve(ROOT_DIR, targetPath);
  const relative = path.relative(ROOT_DIR, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Caminho fora do projeto: ${targetPath}`);
  }

  return resolved;
}

function isTextExtension(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return [
    ".js",
    ".cjs",
    ".mjs",
    ".ts",
    ".tsx",
    ".jsx",
    ".json",
    ".md",
    ".txt",
    ".yml",
    ".yaml",
    ".html",
    ".css",
    ".scss",
    ".py",
    ".java",
    ".go",
    ".rs",
    ".php",
    ".rb",
    ".env",
    ".toml",
    ".sh"
  ].includes(extension);
}

module.exports = {
  toRelative,
  resolveWithinRoot,
  isTextExtension
};
