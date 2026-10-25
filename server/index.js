const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '.env'),
});

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ message: 'Backend is running' });
});

async function startServer() {
  let client;

  try {
    if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) {
      throw new Error('Missing database settings in server/.env');
    }

    client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    await client.connect();

    const db = client.db(process.env.MONGODB_DB);
    await db.command({ ping: 1 });

    app.locals.db = db;
    console.log('MongoDB connected successfully');

    app.listen(PORT, () => {
      console.log(`Backend running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Database startup failed:', error.name);
    console.error('Check your .env settings and Atlas network access.');

    if (client) {
      await client.close();
    }

    process.exitCode = 1;
  }
}

startServer();