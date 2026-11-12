// Admin routes for UA01 (create account) and UA04 (suspend / reactivate).
//
// Mount in server/index.js, AFTER app.use(csrfSynchronisedProtection):
//   const adminRoutes = require('./routes/admin');          // with the other requires
//   app.use('/api/admin', adminRoutes);                     // with the other app.use routes
//
// The frontend must send the CSRF token on POST and PATCH, like your other pages do.

const express = require('express');
const { ObjectId } = require('mongodb');
const CreateUserAccountController = require('../controllers/CreateUserAccountController');
const SuspendUserAccountController = require('../controllers/SuspendUserAccountController');
const ViewUserAccountsController = require('../controllers/ViewUserAccountsController');
const UpdateUserAccountController = require('../controllers/UpdateUserAccountController');
const router = express.Router();

const ADMIN_ROLE = 'user_admin'; // TODO: confirm this is the role value for the User Admin in User.js

// TODO: routes/auth.js decides what the session stores at login. Add its key here if not listed.
function getSessionUserId(req) {
  const s = req.session || {};
  return (
    s.userId ||
    (s.user && (s.user.id || s.user._id)) ||
    null
  );
}

// Only a logged-in, active User Admin may use these routes
async function requireAdmin(req, res, next) {
  const sessionUserId = getSessionUserId(req);

  if (!sessionUserId || !ObjectId.isValid(String(sessionUserId))) {
    return res.status(401).json({ success: false, error: 'Please log in' });
  }

  const admin = await req.app.locals.db.collection('users').findOne({
    _id: new ObjectId(String(sessionUserId)),
    role: ADMIN_ROLE,
    accountStatus: 'active'
  });

  if (!admin) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  req.adminId = admin._id.toString();
  next();
}

function sendError(res, error) {
  const status = error.status || 500;

  if (status === 500) {
    console.error('Admin route error:', error);
    return res.status(500).json({ success: false, error: 'Something went wrong' });
  }

  return res.status(status).json({ success: false, error: error.message });
}

// List accounts for the Manage Accounts page   GET /api/admin/users
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const controller = new ViewUserAccountsController(req.app.locals.db);
    const accounts = await controller.getAccounts();

    res.json({ success: true, data: accounts });
  } catch (error) {
    sendError(res, error);
  }
});

// UA01  POST /api/admin/users
router.post('/users', requireAdmin, async (req, res) => {
  try {
    const controller = new CreateUserAccountController(req.app.locals.db);
    const { name, email, tempPassword, role } = req.body || {};
    const user = await controller.createAccount({ name, email, tempPassword, role });

    res.status(201).json({ success: true, message: 'Account created', data: user });
  } catch (error) {
    sendError(res, error);
  }
});

// UA04  PATCH /api/admin/users/:id/status     body: { "status": "suspended" | "active" }
router.patch('/users/:id/status', requireAdmin, async (req, res) => {
  try {
    const controller = new SuspendUserAccountController(req.app.locals.db);
    const user = await controller.changeAccountStatus(
      req.adminId,
      req.params.id,
      (req.body || {}).status
    );

    res.json({ success: true, message: `Account is now ${user.accountStatus}`, data: user });
  } catch (error) {
    sendError(res, error);
  }
});

// US03 — Update User Account
router.patch('/users/:id', requireAdmin, async (req, res) => {
  try {
    const controller = new UpdateUserAccountController(req.app.locals.db);

    const user = await controller.updateAccount(
      req.adminId,
      req.params.id,
      {
        name: req.body?.name,
        email: req.body?.email
      }
    );

    res.json({
      success: true,
      message: 'Account updated successfully',
      data: user
    });
  } catch (error) {
    sendError(res, error);
  }
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
