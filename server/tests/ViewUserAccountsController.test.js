// Account list used by the Manage Accounts page (UA04 "updated status shown in the account list").
const test = require('node:test');
const assert = require('node:assert/strict');
const ViewUserAccountsController = require('../controllers/ViewUserAccountsController');
const { makeFakeDb } = require('./helpers/fakeDb');

function setup(users) {
  const db = makeFakeDb({ users });
  return new ViewUserAccountsController(db);
}

const older = new Date('2026-11-01T00:00:00Z');
const newer = new Date('2026-11-05T00:00:00Z');

const seed = [
  { name: 'Old', email: 'old@x.com', role: 'customer', accountStatus: 'active', passwordHash: 'secret1', failedLoginAttempts: 2, createdAt: older },
  { name: 'New', email: 'new@x.com', role: 'interior_designer', accountStatus: 'suspended', passwordHash: 'secret2', createdAt: newer }
];

test('list: returns every account with name, email, role and status', async () => {
  const accounts = await setup(seed).getAccounts();

  assert.equal(accounts.length, 2);
  const suspended = accounts.find((a) => a.email === 'new@x.com');
  assert.equal(suspended.name, 'New');
  assert.equal(suspended.role, 'interior_designer');
  assert.equal(suspended.accountStatus, 'suspended');
  assert.ok(suspended.id);
});

test('list: never exposes the password hash or other private fields', async () => {
  const accounts = await setup(seed).getAccounts();

  for (const account of accounts) {
    assert.deepEqual(
      Object.keys(account).sort(),
      ['accountStatus', 'createdAt', 'email', 'id', 'name', 'role']
    );
  }
  assert.ok(!JSON.stringify(accounts).includes('secret'));
});

test('list: newest accounts come first', async () => {
  const accounts = await setup(seed).getAccounts();
  assert.deepEqual(accounts.map((a) => a.name), ['New', 'Old']);
});

test('list: an empty collection gives an empty list', async () => {
  assert.deepEqual(await setup([]).getAccounts(), []);
});
