const { ObjectId } = require('mongodb');

async function requireAuth(req, res, next) {
  try {
    const userId = req.session?.userId;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    const user = await req.app.locals.db.collection('users').findOne({
      _id: new ObjectId(userId)
    });

    if (!user || (user.accountStatus && user.accountStatus !== 'active')) {
      return res.status(401).json({
        success: false,
        error: 'Account unavailable'
      });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email
    };

    next();
  } catch (error) {
    next(error);
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden'
      });
    }

    next();
  };
}

module.exports = { requireAuth, requireRole };
