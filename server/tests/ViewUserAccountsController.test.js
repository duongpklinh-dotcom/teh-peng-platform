// Test-first cases for US05 Search and filter accounts.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ObjectId } = require('mongodb');
const ViewUserAccountsController = require('../controllers/ViewUserAccountsController');

function makeDb(documents = []) {
  const captured = {};
  return {
    captured,
    collection: () => ({
      find: (filter, options) => {
        captured.filter = filter;
        captured.options = options;
        return { sort: () => ({ toArray: async () => documents }) };
      }
    })
  };
}

test('No criteria returns every account (full list)', async () => {
  const db = makeDb([{ _id: new ObjectId(), name: 'A', email: 'a@x.com', role: 'customer', accountStatus: 'active' }]);
  const accounts = await new ViewUserAccountsController(db).getAccounts();

  assert.deepEqual(db.captured.filter, {});
  assert.equal(accounts.length, 1);
});

test('Keyword searches name or email, partial and case-insensitive (AC1, AC4)', async () => {
  const db = makeDb();
  await new ViewUserAccountsController(db).getAccounts({ search: '  ALI ' });

  const [condition] = db.captured.filter.$and;
  assert.equal(condition.$or.length, 2);
  assert.equal(condition.$or[0].name.$regex, 'ALI');
  assert.equal(condition.$or[0].name.$options, 'i');
  assert.ok(condition.$or[1].email);
});

test('Special characters in the keyword are escaped', async () => {
  const db = makeDb();
  await new ViewUserAccountsController(db).getAccounts({ search: 'a.b+(c' });

  assert.equal(db.captured.filter.$and[0].$or[0].name.$regex, 'a\\.b\\+\\(c');
});

test('Filters by profile (role) (AC2)', async () => {
  const db = makeDb();
  await new ViewUserAccountsController(db).getAccounts({ role: 'interior_designer' });

  assert.deepEqual(db.captured.filter, { $and: [{ role: 'interior_designer' }] });
});

test('Active filter also includes older accounts with no status (AC2)', async () => {
  const db = makeDb();
  await new ViewUserAccountsController(db).getAccounts({ status: 'active' });

  assert.deepEqual(db.captured.filter.$and[0].$or, [
    { accountStatus: 'active' },
    { accountStatus: { $exists: false } }
  ]);
});

test('Suspended filter matches accountStatus suspended (AC2)', async () => {
  const db = makeDb();
  await new ViewUserAccountsController(db).getAccounts({ status: 'suspended' });

  assert.deepEqual(db.captured.filter, { $and: [{ accountStatus: 'suspended' }] });
});

test('Search, role and status combine with AND (AC3)', async () => {
  const db = makeDb();
  await new ViewUserAccountsController(db).getAccounts({ search: 'tan', role: 'customer', status: 'suspended' });

  assert.equal(db.captured.filter.$and.length, 3);
});

test('Rejects an unknown role or status filter', async () => {
  const controller = new ViewUserAccountsController(makeDb());

  await assert.rejects(controller.getAccounts({ role: 'superuser' }), error => error.status === 400);
  await assert.rejects(controller.getAccounts({ status: 'banana' }), error => error.status === 400);
});

test('Never returns the password hash and excludes it in the query', async () => {
  const db = makeDb([{ _id: new ObjectId(), name: 'A', email: 'a@x.com', role: 'customer', passwordHash: 'secret' }]);
  const accounts = await new ViewUserAccountsController(db).getAccounts();

  assert.deepEqual(db.captured.options, { projection: { passwordHash: 0 } });
  assert.equal(JSON.stringify(accounts).includes('secret'), false);
  assert.equal(accounts[0].accountStatus, 'active');
});
