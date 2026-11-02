
require('dotenv').config();

const { MongoClient, ObjectId } = require('mongodb');

// Existing development designer
const DESIGNER_ID = '6adfdb222ce3e5f09a648b5f';

// Dates and times in Singapore (UTC+8)
const DEMO_DATES = [
  '2026-12-07',
  '2026-12-08',
  '2026-12-09'
];

const DEMO_HOURS = [9, 11, 14, 16];

function singaporeDateToUTC(date, hour) {
  const paddedHour = String(hour).padStart(2, '0');

  return new Date(
    `${date}T${paddedHour}:00:00+08:00`
  );
}

async function seedConsultationSlots() {
  if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) {
    throw new Error(
      'Missing MONGODB_URI or MONGODB_DB in .env'
    );
  }

  const client = new MongoClient(
    process.env.MONGODB_URI
  );

  try {
    await client.connect();

    const db = client.db(process.env.MONGODB_DB);
    const designerId = new ObjectId(DESIGNER_ID);

    // Verify the test designer exists
    const designer = await db.collection('users').findOne({
      _id: designerId,
      role: 'interior_designer'
    });

    if (!designer) {
      throw new Error(
        'Test Designer not found in MongoDB.'
      );
    }

    console.log('\n===== SEED CONSULTATION SLOTS =====');
    console.log('Designer:', designer.name);
    console.log('Database:', process.env.MONGODB_DB);

    let created = 0;
    let skipped = 0;

    for (const date of DEMO_DATES) {
      for (const hour of DEMO_HOURS) {
        const startTime = singaporeDateToUTC(
          date,
          hour
        );

        const endTime = new Date(
          startTime.getTime() + 60 * 60 * 1000
        );

        // Avoid duplicate slots if the script is run again
        const existingSlot = await db
          .collection('timeSlots')
          .findOne({
            designerId,
            startTime,
            endTime
          });

        if (existingSlot) {
          console.log(
            `SKIPPED: ${date} ${hour}:00 (already exists)`
          );
          skipped++;
          continue;
        }

        // Avoid creating slots that overlap existing ones
        const overlappingSlot = await db
          .collection('timeSlots')
          .findOne({
            designerId,
            startTime: { $lt: endTime },
            endTime: { $gt: startTime }
          });

        if (overlappingSlot) {
          console.log(
            `SKIPPED: ${date} ${hour}:00 (overlaps another slot)`
          );
          skipped++;
          continue;
        }

        await db.collection('timeSlots').insertOne({
          designerId,
          startTime,
          endTime,
          isAvailable: true,
          matchScore: 0,
          testOnly: true,
          seedSource: 'consultation-demo',
          createdAt: new Date()
        });

        console.log(
          `CREATED: ${date} ${String(hour).padStart(2, '0')}:00 Singapore`
        );

        created++;
      }
    }

    console.log('\n===== SEED SUMMARY =====');
    console.log('Created:', created);
    console.log('Skipped:', skipped);
    console.log('Total requested:', DEMO_DATES.length * DEMO_HOURS.length);
    console.log('Done!');

  } catch (error) {
    console.error('Seeding failed:', error);
    process.exitCode = 1;

  } finally {
    await client.close();
  }
}

seedConsultationSlots();
