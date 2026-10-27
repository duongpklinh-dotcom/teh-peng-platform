const { ObjectId } = require('mongodb');

/*
 * FEATURE: US04 — Edit Project Details
 * OWNER: Interior Designer
 *
 * Shared entity:
 * - server/models/Project.js
 *
 * Database:
 * - projects
 *
 * IMPORTANT:
 * - Use the existing Project fields.
 * - Do not create another Project model.
 * - Only the project's owner can edit it.
 * - Do not overwrite createdAt or designerId.
 * - Validate changes before updating MongoDB.
 *
 * TODO: Implement according to approved
 * Edit Project Details BCE and sequence diagrams.
 */

class EditProjectController {
  constructor(db) {
    this.projects = db.collection('projects');
  }

  async getProjectDetails() {
    // TODO: Retrieve the designer's project for editing.
    throw new Error('Not implemented');
  }

  async editProjectDetails() {
    // TODO: Validate and update allowed project fields.
    throw new Error('Not implemented');
  }
}

module.exports = EditProjectController;
