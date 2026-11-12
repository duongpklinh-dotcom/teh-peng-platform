const { ObjectId } = require('mongodb');
const Project = require('../models/Project');

class AddProjectController {
  constructor(db) {
    this.projects = db.collection('projects');
    this.categories = db.collection('categories');
  }

  async addProject(projectData, designerId) {
    if (!ObjectId.isValid(designerId)) {
      throw new Error('Invalid designer ID');
    }

    const categoryId = projectData.categoryId;
    let categoryName = projectData.category || '';

    if (categoryId) {
      if (
        typeof categoryId !== 'string' ||
        !ObjectId.isValid(categoryId)
      ) {
        throw new Error('Invalid category ID');
      }

      const category = await this.categories.findOne({
        _id: new ObjectId(categoryId)
      });

      if (!category) {
        throw new Error('Selected category does not exist');
      }

      categoryName = category.name;
    }

    const project = new Project({
      ...projectData,
      category: categoryName,
      categoryId: categoryId
        ? new ObjectId(categoryId)
        : null,
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