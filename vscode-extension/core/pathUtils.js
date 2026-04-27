const path = require("path");
const { createRuntimeContext } = require("./runtimeContext");

function toRelative(projectPath, runtime = createRuntimeContext()) {
  return path.relative(runtime.rootDir, projectPath).replace(/\\/g, "/");
}

function resolveWithinRoot(targetPath, runtime = createRuntimeContext()) {
  const resolved = path.resolve(runtime.rootDir, targetPath);
  const relative = path.relative(runtime.rootDir, resolved);

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
