/*
 * FEATURE: Search Projects
 * OWNER: Search Projects teammate
 *
 * BCE ENTITY: SearchCriteria
 *
 * Attributes copied from the approved BCE diagram.
 * Methods are intentionally left unimplemented.
 */

class SearchCriteria {
  constructor() {
    this.keyword = null;
    this.selectedStyles = [];
    this.propertyType = null;
    this.roomType = null;
    this.projectStatus = null;
    this.sortOption = null;
  }

  addFilter() {
    // TODO: Feature owner implements.
    throw new Error('Not implemented');
  }

  removeFilter() {
    // TODO: Feature owner implements.
    throw new Error('Not implemented');
  }

  resetCriteria() {
    // TODO: Feature owner implements.
    throw new Error('Not implemented');
  }

  hasValidCriteria() {
    // TODO: Feature owner implements.
    throw new Error('Not implemented');
  }
}

module.exports = SearchCriteria;
