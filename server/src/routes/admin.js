const router = require('express').Router();
const User = require('../models/User');
const NymbleToken = require('../models/NymbleToken');
const Blacklist = require('../models/Blacklist');
const AccessLog = require('../models/AccessLog');
const ActivityLog = require('../models/ActivityLog');
const Report = require('../models/Report');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex } = require('../utils/nymble');
const { validate } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { blacklistSchema, reportActionSchema, pageQuery } = require('../validators');
const { activeFilter, blacklistNymble, blacklistView } = require('../services/blacklist');
const { logActivity } = require('../services/activity');

router.use(requireAuth, requireRole('admin'));

const paged = (items, total, page, limit) => ({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });

// ---------- dashboard ----------
router.get('/stats', asyncHandler(async (req, res) => {
  const now = new Date();
  const start = new Date(now); start.setUTCHours(0, 0, 0, 0); start.setUTCDate(start.getUTCDate() - 6);

  const [totalUsers, activeTokens, blacklisted, granted, denied, pendingReports, daily, reasons] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    NymbleToken.countDocuments({ status: 'active', expiresAt: { $gt: now } }),
    Blacklist.countDocuments(activeFilter()),
    AccessLog.countDocuments({ outcome: 'granted' }),
    AccessLog.countDocuments({ outcome: 'denied' }),
    Report.countDocuments({ status: 'pending' }),
    AccessLog.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, outcome: '$outcome' }, n: { $sum: 1 } } },
    ]),
    AccessLog.aggregate([{ $match: { outcome: 'denied' } }, { $group: { _id: '$reason', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
  ]);

  const series = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start); d.setUTCDate(start.getUTCDate() + i);
    const day = d.toISOString().slice(0, 10);
    const pick = (o) => daily.find((x) => x._id.day === day && x._id.outcome === o)?.n || 0;
    series.push({ day, granted: pick('granted'), denied: pick('denied') });
  }
  res.json({ totalUsers, activeTokens, blacklisted, granted, denied, pendingReports, series, denialReasons: reasons.map((r) => ({ reason: r._id, count: r.n })) });
}));

// ---------- users ----------
router.get('/users', validate(pageQuery, 'query'), asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query;
  const filter = { role: 'user' };
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ username: rx }, { email: rx }, { nymbleId: rx }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  const ids = users.map((u) => u._id);
  const nyms = users.map((u) => u.nymbleId);
  const [tokens, bls] = await Promise.all([
    NymbleToken.find({ user: { $in: ids }, status: 'active', expiresAt: { $gt: new Date() } }),
    Blacklist.find(activeFilter({ nymbleId: { $in: nyms } })),
  ]);
  const items = users.map((u) => {
    const t = tokens.find((x) => String(x.user) === String(u._id));
    const b = bls.find((x) => x.nymbleId === u.nymbleId);
    return { ...u.toPublic(), activeToken: t ? t.toView() : null, blacklist: b ? blacklistView(b) : null };
  });
  res.json(paged(items, total, page, limit));
}));

router.delete('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.', 'not_found');
  if (user.role === 'admin' || user._id.equals(req.user._id)) throw new ApiError(400, 'Administrator accounts cannot be deleted here.', 'protected');
  await Promise.all([NymbleToken.deleteMany({ user: user._id }), user.deleteOne()]);
  await logActivity('user.delete', `Account behind ${user.nymbleId} was deleted`, 'warning');
  res.json({ deleted: true });
}));

// ---------- blacklist ----------
router.get('/blacklist', validate(pageQuery, 'query'), asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const filter = status === 'active' ? activeFilter() : {};
  const [rows, total] = await Promise.all([
    Blacklist.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Blacklist.countDocuments(filter),
  ]);
  res.json(paged(rows.map(blacklistView), total, page, limit));
}));

router.post('/blacklist', validate(blacklistSchema), asyncHandler(async (req, res) => {
  const { nymbleId, reason, durationHours } = req.body;
  const entry = await blacklistNymble({ nymbleId, reason, durationHours, admin: req.user });
  res.status(201).json({ blacklist: blacklistView(entry) });
}));

router.delete('/blacklist/:id', asyncHandler(async (req, res) => {
  const entry = await Blacklist.findById(req.params.id);
  if (!entry) throw new ApiError(404, 'Blacklist entry not found.', 'not_found');
  if (entry.status !== 'active') throw new ApiError(400, 'This entry is already closed.', 'not_active');
  entry.status = 'lifted'; entry.liftedAt = new Date(); entry.liftedBy = req.user._id;
  await entry.save();
  await logActivity('blacklist.lift', `${entry.nymbleId} was removed from the blacklist`, 'success');
  res.json({ blacklist: blacklistView(entry) });
}));

// ---------- reports ----------
router.get('/reports', validate(pageQuery, 'query'), asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const filter = status && status !== 'all' ? { status } : {};
  const [items, total] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('post', 'body resource'),
    Report.countDocuments(filter),
  ]);
  res.json(paged(items, total, page, limit));
}));

router.patch('/reports/:id', validate(reportActionSchema), asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw new ApiError(404, 'Report not found.', 'not_found');
  if (report.status !== 'pending') throw new ApiError(400, 'This report was already resolved.', 'resolved');

  if (req.body.action === 'blacklist') {
    const entry = await blacklistNymble({ nymbleId: report.targetNymbleId, reason: req.body.reason, durationHours: req.body.durationHours, admin: req.user, reportId: report._id });
    report.status = 'actioned'; report.blacklist = entry._id;
  } else {
    report.status = 'dismissed'; report.resolutionNote = req.body.note;
    await logActivity('report.dismiss', `Report against ${report.targetNymbleId} dismissed`);
  }
  report.resolvedBy = req.user._id; report.resolvedAt = new Date();
  await report.save();
  res.json({ report });
}));

// ---------- logs ----------
router.get('/logs/access', validate(pageQuery, 'query'), asyncHandler(async (req, res) => {
  const { page, limit, outcome } = req.query;
  const filter = outcome ? { outcome } : {};
  const [items, total] = await Promise.all([
    AccessLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    AccessLog.countDocuments(filter),
  ]);
  res.json(paged(items, total, page, limit));
}));

router.get('/logs/activity', validate(pageQuery, 'query'), asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const [items, total] = await Promise.all([
    ActivityLog.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    ActivityLog.countDocuments(),
  ]);
  res.json(paged(items, total, page, limit));
}));

module.exports = router;
