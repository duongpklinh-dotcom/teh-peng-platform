const express = require('express');
const { generateToken } = require('../middleware/csrf');
const AuthController = require('../controllers/AuthController');
const { rateLimit } = require('express-rate-limit');

const router = express.Router();

async function recordLogin(req, status, user = null) {
  try {
    await req.app.locals.db.collection('loginHistory').insertOne({
      userId: user?.id || null,
      email: String(req.body?.email || '').trim().toLowerCase(),
      status,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Unable to record login history:', error);
  }
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again later.'
  }
});


router.get('/csrf-token', (req, res, next) => {
  try {
    const token = generateToken(req);

    req.session.save((error) => {
      if (error) return next(error);

      res.json({
        success: true,
        data: { csrfToken: token }
      });
    });
  } catch (error) {
    next(error);
  }
});




router.post('/register', async (req, res) => {
  try {
    const controller = new AuthController(req.app.locals.db);
    const user = await controller.register(req.body);

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    const status = error.message === 'Email already registered'
      ? 409
      : 400;

    res.status(status).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const controller = new AuthController(req.app.locals.db);
    const user = await controller.login(req.body);
    await new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
        if (error) reject(error);
        else resolve();
    });
    });

    req.session.userId = user.id;
    req.session.role = user.role;

    await new Promise((resolve, reject) => {
    req.session.save((error) => {
        if (error) reject(error);
        else resolve();
    });
    });
    await recordLogin(req, 'success', user);
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    await recordLogin(req, 'failed');
    const status = error.message === 'Account is not active'
      ? 403
      : 401;

    res.status(status).json({
      success: false,
      error: error.message
    });
  }
});


router.get('/me', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    const { ObjectId } = require('mongodb');

    if (!ObjectId.isValid(req.session.userId)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid session'
      });
    }

    const db = req.app.locals.db;

    const user = await db.collection('users').findOne({
      _id: new ObjectId(req.session.userId)
    });

    if (!user || user.accountStatus !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Account unavailable'
      });
    }

    res.json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Unable to verify session'
    });
  }
});


router.post('/logout', (req, res) => {
  if (!req.session) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }

  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Unable to log out'
      });
    }

    res.clearCookie('teh_peng.sid', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

// UA: View account login history
router.get('/login-history', requireAdmin, async (req, res) => {
  try {
    const history = await req.app.locals.db
      .collection('loginHistory')
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    res.json({
      success: true,
      data: history.map(record => ({
        id: record._id.toString(),
        email: record.email,
        status: record.status,
        createdAt: record.createdAt
      }))
    });
  } catch (error) {
    sendError(res, error);
  }
});

module.exports = router;
