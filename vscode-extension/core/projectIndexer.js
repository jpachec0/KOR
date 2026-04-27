const fs = require("fs-extra");
const path = require("path");
const {
  DEFAULT_IGNORE_DIRS,
  DEFAULT_IGNORE_FILES
} = require("./constants");
const { createRuntimeContext } = require("./runtimeContext");
const { isTextExtension, toRelative } = require("./pathUtils");

function extractImports(content) {
  const imports = new Set();
  const patterns = [
    /import\s+.*?from\s+["']([^"']+)["']/g,
    /require\(\s*["']([^"']+)["']\s*\)/g,
    /from\s+["']([^"']+)["']/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content))) {
      imports.add(match[1]);
    }
  }

  return [...imports].slice(0, 20);
}

async function buildFileEntry(filePath, stats, runtime = createRuntimeContext()) {
  const relativePath = toRelative(filePath, runtime);
  const entry = {
    path: relativePath,
    name: path.basename(filePath),
    extension: path.extname(filePath),
    size: stats.size,
    modifiedAt: stats.mtime.toISOString(),
    imports: []
  };

  if (!isTextExtension(filePath) || stats.size > 60000) {
    return entry;
  }

  try {
    const content = await fs.readFile(filePath, "utf8");
    entry.imports = extractImports(content);
  } catch (error) {
    entry.imports = [];
  }

  return entry;
}

async function walkDirectory(currentDir, entries, runtime = createRuntimeContext()) {
  const items = await fs.readdir(currentDir);

  for (const item of items) {
    if (DEFAULT_IGNORE_DIRS.has(item) || DEFAULT_IGNORE_FILES.has(item)) {
      continue;
    }

    const fullPath = path.join(currentDir, item);
    const stats = await fs.stat(fullPath);

    if (stats.isDirectory()) {
      await walkDirectory(fullPath, entries, runtime);
      continue;
    }

    entries.push(await buildFileEntry(fullPath, stats, runtime));
  }
}

async function buildProjectIndex(runtime = createRuntimeContext()) {
  const entries = [];
  await walkDirectory(runtime.rootDir, entries, runtime);

  const index = {
    rootDir: runtime.rootDir,
    generatedAt: new Date().toISOString(),
    fileCount: entries.length,
    entries
  };

  await fs.writeJson(runtime.indexFile, index, { spaces: 2 });
  return index;
}

async function loadProjectIndex(runtime = createRuntimeContext()) {
  if (!(await fs.pathExists(runtime.indexFile))) {
    return buildProjectIndex(runtime);
  }

  return fs.readJson(runtime.indexFile);
}

module.exports = {
  buildProjectIndex,
  loadProjectIndex
};
