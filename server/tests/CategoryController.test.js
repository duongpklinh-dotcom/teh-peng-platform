// Test-first cases for US-PM01 Create IDP category.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ObjectId } = require('mongodb');
const CategoryController = require('../controllers/CategoryController');

function makeDb({ existing = null, insertError = null } = {}) {
  const saved = [];
  const db = {
    saved,
    collection: name => {
      assert.equal(name, 'categories');
      return {
        findOne: async query => (existing && query.nameKey === existing.nameKey ? existing : null),
        insertOne: async doc => {
          if (insertError) throw insertError;
          saved.push(doc);
          return { insertedId: new ObjectId() };
        },
        find: () => ({
          sort: () => ({
            toArray: async () => [
              { _id: new ObjectId(), name: 'Modern', description: 'x', status: 'active', createdAt: new Date() }
            ]
          })
        })
      };
    }
  };
  return db;
}

const managerId = new ObjectId().toString();

test('Creates a category with a valid name and description', async () => {
  const db = makeDb();
  const result = await new CategoryController(db).createCategory(
    { name: '  Scandinavian ', description: 'Light woods, neutral tones' },
    managerId
  );

  assert.equal(result.name, 'Scandinavian');
  assert.equal(result.status, 'active');
  assert.equal(db.saved.length, 1);
  assert.equal(db.saved[0].nameKey, 'scandinavian');
  assert.equal(db.saved[0].createdBy.toString(), managerId);
});

test('Rejects an empty category name', async () => {
  const db = makeDb();
  await assert.rejects(
    new CategoryController(db).createCategory({ name: '   ' }, managerId),
    /Category name is required/
  );
  assert.equal(db.saved.length, 0);
});

test('Rejects a name that is too long', async () => {
  await assert.rejects(
    new CategoryController(makeDb()).createCategory({ name: 'A'.repeat(51) }, managerId),
    /50 characters or fewer/
  );
});

test('Rejects invalid characters in the name', async () => {
  await assert.rejects(
    new CategoryController(makeDb()).createCategory({ name: '<script>' }, managerId),
    /may only contain/
  );
});

test('Rejects a description that is too long', async () => {
  await assert.rejects(
    new CategoryController(makeDb()).createCategory(
      { name: 'Modern', description: 'x'.repeat(301) },
      managerId
    ),
    /300 characters or fewer/
  );
});

test('Rejects a duplicate name regardless of letter case (409)', async () => {
  const db = makeDb({ existing: { nameKey: 'modern' } });
  await assert.rejects(
    new CategoryController(db).createCategory({ name: 'MODERN' }, managerId),
    error => error.status === 409 && /already exists/.test(error.message)
  );
  assert.equal(db.saved.length, 0);
});

test('Maps a unique-index race (code 11000) to a duplicate error', async () => {
  const db = makeDb({ insertError: Object.assign(new Error('dup'), { code: 11000 }) });
  await assert.rejects(
    new CategoryController(db).createCategory({ name: 'Minimalist' }, managerId),
    error => error.status === 409
  );
});

test('Rejects an invalid manager ID', async () => {
  await assert.rejects(
    new CategoryController(makeDb()).createCategory({ name: 'Modern' }, 'bad-id'),
    /Invalid platform manager ID/
  );
});

test('Lists categories as API-friendly objects', async () => {
  const list = await new CategoryController(makeDb()).getCategories();
  assert.equal(list.length, 1);
  assert.equal(typeof list[0].id, 'string');
  assert.equal(list[0].name, 'Modern');
});
