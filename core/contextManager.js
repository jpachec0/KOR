const { summarizeHistory } = require("./historySummarizer");

function buildContextSummary(history, existingSummary = "") {
  const summarized = summarizeHistory(history);
  return summarized || existingSummary || "";
}

module.exports = {
  buildContextSummary
};
