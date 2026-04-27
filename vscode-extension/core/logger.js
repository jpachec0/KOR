function timestamp() {
  return new Date().toISOString();
}

function log(level, message) {
  console.log(`[${timestamp()}] [${level}] ${message}`);
}

module.exports = {
  info(message) {
    log("INFO", message);
  },
  warn(message) {
    log("WARN", message);
  },
  error(message) {
    log("ERROR", message);
  }
};
