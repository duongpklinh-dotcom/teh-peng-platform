// UA04 AC3: a suspended user cannot log in and sees a message that the account is suspended.
// Separate file so your existing AuthController.test.js is left untouched.
const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const AuthController = require('../controllers/AuthController');
const { makeFakeDb } = require('./helpers/fakeDb');

const PASSWORD = 'CorrectHorse123!';

async function setup(accountStatus) {
  const db = makeFakeDb({
    users: [
      {
        name: 'Bob',
        email: 'bob@x.com',
        role: 'customer',
        accountStatus,
        failedLoginAttempts: 0,
        passwordHash: await bcrypt.hash(PASSWORD, 4)
      }
    ]
  });
  return { db, controller: new AuthController(db) };
}

test('UA04: an active user can still log in', async () => {
  const { controller } = await setup('active');
  const user = await controller.login({ email: 'bob@x.com', password: PASSWORD });
  assert.equal(user.email, 'bob@x.com');
});

test('UA04: a suspended user with the right password is told the account is suspended', async () => {
  const { controller } = await setup('suspended');
  await assert.rejects(
    controller.login({ email: 'bob@x.com', password: PASSWORD }),
    /Your account is suspended/
  );
});

test('UA04: a suspended account is not revealed to someone with the wrong password', async () => {
  const { controller } = await setup('suspended');
  await assert.rejects(
    controller.login({ email: 'bob@x.com', password: 'wrong-password-123' }),
    /Invalid email or password/
  );
});

test('UA04: a locked account still shows the existing "not active" message', async () => {
  const { controller } = await setup('locked');
  await assert.rejects(
    controller.login({ email: 'bob@x.com', password: PASSWORD }),
    /Account is not active/
  );
});
