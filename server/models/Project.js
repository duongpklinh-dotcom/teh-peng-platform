class Project {
  
constructor({
  designerId,
  title,
  description,
  categoryId,
  style,
  propertyType,
  roomType,
  numRooms = null,
  areaSqm = null,
  estimatedBudget = null,
  projectStatus = 'ongoing',
  images = []
})
 {
    this.designerId = designerId;
    this.title = title;
    this.description = description;
    this.categoryId = categoryId;
    this.style = style;
    this.propertyType = propertyType;
    this.roomType = roomType;
    this.numRooms = numRooms;
    this.areaSqm = areaSqm;
    this.estimatedBudget = estimatedBudget;
    this.projectStatus = projectStatus;
    this.isPublished = false;
    this.images = images;
    this.featured = false;
    this.viewCount = 0;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  validate() {
    if (!this.designerId || !this.title?.trim()) {
      throw new Error('Designer and project title are required');
    }

    if (this.numRooms !== null &&
        (!Number.isInteger(this.numRooms) || this.numRooms <= 0)) {
      throw new Error('Number of rooms must be a positive integer');
    }

    if (this.areaSqm !== null &&
        (typeof this.areaSqm !== 'number' ||
        !Number.isFinite(this.areaSqm) ||
        this.areaSqm <= 0)) {
      throw new Error('Area must be a positive number');
    }

    if (this.estimatedBudget !== null &&
        (typeof this.estimatedBudget !== 'number' ||
        !Number.isFinite(this.estimatedBudget) ||
        this.estimatedBudget < 0)) {
      throw new Error('Estimated budget must be a non-negative number');
    }

  }
}

module.exports = Project;
