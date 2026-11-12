// Entity: IDPCategory (Platform Management - US-PM01 Create IDP category)
// Stored in the shared MongoDB `categories` collection.
// Fields follow docs/shared-data-and-api.md: name, description, status.

const CATEGORY_STATUSES = ['active', 'suspended'];
const NAME_MAX_LENGTH = 50;
const DESCRIPTION_MAX_LENGTH = 300;

class Category {
  constructor({ name, description = '', status = 'active', createdBy = null }) {
    this.name = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : name;
    this.description = typeof description === 'string' ? description.trim() : description;
    this.status = status;
    this.createdBy = createdBy;
    // Lower-case copy of the name, used for case-insensitive duplicate checks.
    this.nameKey = typeof this.name === 'string' ? this.name.toLowerCase() : '';
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  validate() {
    if (typeof this.name !== 'string' || !this.name) {
      throw new Error('Category name is required');
    }

    if (this.name.length > NAME_MAX_LENGTH) {
      throw new Error(`Category name must be ${NAME_MAX_LENGTH} characters or fewer`);
    }

    if (!/^[\p{L}\p{N}][\p{L}\p{N} &'\-]*$/u.test(this.name)) {
      throw new Error(
        'Category name may only contain letters, numbers, spaces, &, apostrophes and hyphens'
      );
    }

    if (typeof this.description !== 'string') {
      throw new Error('Description must be text');
    }

    if (this.description.length > DESCRIPTION_MAX_LENGTH) {
      throw new Error(`Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer`);
    }

    if (!CATEGORY_STATUSES.includes(this.status)) {
      throw new Error('Invalid category status');
    }
  }
}

Category.STATUSES = CATEGORY_STATUSES;
module.exports = Category;
