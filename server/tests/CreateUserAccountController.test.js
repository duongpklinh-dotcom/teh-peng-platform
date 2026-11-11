// UA01 Create user account. Commit these BEFORE the controller exists (red), then add it (green).
const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const CreateUserAccountController = require('../controllers/CreateUserAccountController');
const { makeFakeDb } = require('./helpers/fakeDb');

const valid = {
  name: 'Alice Tan',
  email: 'alice@example.com',
  tempPassword: 'TempPassw0rd!!',
  role: 'customer'
};

function setup(seedUsers = []) {
  const db = makeFakeDb({ users: seedUsers });
  // low bcrypt cost keeps the tests fast; the app uses 12
  const controller = new CreateUserAccountController(db, { bcryptRounds: 4 });
  return { db, controller };
}

async function rejects(promise, status, pattern) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.status, status);
    if (pattern) assert.match(error.message, pattern);
    return true;
  });
}

test('UA01: creates the account with status active', async () => {
  const { db, controller } = setup();
  const result = await controller.createAccount(valid);

  assert.equal(db.data.users.length, 1);
  assert.equal(db.data.users[0].accountStatus, 'active');
  assert.equal(db.data.users[0].role, 'customer');
  assert.equal(result.accountStatus, 'active');
});

test('UA01: stores a bcrypt hash, never the plain password', async () => {
  const { db, controller } = setup();
  await controller.createAccount(valid);

  const stored = db.data.users[0];
  assert.notEqual(stored.passwordHash, valid.tempPassword);
  assert.equal(await bcrypt.compare(valid.tempPassword, stored.passwordHash), true);
});

test('UA01: the returned object never contains the password hash', async () => {
  const { controller } = setup();
  const result = await controller.createAccount(valid);

  assert.equal(result.passwordHash, undefined);
  assert.equal(result.password, undefined);
  assert.ok(result.id);
});

test('UA01: email is trimmed and stored in lower case', async () => {
  const { db, controller } = setup();
  await controller.createAccount({ ...valid, email: '  ALICE@Example.COM ' });

  assert.equal(db.data.users[0].email, 'alice@example.com');
});

for (const field of ['name', 'email', 'tempPassword', 'role']) {
  test(`UA01: rejects an empty ${field}`, async () => {
    const { db, controller } = setup();

    await rejects(controller.createAccount({ ...valid, [field]: '' }), 400);
    assert.equal(db.data.users.length, 0);
  });
}

test('UA01: rejects an invalid email format', async () => {
  const { db, controller } = setup();

  await rejects(
    controller.createAccount({ ...valid, email: 'not-an-email' }),
    400,
    /email/i
  );
  assert.equal(db.data.users.length, 0);
});

test('UA01: rejects a temporary password shorter than 12 characters', async () => {
  const { db, controller } = setup();

  await rejects(
    controller.createAccount({ ...valid, tempPassword: 'short' }),
    400,
    /12 characters/
  );
  assert.equal(db.data.users.length, 0);
});

test('UA01: rejects a profile (role) that does not exist', async () => {
  const { db, controller } = setup();

  await rejects(controller.createAccount({ ...valid, role: 'wizard' }), 400);
  assert.equal(db.data.users.length, 0);
});

test('UA01: rejects a duplicate email with a clear message', async () => {
  const { db, controller } = setup([
    { name: 'Existing', email: 'alice@example.com', role: 'customer', accountStatus: 'active' }
  ]);

  await rejects(controller.createAccount(valid), 409, /already registered/i);
  assert.equal(db.data.users.length, 1);
});

test('UA01: duplicate check ignores letter case and spaces', async () => {
  const { controller } = setup([
    { name: 'Existing', email: 'alice@example.com', role: 'customer', accountStatus: 'active' }
  ]);

  await rejects(
    controller.createAccount({ ...valid, email: '  ALICE@example.com ' }),
    409
  );
});

test('UA01: a duplicate caught by the database index is also reported as 409', async () => {
  const { db, controller } = setup();
  const realFindOne = db.collection('users').findOne;

  // simulate another admin inserting the same email between our check and our insert
  const original = db.collection;
  db.collection = (name) => {
    const c = original(name);
    if (name === 'users') {
      return {
        ...c,
        findOne: async () => null,
        insertOne: async () => {
          const error = new Error('E11000 duplicate key error');
          error.code = 11000;
          throw error;
        }
      };
    }
    return c;
  };
  void realFindOne;

  const racing = new CreateUserAccountController(db, { bcryptRounds: 4 });
  await rejects(racing.createAccount(valid), 409, /already registered/i);
});
