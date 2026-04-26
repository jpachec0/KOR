const fs = require("fs-extra");
const path = require("path");
const { createTwoFilesPatch } = require("diff");
const { resolveWithinRoot } = require("./pathUtils");
const { createRuntimeContext } = require("./runtimeContext");

async function buildDiff(change, runtime = createRuntimeContext()) {
  if (change.action === "executeCommand") {
    return `Executar comando de terminal:\n\n> ${change.content}\n`;
  }

  const absolutePath = resolveWithinRoot(change.path, runtime);
  const exists = await fs.pathExists(absolutePath);
  const oldContent = exists ? await fs.readFile(absolutePath, "utf8") : "";
  const newContent = change.action === "delete" ? "" : change.content;
  const oldLabel = exists ? change.path : `/dev/null`;
  const newLabel = change.action === "delete" ? `/dev/null` : change.path;

  return createTwoFilesPatch(oldLabel, newLabel, oldContent, newContent, "", "");
}

async function buildDiffPreview(changes, runtime = createRuntimeContext()) {
  const previews = [];
  for (const change of changes) {
    previews.push({
      path: change.path,
      action: change.action,
      reason: change.reason,
      diff: await buildDiff(change, runtime)
    });
  }
  return previews;
}

async function applyChanges(changes, runtime = createRuntimeContext()) {
  for (const change of changes) {
    const absolutePath = resolveWithinRoot(change.path, runtime);

    if (change.action === "delete") {
      if (await fs.pathExists(absolutePath)) {
        await fs.remove(absolutePath);
      }
      continue;
    }

    await fs.ensureDir(path.dirname(absolutePath));
    await fs.writeFile(absolutePath, change.content, "utf8");
  }
}

module.exports = {
  buildDiffPreview,
  applyChanges
};
