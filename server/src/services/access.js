const NymbleToken = require('../models/NymbleToken');
const AccessLog = require('../models/AccessLog');
const { hashToken } = require('../utils/nymble');
const { getActiveBlacklist, blacklistView } = require('./blacklist');

const MESSAGES = {
  missing_token: 'No Nymble token was presented.',
  invalid_token: 'This token was not issued by the Pseudonym Manager.',
  expired_token: 'This token has expired. Request a fresh one from your pseudonym page.',
  revoked_token: 'This token was revoked and can no longer be used.',
  blacklisted: 'This pseudonym is blacklisted and cannot use the service.',
};
const STATUS = { missing_token: 401, invalid_token: 401, expired_token: 401, revoked_token: 401, blacklisted: 403 };

// Server-side token check. Runs on every request, so a blacklist takes effect immediately.
async function verifyToken(raw) {
  if (!raw) return { ok: false, reason: 'missing_token' };
  const token = await NymbleToken.findOne({ tokenHash: hashToken(raw) });
  if (!token) return { ok: false, reason: 'invalid_token' };

  const bl = await getActiveBlacklist(token.nymbleId);
  if (bl) return { ok: false, reason: 'blacklisted', nymbleId: token.nymbleId, blacklist: blacklistView(bl) };
  if (token.status === 'revoked') return { ok: false, reason: 'revoked_token', nymbleId: token.nymbleId };
  if (token.status === 'expired' || token.expiresAt <= new Date()) {
    if (token.status === 'active') await NymbleToken.updateOne({ _id: token._id }, { $set: { status: 'expired' } });
    return { ok: false, reason: 'expired_token', nymbleId: token.nymbleId };
  }
  return { ok: true, reason: 'ok', nymbleId: token.nymbleId, token };
}

// Verify, write the access log, and return a ready-to-send denial if needed.
async function authorize(raw, resource, action) {
  const result = await verifyToken(raw);
  await AccessLog.create({
    nymbleId: result.nymbleId || null,
    resource,
    action,
    outcome: result.ok ? 'granted' : 'denied',
    reason: result.reason,
  });
  if (result.ok) return { result };
  return {
    result,
    denial: {
      status: STATUS[result.reason],
      body: { granted: false, code: result.reason, message: MESSAGES[result.reason], ...(result.blacklist ? { blacklist: result.blacklist } : {}) },
    },
  };
}

module.exports = { verifyToken, authorize };
