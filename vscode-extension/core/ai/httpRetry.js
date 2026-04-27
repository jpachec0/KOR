const logger = require("../logger");

const RETRYABLE_NETWORK_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EPIPE",
  "EHOSTUNREACH"
]);

const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 502, 503, 504]);

function isRetryableError(error) {
  if (error.code && RETRYABLE_NETWORK_CODES.has(error.code)) {
    return true;
  }

  const status = error.response?.status;
  if (status && RETRYABLE_HTTP_STATUSES.has(status)) {
    return true;
  }

  return false;
}

function getRetryDelay(attempt, baseDelayMs = 1000) {
  // Exponential backoff: 1s, 2s, 4s
  return baseDelayMs * Math.pow(2, attempt - 1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps an async function with retry logic and exponential backoff.
 * Retries on network errors (ECONNREFUSED, ECONNRESET, etc.) and HTTP 429/5xx.
 *
 * @param {Function} fn - Async function to execute
 * @param {Object} options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.baseDelayMs - Base delay in ms (default: 1000)
 * @param {string} options.label - Label for log messages (default: "HTTP request")
 * @returns {Promise<*>} Result of fn()
 */
async function withRetry(fn, options = {}) {
  const { maxRetries = 3, baseDelayMs = 1000, label = "HTTP request" } = options;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt > maxRetries || !isRetryableError(error)) {
        throw error;
      }

      const delay = getRetryDelay(attempt, baseDelayMs);
      const errorDetail = error.code || `HTTP ${error.response?.status}` || error.message;
      logger.info(
        `[Retry] ${label} falhou (${errorDetail}). Tentativa ${attempt}/${maxRetries}. Aguardando ${delay}ms...`
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

module.exports = {
  withRetry,
  isRetryableError
};
