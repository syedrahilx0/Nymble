const Blacklist = require('../models/Blacklist');
const NymbleToken = require('../models/NymbleToken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('./activity');

const activeFilter = (extra = {}) => ({
  status: 'active',
  $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  ...extra,
});

const getActiveBlacklist = (nymbleId) => Blacklist.findOne(activeFilter({ nymbleId }));

const blacklistView = (b) => ({
  id: b._id,
  nymbleId: b.nymbleId,
  reason: b.reason,
  durationHours: b.durationHours,
  createdAt: b.createdAt,
  expiresAt: b.expiresAt,
  state: b.state(),
  liftedAt: b.liftedAt || null,
  report: b.report || null,
});

// Blacklist a pseudonym and revoke its tokens in one go.
async function blacklistNymble({ nymbleId, reason, durationHours, admin, reportId = null }) {
  const user = await User.findOne({ nymbleId, role: 'user' });
  if (!user) throw new ApiError(404, 'No user holds that Nymble ID.', 'not_found');

  // Close out entries whose time already ran out so the unique index stays clean
  await Blacklist.updateMany(
    { nymbleId, status: 'active', expiresAt: { $ne: null, $lte: new Date() } },
    { $set: { status: 'expired' } }
  );
  if (await Blacklist.exists({ nymbleId, status: 'active' })) {
    throw new ApiError(409, 'That Nymble ID is already blacklisted.', 'already_blacklisted');
  }

  const entry = await Blacklist.create({
    nymbleId,
    user: user._id,
    reason,
    durationHours,
    expiresAt: durationHours ? new Date(Date.now() + durationHours * 3600 * 1000) : null,
    createdBy: admin._id,
    report: reportId,
  });

  const revoked = await NymbleToken.updateMany(
    { user: user._id, status: 'active' },
    { $set: { status: 'revoked', revokedAt: new Date(), revokedReason: 'blacklisted' } }
  );

  await logActivity(
    'blacklist.add',
    `${nymbleId} blacklisted ${durationHours ? `for ${durationHours}h` : 'permanently'} (${revoked.modifiedCount} token${revoked.modifiedCount === 1 ? '' : 's'} revoked)`,
    'danger'
  );
  return entry;
}

module.exports = { activeFilter, getActiveBlacklist, blacklistView, blacklistNymble };
