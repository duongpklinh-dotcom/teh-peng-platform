
require('dotenv').config();

const { MongoClient, ObjectId } = require('mongodb');
const ConsultationController = require(
  './controllers/ConsultationController'
);

async function testConsultationBooking() {
  const client = new MongoClient(process.env.MONGODB_URI);

  const testSlotId = new ObjectId();
  let createdRequestId = null;
  let testSlotInserted = false;
  let allTestsPassed = true;

  try {
    await client.connect();

    const db = client.db(process.env.MONGODB_DB);

    const controller = new ConsultationController(
      db,
      client
    );

    console.log('\n===== DATABASE CONNECTION =====');
    console.log('MongoDB connected successfully.');

    // STEP 1: Find test customer and designer
    const customer = await db.collection('users').findOne({
      role: 'customer'
    });

    const designer = await db.collection('users').findOne({
      role: 'interior_designer'
    });

    if (!customer || !designer) {
      throw new Error(
        'Test customer or interior designer not found.'
      );
    }

    const customerId = customer._id.toString();
    const designerId = designer._id.toString();

    console.log('\n===== TEST USERS =====');
    console.log('Customer:', customer.name);
    console.log('Designer:', designer.name);

    // STEP 2: Confirm existing occupied slots are hidden
    console.log('\n===== AVAILABLE SLOTS CHECK =====');

    const availableSlots =
      await controller.getAvailableSlots(designerId);

    console.log(
      'Available slots:',
      availableSlots.length
    );

    // STEP 3: Create a temporary future slot
    // Choose a time beyond existing bookings.
    const existingSlots = await db
      .collection('timeSlots')
      .find({ designerId: designer._id })
      .toArray();

    const latestEnd = existingSlots.reduce(
      (latest, slot) => {
        const end = new Date(slot.endTime).getTime();

        return Number.isFinite(end)
          ? Math.max(latest, end)
          : latest;
      },
      Date.now()
    );

    // Start at least 30 days in the future,
    // or 2 days after the latest existing slot.
    const startTime = new Date(
      Math.max(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
        latestEnd + 2 * 24 * 60 * 60 * 1000
      )
    );

    const endTime = new Date(
      startTime.getTime() + 60 * 60 * 1000
    );

    const testSlot = {
      _id: testSlotId,
      designerId: designer._id,
      startTime,
      endTime,
      isAvailable: true,
      matchScore: 0,
      testOnly: true
    };

    await db.collection('timeSlots').insertOne(testSlot);
    testSlotInserted = true;

    console.log('\n===== TEMPORARY TEST SLOT =====');
    console.log('Slot ID:', testSlotId.toString());
    console.log('Start:', startTime);
    console.log('End:', endTime);

    // STEP 4: Confirm the new slot is available
    const conflictBefore =
      await controller.detectSchedulingConflict(
        designerId,
        testSlotId.toString()
      );

    console.log('\n===== BEFORE BOOKING =====');
    console.log('Conflict detected:', conflictBefore);

    if (conflictBefore) {
      throw new Error(
        'Temporary test slot already conflicts with a booking.'
      );
    }

    // STEP 5: Submit consultation request
    console.log('\n===== SUBMIT CONSULTATION =====');

    const result =
      await controller.submitConsultationRequest(
        customerId,
        designerId,
        testSlotId.toString(),
        'TEST ONLY: Modern minimalist HDB renovation.'
      );

    createdRequestId = result.requestId;

    console.log('Created request:', result);

    if (result.requestStatus !== 'Pending') {
      throw new Error(
        'New consultation was not saved as Pending.'
      );
    }

    console.log('PASS: Consultation request created.');

    // STEP 6: Retrieve consultation status
    console.log('\n===== REQUEST STATUS TEST =====');

    const status =
      await controller.getRequestStatus(
        createdRequestId
      );

    console.log('Request status:', status.requestStatus);

    if (status.requestStatus !== 'Pending') {
      throw new Error('Incorrect request status.');
    }

    console.log('PASS: Request status retrieved.');

    // STEP 7: Verify slot is no longer available
    console.log('\n===== SLOT RESERVATION TEST =====');

    const reservedSlot = await db
      .collection('timeSlots')
      .findOne({ _id: testSlotId });

    console.log(
      'Slot isAvailable:',
      reservedSlot.isAvailable
    );

    if (reservedSlot.isAvailable !== false) {
      throw new Error('Slot was not reserved.');
    }

    console.log('PASS: Slot reserved.');

    // STEP 8: Verify conflict detection after booking
    console.log('\n===== CONFLICT AFTER BOOKING =====');

    const conflictAfter =
      await controller.detectSchedulingConflict(
        designerId,
        testSlotId.toString()
      );

    console.log('Conflict detected:', conflictAfter);

    if (!conflictAfter) {
      throw new Error(
        'Booked slot was not detected as occupied.'
      );
    }

    console.log('PASS: Conflict detected.');

    // STEP 9: Attempt to book same slot again
    console.log('\n===== DOUBLE BOOKING TEST =====');

    let doubleBookingRejected = false;

    try {
      await controller.submitConsultationRequest(
        customerId,
        designerId,
        testSlotId.toString(),
        'TEST ONLY: Attempting duplicate booking.'
      );
    } catch (error) {
      doubleBookingRejected = true;
      console.log('Booking rejected:', error.message);
    }

    if (!doubleBookingRejected) {
      throw new Error(
        'Double booking was incorrectly accepted.'
      );
    }

    console.log('PASS: Double booking rejected.');

    console.log('\n===== ALL BOOKING TESTS PASSED =====');

  } catch (error) {
    allTestsPassed = false;

    console.error('\n===== TEST FAILED =====');
    console.error(error);

  } finally {
    // Remove only records created by this test.
    try {
      const db = client.db(process.env.MONGODB_DB);

      console.log('\n===== TEST CLEANUP =====');

      if (createdRequestId) {
        await db.collection('consultations').deleteOne({
          _id: new ObjectId(createdRequestId),
          slotId: testSlotId,
          renovationRequirements:
            'TEST ONLY: Modern minimalist HDB renovation.'
        });

        console.log('Temporary consultation removed.');
      }

      if (testSlotInserted) {
        await db.collection('timeSlots').deleteOne({
          _id: testSlotId,
          testOnly: true
        });

        console.log('Temporary time slot removed.');
      }

      console.log('Cleanup completed.');

    } catch (cleanupError) {
      allTestsPassed = false;
      console.error('Cleanup failed:', cleanupError);
    }

    await client.close();

    if (!allTestsPassed) {
      process.exitCode = 1;
    }
  }
}

testConsultationBooking();
