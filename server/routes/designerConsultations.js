
const express = require('express');
const { ObjectId } = require('mongodb');

const router = express.Router();

function isValidId(value) {
  return (
    typeof value === 'string' &&
    /^[a-fA-F0-9]{24}$/.test(value)
  );
}

function sendError(res, error) {
  console.error('Designer consultation error:', error);

  if (
    error.code === 112 ||
    error.hasErrorLabel?.('TransientTransactionError')
  ) {
    return res.status(409).json({
      success: false,
      error:
        'Another consultation update is in progress. Please try again.'
    });
  }

  return res.status(500).json({
    success: false,
    error: 'Unable to process consultation request.'
  });
}

// Only an authenticated, active interior designer
// can access these endpoints.
async function requireDesigner(req, res, next) {
  try {
    const userId = req.session?.userId;

    if (!isValidId(userId)) {
      return res.status(401).json({
        success: false,
        error: 'Please log in as an interior designer.'
      });
    }

    const designerId = new ObjectId(userId);

    const designer = await req.app.locals.db
      .collection('users')
      .findOne({
        _id: designerId,
        role: 'interior_designer',
        accountStatus: 'active'
      });

    if (!designer) {
      return res.status(403).json({
        success: false,
        error: 'Interior designer access is required.'
      });
    }

    req.designerId = designerId;
    next();
  } catch (error) {
    next(error);
  }
}

// STEP 1: Retrieve the logged-in designer's requests.
router.get('/mine', requireDesigner, async (req, res) => {
  try {
    const db = req.app.locals.db;

    const consultations = await db
      .collection('consultations')
      .find({
        designerId: req.designerId
      })
      .sort({
        createdAt: -1
      })
      .toArray();

    const data = await Promise.all(
      consultations.map(async consultation => {
        const customerId = consultation.customerId;
        const slotId = consultation.slotId;

        const [customer, slot] = await Promise.all([
          customerId && ObjectId.isValid(customerId)
            ? db.collection('users').findOne({
                _id: new ObjectId(customerId)
              })
            : null,

          slotId && ObjectId.isValid(slotId)
            ? db.collection('timeSlots').findOne({
                _id: new ObjectId(slotId)
              })
            : null
        ]);

        return {
          requestId: consultation._id.toString(),
          customerId: customerId?.toString() || null,
          customerName:
            customer?.name || 'Customer',
          customerEmail:
            customer?.email || null,
          designerId: req.designerId.toString(),
          slotId: slotId?.toString() || null,
          startTime: slot?.startTime || null,
          endTime: slot?.endTime || null,
          renovationRequirements:
            consultation.renovationRequirements || '',
          requestStatus:
            consultation.requestStatus,
          bookingMethod:
            consultation.bookingMethod || 'available-slot',
          createdAt:
            consultation.createdAt || null,
          reviewedAt:
            consultation.reviewedAt || null
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

// STEP 2: Approve or reject a Pending request.
// The database transaction ensures the status change
// and slot update are committed together.
async function updateConsultationStatus(
  req,
  res,
  action
) {
  const { requestId } = req.params;

  if (!isValidId(requestId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid consultation request ID.'
    });
  }

  const db = req.app.locals.db;
  const mongoClient = req.app.locals.mongoClient;

  if (!mongoClient) {
    return res.status(500).json({
      success: false,
      error: 'MongoDB client is unavailable.'
    });
  }

  const session = mongoClient.startSession();

  const nextStatus =
    action === 'approve' ? 'Confirmed' : 'Rejected';

  let outcome = null;

  try {
    await session.withTransaction(async () => {
      const users = db.collection('users');
      const consultations = db.collection('consultations');
      const timeSlots = db.collection('timeSlots');

      // Coordinate changes to this designer's bookings.
      // This uses the same document as the booking controller.
      const lock = await users.updateOne(
        {
          _id: req.designerId,
          role: 'interior_designer',
          accountStatus: 'active'
        },
        {
          $inc: {
            consultationBookingVersion: 1
          }
        },
        { session }
      );

      if (lock.matchedCount !== 1) {
        outcome = {
          status: 403,
          error: 'Interior designer access is required.'
        };
        return;
      }

      const consultation = await consultations.findOne(
        {
          _id: new ObjectId(requestId),
          designerId: req.designerId
        },
        { session }
      );

      if (!consultation) {
        outcome = {
          status: 404,
          error: 'Consultation request not found.'
        };
        return;
      }

      if (consultation.requestStatus !== 'Pending') {
        outcome = {
          status: 409,
          error:
            'Only Pending consultation requests can be reviewed.'
        };
        return;
      }

      const now = new Date();

      // Update the request only if it is still Pending.
      const updateResult = await consultations.updateOne(
        {
          _id: consultation._id,
          designerId: req.designerId,
          requestStatus: 'Pending'
        },
        {
          $set: {
            requestStatus: nextStatus,
            reviewedAt: now
          }
        },
        { session }
      );

      if (updateResult.modifiedCount !== 1) {
        outcome = {
          status: 409,
          error:
            'This consultation was already updated.'
        };
        return;
      }

      // A confirmed request retains its reserved slot.
      // A rejected request releases the slot only if
      // no other active consultation overlaps it.
      if (
        action === 'reject' &&
        consultation.slotId &&
        ObjectId.isValid(consultation.slotId)
      ) {
        const slotObjectId = new ObjectId(
          consultation.slotId
        );

        const slot = await timeSlots.findOne(
          {
            _id: slotObjectId,
            designerId: req.designerId
          },
          { session }
        );

        if (slot) {
          const start = new Date(slot.startTime);
          const end = new Date(slot.endTime);

          const activeConsultations = await consultations
            .find(
              {
                designerId: req.designerId,
                requestStatus: {
                  $in: ['Pending', 'Confirmed']
                },
                slotId: {
                  $exists: true,
                  $ne: null
                }
              },
              { session }
            )
            .toArray();

          const activeSlotIds = activeConsultations
            .filter(item => ObjectId.isValid(item.slotId))
            .map(item => new ObjectId(item.slotId));

          const activeSlots = activeSlotIds.length
            ? await timeSlots
                .find(
                  {
                    _id: {
                      $in: activeSlotIds
                    }
                  },
                  { session }
                )
                .toArray()
            : [];

          const hasOverlap = activeSlots.some(
            activeSlot => {
              const activeStart = new Date(
                activeSlot.startTime
              );

              const activeEnd = new Date(
                activeSlot.endTime
              );

              return (
                start < activeEnd &&
                end > activeStart
              );
            }
          );

          if (!hasOverlap) {
  await timeSlots.updateOne(
    {
      _id: slotObjectId,
      designerId: req.designerId
    },
    {
      $set: {
        isAvailable: true,
        updatedAt: now
      }
    },
    { session }
  );
}
      } }

      outcome = {
        status: 200,
        data: {
          requestId: consultation._id.toString(),
          designerId: req.designerId.toString(),
          requestStatus: nextStatus,
          reviewedAt: now
        }
      };
    });

    if (outcome?.error) {
      return res.status(outcome.status).json({
        success: false,
        error: outcome.error
      });
    }

    if (!outcome?.data) {
      return res.status(500).json({
        success: false,
        error: 'Unable to update consultation.'
      });
    }

    return res.status(200).json({
      success: true,
      message:
        action === 'approve'
          ? 'Consultation approved successfully.'
          : 'Consultation rejected successfully.',
      data: outcome.data
    });
  } catch (error) {
    return sendError(res, error);
  } finally {
    await session.endSession();
  }
}

// STEP 3: Approve a request.
router.patch(
  '/:requestId/approve',
  requireDesigner,
  async (req, res) => {
    return updateConsultationStatus(
      req,
      res,
      'approve'
    );
  }
);

// STEP 4: Reject a request.
router.patch(
  '/:requestId/reject',
  requireDesigner,
  async (req, res) => {
    return updateConsultationStatus(
      req,
      res,
      'reject'
    );
  }
);

module.exports = router;
