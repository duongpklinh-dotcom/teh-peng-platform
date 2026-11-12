// Control: CategoryController (Platform Management)
// US-PM01 Create IDP category.  Listing is included because the page must
// show the created category; update/suspend/delete are left for US-PM03/04.

const { ObjectId } = require('mongodb');
const Category = require('../models/Category');

class CategoryController {
  constructor(db) {
    this.categories = db.collection('categories');
  }

  // createCategory(name, description, managerId) -> saved category summary
  async createCategory(categoryData, managerId) {
    if (!ObjectId.isValid(managerId)) {
      throw this.#error('Invalid platform manager ID', 400);
    }

    const category = new Category({
      name: categoryData?.name,
      description: categoryData?.description ?? '',
      status: 'active',
      createdBy: new ObjectId(managerId)
    });

    try {
      category.validate();
    } catch (validationError) {
      throw this.#error(validationError.message, 400);
    }

    // Business rule: category names must be unique (case-insensitive).
    if (await this.categories.findOne({ nameKey: category.nameKey })) {
      throw this.#error('A category with this name already exists', 409);
    }

    try {
      const result = await this.categories.insertOne(category);

      return {
        id: result.insertedId.toString(),
        name: category.name,
        description: category.description,
        status: category.status,
        createdAt: category.createdAt,
        message: 'Category created successfully'
      };
    } catch (dbError) {
      // Two managers submitting the same name at once: the unique index wins.
      if (dbError?.code === 11000) {
        throw this.#error('A category with this name already exists', 409);
      }
      throw dbError;
    }
  }

  // getCategories() -> all categories, newest first
  async getCategories() {
    const categories = await this.categories
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return categories.map(category => ({
      id: category._id.toString(),
      name: category.name,
      description: category.description,
      status: category.status,
      createdAt: category.createdAt
    }));
  }

  #error(message, status) {
    const error = new Error(message);
    error.status = status;
    return error;
  }
}

module.exports = CategoryController;
