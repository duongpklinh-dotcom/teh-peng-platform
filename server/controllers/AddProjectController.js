const { ObjectId } = require('mongodb');
const Project = require('../models/Project');

class AddProjectController {
  constructor(db) {
    this.projects = db.collection('projects');
  }

  async addProject(projectData, designerId) {
    if (!ObjectId.isValid(designerId)) {
      throw new Error('Invalid designer ID');
    }

    const project = new Project({
      ...projectData,
      designerId: new ObjectId(designerId)
    });

    project.validate();

    const result = await this.projects.insertOne(project);

    return {
      id: result.insertedId.toString(),
      message: 'Project created successfully'
    };
  }
}

module.exports = AddProjectController;
