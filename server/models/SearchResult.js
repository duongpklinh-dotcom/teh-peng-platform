/*
 * FEATURE: Search Projects
 * OWNER: Search Projects teammate
 *
 * BCE ENTITY: SearchResult
 *
 * Attributes:
 * - projectID
 * - relevanceScore
 * - similarityScore
 *
 * Method:
 * - calculateRelevance()
 *
 * NOTE:
 * SearchResult represents a search result,
 * not a separate MongoDB collection.
 *
 * projectID maps to the shared Project._id.
 */

class SearchResult {
  constructor() {
    this.projectID = null;
    this.relevanceScore = null;
    this.similarityScore = null;
  }

  calculateRelevance() {
    // TODO: Feature owner implements relevance scoring.
    throw new Error('Not implemented');
  }
}

module.exports = SearchResult;
