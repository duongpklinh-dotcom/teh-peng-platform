
const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('user_admin'));

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

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = router;
