
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
const designerAvailabilityRoutes = require('./routes/designerAvailability');
const designerConsultationRoutes = require('./routes/designerConsultations');

// NEW: Private messaging routes
const consultationMessageRoutes = require('./routes/consultationMessages');
const notificationRoutes = require('./routes/notifications');

require('dotenv').config({
  path: path.join(__dirname, '.env')
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
      serverSelectionTimeoutMS: 10000
    });

    await client.connect();

    const db = client.db(process.env.MONGODB_DB);

    await db.command({ ping: 1 });

    await db.collection('users').createIndex(
      { email: 1 },
      { unique: true }
    );

    await db.collection('designerAvailability').createIndex(
      { designerId: 1 },
      { unique: true }
    );

    // NEW: Retrieve messages by consultation and creation time
    await db.collection('consultationMessages').createIndex({
      consultationId: 1,
      createdAt: 1,
      _id: 1
    });
// Retrieve a user's notifications, newest first.
await db.collection('notifications').createIndex({
  recipientId: 1,
  createdAt: -1
});

// Efficiently count unread notifications.
await db.collection('notifications').createIndex({
  recipientId: 1,
  isRead: 1
});
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

    app.use('/api/projects', projectRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/consultations', consultationRoutes);
    // Customer and designer in-app notifications
app.use('/api/notifications', notificationRoutes);

    app.use(
      '/api/designer-availability',
      designerAvailabilityRoutes
    );

    app.use(
      '/api/designer-consultations',
      designerConsultationRoutes
    );

    // NEW: Customer-designer private messaging API
    app.use(
      '/api/consultation-messages',
      consultationMessageRoutes
    );

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
