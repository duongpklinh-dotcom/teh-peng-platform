
const express = require('express');
const { ObjectId } = require('mongodb');
const NotificationService = require('../services/NotificationService');

const router = express.Router();

const MAX_MESSAGE_LENGTH = 2000;
const PAGE_SIZE = 50;

function isValidId(value) {
  return (
    typeof value === 'string' &&
    /^[a-fA-F0-9]{24}$/.test(value)
  );
}

// Ensure the user is logged in and has an active account.
async function requireParticipant(req, res, next) {
  try {
    const userId = req.session?.userId;

    if (!isValidId(userId)) {
      return res.status(401).json({
        success: false,
        error: 'Please log in to access messages.'
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

    req.messagingUser = user;
    next();
  } catch (error) {
    next(error);
  }
}

// Only the customer and designer belonging to a consultation
// may access its conversation.
async function requireConsultationAccess(req, res, next) {
  try {
    const { consultationId } = req.params;

    if (!isValidId(consultationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid consultation ID.'
      });
    }

    const consultation = await req.app.locals.db
      .collection('consultations')
      .findOne({
        _id: new ObjectId(consultationId)
      });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        error: 'Consultation not found.'
      });
    }

    const userId = req.messagingUser._id.toString();

    const isCustomer =
      req.messagingUser.role === 'customer' &&
      consultation.customerId?.toString() === userId;

    const isDesigner =
      req.messagingUser.role === 'interior_designer' &&
      consultation.designerId?.toString() === userId;

    if (!isCustomer && !isDesigner) {
      return res.status(404).json({
        success: false,
        error: 'Consultation not found.'
      });
    }

    req.messagingConsultation = consultation;
    next();
  } catch (error) {
    next(error);
  }
}

function formatMessage(message) {
  return {
    messageId: message._id.toString(),
    consultationId: message.consultationId.toString(),
    senderId: message.senderId.toString(),
    messageText: message.messageText,
    createdAt: message.createdAt
  };
}

// STEP 10D.8:
// Notify the other participant when a new chat message is sent.
async function notifyNewMessage(req, consultation) {
  try {
    const senderId = req.messagingUser._id.toString();

    const isCustomer =
      consultation.customerId?.toString() === senderId;

    const recipientId = isCustomer
      ? consultation.designerId?.toString()
      : consultation.customerId?.toString();

    if (!recipientId || !isValidId(recipientId)) {
      console.error(
        'Chat notification skipped: recipient ID unavailable.'
      );
      return;
    }

    const notificationService = new NotificationService(
      req.app.locals.db
    );

    const senderLabel = isCustomer
      ? 'customer'
      : 'interior designer';

    await notificationService.createNotification({
      recipientId,
      consultationId: consultation._id.toString(),
      type: 'new_consultation_message',
      title: 'New Consultation Message',
      message: `You have received a new message from the ${senderLabel}.`
    });

    console.log(
      'Chat notification created successfully.'
    );
  } catch (error) {
    // Notification failures must not cause
    // successfully saved messages to fail.
    console.error(
      'Unable to create chat notification:',
      error
    );
  }
}

// GET /api/consultation-messages/:consultationId
// Retrieve the most recent messages for a consultation.
router.get(
  '/:consultationId',
  requireParticipant,
  requireConsultationAccess,
  async (req, res) => {
    try {
      const consultation = req.messagingConsultation;

      // Only confirmed consultations unlock messaging.
      if (consultation.requestStatus !== 'Confirmed') {
        return res.status(403).json({
          success: false,
          error:
            'Messaging is only available for confirmed consultations.'
        });
      }

      const messages = await req.app.locals.db
        .collection('consultationMessages')
        .find({
          consultationId: consultation._id
        })
        .sort({
          createdAt: -1,
          _id: -1
        })
        .limit(PAGE_SIZE)
        .toArray();

      // Return messages in chronological order.
      messages.reverse();

      return res.json({
        success: true,
        data: messages.map(formatMessage)
      });
    } catch (error) {
      console.error('Get consultation messages error:', error);

      return res.status(500).json({
        success: false,
        error: 'Unable to load messages.'
      });
    }
  }
);

// POST /api/consultation-messages/:consultationId
// Send a message to the other consultation participant.
router.post(
  '/:consultationId',
  requireParticipant,
  requireConsultationAccess,
  async (req, res) => {
    try {
      const consultation = req.messagingConsultation;

      if (consultation.requestStatus !== 'Confirmed') {
        return res.status(403).json({
          success: false,
          error:
            'Messages can only be sent for confirmed consultations.'
        });
      }

      const { messageText } = req.body || {};

      if (
        typeof messageText !== 'string' ||
        !messageText.trim() ||
        messageText.length > MAX_MESSAGE_LENGTH
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Please enter a message between 1 and 2000 characters.'
        });
      }

      const message = {
        consultationId: consultation._id,
        senderId: req.messagingUser._id,
        messageText: messageText.trim(),
        createdAt: new Date()
      };

      const result = await req.app.locals.db
        .collection('consultationMessages')
        .insertOne(message);

      // STEP 10D.8:
      // Create the notification only after
      // the message has been saved successfully.
      await notifyNewMessage(req, consultation);

      return res.status(201).json({
        success: true,
        data: formatMessage({
          ...message,
          _id: result.insertedId
        })
      });
    } catch (error) {
      console.error('Send consultation message error:', error);

      return res.status(500).json({
        success: false,
        error: 'Unable to send message.'
      });
    }
  }
);

module.exports = router;
