// Wipes the database and fills it with demo data.  Run:  npm run seed
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDb = require('./config/db');
const { makeNymbleId, generateToken, hashToken } = require('./utils/nymble');
const SERVICES = require('./utils/services');
const User = require('./models/User');
const NymbleToken = require('./models/NymbleToken');
const Blacklist = require('./models/Blacklist');
const AccessLog = require('./models/AccessLog');
const ActivityLog = require('./models/ActivityLog');
const ServicePost = require('./models/ServicePost');
const Report = require('./models/Report');

const ADMIN = { username: 'admin', email: 'admin@nymble.local', password: 'Admin@12345' };
const DEMO_PASSWORD = 'Demo@12345';
const NAMES = ['alice', 'bob', 'carol', 'dave', 'erin', 'frank', 'mallory', 'trent'];

const H = 3600 * 1000;
const ago = (ms) => new Date(Date.now() - ms);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

(async () => {
  await connectDb();
  await Promise.all([User, NymbleToken, Blacklist, AccessLog, ActivityLog, ServicePost, Report].map((m) => m.deleteMany({})));
  await Promise.all([User, NymbleToken, Blacklist, AccessLog, ActivityLog, ServicePost, Report].map((m) => m.syncIndexes()));

  const admin = await User.create({ ...ADMIN, passwordHash: await bcrypt.hash(ADMIN.password, 12), role: 'admin' });
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const users = {};
  for (const [i, name] of NAMES.entries()) {
    const u = new User({ username: name, email: `${name}@nymble.local`, passwordHash, createdAt: ago((20 - i * 2) * 24 * H), lastLoginAt: ago(rand(1, 40) * H) });
    u.nymbleId = makeNymbleId(u._id);
    await u.save();
    users[name] = u;
  }

  // ---- tokens ----
  const raws = {};
  const mkToken = (user, { issuedAgo, ttlMin = 60, status = 'active', revokedReason }) => {
    const raw = generateToken();
    raws[user.username] = raw;
    const issuedAt = ago(issuedAgo);
    return NymbleToken.create({
      user: user._id, nymbleId: user.nymbleId, tokenHash: hashToken(raw), prefix: raw.slice(0, 13), status,
      issuedAt, expiresAt: new Date(issuedAt.getTime() + ttlMin * 60000),
      ...(status === 'revoked' ? { revokedAt: ago(issuedAgo / 2), revokedReason } : {}),
    });
  };
  for (const n of ['alice', 'bob', 'carol', 'dave', 'frank']) await mkToken(users[n], { issuedAgo: rand(2, 20) * 60000 });
  await mkToken(users.erin, { issuedAgo: 3 * H, status: 'expired' });
  await mkToken(users.mallory, { issuedAgo: 30 * 60000 * 2, status: 'revoked', revokedReason: 'blacklisted' });
  await mkToken(users.trent, { issuedAgo: 30 * H, status: 'revoked', revokedReason: 'blacklisted' });
  // Demo token for Postman / curl
  const demoRaw = generateToken();
  await NymbleToken.updateMany({ user: users.alice._id }, { $set: { status: 'revoked', revokedAt: new Date(), revokedReason: 'rotated' } });
  await NymbleToken.create({ user: users.alice._id, nymbleId: users.alice.nymbleId, tokenHash: hashToken(demoRaw), prefix: demoRaw.slice(0, 13), expiresAt: new Date(Date.now() + 24 * H) });

  // ---- posts ----
  const nid = (n) => users[n].nymbleId;
  const postsData = [
    ['whisper-board', 'alice', 'Anyone else find the new library hours confusing? Closing at 8 on Fridays seems early.', 70],
    ['whisper-board', 'bob', 'Study group for the networks exam on Thursday. Bring questions, not snacks.', 55],
    ['whisper-board', 'dave', 'CHEAP FOLLOWERS!!! visit my page now, limited offer, click click click', 40],
    ['whisper-board', 'mallory', 'You are all idiots and nobody wants you here.', 30],
    ['whisper-board', 'carol', 'Lost a blue notebook near block C. It has diagrams in it, please message if found.', 20],
    ['tip-line', 'erin', 'The stairwell light near the east gate has been out for three days.', 48],
    ['tip-line', 'frank', 'Someone keeps propping the side door open after 10pm. Might be worth a look.', 26],
    ['tip-line', 'bob', 'Water cooler on floor 2 is leaking again.', 8],
    ['open-wiki', 'carol', 'Added a short section on how token expiry works in the demo.', 36],
    ['open-wiki', 'alice', 'Fixed a few broken links on the getting started page.', 12],
  ];
  const posts = {};
  const insertedPosts = [];
  for (const [resource, who, body, hoursAgo] of postsData) {
    const doc = { _id: new mongoose.Types.ObjectId(), resource, nymbleId: nid(who), body, createdAt: ago(hoursAgo * H) };
    insertedPosts.push(doc);
    posts[body.slice(0, 12)] = doc;
  }
  await ServicePost.collection.insertMany(insertedPosts);

  // ---- blacklist history ----
  const mReport = await Report.create({ reporter: users.alice._id, reporterNymbleId: nid('alice'), targetNymbleId: nid('mallory'), category: 'harassment',
    description: 'Repeated insults aimed at other people on the board.', post: insertedPosts[3]._id, status: 'actioned', resolvedBy: admin._id, resolvedAt: ago(1.5 * H) });
  const mBl = await Blacklist.create({ nymbleId: nid('mallory'), user: users.mallory._id, reason: 'Harassment on Whisper Board. Reported by a community member.',
    durationHours: 72, expiresAt: new Date(Date.now() + 70 * H), createdBy: admin._id, report: mReport._id, createdAt: ago(1.5 * H) });
  await Report.updateOne({ _id: mReport._id }, { blacklist: mBl._id });
  await Blacklist.create({ nymbleId: nid('trent'), user: users.trent._id, reason: 'Posting spam links on the tip line.', durationHours: 24,
    expiresAt: ago(6 * H), status: 'active', createdBy: admin._id, createdAt: ago(30 * H) }); // time ran out, so it reads as "expired"

  // ---- pending / resolved reports ----
  await Report.create({ reporter: users.alice._id, reporterNymbleId: nid('alice'), targetNymbleId: nid('dave'), category: 'spam', description: 'Promotional spam with links, posted twice today.', post: insertedPosts[2]._id, createdAt: ago(5 * H) });
  await Report.create({ reporter: users.bob._id, reporterNymbleId: nid('bob'), targetNymbleId: nid('dave'), category: 'spam', description: 'Same follower-selling message as the one above.', post: insertedPosts[2]._id, createdAt: ago(4 * H) });
  await Report.create({ reporter: users.carol._id, reporterNymbleId: nid('carol'), targetNymbleId: nid('frank'), category: 'other', description: 'Tip about a propped door reads more like a complaint about a named person.', post: insertedPosts[6]._id, createdAt: ago(2 * H) });
  await Report.create({ reporter: users.erin._id, reporterNymbleId: nid('erin'), targetNymbleId: nid('bob'), category: 'other', description: 'I think this post was off-topic for the tip line.', status: 'dismissed', resolvedBy: admin._id, resolvedAt: ago(20 * H), resolutionNote: 'On topic. No action needed.', createdAt: ago(22 * H) });

  // ---- 7 days of access logs ----
  const active = ['alice', 'bob', 'carol', 'dave', 'erin', 'frank'];
  const deniedReasons = ['expired_token', 'expired_token', 'invalid_token', 'missing_token', 'revoked_token'];
  const logs = [];
  for (let d = 6; d >= 0; d--) {
    const grants = rand(14, 32), denials = rand(2, 7);
    for (let i = 0; i < grants; i++) logs.push({ nymbleId: nid(pick(active)), resource: pick(SERVICES).id, action: Math.random() < 0.25 ? 'post' : 'access', outcome: 'granted', reason: 'ok', createdAt: ago(d * 24 * H + rand(0, 20) * H + rand(0, 59) * 60000) });
    for (let i = 0; i < denials; i++) { const r = pick(deniedReasons); logs.push({ nymbleId: r === 'invalid_token' || r === 'missing_token' ? null : nid(pick(active)), resource: pick(SERVICES).id, action: 'access', outcome: 'denied', reason: r, createdAt: ago(d * 24 * H + rand(0, 20) * H + rand(0, 59) * 60000) }); }
  }
  for (let i = 0; i < 4; i++) logs.push({ nymbleId: nid('mallory'), resource: 'whisper-board', action: 'access', outcome: 'denied', reason: 'blacklisted', createdAt: ago(rand(1, 60) * 60000) });
  logs.push({ nymbleId: nid('trent'), resource: 'tip-line', action: 'access', outcome: 'denied', reason: 'blacklisted', createdAt: ago(10 * H) });
  await AccessLog.collection.insertMany(logs);

  // ---- activity feed ----
  const acts = [
    ['user.register', `New pseudonym ${nid('frank')} registered`, 'success', 3 * 24 * 60],
    ['report.create', `${nid('alice')} reported ${nid('dave')} for spam`, 'warning', 300],
    ['report.create', `${nid('bob')} reported ${nid('dave')} for spam`, 'warning', 240],
    ['report.dismiss', `Report against ${nid('bob')} dismissed`, 'info', 1200],
    ['blacklist.add', `${nid('trent')} blacklisted for 24h (1 token revoked)`, 'danger', 30 * 60],
    ['blacklist.add', `${nid('mallory')} blacklisted for 72h (1 token revoked)`, 'danger', 90],
    ['token.issue', `Token issued to ${nid('carol')}`, 'info', 18],
    ['user.login', 'Administrator signed in', 'info', 10],
    ['report.create', `${nid('carol')} reported ${nid('frank')} for other`, 'warning', 120],
  ].map(([type, message, severity, minsAgo]) => ({ type, message, severity, createdAt: ago(minsAgo * 60000) }));
  await ActivityLog.collection.insertMany(acts);

  console.log('\nSeed complete.\n');
  console.log(`  Admin   ${ADMIN.email}  /  ${ADMIN.password}`);
  console.log(`  Users   <name>@nymble.local  /  ${DEMO_PASSWORD}   (${NAMES.join(', ')})`);
  console.log('          mallory is blacklisted, trent has an expired blacklist entry\n');
  console.log(`  Demo Nymble token for alice (valid 24h):\n  ${demoRaw}\n`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
