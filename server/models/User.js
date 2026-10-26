const VALID_ROLES = [
  'customer',
  'interior_designer',
  'platform_management',
  'user_admin'
];

class User {
  constructor({
    name,
    email,
    passwordHash,
    role = 'customer'
  }) {
    this.name = name;
    this.email = email;
    this.passwordHash = passwordHash;
    this.role = role;
    this.accountStatus = 'active';
    this.failedLoginAttempts = 0;
    this.companyId = null;
    this.createdAt = new Date();
  }

  validate() {
    if (typeof this.name !== 'string' || !this.name.trim()) {
      throw new Error('Name is required');
    }

    if (typeof this.email !== 'string' || !this.email.trim()) {
      throw new Error('Email is required');
    }

    if (typeof this.passwordHash !== 'string' || !this.passwordHash) {
      throw new Error('Password hash is required');
    }

    if (!VALID_ROLES.includes(this.role)) {
      throw new Error('Invalid user role');
    }
  }
}

module.exports = User;
