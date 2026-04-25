const MAX_EVENTS = 100;

function createMonitorStore() {
  const events = [];
  const clients = new Set();

  function pushEvent(event) {
    events.unshift(event);
    if (events.length > MAX_EVENTS) {
      events.length = MAX_EVENTS;
    }

    const payload = `data: ${JSON.stringify({ type: "event", event })}\n\n`;
    for (const client of clients) {
      client.write(payload);
    }
  }

  function addClient(response) {
    clients.add(response);
    response.write(`data: ${JSON.stringify({ type: "bootstrap", events })}\n\n`);
  }

  function removeClient(response) {
    clients.delete(response);
  }

  return {
    pushEvent,
    addClient,
    removeClient,
    getEvents() {
      return [...events];
    }
  };
}

module.exports = {
  createMonitorStore
};
