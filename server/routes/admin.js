// Admin routes for UA01 (create account) and UA04 (suspend / reactivate).
//
// Mount in server/index.js, AFTER app.use(csrfSynchronisedProtection):
//   const adminRoutes = require('./routes/admin');          // with the other requires
//   app.use('/api/admin', adminRoutes);                     // with the other app.use routes
//
// The frontend must send the CSRF token on POST and PATCH, like your other pages do.

const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, requireRole } = require('../middleware/auth');
const CreateUserAccountController = require('../controllers/CreateUserAccountController');
const SuspendUserAccountController = require('../controllers/SuspendUserAccountController');
const ViewUserAccountsController = require('../controllers/ViewUserAccountsController');
const UpdateUserAccountController = require('../controllers/UpdateUserAccountController');

const router = express.Router();
router.use(requireAuth, requireRole('user_admin'));

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

router.get('/accounts', async (req, res, next) => {
    try {
        const search = String(req.query.search || '').trim();
        const filter = search
            ? {
                $or: [
                    { name: { $regex: escapeRegex(search), $options: 'i' } },
                    { email: { $regex: escapeRegex(search), $options: 'i' } }
                ]
            }
            : {};

        const accounts = await req.app.locals.db.collection('users')
            .find(filter, {
                projection: { name: 1, email: 1, role: 1, accountStatus: 1, failedLoginAttempts: 1, createdAt: 1 }
            })
            .sort({ createdAt: -1 })
            .limit(300)
            .toArray();

        res.json({
            success: true,
            data: accounts.map(account => ({
                id: account._id.toString(),
                name: account.name,
                email: account.email,
                role: account.role,
                accountStatus: account.accountStatus || 'active',
                failedLoginAttempts: account.failedLoginAttempts || 0,
                createdAt: account.createdAt || null
            }))
        });
    } catch (error) {
        next(error);
    }
});

router.patch('/accounts/:id/unlock', async (req, res, next) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, error: 'Invalid account ID' });
        }

        const db = req.app.locals.db;
        const account = await db.collection('users').findOneAndUpdate(
            { _id: new ObjectId(req.params.id), accountStatus: 'locked' },
            { $set: { accountStatus: 'active', failedLoginAttempts: 0, unlockedAt: new Date(), unlockedBy: req.user.id } },
            { returnDocument: 'after', projection: { name: 1, email: 1, accountStatus: 1 } }
        );

        const updated = account?.value || account;
        if (!updated) {
            const existing = await db.collection('users').findOne({ _id: new ObjectId(req.params.id) });
            if (!existing) return res.status(404).json({ success: false, error: 'Account not found' });
            return res.status(409).json({ success: false, error: 'Account is not locked' });
        }

        await db.collection('loginHistory').insertOne({
            userId: updated._id.toString(),
            email: updated.email,
            outcome: 'admin_unlock',
            reason: 'Account unlocked by user administrator',
            ipAddress: req.ip || null,
            userAgent: req.get('user-agent') || null,
            createdAt: new Date(),
            performedBy: req.user.id
        });

        res.json({
            success: true,
            message: 'Account unlocked successfully',
            data: { id: updated._id.toString(), accountStatus: updated.accountStatus }
        });
    } catch (error) {
        next(error);
    }
});

router.get('/login-history', async (req, res, next) => {
    try {
        const search = String(req.query.search || '').trim();
        const outcome = String(req.query.outcome || '').trim();
        const filter = {};

        if (search) {
            filter.$or = [
                { email: { $regex: escapeRegex(search), $options: 'i' } },
                { userId: search }
            ];
        }
        if (['success', 'failed', 'blocked', 'admin_unlock'].includes(outcome)) {
            filter.outcome = outcome;
        }

        const events = await req.app.locals.db.collection('loginHistory')
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(300)
            .toArray();

        res.json({
            success: true,
            data: events.map(event => ({
                id: event._id.toString(),
                userId: event.userId || null,
                email: event.email || '',
                outcome: event.outcome,
                reason: event.reason || '',
                ipAddress: event.ipAddress || '',
                userAgent: event.userAgent || '',
                createdAt: event.createdAt
            }))
        });
    } catch (error) {
        next(error);
    }
});

// List accounts for the Manage Accounts page   GET /api/admin/users
// US05 optional filters: ?search=keyword&role=customer&status=active
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const controller = new ViewUserAccountsController(req.app.locals.db);
    const accounts = await controller.getAccounts({
      search: req.query.search,
      role: req.query.role,
      status: req.query.status
    });

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

// US03  PATCH /api/admin/users/:id     body: { "name": "...", "email": "..." }
router.patch('/users/:id', requireAdmin, async (req, res) => {
  try {
    const controller = new UpdateUserAccountController(req.app.locals.db);
    const { name, email } = req.body || {};
    const user = await controller.updateAccount(req.adminId, req.params.id, { name, email });

    res.json({ success: true, message: 'Account updated', data: user });
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

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = router;