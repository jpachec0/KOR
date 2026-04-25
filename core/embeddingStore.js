class EmbeddingStore {
  constructor() {
    this.enabled = false;
  }

  async upsertDocuments() {
    return null;
  }

  async search() {
    return [];
  }
}

module.exports = {
  EmbeddingStore
};
