
const { ObjectId } = require('mongodb');

class NotificationService {
  constructor(db) {
    this.db = db;
    this.collection = db.collection('notifications');
  }

  async createNotification({
    recipientId,
    consultationId,
    type,
    title,
    message
  }) {
    if (!ObjectId.isValid(recipientId)) {
      throw new Error('Invalid notification recipient ID.');
    }

    const notification = {
      recipientId: new ObjectId(recipientId),
      consultationId: consultationId
        ? new ObjectId(consultationId)
        : null,
      type,
      title,
      message,
      isRead: false,
      createdAt: new Date()
    };

    const result = await this.collection.insertOne(notification);

    return {
      ...notification,
      _id: result.insertedId
    };
  }

  async getNotifications(userId) {
    return this.collection
      .find({
        recipientId: new ObjectId(userId)
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
  }

  async getUnreadCount(userId) {
    return this.collection.countDocuments({
      recipientId: new ObjectId(userId),
      isRead: false
    });
  }

  async markAsRead(notificationId, userId) {
    return this.collection.updateOne(
      {
        _id: new ObjectId(notificationId),
        recipientId: new ObjectId(userId)
      },
      {
        $set: {
          isRead: true
        }
      }
    );
  }
}

module.exports = NotificationService;
