// Generates random test data for the Platform Management demo.
//   - 8 IDP categories
//   - 300 project views and 120 shortlists spread over the last 3 weeks,
//     attached to existing published projects (so reports have data to show).
// Run from the server folder:  node seedPlatformManagementData.js
// Safe to re-run: seeded rows are tagged seeded:true and replaced each time.

const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const CATEGORY_NAMES = [
  ['Modern', 'Clean lines and contemporary finishes'],
  ['Scandinavian', 'Light woods, neutral tones, cosy textiles'],
  ['Minimalist', 'Fewer pieces, more space'],
  ['Industrial', 'Exposed brick, metal and concrete'],
  ['Contemporary', 'Current trends with a flexible palette'],
  ['Japandi', 'Japanese minimalism meets Nordic warmth'],
  ['Traditional', 'Classic detailing and warm colours'],
  ['Luxury', 'Premium materials and bespoke joinery']
];

const rand = max => Math.floor(Math.random() * max);

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB);

  const projects = await db.collection('projects').find({}, { projection: { _id: 1 } }).toArray();
  if (projects.length === 0) {
    throw new Error('No projects found. Add some projects first, then re-run this script.');
  }

  await db.collection('categories').deleteMany({ seeded: true });
  await db.collection('categories').insertMany(
    CATEGORY_NAMES.map(([name, description], i) => ({
      name, description,
      status: i === 7 ? 'suspended' : 'active',
      nameKey: name.toLowerCase(),
      seeded: true,
      createdAt: new Date(), updatedAt: new Date()
    })),
    { ordered: false }
  ).catch(error => console.log('Some categories already exist, skipped:', error.message));

  const now = Date.now();
  const randomTime = () => new Date(now - rand(21 * 24 * 3600 * 1000));
  const pick = () => projects[rand(projects.length)]._id;

  await db.collection('projectViews').deleteMany({ seeded: true });
  await db.collection('shortlists').deleteMany({ seeded: true });

  await db.collection('projectViews').insertMany(
    Array.from({ length: 300 }, () => ({ projectId: pick(), viewedAt: randomTime(), seeded: true }))
  );
  await db.collection('shortlists').insertMany(
    Array.from({ length: 120 }, () => ({ projectId: pick(), shortlistedAt: randomTime(), seeded: true }))
  );

  console.log('Seeded 8 categories, 300 project views and 120 shortlists.');
  await client.close();
}

main().catch(error => { console.error(error); process.exitCode = 1; });
