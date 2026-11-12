/*
 * FEATURE: US03 Update user account
 * BCE CONTROL CLASS: UpdateUserAccountController
 * BCE BOUNDARY: AccountListPage (edit form)
 * BCE ENTITY: User (shared model, name and email fields only)
 *
 * Only name and email can be changed here. Role/profile and status are
 * handled by other features. Thrown errors carry a .status for the route.
 */

const { ObjectId } = require('mongodb');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 254;

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

class UpdateUserAccountController {
  constructor(db) {
    this.users = db.collection('users');
  }

  // Returns a list of problems; empty list means the input is valid (AC3)
  validate({ name, email }) {
    const errors = [];

    if (typeof name !== 'string' || !name.trim()) {
      errors.push('Name is required');
    } else if (name.trim().length > NAME_MAX_LENGTH) {
      errors.push(`Name must be ${NAME_MAX_LENGTH} characters or fewer`);
    }

    if (typeof email !== 'string' || !email.trim()) {
      errors.push('Email is required');
    } else if (
      !EMAIL_PATTERN.test(email.trim()) ||
      email.trim().length > EMAIL_MAX_LENGTH
    ) {
      errors.push('Invalid email address');
    }

    return errors;
  }

  async updateAccount(adminId, userId, { name, email } = {}) {
    if (!ObjectId.isValid(String(userId))) {
      throw httpError(400, 'Invalid user ID');
    }

    const errors = this.validate({ name, email });

    if (errors.length > 0) {
      throw httpError(400, errors[0]);
    }

    const newName = name.trim();
    const newEmail = email.trim().toLowerCase();

    const user = await this.users.findOne({
      _id: new ObjectId(String(userId))
    });

    if (!user) {
      throw httpError(404, 'Account not found');
    }

    if (user.name === newName && user.email === newEmail) {
      throw httpError(400, 'No changes to save');
    }

    // AC3: the email must not belong to a different account
    const emailOwner = await this.users.findOne({
      email: newEmail,
      _id: { $ne: user._id }
    });

    if (emailOwner) {
      throw httpError(409, 'Email is already used by another account');
    }

    try {
      // AC4: only name and email change; every other field is kept
      await this.users.updateOne(
        { _id: user._id },
        {
          $set: {
            name: newName,
            email: newEmail,
            updatedAt: new Date(),
            updatedBy: String(adminId)
          }
        }
      );
    } catch (error) {
      // Two admins used the same email at once: unique index on email
      if (error && error.code === 11000) {
        throw httpError(409, 'Email is already used by another account');
      }
      throw error;
    }

    // Never return the password hash
    return {
      id: user._id.toString(),
      name: newName,
      email: newEmail,
      role: user.role,
      accountStatus: user.accountStatus || 'active'
    };
  }
}

module.exports = UpdateUserAccountController;
