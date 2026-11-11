const test = require('node:test');
const assert = require('node:assert/strict');
const { ObjectId } = require('mongodb');

const {
  requireAuth,
  requireRole
} = require('../middleware/auth');

test('Rejects requests without a login session', async () => {
  const req = { session: {} };

  let statusCode;
  let response;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      response = data;
      return this;
    }
  };

  let nextCalled = false;

  await requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(statusCode, 401);
  assert.equal(response.success, false);
  assert.equal(nextCalled, false);
});

test('Rejects customers accessing designer features', () => {
  const req = {
    user: { id: '123', role: 'customer' }
  };

  let statusCode;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    }
  };

  let nextCalled = false;

  requireRole('interior_designer')(req, res, () => {
    nextCalled = true;
  });

  assert.equal(statusCode, 403);
  assert.equal(nextCalled, false);
});

test('Allows authenticated designers to access designer features', async () => {
  const userId = new ObjectId();

  const req = {
    session: { userId: userId.toString() },
    app: {
      locals: {
        db: {
          collection: () => ({
            findOne: async () => ({
              _id: userId,
              email: 'designer@example.com',
              role: 'interior_designer',
              accountStatus: 'active'
            })
          })
        }
      }
    }
  };

  const res = {
    status() {
      throw new Error('Request should not be rejected');
    }
  };

  let authenticated = false;

  await requireAuth(req, res, () => {
    authenticated = true;
  });

  assert.equal(authenticated, true);
  assert.equal(req.user.role, 'interior_designer');

  let authorised = false;

  requireRole('interior_designer')(req, res, () => {
    authorised = true;
  });

  assert.equal(authorised, true);
});
