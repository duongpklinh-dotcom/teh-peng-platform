const bcrypt = require('bcryptjs');
const User = require('../models/User');

class AuthController {
  constructor(db) {
    this.db = db;
  }

  getRegistrationRole() {
    return 'customer';
  }

  async register({ name, email, password }) {
    if (typeof password !== 'string' || password.length < 12) {
      throw new Error('Password must be at least 12 characters');
    }

    const normalizedEmail =
      typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error('Invalid email address');
    }

    const users = this.db.collection('users');

    const existingUser = await users.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = new User({
      name,
      email: normalizedEmail,
      passwordHash,
      role: this.getRegistrationRole()
    });

    user.validate();

    const result = await users.insertOne(user);

    return {
      id: result.insertedId.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    };
  }

async login({ email, password }) {
  if (
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    throw new Error('Invalid email or password');
  }

  const normalizedEmail = email.trim().toLowerCase();

  const users = this.db.collection('users');

  const user = await users.findOne({
    email: normalizedEmail
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (user.accountStatus !== 'active') {
    throw new Error('Account is not active');
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new Error('Invalid email or password');
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role
  };
}

}

module.exports = AuthController;
