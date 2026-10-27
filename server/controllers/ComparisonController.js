
/*
 * FEATURE: Compare Interior Design Projects
 * OWNER: Comparison feature teammate
 *
 * Shared entities:
 * - users
 * - projects
 * - designerReviews (proposed; confirm schema)
 *
 * Reference:
 * - docs/shared-data-and-api.md
 * - Approved BCE and sequence diagrams
 */

class ComparisonController {
  constructor(db) {
    this.projects = db.collection('projects');
    this.users = db.collection('users');
  }

  async addProject(customerId, projectId) {
    // TODO: Select project for comparison.
    throw new Error('Not implemented');
  }

  async removeProject(customerId, projectId) {
    // TODO: Remove selected project.
    throw new Error('Not implemented');
  }

  async checkComparisonLimit(customerId) {
    // TODO: Maximum 3 projects.
    throw new Error('Not implemented');
  }

  async getSelectedProjects(customerId) {
    // TODO: Retrieve selected projects.
    throw new Error('Not implemented');
  }

  async retrieveProjectDetails(projectId) {
    // TODO: Retrieve fields from shared Project model.
    throw new Error('Not implemented');
  }

  async getDesignerReviews(designerId) {
    // TODO: Retrieve actual designer reviews.
    throw new Error('Not implemented');
  }
}

module.exports = ComparisonController;
