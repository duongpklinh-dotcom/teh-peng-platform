/*
 * FEATURE: View user accounts (minimal list used by UA04's AccountListPage)
 * BCE CONTROL CLASS: ViewUserAccountsController
 * BCE ENTITY: User
 *
 * Returns only safe fields. The password hash is excluded in the query AND
 * the result is rebuilt field by field, so it can never leak by accident.
 */

class ViewUserAccountsController {
  constructor(db) {
    this.users = db.collection('users');
  }

  async getAccounts() {
    const documents = await this.users
      .find({}, { projection: { passwordHash: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    return documents.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt || null
    }));
  }
}

module.exports = ViewUserAccountsController;
