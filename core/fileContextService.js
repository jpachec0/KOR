const fs = require("fs-extra");
const { MAX_CONTEXT_CHARS, MAX_FILE_BYTES } = require("./constants");
const { resolveWithinRoot } = require("./pathUtils");
const { createRuntimeContext } = require("./runtimeContext");

async function loadFilesForPrompt(relativePaths, runtime = createRuntimeContext()) {
  const files = [];
  let totalChars = 0;

  for (const relativePath of relativePaths) {
    const fullPath = resolveWithinRoot(relativePath, runtime);
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
    rootDir: runtime.rootDir,
    files
  };
}

module.exports = {
  loadFilesForPrompt
};
