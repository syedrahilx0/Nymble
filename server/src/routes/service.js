const router = require('express').Router();
const AccessLog = require('../models/AccessLog');
const ServicePost = require('../models/ServicePost');
const asyncHandler = require('../utils/asyncHandler');
const SERVICES = require('../utils/services');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { accessSchema, postSchema } = require('../validators');
const { authorize } = require('../services/access');

// The token travels in a header so the service never needs a login session.
const tokenFrom = (req) => req.headers['x-nymble-token'] || req.body.token;

const feed = async (resource) => {
  const posts = await ServicePost.find({ resource }).sort({ createdAt: -1 }).limit(30);
  return posts.map((p) => ({ id: p._id, nymbleId: p.nymbleId, body: p.body, createdAt: p.createdAt }));
};

router.get('/resources', (req, res) => res.json({ services: SERVICES }));

router.post('/access', validate(accessSchema), asyncHandler(async (req, res) => {
  const { resource } = req.body;
  const { result, denial } = await authorize(tokenFrom(req), resource, 'access');
  if (denial) return res.status(denial.status).json(denial.body);
  res.json({
    granted: true,
    nymbleId: result.nymbleId,
    tokenExpiresAt: result.token.expiresAt,
    service: SERVICES.find((s) => s.id === resource),
    posts: await feed(resource),
  });
}));

router.post('/posts', validate(postSchema), asyncHandler(async (req, res) => {
  const { resource, body } = req.body;
  const { result, denial } = await authorize(tokenFrom(req), resource, 'post');
  if (denial) return res.status(denial.status).json(denial.body);
  const post = await ServicePost.create({ resource, nymbleId: result.nymbleId, body });
  res.status(201).json({ granted: true, post: { id: post._id, nymbleId: post.nymbleId, body: post.body, createdAt: post.createdAt } });
}));

// A user's own request history, looked up by pseudonym
router.get('/history', requireAuth, requireRole('user'), asyncHandler(async (req, res) => {
  const items = await AccessLog.find({ nymbleId: req.user.nymbleId }).sort({ createdAt: -1 }).limit(50);
  res.json({ items });
}));

module.exports = router;
