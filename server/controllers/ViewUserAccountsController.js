/*
 * FEATURE: View user accounts (AccountListPage) + US05 Search and filter accounts
 * BCE CONTROL CLASS: ViewUserAccountsController
 * BCE ENTITY: User
 *
 * Returns only safe fields. The password hash is excluded in the query AND
 * the result is rebuilt field by field, so it can never leak by accident.
 *
 * US05: getAccounts({ search, role, status }) - all filters are optional and
 * combine with AND. Search is case-insensitive and matches part of the name
 * or email.
 */

const { ALLOWED_ROLES } = require('./CreateUserAccountController');

const FILTERABLE_STATUSES = ['active', 'suspended', 'locked'];
const SEARCH_MAX_LENGTH = 100;

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// Stops characters such as . * ( from being treated as a pattern
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class ViewUserAccountsController {
  constructor(db) {
    this.users = db.collection('users');
  }

  buildFilter({ search = '', role = '', status = '' } = {}) {
    const keyword = String(search || '').trim().slice(0, SEARCH_MAX_LENGTH);
    const conditions = [];

    if (keyword) {
      const pattern = { $regex: escapeRegex(keyword), $options: 'i' };
      conditions.push({ $or: [{ name: pattern }, { email: pattern }] });
    }

    if (role) {
      if (!ALLOWED_ROLES.includes(role)) {
        throw httpError(400, 'Invalid profile filter');
      }
      conditions.push({ role });
    }

    if (status) {
      if (!FILTERABLE_STATUSES.includes(status)) {
        throw httpError(400, 'Invalid status filter');
      }

      // Older accounts may have no accountStatus; the rest of the app treats
      // those as active, so the Active filter must include them.
      conditions.push(
        status === 'active'
          ? { $or: [{ accountStatus: 'active' }, { accountStatus: { $exists: false } }] }
          : { accountStatus: status }
      );
    }

    return conditions.length > 0 ? { $and: conditions } : {};
  }

  async getAccounts(criteria = {}) {
    const filter = this.buildFilter(criteria);

    const documents = await this.users
      .find(filter, { projection: { passwordHash: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    return documents.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus || 'active',
      createdAt: user.createdAt || null
    }));
  }
}

module.exports = ViewUserAccountsController;
