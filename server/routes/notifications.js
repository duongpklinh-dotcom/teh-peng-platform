
const express = require('express');
const { ObjectId } = require('mongodb');
const NotificationService = require('../services/NotificationService');

const router = express.Router();

function isValidId(value) {
  return (
    typeof value === 'string' &&
    /^[a-fA-F0-9]{24}$/.test(value)
  );
}

async function requireNotificationUser(req, res, next) {
  try {
    const userId = req.session?.userId;

    if (!isValidId(userId)) {
      return res.status(401).json({
        success: false,
        error: 'Please log in to view notifications.'
      });
    }

    const user = await req.app.locals.db
      .collection('users')
      .findOne({
        _id: new ObjectId(userId),
        accountStatus: 'active',
        role: {
          $in: ['customer', 'interior_designer']
        }
      });

    if (!user) {
      return res.status(403).json({
        success: false,
        error: 'An active customer or designer account is required.'
      });
    }

    req.notificationUserId = user._id.toString();
    next();
  } catch (error) {
    next(error);
  }
}

function formatNotification(notification) {
  return {
    notificationId: notification._id.toString(),
    consultationId: notification.consultationId?.toString() || null,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    isRead: notification.isRead,
    createdAt: notification.createdAt
  };
}

// GET /api/notifications
router.get('/', requireNotificationUser, async (req, res) => {
  try {
    const service = new NotificationService(req.app.locals.db);

    const notifications = await service.getNotifications(
      req.notificationUserId
    );

    return res.json({
      success: true,
      data: notifications.map(formatNotification)
    });
  } catch (error) {
    console.error('Get notifications error:', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to load notifications.'
    });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', requireNotificationUser, async (req, res) => {
  try {
    const service = new NotificationService(req.app.locals.db);

    const count = await service.getUnreadCount(
      req.notificationUserId
    );

    return res.json({
      success: true,
      data: { unreadCount: count }
    });
  } catch (error) {
    console.error('Get unread count error:', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to load unread count.'
    });
  }
});

// PATCH /api/notifications/:notificationId/read
router.patch(
  '/:notificationId/read',
  requireNotificationUser,
  async (req, res) => {
    try {
      const { notificationId } = req.params;

      if (!isValidId(notificationId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid notification ID.'
        });
      }

      const service = new NotificationService(req.app.locals.db);

      const result = await service.markAsRead(
        notificationId,
        req.notificationUserId
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found.'
        });
      }

      return res.json({
        success: true,
        message: 'Notification marked as read.'
      });
    } catch (error) {
      console.error('Mark notification read error:', error);

      return res.status(500).json({
        success: false,
        error: 'Unable to update notification.'
      });
    }
  }
);

module.exports = router;

