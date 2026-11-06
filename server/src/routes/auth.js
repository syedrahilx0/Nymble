const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { makeNymbleId } = require('../utils/nymble');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { registerSchema, loginSchema } = require('../validators');
const { issueToken } = require('../services/tokens');
const { logActivity } = require('../services/activity');

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many failed attempts. Try again in a few minutes.', code: 'rate_limited' } });

const signJwt = (user) => jwt.sign({ sub: user._id, role: user.role }, jwtSecret, { expiresIn: jwtExpiresIn });
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10); // keeps login timing similar for unknown emails

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  const user = new User({ username, email, passwordHash: await bcrypt.hash(password, 12) }); // role is never taken from the client
  user.nymbleId = makeNymbleId(user._id);
  await user.save();

  const { raw, doc } = await issueToken(user);
  await logActivity('user.register', `New pseudonym ${user.nymbleId} registered`, 'success');
  res.status(201).json({ token: signJwt(user), user: user.toPublic(), nymbleToken: raw, tokenInfo: doc.toView() });
}));

router.post('/login', authLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) throw new ApiError(401, 'Email or password is incorrect.', 'bad_credentials');

  user.lastLoginAt = new Date();
  await user.save();
  await logActivity('user.login', user.role === 'admin' ? 'Administrator signed in' : `Pseudonym ${user.nymbleId} signed in`);
  res.json({ token: signJwt(user), user: user.toPublic() });
}));

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toPublic() }));

module.exports = router;
