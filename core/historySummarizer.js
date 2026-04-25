const { MAX_HISTORY_SUMMARY_ITEMS } = require("./constants");

function clip(text, max = 220) {
  if (!text) {
    return "";
  }

  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) {
    return normalized;
  }

  return `${normalized.slice(0, max - 3)}...`;
}

function summarizeHistory(history) {
  if (!history.length) {
    return "";
  }

  const olderMessages = history.slice(0, Math.max(0, history.length - 8));
  const items = [];

  for (const message of olderMessages) {
    if (!message.content) {
      continue;
    }

    const prefix = message.role === "user" ? "Usuario" : "Agente";
    items.push(`- ${prefix}: ${clip(message.content)}`);
    if (items.length >= MAX_HISTORY_SUMMARY_ITEMS) {
      break;
    }
  }

  return items.join("\n");
}

module.exports = {
  summarizeHistory
};
