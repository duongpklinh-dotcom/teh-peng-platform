const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/User');

test('Creates a valid customer account', () => {
  const user = new User({
    name: 'Alice',
    email: 'alice@example.com',
    passwordHash: 'example-hash'
  });

  assert.doesNotThrow(() => user.validate());
  assert.equal(user.role, 'customer');
  assert.equal(user.accountStatus, 'active');
  assert.equal(user.failedLoginAttempts, 0);
});

test('Creates an interior designer account', () => {
  const user = new User({
    name: 'Linh',
    email: 'designer@example.com',
    passwordHash: 'example-hash',
    role: 'interior_designer'
  });

  assert.doesNotThrow(() => user.validate());
  assert.equal(user.role, 'interior_designer');
});

test('Rejects an invalid user role', () => {
  const user = new User({
    name: 'Alice',
    email: 'alice@example.com',
    passwordHash: 'example-hash',
    role: 'superadmin'
  });

  assert.throws(() => user.validate(), /Invalid user role/);
});

test('Rejects an account without a password hash', () => {
  const user = new User({
    name: 'Alice',
    email: 'alice@example.com',
    passwordHash: ''
  });

  assert.throws(() => user.validate(), /Password hash is required/);
});
