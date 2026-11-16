const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const AuthController = require('../controllers/AuthController');

function createFakeDb(initialUser = null) {
  const state = {
    user: initialUser ? { ...initialUser } : null,
    loginHistory: []
  };

  const users = {
    findOne: async ({ email }) =>
      state.user && state.user.email === email ? { ...state.user } : null,

    insertOne: async (user) => {
      state.user = { ...user, _id: 'new-user-id' };
      return { insertedId: 'new-user-id' };
    },

    findOneAndUpdate: async (filter, pipeline) => {
      if (!state.user || state.user._id !== filter._id) return null;
      if (state.user.accountStatus && state.user.accountStatus !== 'active') return null;
      assert.equal(Array.isArray(pipeline), true);

      state.user.failedLoginAttempts = (state.user.failedLoginAttempts || 0) + 1;
      if (state.user.failedLoginAttempts >= 5) {
        state.user.accountStatus = 'locked';
      } else if (!state.user.accountStatus) {
        state.user.accountStatus = 'active';
      }
      return { ...state.user };
    },

    updateOne: async (filter, update) => {
      if (!state.user || state.user._id !== filter._id) {
        return { matchedCount: 0, modifiedCount: 0 };
      }
      if (state.user.accountStatus && state.user.accountStatus !== 'active') {
        return { matchedCount: 0, modifiedCount: 0 };
      }
      Object.assign(state.user, update.$set);
      return { matchedCount: 1, modifiedCount: 1 };
    }
  };

  const loginHistory = {
    insertOne: async (event) => {
      state.loginHistory.push({ ...event, _id: `event-${state.loginHistory.length + 1}` });
      return { insertedId: `event-${state.loginHistory.length}` };
    }
  };

  return {
    state,
    db: {
      collection(name) {
        if (name === 'users') return users;
        if (name === 'loginHistory') return loginHistory;
        throw new Error(`Unexpected collection: ${name}`);
      }
    }
  };
}

async function makeUser(overrides = {}) {
  return {
    _id: 'user123',
    name: 'Alice',
    email: 'alice@example.com',
    passwordHash: await bcrypt.hash('CorrectPassword123!', 4),
    role: 'customer',
    accountStatus: 'active',
    failedLoginAttempts: 0,
    ...overrides
  };
}

test('Public registration must create a customer account', () => {
  const controller = new AuthController(null);
  assert.equal(controller.getRegistrationRole({ role: 'user_admin' }), 'customer');
});

test('Registration securely creates a customer account', async () => {
  let savedUser;
  const fakeDb = {
    collection(name) {
      assert.equal(name, 'users');
      return {
        findOne: async () => null,
        insertOne: async (user) => {
          savedUser = user;
          return { insertedId: 'new-user-id' };
        }
      };
    }
  };

  const controller = new AuthController(fakeDb);
  const result = await controller.register({
    name: 'Alice',
    email: 'Alice@Example.com',
    password: 'SecurePassword123!',
    role: 'user_admin'
  });

  assert.equal(savedUser.role, 'customer');
  assert.equal(savedUser.email, 'alice@example.com');
  assert.notEqual(savedUser.passwordHash, 'SecurePassword123!');
  assert.equal(await bcrypt.compare('SecurePassword123!', savedUser.passwordHash), true);
  assert.equal(result.passwordHash, undefined);
});

test('Successful login records a success event and resets failed attempts', async () => {
  const user = await makeUser({ failedLoginAttempts: 2 });
  const { db, state } = createFakeDb(user);
  const controller = new AuthController(db);

  const result = await controller.login({
    email: ' ALICE@example.com ',
    password: 'CorrectPassword123!'
  }, { ip: '127.0.0.1', get: () => 'Test Browser' });

  assert.equal(result.id, 'user123');
  assert.equal(state.user.failedLoginAttempts, 0);
  assert.equal(state.loginHistory.length, 1);
  assert.equal(state.loginHistory[0].outcome, 'success');
  assert.equal(state.loginHistory[0].email, 'alice@example.com');
  assert.equal(state.loginHistory[0].ipAddress, '127.0.0.1');
});

test('Incorrect password records a failed event and increments the counter', async () => {
  const user = await makeUser();
  const { db, state } = createFakeDb(user);
  const controller = new AuthController(db);

  await assert.rejects(
    controller.login({ email: user.email, password: 'WrongPassword123!' }),
    /Invalid email or password/
  );

  assert.equal(state.user.failedLoginAttempts, 1);
  assert.equal(state.user.accountStatus, 'active');
  assert.equal(state.loginHistory.length, 1);
  assert.equal(state.loginHistory[0].outcome, 'failed');
  assert.equal(state.loginHistory[0].reason, 'Incorrect password');
});

test('Unknown email attempts are recorded without a user ID', async () => {
  const { db, state } = createFakeDb();
  const controller = new AuthController(db);

  await assert.rejects(
    controller.login({ email: 'missing@example.com', password: 'WrongPassword123!' }),
    /Invalid email or password/
  );

  assert.equal(state.loginHistory.length, 1);
  assert.equal(state.loginHistory[0].outcome, 'failed');
  assert.equal(state.loginHistory[0].userId, null);
  assert.equal(state.loginHistory[0].email, 'missing@example.com');
});

test('Fifth incorrect password locks the account and records a blocked event', async () => {
  const user = await makeUser({ failedLoginAttempts: 4 });
  const { db, state } = createFakeDb(user);
  const controller = new AuthController(db);

  await assert.rejects(
    controller.login({ email: user.email, password: 'WrongPassword123!' }),
    /Account is locked/
  );

  assert.equal(state.user.failedLoginAttempts, 5);
  assert.equal(state.user.accountStatus, 'locked');
  assert.equal(state.loginHistory.length, 1);
  assert.equal(state.loginHistory[0].outcome, 'blocked');
  assert.match(state.loginHistory[0].reason, /Fifth failed login attempt/);
});

test('A locked account cannot log in and the blocked attempt is recorded', async () => {
  const user = await makeUser({ accountStatus: 'locked', failedLoginAttempts: 5 });
  const { db, state } = createFakeDb(user);
  const controller = new AuthController(db);

  await assert.rejects(
    controller.login({ email: user.email, password: 'CorrectPassword123!' }),
    /Account is locked/
  );

  assert.equal(state.loginHistory.length, 1);
  assert.equal(state.loginHistory[0].outcome, 'blocked');
});

test('Legacy account without accountStatus can still log in', async () => {
  const user = await makeUser();
  delete user.accountStatus;
  const { db, state } = createFakeDb(user);
  const controller = new AuthController(db);

  const result = await controller.login({
    email: user.email,
    password: 'CorrectPassword123!'
  });

  assert.equal(result.id, 'user123');
  assert.equal(state.user.accountStatus, 'active');
  assert.equal(state.loginHistory[0].outcome, 'success');
});
