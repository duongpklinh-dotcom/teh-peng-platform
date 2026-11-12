
const { ObjectId } = require('mongodb');
const Project = require('../models/Project');

class EditProjectController {
  constructor(db) {
  this.projects = db.collection('projects');
  this.categories = db.collection('categories');
}

  // Retrieve a project belonging to the logged-in designer
  async getProjectDetails(projectId, designerId) {
    if (
      !ObjectId.isValid(projectId) ||
      !ObjectId.isValid(designerId)
    ) {
      throw new Error('Invalid project or designer ID');
    }

    const project = await this.projects.findOne({
      _id: new ObjectId(projectId),
      designerId: new ObjectId(designerId)
    });

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    return project;
  }

  // Update editable details without replacing the whole document
  async editProjectDetails(projectId, designerId, changes) {
    const existing = await this.getProjectDetails(
      projectId,
      designerId
    );

    if (!changes || typeof changes !== 'object' ||
        Array.isArray(changes)) {
      throw new Error('Invalid project details');
    }

    const editableFields = [
      'title',
      'description',
      'categoryId',
      'style',
      'propertyType',
      'roomType',
      'numRooms',
      'areaSqm',
      'estimatedBudget',
      'projectStatus',
      'isPublished',
      'images'
    ];

    const updates = {};

    for (const field of editableFields) {
      if (Object.hasOwn(changes, field)) {
        updates[field] = changes[field];
      }
    }

    // Validate and normalise text fields
    for (const field of [
      'title',
      'description',
      'style',
      'propertyType',
      'roomType'
    ]) {
      if (Object.hasOwn(updates, field)) {
        if (typeof updates[field] !== 'string') {
          throw new Error(`Invalid ${field}`);
        }

        updates[field] = updates[field].trim();
      }
    }

    // Convert optional numeric values
    for (const field of [
      'numRooms',
      'areaSqm',
      'estimatedBudget'
    ]) {
      if (Object.hasOwn(updates, field)) {
        const value = updates[field];

        if (value === '' || value === null) {
          updates[field] = null;
        } else if (
          typeof value !== 'string' &&
          typeof value !== 'number'
        ) {
          throw new Error(`Invalid ${field}`);
        } else if (
          typeof value === 'string' &&
          !value.trim()
        ) {
          updates[field] = null;
        } else {
          updates[field] = Number(value);
        }
      }
    }

    // Validate project status
    if (Object.hasOwn(updates, 'projectStatus')) {
      if (!['ongoing', 'completed'].includes(
        updates.projectStatus
      )) {
        throw new Error('Invalid project status');
      }
    }

    // Convert publication status from FormData strings
    if (Object.hasOwn(updates, 'isPublished')) {
      if (
        updates.isPublished !== true &&
        updates.isPublished !== false &&
        updates.isPublished !== 'true' &&
        updates.isPublished !== 'false'
      ) {
        throw new Error('Invalid publication status');
      }

      updates.isPublished =
        updates.isPublished === true ||
        updates.isPublished === 'true';
    }

    // Preserve the category reference in the correct type
    if (Object.hasOwn(updates, 'categoryId')) {
      const categoryId = updates.categoryId;

      if (categoryId === '' || categoryId === null) {
        updates.categoryId = null;
        updates.category = '';
      } else if (
        typeof categoryId !== 'string' ||
        !ObjectId.isValid(categoryId)
      ) {
        throw new Error('Invalid category ID');
      } else {
        const category = await this.categories.findOne({
          _id: new ObjectId(categoryId)
        });

        if (!category) {
          throw new Error('Selected category does not exist');
        }

        updates.categoryId = new ObjectId(categoryId);
        updates.category = category.name;
      }
}

    // Image paths are prepared by the upload route
    if (Object.hasOwn(updates, 'images')) {
      if (
        !Array.isArray(updates.images) ||
        updates.images.length > 5 ||
        updates.images.some(
          image =>
            typeof image !== 'string' ||
            !image.startsWith('/uploads/projects/')
        )
      ) {
        throw new Error('Invalid project images');
      }

      // Existing paths must already belong to this project.
      // Newly uploaded paths are supplied by the trusted route.
      const previousImages = (existing.images || [])
        .map(image =>
          typeof image === 'string' ? image : image?.url
        )
        .filter(Boolean);

      const newUploadPaths = changes.newUploadPaths || [];

      if (
        !Array.isArray(newUploadPaths) ||
        updates.images.some(
          image =>
            !previousImages.includes(image) &&
            !newUploadPaths.includes(image)
        )
      ) {
        throw new Error('Invalid image selection');
      }
    }

    // Reuse validation from our shared Project model
    const project = new Project({
      ...existing,
      ...updates
    });

    project.validate();

    // Detect whether any stored values have changed
    const changedFields = {};

    for (const [field, value] of Object.entries(updates)) {
      const oldValue = existing[field];

      const sameValue =
        field === 'categoryId'
          ? String(oldValue ?? '') === String(value ?? '')
          : field === 'images'
            ? JSON.stringify(oldValue || []) ===
              JSON.stringify(value)
            : oldValue === value;

      if (!sameValue) {
        changedFields[field] = value;
      }
    }

    if (Object.keys(changedFields).length === 0) {
      throw new Error('No changes detected');
    }

    changedFields.updatedAt = new Date();

    const result = await this.projects.updateOne(
      {
        _id: existing._id,
        designerId: existing.designerId
      },
      {
        $set: changedFields
      }
    );

    if (result.matchedCount === 0) {
      throw new Error('Project not found or access denied');
    }

    return this.getProjectDetails(projectId, designerId);
  }
}

module.exports = EditProjectController;
