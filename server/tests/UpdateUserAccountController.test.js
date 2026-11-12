// Test-first cases for US03 Update user account.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ObjectId } = require('mongodb');
const UpdateUserAccountController = require('../controllers/UpdateUserAccountController');

function makeDb(users) {
  const updates = [];
  return {
    updates,
    collection: name => {
      assert.equal(name, 'users');
      return {
        findOne: async query => {
          if (query.email) {
            return users.find(u => u.email === query.email &&
              String(u._id) !== String(query._id.$ne)) || null;
          }
          return users.find(u => String(u._id) === String(query._id)) || null;
        },
        updateOne: async (filter, change) => {
          updates.push({ filter, change });
          return { matchedCount: 1 };
        }
      };
    }
  };
}

const adminId = new ObjectId().toString();
const mkUser = (name, email) => ({
  _id: new ObjectId(), name, email, role: 'customer', accountStatus: 'active', passwordHash: 'secret'
});

test('Updates name and email and stores only those fields (AC2, AC4)', async () => {
  const alice = mkUser('Alice', 'alice@example.com');
  const db = makeDb([alice]);

  const result = await new UpdateUserAccountController(db).updateAccount(
    adminId, alice._id.toString(), { name: '  Alice Tan ', email: 'ALICE.TAN@Example.com ' }
  );

  assert.equal(result.name, 'Alice Tan');
  assert.equal(result.email, 'alice.tan@example.com');
  assert.equal(db.updates.length, 1);
  assert.deepEqual(
    Object.keys(db.updates[0].change.$set).sort(),
    ['email', 'name', 'updatedAt', 'updatedBy']
  );
  assert.equal(JSON.stringify(result).includes('secret'), false);
});

test('Rejects an empty name (AC3)', async () => {
  const alice = mkUser('Alice', 'alice@example.com');
  const db = makeDb([alice]);

  await assert.rejects(
    new UpdateUserAccountController(db).updateAccount(adminId, alice._id.toString(), { name: '   ', email: 'a@b.com' }),
    error => error.status === 400 && /Name is required/.test(error.message)
  );
  assert.equal(db.updates.length, 0);
});

test('Rejects an empty or invalid email (AC3)', async () => {
  const alice = mkUser('Alice', 'alice@example.com');
  const controller = new UpdateUserAccountController(makeDb([alice]));

  await assert.rejects(controller.updateAccount(adminId, alice._id.toString(), { name: 'Alice', email: '' }), /Email is required/);
  await assert.rejects(controller.updateAccount(adminId, alice._id.toString(), { name: 'Alice', email: 'not-an-email' }), /Invalid email address/);
});

test('Rejects an email already used by another account (AC3)', async () => {
  const alice = mkUser('Alice', 'alice@example.com');
  const bob = mkUser('Bob', 'bob@example.com');
  const db = makeDb([alice, bob]);

  await assert.rejects(
    new UpdateUserAccountController(db).updateAccount(adminId, alice._id.toString(), { name: 'Alice', email: 'BOB@example.com' }),
    error => error.status === 409 && /already used/.test(error.message)
  );
  assert.equal(db.updates.length, 0);
});

test('Allows keeping the same email while changing the name', async () => {
  const alice = mkUser('Alice', 'alice@example.com');
  const db = makeDb([alice]);

  const result = await new UpdateUserAccountController(db).updateAccount(
    adminId, alice._id.toString(), { name: 'Alice Tan', email: 'alice@example.com' }
  );
  assert.equal(result.name, 'Alice Tan');
});

test('Rejects a save with no changes', async () => {
  const alice = mkUser('Alice', 'alice@example.com');
  await assert.rejects(
    new UpdateUserAccountController(makeDb([alice])).updateAccount(adminId, alice._id.toString(), { name: 'Alice', email: 'alice@example.com' }),
    error => error.status === 400 && /No changes/.test(error.message)
  );
});

test('Returns 404 when the account does not exist and 400 for a bad ID', async () => {
  const controller = new UpdateUserAccountController(makeDb([]));

  await assert.rejects(
    controller.updateAccount(adminId, new ObjectId().toString(), { name: 'X', email: 'x@y.com' }),
    error => error.status === 404
  );
  await assert.rejects(
    controller.updateAccount(adminId, 'bad-id', { name: 'X', email: 'x@y.com' }),
    error => error.status === 400
  );
});
