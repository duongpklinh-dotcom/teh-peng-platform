
const express = require('express');
const { ObjectId } = require('mongodb');

const router = express.Router();

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

const MIN_WORK_TIME = 9 * 60;
const MAX_WORK_TIME = 18 * 60;

function isValidTime(value) {
  return (
    typeof value === 'string' &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  );
}

function timeToMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function isValidDate(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function singaporeDate(value) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(value));
}

function singaporeMinutes(value) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date(value));

  const hours = Number(
    parts.find(part => part.type === 'hour')?.value
  );

  const minutes = Number(
    parts.find(part => part.type === 'minute')?.value
  );

  return hours * 60 + minutes;
}

function getSingaporeToday() {
  return singaporeDate(new Date());
}

function getSingaporeDayOfWeek(dateString) {
  return new Date(`${dateString}T00:00:00.000Z`)
    .getUTCDay();
}

function validateWorkingHours(startTime, endTime) {
  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    return 'Working hours must use HH:mm format.';
  }

  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (end <= start) {
    return 'End time must be later than start time.';
  }

  if (start < MIN_WORK_TIME || end > MAX_WORK_TIME) {
    return 'Working hours must be between 09:00 and 18:00.';
  }

  return null;
}

function normalizeWeeklySchedule(weeklySchedule) {
  if (
    !Array.isArray(weeklySchedule) ||
    weeklySchedule.length > 7
  ) {
    throw new Error(
      'weeklySchedule must be an array containing at most 7 days.'
    );
  }

  const seenDays = new Set();

  const normalized = weeklySchedule.map(entry => {
    if (!entry || typeof entry !== 'object') {
      throw new Error('Invalid schedule entry.');
    }

    const {
      dayOfWeek,
      isWorking,
      startTime,
      endTime
    } = entry;

    if (
      !Number.isInteger(dayOfWeek) ||
      dayOfWeek < 0 ||
      dayOfWeek > 6
    ) {
      throw new Error('dayOfWeek must be between 0 and 6.');
    }

    if (seenDays.has(dayOfWeek)) {
      throw new Error('Duplicate day in weekly schedule.');
    }

    seenDays.add(dayOfWeek);

    if (typeof isWorking !== 'boolean') {
      throw new Error('isWorking must be true or false.');
    }

    if (isWorking) {
      const error = validateWorkingHours(
        startTime,
        endTime
      );

      if (error) {
        throw new Error(
          `${DAY_NAMES[dayOfWeek]}: ${error}`
        );
      }
    }

    return {
      dayOfWeek,
      dayName: DAY_NAMES[dayOfWeek],
      isWorking,
      startTime: isWorking ? startTime : null,
      endTime: isWorking ? endTime : null
    };
  });

  return normalized.sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek
  );
}

function normalizeDateOverride(entry) {
  if (!entry || typeof entry !== 'object') {
    throw new Error('Invalid date override.');
  }

  const {
    date,
    isWorking,
    startTime,
    endTime
  } = entry;

  if (!isValidDate(date)) {
    throw new Error('Invalid date. Use YYYY-MM-DD.');
  }

  if (date < getSingaporeToday()) {
    throw new Error('Cannot modify a date in the past.');
  }

  if (typeof isWorking !== 'boolean') {
    throw new Error('isWorking must be true or false.');
  }

  if (isWorking) {
    const error = validateWorkingHours(
      startTime,
      endTime
    );

    if (error) {
      throw new Error(error);
    }
  }

  return {
    date,
    isWorking,
    startTime: isWorking ? startTime : null,
    endTime: isWorking ? endTime : null
  };
}

async function requireDesigner(req, res, next) {
  try {
    const userId = req.session?.userId;

    if (!userId || !ObjectId.isValid(userId)) {
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

async function getActiveAppointments(
  db,
  designerId,
  date = null,
  session = undefined
) {
  const options = session ? { session } : {};

  const consultations = await db
    .collection('consultations')
    .find({
      designerId,
      requestStatus: {
        $in: ['Pending', 'Confirmed']
      }
    }, options)
    .toArray();

  const slotIds = consultations
    .filter(item => item.slotId && ObjectId.isValid(item.slotId))
    .map(item => new ObjectId(item.slotId));

  if (slotIds.length === 0) {
    return [];
  }

  const slots = await db
    .collection('timeSlots')
    .find({
      _id: { $in: slotIds }
    }, options)
    .toArray();

  const slotMap = new Map(
    slots.map(slot => [
      slot._id.toString(),
      slot
    ])
  );

  const appointments = consultations
    .map(consultation => {
      const slot = slotMap.get(
        String(consultation.slotId)
      );

      if (!slot) return null;

      const start = new Date(slot.startTime);
      const end = new Date(slot.endTime);

      if (
        !Number.isFinite(start.getTime()) ||
        !Number.isFinite(end.getTime())
      ) {
        return null;
      }

      return {
        requestId: consultation._id.toString(),
        startTime: start,
        endTime: end
      };
    })
    .filter(Boolean);

  if (!date) return appointments;

  return appointments.filter(appointment =>
    singaporeDate(appointment.startTime) === date ||
    singaporeDate(appointment.endTime - 1) === date
  );
}

function appointmentFitsSchedule(
  appointment,
  date,
  isWorking,
  startTime,
  endTime
) {
  if (!isWorking) return false;

  const appointmentStartDate = singaporeDate(
    appointment.startTime
  );

  const appointmentEndDate = singaporeDate(
    new Date(appointment.endTime.getTime() - 1)
  );

  if (
    appointmentStartDate !== date ||
    appointmentEndDate !== date
  ) {
    return false;
  }

  const start = singaporeMinutes(
    appointment.startTime
  );

  const end = singaporeMinutes(
    appointment.endTime
  );

  return (
    start >= timeToMinutes(startTime) &&
    end <= timeToMinutes(endTime)
  );
}

async function ensureAppointmentsFit(
  db,
  designerId,
  date,
  isWorking,
  startTime,
  endTime,
  session = undefined
) {
  const appointments = await getActiveAppointments(
    db,
    designerId,
    date,
    session
  );

  for (const appointment of appointments) {
    if (
      !appointmentFitsSchedule(
        appointment,
        date,
        isWorking,
        startTime,
        endTime
      )
    ) {
      throw new Error(
        'This availability change conflicts with an existing ' +
        'Pending or Confirmed consultation.'
      );
    }
  }
}

function effectiveHoursForDate(
  date,
  weeklySchedule,
  dateOverrides
) {
  const override = dateOverrides.find(
    item => item.date === date
  );

  if (override) return override;

  const dayOfWeek = getSingaporeDayOfWeek(date);

  return weeklySchedule.find(
    item => item.dayOfWeek === dayOfWeek
  ) || {
    isWorking: false,
    startTime: null,
    endTime: null
  };
}

function sendError(res, error) {
  const message = error.message || 'Unexpected error.';

  const status =
    message.includes('conflicts with an existing')
      ? 409
      : message.startsWith('Invalid') ||
        message.startsWith('Cannot') ||
        message.includes('must be') ||
        message.includes('Duplicate') ||
        message.includes('later than') ||
        message.includes('between') ||
        message.includes('at most')
        ? 400
        : 500;

  res.status(status).json({
    success: false,
    error: status === 500
      ? 'Unable to process designer availability.'
      : message
  });
}

router.get('/mine', requireDesigner, async (req, res) => {
  try {
    const availability = await req.app.locals.db
      .collection('designerAvailability')
      .findOne({
        designerId: req.designerId
      });

    res.json({
      success: true,
      data: {
        weeklySchedule:
          availability?.weeklySchedule || [],
        dateOverrides:
          availability?.dateOverrides || [],
        updatedAt:
          availability?.updatedAt || null
      }
    });
  } catch (error) {
    sendError(res, error);
  }
});

router.put('/mine', requireDesigner, async (req, res) => {
  try {
    const normalizedSchedule = normalizeWeeklySchedule(
      req.body?.weeklySchedule
    );

    const db = req.app.locals.db;
    const client = req.app.locals.mongoClient;

    const session = client.startSession();

    let updatedAt;

    try {
      await session.withTransaction(async () => {
        const availabilityCollection =
          db.collection('designerAvailability');

        const existing = await availabilityCollection
          .findOne(
            { designerId: req.designerId },
            { session }
          );

        const dateOverrides =
          existing?.dateOverrides || [];

        const appointments = await getActiveAppointments(
          db,
          req.designerId,
          null,
          session
        );

        const today = getSingaporeToday();

        for (const appointment of appointments) {
          const date = singaporeDate(
            appointment.startTime
          );

          if (date < today) continue;

          const effective = effectiveHoursForDate(
            date,
            normalizedSchedule,
            dateOverrides
          );

          if (
            !appointmentFitsSchedule(
              appointment,
              date,
              effective.isWorking,
              effective.startTime,
              effective.endTime
            )
          ) {
            throw new Error(
              'This availability change conflicts with an existing ' +
              'Pending or Confirmed consultation.'
            );
          }
        }

        const now = new Date();

        await availabilityCollection.updateOne(
          { designerId: req.designerId },
          {
            $set: {
              weeklySchedule: normalizedSchedule,
              updatedAt: now
            },
            $setOnInsert: {
              designerId: req.designerId,
              createdAt: now
            }
          },
          {
            upsert: true,
            session
          }
        );

        updatedAt = now;
      });
    } finally {
      await session.endSession();
    }

    res.json({
      success: true,
      message: 'Weekly availability saved successfully.',
      data: {
        weeklySchedule: normalizedSchedule,
        updatedAt
      }
    });
  } catch (error) {
    sendError(res, error);
  }
});

router.put('/mine/date', requireDesigner, async (req, res) => {
  try {
    const override = normalizeDateOverride(
      req.body
    );

    const db = req.app.locals.db;
    const client = req.app.locals.mongoClient;
    const session = client.startSession();

    let updatedAt;

    try {
      await session.withTransaction(async () => {
        await ensureAppointmentsFit(
          db,
          req.designerId,
          override.date,
          override.isWorking,
          override.startTime,
          override.endTime,
          session
        );

        const collection =
          db.collection('designerAvailability');

        const existing = await collection.findOne(
          { designerId: req.designerId },
          { session }
        );

        const dateOverrides = (
          existing?.dateOverrides || []
        ).filter(item => item.date !== override.date);

        dateOverrides.push(override);

        dateOverrides.sort(
          (a, b) => a.date.localeCompare(b.date)
        );

        const now = new Date();

        await collection.updateOne(
          { designerId: req.designerId },
          {
            $set: {
              dateOverrides,
              updatedAt: now
            },
            $setOnInsert: {
              designerId: req.designerId,
              createdAt: now
            }
          },
          {
            upsert: true,
            session
          }
        );

        updatedAt = now;
      });
    } finally {
      await session.endSession();
    }

    res.json({
      success: true,
      message: 'Date availability saved successfully.',
      data: {
        dateOverride: override,
        updatedAt
      }
    });
  } catch (error) {
    sendError(res, error);
  }
});

router.delete('/mine/date/:date', requireDesigner, async (req, res) => {
  try {
    const date = req.params.date;

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date. Use YYYY-MM-DD.'
      });
    }

    if (date < getSingaporeToday()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot modify a date in the past.'
      });
    }

    const db = req.app.locals.db;
    const client = req.app.locals.mongoClient;
    const session = client.startSession();

    let updatedAt;

    try {
      await session.withTransaction(async () => {
        const collection =
          db.collection('designerAvailability');

        const existing = await collection.findOne(
          { designerId: req.designerId },
          { session }
        );

        const weeklySchedule =
          existing?.weeklySchedule || [];

        const effective = effectiveHoursForDate(
          date,
          weeklySchedule,
          []
        );

        await ensureAppointmentsFit(
          db,
          req.designerId,
          date,
          effective.isWorking,
          effective.startTime,
          effective.endTime,
          session
        );

        const dateOverrides = (
          existing?.dateOverrides || []
        ).filter(item => item.date !== date);

        const now = new Date();

        await collection.updateOne(
          { designerId: req.designerId },
          {
            $set: {
              dateOverrides,
              updatedAt: now
            }
          },
          { session }
        );

        updatedAt = now;
      });
    } finally {
      await session.endSession();
    }

    res.json({
      success: true,
      message: 'Date override removed successfully.',
      data: {
        date,
        updatedAt
      }
    });
  } catch (error) {
    sendError(res, error);
  }
});

module.exports = router;
