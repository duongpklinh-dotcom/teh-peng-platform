const test = require('node:test');
const assert = require('node:assert/strict');

test('Public registration must create a customer account', () => {
  const AuthController = require('../controllers/AuthController');

  const controller = new AuthController(null);

  const role = controller.getRegistrationRole({
    role: 'user_admin'
  });

  assert.equal(role, 'customer');
});


test('Registration securely creates a customer account', async () => {
  const bcrypt = require('bcryptjs');
  const AuthController = require('../controllers/AuthController');

  let savedUser;

  const fakeDb = {
    collection: (name) => {
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
    email: 'alice@example.com',
    password: 'SecurePassword123!',
    role: 'user_admin'
  });

  assert.equal(savedUser.role, 'customer');
  assert.equal(savedUser.email, 'alice@example.com');

  assert.notEqual(savedUser.passwordHash, 'SecurePassword123!');
  assert.equal(
    await bcrypt.compare('SecurePassword123!', savedUser.passwordHash),
    true
  );

  assert.equal(savedUser.password, undefined);
  assert.equal(result.passwordHash, undefined);
});


test('Rejects registration with an existing email', async () => {
  const AuthController = require('../controllers/AuthController');

  const fakeDb = {
    collection: () => ({
      findOne: async () => ({
        email: 'alice@example.com'
      }),
      insertOne: async () => {
        throw new Error('Should not insert duplicate user');
      }
    })
  };

  const controller = new AuthController(fakeDb);

  await assert.rejects(
    controller.register({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'SecurePassword123!'
    }),
    /Email already registered/
  );
});


test('Logs in a user with the correct password', async () => {
  const bcrypt = require('bcryptjs');
  const AuthController = require('../controllers/AuthController');

  const passwordHash = await bcrypt.hash('SecurePassword123!', 12);

  
    const fakeDb = {
    collection: (name) => {
        assert.equal(name, 'users');

        return {
        findOne: async () => ({
            _id: 'user123',
            name: 'Alice',
            email: 'alice@example.com',
            passwordHash,
            role: 'customer',
            accountStatus: 'active'
        }),
        updateOne: async () => ({ modifiedCount: 1 })
        };
    }
    };

  const controller = new AuthController(fakeDb);

  const result = await controller.login({
    email: 'alice@example.com',
    password: 'SecurePassword123!'
  });

  assert.equal(result.id, 'user123');
  assert.equal(result.role, 'customer');
  assert.equal(result.passwordHash, undefined);
});

test('Rejects login with an incorrect password', async () => {
  const bcrypt = require('bcryptjs');
  const AuthController = require('../controllers/AuthController');

  const passwordHash = await bcrypt.hash('SecurePassword123!', 12);

  
    
    const fakeDb = {
    collection: () => ({
        findOne: async () => ({
        _id: 'user123',
        email: 'alice@example.com',
        passwordHash,
        role: 'customer',
        accountStatus: 'active',
        failedLoginAttempts: 0
        }),

        findOneAndUpdate: async () => ({
        failedLoginAttempts: 1,
        accountStatus: 'active'
        })
    })
    };



  const controller = new AuthController(fakeDb);

  await assert.rejects(
    controller.login({
      email: 'alice@example.com',
      password: 'WrongPassword123!'
    }),
    /Invalid email or password/
  );
});



test('Rejects login when the account is locked', async () => {
  const bcrypt = require('bcryptjs');
  const AuthController = require('../controllers/AuthController');

  const passwordHash = await bcrypt.hash('SecurePassword123!', 12);

  const fakeDb = {
    collection: () => ({
      findOne: async () => ({
        _id: 'user123',
        email: 'alice@example.com',
        passwordHash,
        role: 'customer',
        accountStatus: 'locked'
      }),

      updateOne: async () => {
        throw new Error('Locked account should not be updated');
      }
    })
  };

  const controller = new AuthController(fakeDb);

  await assert.rejects(
    controller.login({
      email: 'alice@example.com',
      password: 'SecurePassword123!'
    }),
    /Account is not active/
  );
});



test('Locks an account after 5 failed login attempts', async () => {
  const bcrypt = require('bcryptjs');
  const AuthController = require('../controllers/AuthController');

  const passwordHash = await bcrypt.hash('CorrectPassword123!', 12);

  const user = {
    _id: 'user123',
    email: 'alice@example.com',
    passwordHash,
    role: 'customer',
    accountStatus: 'active',
    failedLoginAttempts: 4
  };

  
    
    
    const fakeDb = {
    collection: () => ({
        findOne: async () => user,

        findOneAndUpdate: async (filter, pipeline) => {
        assert.equal(filter.accountStatus, 'active');
        assert.equal(Array.isArray(pipeline), true);

        // Simulate MongoDB's atomic update pipeline
        const nextAttempts = (user.failedLoginAttempts || 0) + 1;

        user.failedLoginAttempts = nextAttempts;

        if (nextAttempts >= 5) {
            user.accountStatus = 'locked';
        }

        return { ...user };
        },

        updateOne: async () => {
        throw new Error('Locking must use one atomic update');
        }
    })
    };




  const controller = new AuthController(fakeDb);

  await assert.rejects(
    controller.login({
      email: 'alice@example.com',
      password: 'WrongPassword123!'
    }),
    /Invalid email or password/
  );

  assert.equal(user.failedLoginAttempts, 5);
  assert.equal(user.accountStatus, 'locked');
});
