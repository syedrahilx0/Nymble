const router = require('express').Router();
const Report = require('../models/Report');
const ServicePost = require('../models/ServicePost');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { reportSchema } = require('../validators');
const { logActivity } = require('../services/activity');

router.use(requireAuth, requireRole('user'));

router.post('/', validate(reportSchema), asyncHandler(async (req, res) => {
  const { targetNymbleId, category, description, postId } = req.body;
  if (targetNymbleId === req.user.nymbleId) throw new ApiError(400, 'You cannot report your own pseudonym.', 'self_report');
  if (!(await User.exists({ nymbleId: targetNymbleId, role: 'user' }))) throw new ApiError(404, 'No pseudonym matches that Nymble ID.', 'not_found');

  if (postId) {
    const post = await ServicePost.findById(postId);
    if (!post || post.nymbleId !== targetNymbleId) throw new ApiError(400, 'That post does not belong to this Nymble ID.', 'bad_post');
  }
  if (await Report.exists({ reporter: req.user._id, targetNymbleId, status: 'pending' })) {
    throw new ApiError(409, 'You already have an open report against this Nymble ID.', 'duplicate_report');
  }

  const report = await Report.create({
    reporter: req.user._id, reporterNymbleId: req.user.nymbleId, targetNymbleId, category, description, post: postId || null,
  });
  await logActivity('report.create', `${req.user.nymbleId} reported ${targetNymbleId} for ${category}`, 'warning');
  res.status(201).json({ report });
}));

router.get('/mine', asyncHandler(async (req, res) => {
  const reports = await Report.find({ reporter: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ reports });
}));

module.exports = router;
