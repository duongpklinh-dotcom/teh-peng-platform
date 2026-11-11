// UA04 Suspend or reactivate account. Commit these BEFORE the controller exists (red), then add it (green).
const test = require('node:test');
const assert = require('node:assert/strict');
const SuspendUserAccountController = require('../controllers/SuspendUserAccountController');
const { makeFakeDb } = require('./helpers/fakeDb');

function setup() {
  const db = makeFakeDb({
    users: [
      { name: 'Admin', email: 'admin@x.com', role: 'user_admin', accountStatus: 'active', passwordHash: 'h1' },
      { name: 'Bob', email: 'bob@x.com', role: 'customer', accountStatus: 'active', passwordHash: 'h2' },
      { name: 'Cara', email: 'cara@x.com', role: 'customer', accountStatus: 'suspended', failedLoginAttempts: 3, passwordHash: 'h3' },
      { name: 'Dan', email: 'dan@x.com', role: 'customer', accountStatus: 'locked', passwordHash: 'h4' }
    ]
  });

  const byName = (n) => db.data.users.find((u) => u.name === n);
  return { db, controller: new SuspendUserAccountController(db), byName };
}

async function rejects(promise, status, pattern) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.status, status);
    if (pattern) assert.match(error.message, pattern);
    return true;
  });
}

test('UA04: suspends an active account', async () => {
  const { controller, byName } = setup();
  const result = await controller.changeAccountStatus(
    byName('Admin')._id, byName('Bob')._id.toString(), 'suspended'
  );

  assert.equal(result.accountStatus, 'suspended');
  assert.equal(byName('Bob').accountStatus, 'suspended');
});

test('UA04: reactivates a suspended account and clears failed attempts', async () => {
  const { controller, byName } = setup();
  const result = await controller.changeAccountStatus(
    byName('Admin')._id, byName('Cara')._id.toString(), 'active'
  );

  assert.equal(result.accountStatus, 'active');
  assert.equal(byName('Cara').accountStatus, 'active');
  assert.equal(byName('Cara').failedLoginAttempts, 0);
});

test('UA04: all other account data is kept in the database', async () => {
  const { controller, byName } = setup();
  await controller.changeAccountStatus(
    byName('Admin')._id, byName('Bob')._id.toString(), 'suspended'
  );

  const bob = byName('Bob');
  assert.equal(bob.name, 'Bob');
  assert.equal(bob.email, 'bob@x.com');
  assert.equal(bob.role, 'customer');
  assert.equal(bob.passwordHash, 'h2');
});

test('UA04: records who changed the status and when', async () => {
  const { controller, byName } = setup();
  const adminId = byName('Admin')._id;
  await controller.changeAccountStatus(adminId, byName('Bob')._id.toString(), 'suspended');

  assert.equal(byName('Bob').statusChangedBy, String(adminId));
  assert.ok(byName('Bob').statusChangedAt instanceof Date);
});

test('UA04: the result never contains the password hash', async () => {
  const { controller, byName } = setup();
  const result = await controller.changeAccountStatus(
    byName('Admin')._id, byName('Bob')._id.toString(), 'suspended'
  );

  assert.equal(result.passwordHash, undefined);
});

test('UA04: rejects suspending an already suspended account', async () => {
  const { controller, byName } = setup();
  await rejects(
    controller.changeAccountStatus(byName('Admin')._id, byName('Cara')._id.toString(), 'suspended'),
    409,
    /already suspended/
  );
});

test('UA04: rejects reactivating an already active account', async () => {
  const { controller, byName } = setup();
  await rejects(
    controller.changeAccountStatus(byName('Admin')._id, byName('Bob')._id.toString(), 'active'),
    409,
    /already active/
  );
});

test('UA04: leaves a locked account alone (locked is a different feature)', async () => {
  const { controller, byName } = setup();
  await rejects(
    controller.changeAccountStatus(byName('Admin')._id, byName('Dan')._id.toString(), 'suspended'),
    409,
    /locked/
  );
  assert.equal(byName('Dan').accountStatus, 'locked');
});

test('UA04: unknown account returns 404', async () => {
  const { controller, byName } = setup();
  await rejects(
    controller.changeAccountStatus(byName('Admin')._id, '64b64b64b64b64b64b64b64b', 'suspended'),
    404
  );
});

test('UA04: malformed user id returns 400', async () => {
  const { controller, byName } = setup();
  await rejects(
    controller.changeAccountStatus(byName('Admin')._id, 'not-an-id', 'suspended'),
    400
  );
});

test('UA04: rejects a status value other than active or suspended', async () => {
  const { controller, byName } = setup();
  await rejects(
    controller.changeAccountStatus(byName('Admin')._id, byName('Bob')._id.toString(), 'deleted'),
    400
  );
});

test('UA04: an admin cannot suspend their own account', async () => {
  const { controller, byName } = setup();
  const admin = byName('Admin');
  await rejects(
    controller.changeAccountStatus(admin._id, admin._id.toString(), 'suspended'),
    400,
    /own account/
  );
  assert.equal(admin.accountStatus, 'active');
});

test('UA04: refuses if someone else changed the status in the meantime', async () => {
  const { db, controller, byName } = setup();
  const bobId = byName('Bob')._id.toString();

  // the status changes between our read and our update
  const original = db.collection;
  db.collection = (name) => {
    const c = original(name);
    if (name === 'users') {
      return { ...c, updateOne: async () => ({ matchedCount: 0, modifiedCount: 0 }) };
    }
    return c;
  };

  const racing = new SuspendUserAccountController(db);
  await rejects(
    racing.changeAccountStatus(byName('Admin')._id, bobId, 'suspended'),
    409,
    /someone else/
  );
});
