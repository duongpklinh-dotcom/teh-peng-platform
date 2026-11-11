// Tiny in-memory stand-in for a MongoDB db, so unit tests need no database.
// Supports only what UA01 / UA02 / UA04 / login use:
// findOne, find (sort/skip/limit/toArray), countDocuments, insertOne, updateOne.
const { ObjectId } = require('mongodb');

function matches(doc, filter) {
  return Object.entries(filter).every(
    ([key, value]) => String(doc[key]) === String(value)
  );
}

function compare(a, b) {
  if (a === undefined || a === null) return b === undefined || b === null ? 0 : -1;
  if (b === undefined || b === null) return 1;
  if (a instanceof ObjectId && b instanceof ObjectId) return a.toString() < b.toString() ? -1 : a.toString() > b.toString() ? 1 : 0;
  return a < b ? -1 : a > b ? 1 : 0;
}

function makeFakeDb(seed = {}) {
  const data = {};

  for (const [name, docs] of Object.entries(seed)) {
    data[name] = docs.map((d) => ({ _id: new ObjectId(), ...d }));
  }

  function table(name) {
    if (!data[name]) data[name] = [];
    return data[name];
  }

  return {
    data,
    collection(name) {
      return {
        async findOne(filter) {
          return table(name).find((d) => matches(d, filter)) || null;
        },
        // find(filter, { projection }).sort({ field: -1 }).skip(n).limit(n).toArray()
        find(filter = {}, options = {}) {
          let rows = table(name).filter((d) => matches(d, filter));
          const cursor = {
            sort(spec) {
              const keys = Object.entries(spec);
              rows = [...rows].sort((a, b) => {
                for (const [key, dir] of keys) {
                  const result = compare(a[key], b[key]) * dir;
                  if (result !== 0) return result;
                }
                return 0;
              });
              return cursor;
            },
            skip(n) { rows = rows.slice(n); return cursor; },
            limit(n) { rows = rows.slice(0, n); return cursor; },
            async toArray() {
              const projection = options.projection;
              if (!projection) return rows;
              const keys = Object.keys(projection);
              const excluding = keys.length > 0 && keys.every((k) => !projection[k]);
              return rows.map((row) => {
                if (excluding) {
                  const copy = { ...row };
                  keys.forEach((k) => delete copy[k]);
                  return copy;
                }
                const out = { _id: row._id };
                for (const key of keys) {
                  if (projection[key] && key in row) out[key] = row[key];
                }
                return out;
              });
            }
          };
          return cursor;
        },
        async countDocuments(filter = {}) {
          return table(name).filter((d) => matches(d, filter)).length;
        },
        async insertOne(doc) {
          // behaves like the unique index on users.email in server/index.js
          if (
            name === 'users' &&
            table(name).some((d) => d.email === doc.email)
          ) {
            const error = new Error('E11000 duplicate key error');
            error.code = 11000;
            throw error;
          }
          const stored = Object.assign(doc, { _id: new ObjectId() });
          table(name).push(stored);
          return { insertedId: stored._id };
        },
        async updateOne(filter, update) {
          const doc = table(name).find((d) => matches(d, filter));
          if (!doc) return { matchedCount: 0, modifiedCount: 0 };
          Object.assign(doc, update.$set || {});
          return { matchedCount: 1, modifiedCount: 1 };
        }
      };
    }
  };
}

module.exports = { makeFakeDb };
