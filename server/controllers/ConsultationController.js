
const { ObjectId } = require('mongodb');

class ConsultationController {
  constructor(db, mongoClient) {
    this.db = db;
    this.mongoClient = mongoClient;
  }

  toObjectId(value, fieldName) {
    const id = String(value);

    if (
      !ObjectId.isValid(id) ||
      new ObjectId(id).toString() !== id.toLowerCase()
    ) {
      throw new Error(`Invalid ${fieldName}.`);
    }

    return new ObjectId(id);
  }

  // STEP 1: Retrieve available slots
  async getAvailableSlots(designerId) {
    const designerObjectId = this.toObjectId(
      designerId,
      'designerId'
    );

    const slots = await this.db.collection('timeSlots')
      .find({
        designerId: designerObjectId,
        isAvailable: true
      })
      .sort({ startTime: 1 })
      .toArray();

    const consultations = await this.db
      .collection('consultations')
      .find({
        designerId: designerObjectId,
        requestStatus: {
          $in: ['Pending', 'Confirmed']
        }
      })
      .toArray();

    const bookedSlotIds = consultations
      .filter(item => item.slotId)
      .map(item => this.toObjectId(item.slotId, 'slotId'));

    const bookedSlots = bookedSlotIds.length
      ? await this.db.collection('timeSlots')
          .find({ _id: { $in: bookedSlotIds } })
          .toArray()
      : [];

    return slots
      .filter(slot => {
        const start = new Date(slot.startTime);
        const end = new Date(slot.endTime);

        return !bookedSlots.some(booked => {
          const bookedStart = new Date(booked.startTime);
          const bookedEnd = new Date(booked.endTime);

          return start < bookedEnd && end > bookedStart;
        });
      })
      .map(slot => ({
        slotId: slot._id.toString(),
        designerId: slot.designerId.toString(),
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: true,
        matchScore: slot.matchScore || 0
      }));
  }

  // STEP 2: Rank available slots
  async rankAvailableSlots(designerId, preferredTime) {
    if (!['morning', 'afternoon'].includes(preferredTime)) {
      throw new Error(
        'Preferred time must be morning or afternoon.'
      );
    }

    const slots = await this.getAvailableSlots(designerId);

    return slots
      .map(slot => ({
        ...slot,
        matchScore: this.calculateSlotScore(
          slot,
          preferredTime
        )
      }))
      .sort((a, b) => {
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore;
        }

        return (
          new Date(a.startTime) -
          new Date(b.startTime)
        );
      });
  }

  // STEP 3: Calculate preference score (Singapore time)
  calculateSlotScore(slot, preferredTime) {
    const startTime = new Date(slot.startTime);

    const singaporeHour =
      (startTime.getUTCHours() + 8) % 24;

    const isMorning = singaporeHour < 12;

    if (preferredTime === 'morning') {
      return isMorning ? 100 : 50;
    }

    return isMorning ? 50 : 100;
  }

  // STEP 4: Detect scheduling conflicts
  async detectSchedulingConflict(
    designerId,
    slotId,
    session = undefined
  ) {
    const designerObjectId = this.toObjectId(
      designerId,
      'designerId'
    );

    const slotObjectId = this.toObjectId(
      slotId,
      'slotId'
    );

    const options = session ? { session } : {};

    const selectedSlot = await this.db
      .collection('timeSlots')
      .findOne(
        {
          _id: slotObjectId,
          designerId: designerObjectId
        },
        options
      );

    if (!selectedSlot) {
      throw new Error('Selected time slot not found.');
    }

    if (!selectedSlot.isAvailable) {
      return true;
    }

    const consultations = await this.db
      .collection('consultations')
      .find(
        {
          designerId: designerObjectId,
          requestStatus: {
            $in: ['Pending', 'Confirmed']
          }
        },
        options
      )
      .toArray();

    const selectedStart = new Date(selectedSlot.startTime);
    const selectedEnd = new Date(selectedSlot.endTime);

    for (const consultation of consultations) {
      if (!consultation.slotId) {
        continue;
      }

      const bookedSlot = await this.db
        .collection('timeSlots')
        .findOne(
          {
            _id: this.toObjectId(
              consultation.slotId,
              'slotId'
            )
          },
          options
        );

      if (!bookedSlot) {
        continue;
      }

      const bookedStart = new Date(bookedSlot.startTime);
      const bookedEnd = new Date(bookedSlot.endTime);

      if (
        selectedStart < bookedEnd &&
        selectedEnd > bookedStart
      ) {
        return true;
      }
    }

    return false;
  }

  // STEP 5: Submit consultation request
  async submitConsultationRequest(
    customerId,
    designerId,
    slotId,
    renovationRequirements
  ) {
    if (!this.mongoClient) {
      throw new Error('MongoDB client is required.');
    }

    const customerObjectId = this.toObjectId(
      customerId,
      'customerId'
    );

    const designerObjectId = this.toObjectId(
      designerId,
      'designerId'
    );

    const slotObjectId = this.toObjectId(
      slotId,
      'slotId'
    );

    if (
      typeof renovationRequirements !== 'string' ||
      !renovationRequirements.trim()
    ) {
      throw new Error(
        'Renovation requirements cannot be empty.'
      );
    }

    const session = this.mongoClient.startSession();

    try {
      let createdRequest;

      await session.withTransaction(async () => {
        // Verify customer exists
        const customer = await this.db
          .collection('users')
          .findOne(
            {
              _id: customerObjectId,
              role: 'customer'
            },
            { session }
          );

        if (!customer) {
          throw new Error('Customer not found.');
        }

        // Verify designer exists
        const designer = await this.db
          .collection('users')
          .findOne(
            {
              _id: designerObjectId,
              role: 'interior_designer'
            },
            { session }
          );

        if (!designer) {
          throw new Error('Interior designer not found.');
        }

        // Coordinate bookings for this designer.
        // Concurrent transactions writing this document
        // cannot both commit from the same snapshot.
        const lockResult = await this.db
          .collection('users')
          .updateOne(
            { _id: designerObjectId },
            {
              $inc: {
                consultationBookingVersion: 1
              }
            },
            { session }
          );

        if (lockResult.matchedCount !== 1) {
          throw new Error('Designer not found.');
        }

        // Check slot belongs to designer
        const selectedSlot = await this.db
          .collection('timeSlots')
          .findOne(
            {
              _id: slotObjectId,
              designerId: designerObjectId,
              isAvailable: true
            },
            { session }
          );

        if (!selectedSlot) {
          throw new Error(
            'Selected time slot is no longer available.'
          );
        }

        // Check that slot dates are valid
        const start = new Date(selectedSlot.startTime);
        const end = new Date(selectedSlot.endTime);

        if (
          !Number.isFinite(start.getTime()) ||
          !Number.isFinite(end.getTime()) ||
          end <= start
        ) {
          throw new Error('Invalid time slot dates.');
        }

        if (start <= new Date()) {
          throw new Error(
            'Cannot book a time slot in the past.'
          );
        }

        // Reject existing or overlapping bookings
        const hasConflict =
          await this.detectSchedulingConflict(
            designerId,
            slotId,
            session
          );

        if (hasConflict) {
          throw new Error(
            'Scheduling conflict detected. Please choose another slot.'
          );
        }

        // Reserve slot atomically
        const reservation = await this.db
          .collection('timeSlots')
          .updateOne(
            {
              _id: slotObjectId,
              designerId: designerObjectId,
              isAvailable: true
            },
            {
              $set: {
                isAvailable: false
              }
            },
            { session }
          );

        if (reservation.modifiedCount !== 1) {
          throw new Error(
            'Unable to reserve the selected slot.'
          );
        }

        // Save the consultation request
        const consultation = {
          customerId: customerObjectId,
          designerId: designerObjectId,
          slotId: slotObjectId,
          renovationRequirements:
            renovationRequirements.trim(),
          requestStatus: 'Pending',
          createdAt: new Date()
        };

        const result = await this.db
          .collection('consultations')
          .insertOne(consultation, { session });

        createdRequest = {
          requestId: result.insertedId.toString(),
          customerId: customerObjectId.toString(),
          designerId: designerObjectId.toString(),
          slotId: slotObjectId.toString(),
          renovationRequirements:
            consultation.renovationRequirements,
          requestStatus: consultation.requestStatus
        };
      });

      return createdRequest;

    } finally {
      await session.endSession();
    }
  }

  // STEP 6: Retrieve consultation request status
  async getRequestStatus(requestId) {
    const requestObjectId = this.toObjectId(
      requestId,
      'requestId'
    );

    const consultation = await this.db
      .collection('consultations')
      .findOne({
        _id: requestObjectId
      });

    if (!consultation) {
      throw new Error('Consultation request not found.');
    }

    return {
      requestId: consultation._id.toString(),
      customerId: consultation.customerId.toString(),
      designerId: consultation.designerId.toString(),
      slotId: consultation.slotId.toString(),
      renovationRequirements:
        consultation.renovationRequirements,
      requestStatus: consultation.requestStatus,
      createdAt: consultation.createdAt || null
    };
  }
}

module.exports = ConsultationController;
