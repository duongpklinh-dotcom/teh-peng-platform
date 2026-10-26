const express = require('express');
const AuthController = require('../controllers/AuthController');

const router = express.Router();

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

router.post('/login', async (req, res) => {
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

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
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


module.exports = router;
