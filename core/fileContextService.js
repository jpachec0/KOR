const fs = require("fs-extra");
const { MAX_CONTEXT_CHARS, MAX_FILE_BYTES, ROOT_DIR } = require("./constants");
const { resolveWithinRoot } = require("./pathUtils");

async function loadFilesForPrompt(relativePaths) {
  const files = [];
  let totalChars = 0;

  for (const relativePath of relativePaths) {
    const fullPath = resolveWithinRoot(relativePath);
    if (!(await fs.pathExists(fullPath))) {
      continue;
    }

    const stats = await fs.stat(fullPath);
    if (!stats.isFile() || stats.size > MAX_FILE_BYTES) {
      continue;
    }

    const content = await fs.readFile(fullPath, "utf8");
    totalChars += content.length;

    if (totalChars > MAX_CONTEXT_CHARS) {
      break;
    }

    files.push({
      path: relativePath,
      absolutePath: fullPath,
      size: stats.size,
      content
    });
  }

  return {
    rootDir: ROOT_DIR,
    files
  };
}

module.exports = {
  loadFilesForPrompt
};
