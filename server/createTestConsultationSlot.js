
require('dotenv').config();

const { MongoClient, ObjectId } = require('mongodb');

async function createTestConsultationSlot() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();

    const db = client.db(process.env.MONGODB_DB);

    const designerId = new ObjectId(
      '6adfdb222ce3e5f09a648b5f'
    );

    const designer = await db.collection('users').findOne({
      _id: designerId,
      role: 'interior_designer'
    });

    if (!designer) {
      throw new Error('Test Designer not found.');
    }

    // 10 AM Singapore = 2 AM UTC
    const startTime = new Date(
      '2026-12-05T02:00:00.000Z'
    );

    const endTime = new Date(
      '2026-12-05T03:00:00.000Z'
    );

    const existingSlot = await db
      .collection('timeSlots')
      .findOne({
        designerId,
        startTime,
        endTime
      });

    if (existingSlot) {
      console.log(
        'A slot already exists for this designer and time.'
      );
      console.log(
        'Slot ID:',
        existingSlot._id.toString()
      );
      console.log(
        'Available:',
        existingSlot.isAvailable
      );
      return;
    }

    const result = await db.collection('timeSlots')
      .insertOne({
        designerId,
        startTime,
        endTime,
        isAvailable: true,
        matchScore: 0,
        testOnly: true,
        createdAt: new Date()
      });

    console.log('Test consultation slot created!');
    console.log(
      'Slot ID:',
      result.insertedId.toString()
    );
    console.log('Designer:', designer.name);
    console.log(
      'Date: 5 December 2026'
    );
    console.log(
      'Time: 10:00 AM – 11:00 AM Singapore'
    );

  } catch (error) {
    console.error(
      'Unable to create test slot:',
      error.message
    );
    process.exitCode = 1;

  } finally {
    await client.close();
  }
}

createTestConsultationSlot();
