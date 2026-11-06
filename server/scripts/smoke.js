// End-to-end API check. Needs the API running on a freshly seeded database.
//   npm run seed && npm start      (one terminal)
//   npm run smoke                  (another)
const BASE = process.env.API_URL || 'http://localhost:5000/api';
let failures = 0;

async function call(method, path, { body, jwt, nymble } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}), ...(nymble ? { 'X-Nymble-Token': nymble } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}
function check(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  ${extra}`}`);
  if (!cond) failures++;
}

(async () => {
  const sfx = Math.random().toString(36).slice(2, 8);
  const mk = async (n) => (await call('POST', '/auth/register', { body: { username: `${n}_${sfx}`, email: `${n}_${sfx}@test.local`, password: 'Passw0rd!x' } })).data;

  const admin = (await call('POST', '/auth/login', { body: { email: 'admin@nymble.local', password: 'Admin@12345' } })).data;
  check('admin login', !!admin.token && admin.user.role === 'admin');

  const bad = await call('POST', '/auth/login', { body: { email: 'admin@nymble.local', password: 'wrong-pass1' } });
  check('wrong password rejected (401)', bad.status === 401);

  const weak = await call('POST', '/auth/register', { body: { username: 'x', email: 'nope', password: '123' } });
  check('invalid registration rejected (400)', weak.status === 400 && weak.data.fields);

  const a = await mk('sam'); const b = await mk('kim');
  check('register returns jwt, nymble id and token, never a password', a.token && /^NYM-/.test(a.user.nymbleId) && a.nymbleToken && !JSON.stringify(a).includes('passwordHash'));
  check('role cannot be self-assigned', (await call('POST', '/auth/register', { body: { username: `evil_${sfx}`, email: `evil_${sfx}@t.local`, password: 'Passw0rd!x', role: 'admin' } })).data.user.role === 'user');

  const dup = await call('POST', '/auth/register', { body: { username: `sam_${sfx}`, email: `sam2_${sfx}@test.local`, password: 'Passw0rd!x' } });
  check('duplicate username rejected (409)', dup.status === 409);

  const me = await call('GET', '/pseudonym/me', { jwt: a.token });
  check('pseudonym view shows an active token', me.data.currentToken?.status === 'active' && !('email' in me.data));

  check('user cannot reach admin API (403)', (await call('GET', '/admin/stats', { jwt: a.token })).status === 403);
  check('anonymous cannot reach user API (401)', (await call('GET', '/pseudonym/me')).status === 401);

  const ok = await call('POST', '/service/access', { body: { resource: 'whisper-board' }, nymble: a.nymbleToken });
  check('valid token granted', ok.status === 200 && ok.data.granted === true);
  check('garbage token denied (401)', (await call('POST', '/service/access', { body: { resource: 'whisper-board' }, nymble: 'nmbl_nope' })).status === 401);
  check('missing token denied (401)', (await call('POST', '/service/access', { body: { resource: 'whisper-board' } })).status === 401);

  const post = await call('POST', '/service/posts', { body: { resource: 'whisper-board', body: 'smoke test message from a pseudonym' }, nymble: a.nymbleToken });
  check('post created under pseudonym', post.status === 201 && post.data.post.nymbleId === a.user.nymbleId);

  const rep = await call('POST', '/reports', { jwt: b.token, body: { targetNymbleId: a.user.nymbleId, category: 'spam', description: 'Smoke test report for blacklisting', postId: post.data.post.id } });
  check('report filed', rep.status === 201, JSON.stringify(rep.data));
  check('cannot report yourself', (await call('POST', '/reports', { jwt: a.token, body: { targetNymbleId: a.user.nymbleId, category: 'spam', description: 'reporting myself here' } })).status === 400);

  const open = await call('GET', '/admin/reports?status=pending&limit=100', { jwt: admin.token });
  const mine = open.data.items?.find((r) => r.targetNymbleId === a.user.nymbleId);
  check('admin sees the pending report', !!mine);

  const act = await call('PATCH', `/admin/reports/${mine?._id}`, { jwt: admin.token, body: { action: 'blacklist', reason: 'Smoke test: spam', durationHours: 1 } });
  check('admin blacklists from report', act.status === 200 && act.data.report.status === 'actioned', JSON.stringify(act.data));

  const denied = await call('POST', '/service/access', { body: { resource: 'whisper-board' }, nymble: a.nymbleToken });
  check('blacklisted user is denied immediately (403)', denied.status === 403 && denied.data.code === 'blacklisted' && denied.data.blacklist?.reason);
  check('blacklisted user cannot post (403)', (await call('POST', '/service/posts', { body: { resource: 'whisper-board', body: 'still here?' }, nymble: a.nymbleToken })).status === 403);
  check('blacklisted user cannot get a new token (403)', (await call('POST', '/pseudonym/token', { jwt: a.token })).status === 403);
  check('user dashboard shows blacklist', (await call('GET', '/pseudonym/me', { jwt: a.token })).data.blacklist?.state === 'active');
  check('second user is unaffected', (await call('POST', '/service/access', { body: { resource: 'tip-line' }, nymble: b.nymbleToken })).status === 200);
  check('duplicate blacklist rejected (409)', (await call('POST', '/admin/blacklist', { jwt: admin.token, body: { nymbleId: a.user.nymbleId, reason: 'again please', durationHours: 2 } })).status === 409);

  const list = await call('GET', '/admin/blacklist?status=active', { jwt: admin.token });
  const entry = list.data.items?.find((e) => e.nymbleId === a.user.nymbleId);
  check('blacklist list includes entry', !!entry);
  check('admin lifts blacklist', (await call('DELETE', `/admin/blacklist/${entry?.id}`, { jwt: admin.token })).status === 200);
  check('old token stays revoked after lifting', (await call('POST', '/service/access', { body: { resource: 'whisper-board' }, nymble: a.nymbleToken })).data.code === 'revoked_token');

  const fresh = await call('POST', '/pseudonym/token', { jwt: a.token });
  check('fresh token issued after lifting', fresh.status === 201);
  check('fresh token works again', (await call('POST', '/service/access', { body: { resource: 'whisper-board' }, nymble: fresh.data.token })).status === 200);

  const stats = await call('GET', '/admin/stats', { jwt: admin.token });
  check('admin stats populated', stats.data.totalUsers > 0 && stats.data.series?.length === 7);
  check('access log recorded denials', (await call('GET', '/admin/logs/access?outcome=denied', { jwt: admin.token })).data.total > 0);

  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('Smoke test crashed:', e.message); process.exit(1); });
