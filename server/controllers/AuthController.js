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

  if (
    user.accountStatus !== 'active' &&
    user.accountStatus !== 'suspended'
  ) {
    throw new Error('Account is not active');
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  // UA04: only reveal the suspension to someone who knows the password
  if (user.accountStatus === 'suspended') {
    throw new Error(
      passwordMatches
        ? 'Your account is suspended'
        : 'Invalid email or password'
    );
  }

  

    if (!passwordMatches) {
    await users.findOneAndUpdate(
        {
        _id: user._id,
        accountStatus: 'active'
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
                '$accountStatus'
                ]
            }
            }
        }
        ],
        { returnDocument: 'after' }
    );

    throw new Error('Invalid email or password');
    }



  await users.updateOne(
    { _id: user._id },
    { $set: { failedLoginAttempts: 0 } }
  );

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role
  };
}


}

module.exports = AuthController;
