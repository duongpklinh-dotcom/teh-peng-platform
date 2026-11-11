/*
 * FEATURE: UA04 Suspend or reactivate account
 * BCE CONTROL CLASS: SuspendUserAccountController
 * BCE BOUNDARY: AccountListPage
 * BCE ENTITY: User (shared model, accountStatus field)
 *
 * accountStatus values used across the app: 'active', 'locked', 'suspended'.
 * Only 'active' <-> 'suspended' is handled here. 'locked' (too many failed
 * logins) is a different feature and is left alone.
 */

const { ObjectId } = require('mongodb');

const SETTABLE_STATUSES = ['active', 'suspended'];

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

class SuspendUserAccountController {
  constructor(db) {
    this.users = db.collection('users');
  }

  async changeAccountStatus(adminId, userId, newStatus) {
    if (!SETTABLE_STATUSES.includes(newStatus)) {
      throw httpError(400, 'Status must be active or suspended');
    }

    if (!ObjectId.isValid(String(userId))) {
      throw httpError(400, 'Invalid user ID');
    }

    const user = await this.users.findOne({
      _id: new ObjectId(String(userId))
    });

    if (!user) {
      throw httpError(404, 'Account not found');
    }

    // An admin must not lock themselves out
    if (
      newStatus === 'suspended' &&
      String(user._id) === String(adminId)
    ) {
      throw httpError(400, 'You cannot suspend your own account');
    }

    const current = user.accountStatus;

    if (current === newStatus) {
      throw httpError(409, `Account is already ${newStatus}`);
    }

    if (current !== 'active' && current !== 'suspended') {
      throw httpError(
        409,
        `Account is ${current}; its status cannot be changed here`
      );
    }

    // Only status fields change; every other field is kept (AC4).
    // The accountStatus in the filter stops two admins racing each other.
    const changes = {
      accountStatus: newStatus,
      statusChangedAt: new Date(),
      statusChangedBy: String(adminId)
    };

    if (newStatus === 'active') {
      changes.failedLoginAttempts = 0;
    }

    const result = await this.users.updateOne(
      { _id: user._id, accountStatus: current },
      { $set: changes }
    );

    if (result.matchedCount !== 1) {
      throw httpError(409, 'Account status was changed by someone else');
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      accountStatus: newStatus
    };
  }
}

module.exports = SuspendUserAccountController;
