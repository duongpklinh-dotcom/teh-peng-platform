/*
 * FEATURE: UA01 Create user account
 * BCE CONTROL CLASS: CreateUserAccountController
 * BCE BOUNDARY: CreateAccountPage
 * BCE ENTITY: User (shared model, reused from server/models/User.js)
 *
 * Follows the same style as AuthController: constructor(db), throws Errors.
 * Thrown errors carry a .status so the route can return 400 / 409.
 */

const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Roles used by the platform. Keep in sync with server/models/User.js.
const ALLOWED_ROLES = [
  'customer',
  'interior_designer',
  'platform_management',
  'user_admin'
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 12; // same rule as AuthController.register

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

class CreateUserAccountController {
  constructor(db, { bcryptRounds = 12 } = {}) {
    this.users = db.collection('users');
    this.bcryptRounds = bcryptRounds;
  }

  // Returns a list of problems; empty list means the input is valid
  validate({ name, email, tempPassword, role }) {
    const errors = [];

    if (typeof name !== 'string' || !name.trim()) {
      errors.push('Name is required');
    }

    if (typeof email !== 'string' || !email.trim()) {
      errors.push('Email is required');
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      errors.push('Invalid email address');
    }

    if (typeof tempPassword !== 'string' || !tempPassword) {
      errors.push('Temporary password is required');
    } else if (tempPassword.length < MIN_PASSWORD_LENGTH) {
      errors.push(
        `Temporary password must be at least ${MIN_PASSWORD_LENGTH} characters`
      );
    }

    if (typeof role !== 'string' || !role) {
      errors.push('Profile is required');
    } else if (!ALLOWED_ROLES.includes(role)) {
      errors.push('Selected profile does not exist');
    }

    return errors;
  }

  async createAccount({ name, email, tempPassword, role }) {
    const errors = this.validate({ name, email, tempPassword, role });

    if (errors.length > 0) {
      throw httpError(400, errors[0]);
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await this.users.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      throw httpError(409, 'Email already registered');
    }

    const passwordHash = await bcrypt.hash(
      tempPassword,
      this.bcryptRounds
    );

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role
    });

    try {
      user.validate();
    } catch (error) {
      throw httpError(400, error.message);
    }

    // AC4: new accounts are saved as active (same value the login checks)
    user.accountStatus = 'active';

    if (user.failedLoginAttempts === undefined) {
      user.failedLoginAttempts = 0;
    }

    let result;

    try {
      result = await this.users.insertOne(user);
    } catch (error) {
      // Two admins created the same email at once: unique index on email
      if (error && error.code === 11000) {
        throw httpError(409, 'Email already registered');
      }
      throw error;
    }

    // Never return the password hash
    return {
      id: result.insertedId.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus
    };
  }
}

module.exports = CreateUserAccountController;
module.exports.ALLOWED_ROLES = ALLOWED_ROLES;
