const crypto = require('crypto');
const { nymbleSecret } = require('../config/env');

// Pseudonym derived from the user id with a server-side secret (HMAC-SHA256).
// Without the secret, a Nymble ID cannot be traced back to an account.
function makeNymbleId(userId) {
  const h = crypto.createHmac('sha256', nymbleSecret).update(String(userId)).digest('hex').slice(0, 16).toUpperCase();
  return `NYM-${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}`;
}

const generateToken = () => `nmbl_${crypto.randomBytes(32).toString('base64url')}`;
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { makeNymbleId, generateToken, hashToken, escapeRegex };
