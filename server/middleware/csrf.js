const { csrfSync } = require('csrf-sync');

const {
  generateToken,
  csrfSynchronisedProtection
} = csrfSync();

module.exports = {
  generateToken,
  csrfSynchronisedProtection
};
