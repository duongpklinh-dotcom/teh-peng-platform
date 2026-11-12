
const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;

const {
  csrfSynchronisedProtection
} = require('./middleware/csrf');

const projectRoutes = require('./routes/projects');
const authRoutes = require('./routes/auth');
const consultationRoutes = require('./routes/consultations');
const adminRoutes = require('./routes/admin');
const categoryRoutes = require('./routes/categories');
const reportRoutes = require('./routes/reports');

require('dotenv').config({
  path: path.join(__dirname, '.env'),
});

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());

// Serve uploaded project images
app.use(
  '/uploads/projects',
  express.static(path.join(__dirname, 'uploads/projects'))
);

app.get('/api/health', (req, res) => {
  res.json({
    message: 'Backend is running'
  });
});

async function startServer() {
  let client;

  try {
    if (
      !process.env.MONGODB_URI ||
      !process.env.MONGODB_DB ||
      !process.env.SESSION_SECRET
    ) {
      throw new Error(
        'Missing required environment settings'
      );
    }

    client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    await client.connect();

    const db = client.db(process.env.MONGODB_DB);

    await db.command({ ping: 1 });

    await db.collection('users').createIndex(
      { email: 1 },
      { unique: true }
    );

    // Platform Management: category names must be unique (case-insensitive).
    await db.collection('categories').createIndex(
      { nameKey: 1 },
      { unique: true, partialFilterExpression: { nameKey: { $type: 'string' } } }
    );

    app.locals.db = db;
    app.locals.mongoClient = client;

    app.use(session({
      name: 'teh_peng.sid',
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        client,
        dbName: process.env.MONGODB_DB,
        collectionName: 'sessions'
      }),
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      }
    }));

    app.use(csrfSynchronisedProtection);

    // Register application routes
    app.use('/api/projects', projectRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/consultations', consultationRoutes);

    // Register user administration routes (US13 and US14)
    app.use('/api/admin', adminRoutes);

    // Platform Management routes (Create IDP category, Weekly report)
    app.use('/api/categories', categoryRoutes);
    app.use('/api/reports', reportRoutes);

    // CSRF error handling
    app.use((err, req, res, next) => {
      if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({
          success: false,
          error: 'Invalid or missing CSRF token'
        });
      }

      next(err);
    });

    console.log('MongoDB connected successfully');
    console.log('Admin routes mounted at /api/admin');

    app.listen(PORT, () => {
      console.log(
        `Backend running at http://localhost:${PORT}`
      );
    });

  } catch (error) {
    console.error('Database startup failed:', error);

    if (client) {
      await client.close();
    }

    process.exitCode = 1;
  }
}

startServer();
