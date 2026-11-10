
const test = require('node:test');
const assert = require('node:assert/strict');
const { ObjectId } = require('mongodb');

const NotificationService = require('../services/NotificationService');

// Test user IDs
const CUSTOMER_ID = new ObjectId().toString();
const DESIGNER_ID = new ObjectId().toString();
const CONSULTATION_ID = new ObjectId().toString();

// Create a fake MongoDB collection.
// This allows unit testing without connecting to MongoDB Atlas.
function createMockDatabase() {
  const notifications = [];

  const collection = {
    async insertOne(notification) {
      const insertedId = new ObjectId();

      notifications.push({
        ...notification,
        _id: insertedId
      });

      return { insertedId };
    },

    find(filter) {
      let results = notifications.filter(
        notification =>
          notification.recipientId.equals(filter.recipientId)
      );

      return {
        sort(sortOptions) {
          if (sortOptions.createdAt === -1) {
            results.sort(
              (a, b) => b.createdAt - a.createdAt
            );
          }

          return this;
        },

        limit(maximum) {
          results = results.slice(0, maximum);
          return this;
        },

        async toArray() {
          return results;
        }
      };
    },

    async countDocuments(filter) {
      return notifications.filter(
        notification =>
          notification.recipientId.equals(filter.recipientId) &&
          notification.isRead === filter.isRead
      ).length;
    },

    async updateOne(filter, update) {
      const notification = notifications.find(
        item =>
          item._id.equals(filter._id) &&
          item.recipientId.equals(filter.recipientId)
      );

      if (!notification) {
        return {
          matchedCount: 0,
          modifiedCount: 0
        };
      }

      const wasRead = notification.isRead;

      Object.assign(notification, update.$set);

      return {
        matchedCount: 1,
        modifiedCount: wasRead ? 0 : 1
      };
    }
  };

  const db = {
    collection(name) {
      assert.equal(name, 'notifications');
      return collection;
    }
  };

  return { db, notifications };
}

function createTestNotification(overrides = {}) {
  return {
    recipientId: CUSTOMER_ID,
    consultationId: CONSULTATION_ID,
    type: 'consultation_approved',
    title: 'Consultation Approved',
    message: 'Your consultation has been approved.',
    ...overrides
  };
}

// TC-UT20
test('TC-UT20: creates a notification successfully', async () => {
  const { db, notifications } = createMockDatabase();
  const service = new NotificationService(db);

  const result = await service.createNotification(
    createTestNotification()
  );

  assert.ok(result._id instanceof ObjectId);
  assert.ok(result.recipientId.equals(CUSTOMER_ID));
  assert.ok(result.consultationId.equals(CONSULTATION_ID));
  assert.equal(result.isRead, false);
  assert.equal(result.type, 'consultation_approved');
  assert.ok(result.createdAt instanceof Date);
  assert.equal(notifications.length, 1);
});

// TC-UT21
test('TC-UT21: rejects an invalid recipient ID', async () => {
  const { db, notifications } = createMockDatabase();
  const service = new NotificationService(db);

  await assert.rejects(
    service.createNotification(
      createTestNotification({
        recipientId: 'invalid-id'
      })
    ),
    /Invalid notification recipient ID/
  );

  assert.equal(notifications.length, 0);
});

// TC-UT22
test('TC-UT22: creates notification without consultation ID', async () => {
  const { db } = createMockDatabase();
  const service = new NotificationService(db);

  const result = await service.createNotification(
    createTestNotification({
      consultationId: null,
      type: 'general'
    })
  );

  assert.equal(result.consultationId, null);
  assert.equal(result.type, 'general');
});

// TC-UT23
test('TC-UT23: retrieves notifications for correct user', async () => {
  const { db } = createMockDatabase();
  const service = new NotificationService(db);

  await service.createNotification(
    createTestNotification({
      recipientId: CUSTOMER_ID
    })
  );

  await service.createNotification(
    createTestNotification({
      recipientId: DESIGNER_ID
    })
  );

  const results = await service.getNotifications(CUSTOMER_ID);

  assert.equal(results.length, 1);
  assert.ok(results[0].recipientId.equals(CUSTOMER_ID));
});

// TC-UT24
test('TC-UT24: returns newest 50 notifications', async () => {
  const { db, notifications } = createMockDatabase();
  const service = new NotificationService(db);

  const baseTime = Date.now();

  for (let i = 0; i < 55; i++) {
    notifications.push({
      _id: new ObjectId(),
      recipientId: new ObjectId(CUSTOMER_ID),
      consultationId: new ObjectId(CONSULTATION_ID),
      type: 'test',
      title: `Notification ${i}`,
      message: 'Test message',
      isRead: false,
      createdAt: new Date(baseTime + i * 1000)
    });
  }

  const results = await service.getNotifications(CUSTOMER_ID);

  assert.equal(results.length, 50);
  assert.equal(results[0].title, 'Notification 54');
  assert.equal(results[49].title, 'Notification 5');
});

// TC-UT25
test('TC-UT25: counts only unread notifications', async () => {
  const { db, notifications } = createMockDatabase();
  const service = new NotificationService(db);

  const first = await service.createNotification(
    createTestNotification()
  );

  await service.createNotification(
    createTestNotification()
  );

  await service.createNotification(
    createTestNotification({
      recipientId: DESIGNER_ID
    })
  );

  const before = await service.getUnreadCount(CUSTOMER_ID);

  assert.equal(before, 2);

  await service.markAsRead(first._id.toString(), CUSTOMER_ID);

  const after = await service.getUnreadCount(CUSTOMER_ID);

  assert.equal(after, 1);
  assert.equal(notifications.length, 3);
});

// TC-UT26
test('TC-UT26: marks notification as read', async () => {
  const { db } = createMockDatabase();
  const service = new NotificationService(db);

  const notification = await service.createNotification(
    createTestNotification()
  );

  const result = await service.markAsRead(
    notification._id.toString(),
    CUSTOMER_ID
  );

  assert.equal(result.matchedCount, 1);
  assert.equal(result.modifiedCount, 1);

  const results = await service.getNotifications(CUSTOMER_ID);

  assert.equal(results[0].isRead, true);
});

// TC-UT27
test('TC-UT27: prevents another user marking notification as read', async () => {
  const { db } = createMockDatabase();
  const service = new NotificationService(db);

  const notification = await service.createNotification(
    createTestNotification({
      recipientId: CUSTOMER_ID
    })
  );

  const result = await service.markAsRead(
    notification._id.toString(),
    DESIGNER_ID
  );

  assert.equal(result.matchedCount, 0);
  assert.equal(result.modifiedCount, 0);

  const customerNotifications =
    await service.getNotifications(CUSTOMER_ID);

  assert.equal(customerNotifications[0].isRead, false);
});
