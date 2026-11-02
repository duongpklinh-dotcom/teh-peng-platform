
const { ObjectId } = require('mongodb');

class ConsultationController {
  constructor(db) {
    this.db = db;
  }

  // Validate a MongoDB ObjectId
  toObjectId(value, fieldName) {
    if (
      !ObjectId.isValid(value) ||
      new ObjectId(value).toString() !== String(value).toLowerCase()
    ) {
      throw new Error(`Invalid ${fieldName}.`);
    }

    return new ObjectId(value);
  }

  // Find time slots that are not occupied by active consultations
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
      .map(item => item.slotId)
      .filter(Boolean)
      .map(id => this.toObjectId(id, 'slotId'));

    const bookedSlots = await this.db
      .collection('timeSlots')
      .find({
        _id: { $in: bookedSlotIds }
      })
      .toArray();

    const availableSlots = slots.filter(slot => {
      const start = new Date(slot.startTime);
      const end = new Date(slot.endTime);

      return !bookedSlots.some(bookedSlot => {
        const bookedStart = new Date(bookedSlot.startTime);
        const bookedEnd = new Date(bookedSlot.endTime);

        return start < bookedEnd && end > bookedStart;
      });
    });

    return availableSlots.map(slot => ({
      slotId: slot._id.toString(),
      designerId: slot.designerId.toString(),
      startTime: slot.startTime,
      endTime: slot.endTime,
      isAvailable: slot.isAvailable,
      matchScore: slot.matchScore || 0
    }));
  }

  // Rank slots according to morning or afternoon preference
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

  // Calculate score using Singapore time (UTC+8)
  calculateSlotScore(slot, preferredTime) {
    const startTime = new Date(slot.startTime);
    const singaporeHour =
      (startTime.getUTCHours() + 8) % 24;

    const isMorning = singaporeHour < 12;

    if (preferredTime === 'morning' && isMorning) {
      return 100;
    }

    if (preferredTime === 'afternoon' && !isMorning) {
      return 100;
    }

    return 50;
  }

  // Check whether a slot overlaps with an existing booking
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

    const selectedStart = new Date(
      selectedSlot.startTime
    );

    const selectedEnd = new Date(
      selectedSlot.endTime
    );

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

      const bookedStart = new Date(
        bookedSlot.startTime
      );

      const bookedEnd = new Date(
        bookedSlot.endTime
      );

      if (
        selectedStart < bookedEnd &&
        selectedEnd > bookedStart
      ) {
        return true;
      }
    }

    return false;
  }

  // Submit and save a consultation request
  async submitConsultationRequest(
    customerId,
    designerId,
    slotId,
    renovationRequirements
  ) {
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

    const client = this.db.client;

    if (!client) {
      throw new Error(
        'MongoDB client is unavailable for booking transaction.'
      );
    }

    const session = client.startSession();

    try {
      let createdRequest = null;

      await session.withTransaction(async () => {
        // Validate customer
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

        // Validate designer
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

        // Update the designer document to serialize
        // concurrent booking transactions for this designer.
        await this.db.collection('users').updateOne(
          { _id: designerObjectId },
          {
            $inc: {
              consultationBookingVersion: 1
            }
          },
          { session }
        );

        // Check the slot is valid and still available
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

        // Check overlapping Pending or Confirmed bookings
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

        // Reserve the selected slot
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

        // Create consultation request
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
          .insertOne(
            consultation,
            { session }
          );

        createdRequest = {
          requestId: result.insertedId.toString(),
          customerId: customerId.toString(),
          designerId: designerId.toString(),
          slotId: slotId.toString(),
          renovationRequirements:
            consultation.renovationRequirements,
          requestStatus: 'Pending'
        };
      });

      return createdRequest;

    } finally {
      await session.endSession();
    }
  }

  // Retrieve the status of a consultation request
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
