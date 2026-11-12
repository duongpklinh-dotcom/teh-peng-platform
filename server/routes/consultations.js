
const express = require('express');
const { ObjectId } = require('mongodb');
const ConsultationController = require(
  '../controllers/ConsultationController'
);

const router = express.Router();

function createController(req) {
  return new ConsultationController(
    req.app.locals.db,
    req.app.locals.mongoClient
  );
}

function isValidId(id) {
  return (
    typeof id === 'string' &&
    /^[a-fA-F0-9]{24}$/.test(id)
  );
}

function sendError(res, error) {
  const message = error.message || 'Request failed.';

  if (
    message.includes('no longer available') ||
    message.includes('Scheduling conflict') ||
    message.includes('Unable to reserve')
  ) {
    return res.status(409).json({
      success: false,
      error: message
    });
  }

  if (message.includes('not found')) {
    return res.status(404).json({
      success: false,
      error: message
    });
  }

  if (
    message.startsWith('Invalid') ||
    message.includes('cannot be empty') ||
    message.includes('in the past')
  ) {
    return res.status(400).json({
      success: false,
      error: message
    });
  }

  console.error('Consultation API error:', error);

  return res.status(500).json({
    success: false,
    error: 'Unable to process consultation request.'
  });
}

async function requireCustomer(req, res, next) {
  try {
    const userId = req.session?.userId;

    if (!isValidId(userId)) {
      return res.status(401).json({
        success: false,
        error: 'Please log in to view consultations.'
      });
    }

    const user = await req.app.locals.db
      .collection('users')
      .findOne({
        _id: new ObjectId(userId)
      });

    if (
      !user ||
      user.accountStatus !== 'active' ||
      user.role !== 'customer'
    ) {
      return res.status(403).json({
        success: false,
        error: 'An active customer account is required.'
      });
    }

    req.customerId = user._id.toString();
    next();

  } catch (error) {
    next(error);
  }
}

// GET available slots for a designer
router.get('/slots', async (req, res) => {
  try {
    const { designerId, preferredTime = 'morning' } =
      req.query;

    if (!isValidId(designerId)) {
      return res.status(400).json({
        success: false,
        error: 'A valid designer ID is required.'
      });
    }

    if (!['morning', 'afternoon'].includes(preferredTime)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid consultation period.'
      });
    }

    const designer = await req.app.locals.db
      .collection('users')
      .findOne({
        _id: new ObjectId(designerId),
        role: 'interior_designer'
      });

    if (!designer) {
      return res.status(404).json({
        success: false,
        error: 'Interior designer not found.'
      });
    }

    const controller = createController(req);

    const slots = await controller.rankAvailableSlots(
      designerId,
      preferredTime
    );

    const futureSlots = slots.filter(
      slot => new Date(slot.startTime) > new Date()
    );

    return res.json({
      success: true,
      data: futureSlots
    });

  } catch (error) {
    return sendError(res, error);
  }
});

// POST new consultation request
router.post('/', requireCustomer, async (req, res) => {
  try {
    const {
      designerId,
      slotId,
      renovationRequirements
    } = req.body || {};

    if (!isValidId(designerId) || !isValidId(slotId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid designer and slot IDs are required.'
      });
    }

    if (
      typeof renovationRequirements !== 'string' ||
      !renovationRequirements.trim() ||
      renovationRequirements.length > 2000
    ) {
      return res.status(400).json({
        success: false,
        error: 'Please enter up to 2000 characters of renovation requirements.'
      });
    }

    const controller = createController(req);

    const result =
      await controller.submitConsultationRequest(
        req.customerId,
        designerId,
        slotId,
        renovationRequirements
      );

    return res.status(201).json({
      success: true,
      data: result
    });

  } catch (error) {
    return sendError(res, error);
  }
});

// GET consultations belonging to signed-in customer
router.get('/mine', requireCustomer, async (req, res) => {
  try {
    const db = req.app.locals.db;

    const consultations = await db
      .collection('consultations')
      .find({
        customerId: new ObjectId(req.customerId)
      })
      .sort({ createdAt: -1 })
      .toArray();

    const data = await Promise.all(
      consultations.map(async item => {
        const slotId = item.slotId
          ? new ObjectId(item.slotId)
          : null;

        const designerId = item.designerId
          ? new ObjectId(item.designerId)
          : null;

        const [slot, designer] = await Promise.all([
          slotId
            ? db.collection('timeSlots').findOne({
                _id: slotId
              })
            : null,

          designerId
            ? db.collection('users').findOne({
                _id: designerId
              })
            : null
        ]);

        return {
          requestId: item._id.toString(),
          designerId: item.designerId?.toString(),
          designerName: designer?.name || 'Interior Designer',
          slotId: item.slotId?.toString(),
          startTime: slot?.startTime || null,
          endTime: slot?.endTime || null,
          renovationRequirements:
            item.renovationRequirements,
          requestStatus: item.requestStatus,
          createdAt: item.createdAt || null
        };
      })
    );

    return res.json({
      success: true,
      data
    });

  } catch (error) {
    return sendError(res, error);
  }
});

// GET status of a specific consultation
router.get('/:requestId', requireCustomer, async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!isValidId(requestId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid consultation request ID.'
      });
    }

    const existing = await req.app.locals.db
      .collection('consultations')
      .findOne({
        _id: new ObjectId(requestId),
        customerId: new ObjectId(req.customerId)
      });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Consultation request not found.'
      });
    }

    const controller = createController(req);

    const status = await controller.getRequestStatus(
      requestId
    );

    return res.json({
      success: true,
      data: status
    });

  } catch (error) {
    return sendError(res, error);
  }
});

module.exports = router;
