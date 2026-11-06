const NymbleToken = require('../models/NymbleToken');
const ApiError = require('../utils/ApiError');
const { generateToken, hashToken } = require('../utils/nymble');
const { tokenTtlMinutes } = require('../config/env');
const { getActiveBlacklist, blacklistView } = require('./blacklist');

const revokeActiveTokens = (userId, reason) =>
  NymbleToken.updateMany({ user: userId, status: 'active' }, { $set: { status: 'revoked', revokedAt: new Date(), revokedReason: reason } });

// Issues a fresh token and retires any earlier one (rotation).
async function issueToken(user) {
  const bl = await getActiveBlacklist(user.nymbleId);
  if (bl) {
    throw new ApiError(403, 'This pseudonym is blacklisted, so new tokens cannot be issued.', 'blacklisted', { blacklist: blacklistView(bl) });
  }
  await revokeActiveTokens(user._id, 'rotated');
  const raw = generateToken();
  const doc = await NymbleToken.create({
    user: user._id,
    nymbleId: user.nymbleId,
    tokenHash: hashToken(raw),
    prefix: raw.slice(0, 13),
    expiresAt: new Date(Date.now() + tokenTtlMinutes * 60 * 1000),
  });
  return { raw, doc };
}

module.exports = { issueToken, revokeActiveTokens };
