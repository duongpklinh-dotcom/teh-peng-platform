class Project {
  constructor({
    designerId,
    title,
    description,
    categoryId,
    style,
    propertyType,
    roomType,
    projectStatus = 'ongoing',
    images = []
  }) {
    this.designerId = designerId;
    this.title = title;
    this.description = description;
    this.categoryId = categoryId;
    this.style = style;
    this.propertyType = propertyType;
    this.roomType = roomType;
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
  }
}

module.exports = Project;
