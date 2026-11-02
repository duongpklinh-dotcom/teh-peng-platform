
const { csrfSync } = require('csrf-sync');

const {
  generateToken,
  csrfSynchronisedProtection
} = csrfSync({
  getTokenFromRequest: (req) => {
    return req.headers['x-csrf-token'];
  }
});

module.exports = {
  generateToken,
  csrfSynchronisedProtection
};
