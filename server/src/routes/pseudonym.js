const router = require('express').Router();
const NymbleToken = require('../models/NymbleToken');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireRole } = require('../middleware/auth');
const { issueToken, revokeActiveTokens } = require('../services/tokens');
const { getActiveBlacklist, blacklistView } = require('../services/blacklist');
const { logActivity } = require('../services/activity');

router.use(requireAuth, requireRole('user'));

// Your pseudonymous identity. Never includes email or password data.
router.get('/me', asyncHandler(async (req, res) => {
  const [tokens, bl] = await Promise.all([
    NymbleToken.find({ user: req.user._id }).sort({ issuedAt: -1 }).limit(10),
    getActiveBlacklist(req.user.nymbleId),
  ]);
  const views = tokens.map((t) => t.toView());
  res.json({
    nymbleId: req.user.nymbleId,
    createdAt: req.user.createdAt,
    currentToken: views.find((t) => t.status === 'active') || null,
    blacklist: bl ? blacklistView(bl) : null,
    tokens: views,
  });
}));

router.post('/token', asyncHandler(async (req, res) => {
  const { raw, doc } = await issueToken(req.user);
  await logActivity('token.issue', `Token issued to ${req.user.nymbleId}`);
  res.status(201).json({ token: raw, info: doc.toView() }); // the raw token is shown once and never stored server-side
}));

router.delete('/token', asyncHandler(async (req, res) => {
  const r = await revokeActiveTokens(req.user._id, 'user');
  if (r.modifiedCount) await logActivity('token.revoke', `${req.user.nymbleId} revoked their token`, 'warning');
  res.json({ revoked: r.modifiedCount });
}));

module.exports = router;
