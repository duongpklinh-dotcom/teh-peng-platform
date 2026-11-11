
const { ObjectId } = require('mongodb');

const ACTIVE_STATUSES = ['Pending', 'Confirmed'];
const HOUR_MS = 60 * 60 * 1000;
const HALF_HOUR_MS = 30 * 60 * 1000;
const SGT_OFFSET_MS = 8 * HOUR_MS;

class ConsultationController {
  constructor(db, mongoClient) {
    this.db = db;
    this.mongoClient = mongoClient;
  }

  toObjectId(value, fieldName) {
    const id = String(value);
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      throw new Error(`Invalid ${fieldName}.`);
    }
    return new ObjectId(id);
  }

  // Dates and working hours use Singapore time (UTC+08:00).
  singaporeParts(value) {
    const date = new Date(value);
    const local = new Date(date.getTime() + SGT_OFFSET_MS);

    return {
      date: local.toISOString().slice(0, 10),
      dayOfWeek: local.getUTCDay(),
      minutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
      seconds: local.getUTCSeconds(),
      milliseconds: local.getUTCMilliseconds()
    };
  }

  isValidDate(date) {
    if (
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return false;
    }

    const parsed = new Date(`${date}T00:00:00.000Z`);

    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === date
    );
  }

  timeMinutes(time) {
    if (
      typeof time !== 'string' ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
    ) {
      return null;
    }

    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  async getSchedule(designerId, session = undefined) {
    const options = session ? { session } : {};

    return this.db.collection('designerAvailability').findOne(
      {
        designerId: this.toObjectId(designerId, 'designerId')
      },
      options
    );
  }

  effectiveHours(schedule, date) {
    const override = (schedule?.dateOverrides || [])
      .find(item => item.date === date);

    if (override) return override;

    const dayOfWeek = new Date(
      `${date}T00:00:00.000Z`
    ).getUTCDay();

    return (schedule?.weeklySchedule || [])
      .find(item => item.dayOfWeek === dayOfWeek) || {
        isWorking: false,
        startTime: null,
        endTime: null
      };
  }

  fitsWorkingHours(start, end, schedule) {
    const startParts = this.singaporeParts(start);

    const endParts = this.singaporeParts(
      new Date(end.getTime() - 1)
    );

    if (startParts.date !== endParts.date) {
      return false;
    }

    const hours = this.effectiveHours(
      schedule,
      startParts.date
    );

    if (!hours.isWorking) return false;

    const opening = this.timeMinutes(hours.startTime);
    const closing = this.timeMinutes(hours.endTime);

    if (opening === null || closing === null) {
      return false;
    }

    return (
      startParts.minutes >= opening &&
      startParts.minutes +
        (end.getTime() - start.getTime()) / 60000 <= closing
    );
  }

  async getBookedSlots(designerId, session = undefined) {
    const options = session ? { session } : {};

    const designerObjectId = this.toObjectId(
      designerId,
      'designerId'
    );

    const bookings = await this.db
      .collection('consultations')
      .find({
        designerId: designerObjectId,
        requestStatus: { $in: ACTIVE_STATUSES }
      }, options)
      .toArray();

    const ids = bookings
      .filter(item => item.slotId)
      .map(item => this.toObjectId(item.slotId, 'slotId'));

    if (!ids.length) return [];

    return this.db.collection('timeSlots')
      .find({ _id: { $in: ids } }, options)
      .toArray();
  }

  overlaps(start, end, slot) {
    return (
      start < new Date(slot.endTime) &&
      end > new Date(slot.startTime)
    );
  }
// TDD: Validate that a consultation lasts exactly 60 minutes.
  isValidDuration(start, end) {
    if (!(start instanceof Date) || !(end instanceof Date)) {
      return false;
    }

    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime())
    ) {
      return false;
    }

    return end.getTime() - start.getTime() === HOUR_MS;
  }
  // Generate one-hour appointments at 30-minute intervals.
  // Booked appointments remain visible but unavailable.
  async getCalendarSlots(designerId, date) {
    if (!this.isValidDate(date)) {
      throw new Error('Invalid date. Use YYYY-MM-DD.');
    }

    const designerObjectId = this.toObjectId(
      designerId,
      'designerId'
    );

    const designer = await this.db
      .collection('users')
      .findOne({
        _id: designerObjectId,
        role: 'interior_designer',
        accountStatus: 'active'
      });

    if (!designer) {
      throw new Error('Interior designer not found.');
    }

    const schedule = await this.getSchedule(designerId);
    const hours = this.effectiveHours(schedule, date);

    const opening = this.timeMinutes(hours.startTime);
    const closing = this.timeMinutes(hours.endTime);

    const result = {
      date,
      designerId,
      isWorking: Boolean(hours.isWorking),
      startTime: hours.isWorking ? hours.startTime : null,
      endTime: hours.isWorking ? hours.endTime : null,
      slots: []
    };

    if (
      !hours.isWorking ||
      opening === null ||
      closing === null
    ) {
      return result;
    }

    const booked = await this.getBookedSlots(designerId);
    const now = Date.now();

    const dayStartUTC =
      Date.parse(`${date}T00:00:00.000Z`) -
      SGT_OFFSET_MS;

    for (
      let minute = opening;
      minute + 60 <= closing;
      minute += 30
    ) {
      const start = new Date(
        dayStartUTC + minute * 60000
      );

      const end = new Date(
        start.getTime() + HOUR_MS
      );

      const isPast = start.getTime() <= now;

      const isBooked = booked.some(slot =>
        this.overlaps(start, end, slot)
      );

      result.slots.push({
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        available: !isPast && !isBooked,
        status: isPast
          ? 'past'
          : isBooked
            ? 'booked'
            : 'available'
      });
    }

    return result;
  }

  async getAvailableSlots(designerId) {
    const designerObjectId = this.toObjectId(
      designerId,
      'designerId'
    );

    const [slots, booked, schedule] = await Promise.all([
      this.db.collection('timeSlots')
        .find({
            designerId: designerObjectId,
            isAvailable: true,
            bookingSource: {
          $ne: 'customer-custom'
  }
})
        .sort({ startTime: 1 })
        .toArray(),

      this.getBookedSlots(designerId),
      this.getSchedule(designerId)
    ]);

    return slots
      .filter(slot => {
        const start = new Date(slot.startTime);
        const end = new Date(slot.endTime);

        return (
          start > new Date() &&
          end > start &&
          this.fitsWorkingHours(start, end, schedule) &&
          !booked.some(item =>
            this.overlaps(start, end, item)
          )
        );
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

  calculateSlotScore(slot, preferredTime) {
    const hour = Math.floor(
      this.singaporeParts(slot.startTime).minutes / 60
    );

    const morning = hour < 12;

    return preferredTime === 'morning'
      ? (morning ? 100 : 50)
      : (morning ? 50 : 100);
  }

  async rankAvailableSlots(designerId, preferredTime) {
    if (
      !['morning', 'afternoon'].includes(preferredTime)
    ) {
      throw new Error(
        'Invalid preferred consultation period.'
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
      .sort(
        (a, b) =>
          b.matchScore - a.matchScore ||
          new Date(a.startTime) - new Date(b.startTime)
      );
  }

  async detectSchedulingConflict(
    designerId,
    slotId,
    session = undefined
  ) {
    const options = session ? { session } : {};

    const slot = await this.db
      .collection('timeSlots')
      .findOne({
        _id: this.toObjectId(slotId, 'slotId'),
        designerId: this.toObjectId(
          designerId,
          'designerId'
        )
      }, options);

    if (!slot) {
      throw new Error('Selected time slot not found.');
    }

    if (!slot.isAvailable) return true;

    const booked = await this.getBookedSlots(
      designerId,
      session
    );

    return booked.some(item =>
      this.overlaps(
        new Date(slot.startTime),
        new Date(slot.endTime),
        item
      )
    );
  }

  async validateBookingActors(
    customerId,
    designerId,
    session
  ) {
    const users = this.db.collection('users');

    const customer = await users.findOne({
      _id: this.toObjectId(customerId, 'customerId'),
      role: 'customer',
      accountStatus: 'active'
    }, { session });

    if (!customer) {
      throw new Error('Customer not found.');
    }

    const designer = await users.findOne({
      _id: this.toObjectId(designerId, 'designerId'),
      role: 'interior_designer',
      accountStatus: 'active'
    }, { session });

    if (!designer) {
      throw new Error('Interior designer not found.');
    }

    // Coordinate booking transactions for this designer.
    const lock = await users.updateOne(
      { _id: designer._id },
      {
        $inc: {
          consultationBookingVersion: 1
        }
      },
      { session }
    );

    if (lock.matchedCount !== 1) {
      throw new Error('Designer not found.');
    }
  }

  validateRequirements(value) {
    if (
      typeof value !== 'string' ||
      !value.trim() ||
      value.length > 2000
    ) {
      throw new Error('Invalid renovation requirements.');
    }

    return value.trim();
  }

  async submitConsultationRequest(
    customerId,
    designerId,
    slotId,
    renovationRequirements
  ) {
    if (!this.mongoClient) {
      throw new Error('MongoDB client is required.');
    }

    const requirements = this.validateRequirements(
      renovationRequirements
    );

    const slotObjectId = this.toObjectId(
      slotId,
      'slotId'
    );

    const designerObjectId = this.toObjectId(
      designerId,
      'designerId'
    );

    const customerObjectId = this.toObjectId(
      customerId,
      'customerId'
    );

    const session = this.mongoClient.startSession();

    try {
      let createdRequest;

      await session.withTransaction(async () => {
        await this.validateBookingActors(
          customerId,
          designerId,
          session
        );

        const slot = await this.db
          .collection('timeSlots')
          .findOne({
            _id: slotObjectId,
            designerId: designerObjectId,
            isAvailable: true
          }, { session });

        if (!slot) {
          throw new Error(
            'Selected time slot is no longer available.'
          );
        }

        const start = new Date(slot.startTime);
        const end = new Date(slot.endTime);

        
if (
  !Number.isFinite(start.getTime()) ||
  !Number.isFinite(end.getTime()) ||
  !this.isValidDuration(start, end)
) {
  throw new Error('Invalid time slot dates.');
}

        if (start <= new Date()) {
          throw new Error(
            'Cannot book a time slot in the past.'
          );
        }

        const schedule = await this.getSchedule(
          designerId,
          session
        );

        if (!this.fitsWorkingHours(start, end, schedule)) {
          throw new Error(
            'Selected time slot is no longer available under the designer schedule.'
          );
        }

        if (
          await this.detectSchedulingConflict(
            designerId,
            slotId,
            session
          )
        ) {
          throw new Error(
            'Scheduling conflict detected. Please choose another slot.'
          );
        }

        const reserved = await this.db
          .collection('timeSlots')
          .updateOne({
            _id: slotObjectId,
            designerId: designerObjectId,
            isAvailable: true
          }, {
            $set: {
              isAvailable: false
            }
          }, { session });

        if (reserved.modifiedCount !== 1) {
          throw new Error(
            'Unable to reserve the selected slot.'
          );
        }

        const consultation = {
          customerId: customerObjectId,
          designerId: designerObjectId,
          slotId: slotObjectId,
          renovationRequirements: requirements,
          requestStatus: 'Pending',
          bookingMethod: 'available-slot',
          createdAt: new Date()
        };

        const result = await this.db
          .collection('consultations')
          .insertOne(consultation, { session });

        createdRequest = {
          requestId: result.insertedId.toString(),
          customerId,
          designerId,
          slotId,
          startTime: start,
          endTime: end,
          renovationRequirements: requirements,
          requestStatus: 'Pending',
          bookingMethod: 'available-slot'
        };
      });

      return createdRequest;
    } catch (error) {
      if (
        error.hasErrorLabel?.('TransientTransactionError') ||
        error.code === 112
      ) {
        throw new Error(
          'Scheduling conflict or concurrent booking detected. Please try again.'
        );
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  async submitCustomConsultationRequest(
    customerId,
    designerId,
    startTime,
    renovationRequirements
  ) {
    if (!this.mongoClient) {
      throw new Error('MongoDB client is required.');
    }

    const requirements = this.validateRequirements(
      renovationRequirements
    );

    if (
      typeof startTime !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(startTime)
    ) {
      throw new Error(
        'Invalid appointment date or time.'
      );
    }

    const start = new Date(startTime);

    if (!Number.isFinite(start.getTime())) {
      throw new Error(
        'Invalid appointment date or time.'
      );
    }

    const end = new Date(
      start.getTime() + HOUR_MS
    );

    if (start <= new Date()) {
      throw new Error(
        'Cannot book a time slot in the past.'
      );
    }

    const parts = this.singaporeParts(start);

    if (
      ![0, 30].includes(parts.minutes % 60) ||
      parts.seconds ||
      parts.milliseconds
    ) {
      throw new Error(
        'Invalid appointment time. Please select a 30-minute interval.'
      );
    }

    const designerObjectId = this.toObjectId(
      designerId,
      'designerId'
    );

    const customerObjectId = this.toObjectId(
      customerId,
      'customerId'
    );

    const session = this.mongoClient.startSession();

    try {
      let createdRequest;

      await session.withTransaction(async () => {
        await this.validateBookingActors(
          customerId,
          designerId,
          session
        );

        const schedule = await this.getSchedule(
          designerId,
          session
        );

        if (!this.fitsWorkingHours(start, end, schedule)) {
          throw new Error(
            'Selected appointment is no longer available under the designer schedule.'
          );
        }

        const booked = await this.getBookedSlots(
          designerId,
          session
        );

        if (
          booked.some(slot =>
            this.overlaps(start, end, slot)
          )
        ) {
          throw new Error(
            'Scheduling conflict detected. The designer already has a consultation during your selected time. Please choose another date or time.'
          );
        }

        const slotResult = await this.db
          .collection('timeSlots')
          .insertOne({
            designerId: designerObjectId,
            startTime: start,
            endTime: end,
            isAvailable: false,
            matchScore: 0,
            bookingSource: 'customer-custom',
            createdAt: new Date()
          }, { session });

        const consultation = {
          customerId: customerObjectId,
          designerId: designerObjectId,
          slotId: slotResult.insertedId,
          renovationRequirements: requirements,
          requestStatus: 'Pending',
          bookingMethod: 'custom',
          createdAt: new Date()
        };

        const result = await this.db
          .collection('consultations')
          .insertOne(consultation, { session });

        createdRequest = {
          requestId: result.insertedId.toString(),
          customerId,
          designerId,
          slotId: slotResult.insertedId.toString(),
          startTime: start,
          endTime: end,
          requestStatus: 'Pending',
          bookingMethod: 'custom'
        };
      });

      return createdRequest;
    } catch (error) {
      if (
        error.hasErrorLabel?.('TransientTransactionError') ||
        error.code === 112
      ) {
        throw new Error(
          'Scheduling conflict or concurrent booking detected. Please check availability and try again.'
        );
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  async getRequestStatus(requestId) {
    const consultation = await this.db
      .collection('consultations')
      .findOne({
        _id: this.toObjectId(requestId, 'requestId')
      });

    if (!consultation) {
      throw new Error(
        'Consultation request not found.'
      );
    }

    return {
      requestId: consultation._id.toString(),
      customerId: consultation.customerId.toString(),
      designerId: consultation.designerId.toString(),
      slotId: consultation.slotId?.toString() || null,
      renovationRequirements:
        consultation.renovationRequirements,
      requestStatus: consultation.requestStatus,
      createdAt: consultation.createdAt || null
    };
  }
}

module.exports = ConsultationController;
