const bcrypt = require('bcryptjs');
const User = require('../models/User');

class AuthController {
  constructor(db) {
    this.db = db;
  }

  getRegistrationRole() {
    return 'customer';
  }
    async recordLoginEvent({ userId = null, email, outcome, reason = null, req }) {
    await this.db.collection('loginHistory').insertOne({
      userId: userId ? userId.toString() : null,
      email: typeof email === 'string' ? email.trim().toLowerCase() : '',
      outcome,
      reason,
      ipAddress: req?.ip || null,
      userAgent: req?.get?.('user-agent') || null,
      createdAt: new Date()
    });
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


async login({ email, password }, req) {
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

  // Record attempts using an email that does not exist.
  if (!user) {
    await this.recordLoginEvent({
      userId: null,
      email: normalizedEmail,
      outcome: 'failed',
      reason: 'Invalid email or password',
      req
    });

    throw new Error('Invalid email or password');
  }

  // Record attempts against locked or inactive accounts.
  if (user.accountStatus && user.accountStatus !== 'active') {
    await this.recordLoginEvent({
      userId: user._id,
      email: normalizedEmail,
      outcome: 'blocked',
      reason: 'Account is not active',
      req
    });

    throw new Error('Account is not active');
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  // Handle an incorrect password.
  if (!passwordMatches) {
    await users.updateOne(
      {
        _id: user._id,
        $or: [
          { accountStatus: 'active' },
          { accountStatus: { $exists: false } },
          { accountStatus: null }
        ]
      },
      [
        {
          $set: {
            failedLoginAttempts: {
              $add: [
                { $ifNull: ['$failedLoginAttempts', 0] },
                1
              ]
            }
          }
        },
        {
          $set: {
            accountStatus: {
              $cond: [
                { $gte: ['$failedLoginAttempts', 5] },
                'locked',
                { $ifNull: ['$accountStatus', 'active'] }
              ]
            }
          }
        }
      ]
    );

    // Retrieve the latest status after updating the counter.
    const updatedUser = await users.findOne({
      _id: user._id
    });

    const isLocked = updatedUser?.accountStatus === 'locked';

    // Record the incorrect-password attempt.
    await this.recordLoginEvent({
      userId: user._id,
      email: normalizedEmail,
      outcome: isLocked ? 'blocked' : 'failed',
      reason: isLocked
        ? 'Account locked after 5 failed login attempts'
        : 'Incorrect password',
      req
    });

    throw new Error(
      isLocked
        ? 'Account is locked'
        : 'Invalid email or password'
    );
  }

  // Reset failed attempts after a successful login.
  await users.updateOne(
    { _id: user._id },
    {
      $set: {
        accountStatus: 'active',
        failedLoginAttempts: 0
      }
    }
  );

  // Record successful login.
  await this.recordLoginEvent({
    userId: user._id,
    email: normalizedEmail,
    outcome: 'success',
    reason: null,
    req
  });

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role
  };
}


}

module.exports = AuthController;
