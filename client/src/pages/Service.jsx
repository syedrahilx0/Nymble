import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, CheckCircle2, Flag, KeyRound, LockKeyhole, MessageSquare, Radio, Send, XCircle } from 'lucide-react';
import { api, tokenStore } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useServices } from '../lib/hooks';
import { fmtDateTime, humanRemaining, timeAgo } from '../lib/format';
import ReportForm from '../components/ReportForm';
import { Badge, Button, Card, EmptyState, Modal, PageHeader, Skeleton, cx } from '../components/ui';

export default function Service() {
  const { user } = useAuth();
  const toast = useToast();
  const services = useServices();
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState(null);
  const [busy, setBusy] = useState(false);
  const [useOther, setUseOther] = useState(false);
  const [other, setOther] = useState('');
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [reporting, setReporting] = useState(null);
  const [, setRev] = useState(0); // forces a re-read of the saved token

  const stored = tokenStore.get(user.id);
  const token = useOther ? other.trim() : stored;
  const headers = { 'X-Nymble-Token': token || '' };

  async function request(resource, silent = false) {
    setSelected(resource);
    if (!silent) setBusy(true);
    try {
      const r = await api('/service/access', { method: 'POST', body: { resource }, headers });
      setDecision({ ...r, resource });
      if (!silent) toast.success('Access granted.');
    } catch (e) {
      if (e.status === 401 || e.status === 403) {
        setDecision({ granted: false, resource, ...e.data });
        if (!silent) toast.error(e.message);
      } else toast.error(e.message);
    } finally { setBusy(false); }
  }

  async function post(e) {
    e.preventDefault();
    setPosting(true);
    try {
      await api('/service/posts', { method: 'POST', body: { resource: selected, body: draft }, headers });
      setDraft('');
      toast.success('Posted under your Nymble ID.');
      await request(selected, true);
    } catch (err) {
      if (err.status === 401 || err.status === 403) { setDecision({ granted: false, resource: selected, ...err.data }); toast.error(err.message); }
      else toast.error(err.fields?.body || err.message);
    } finally { setPosting(false); }
  }

  async function getToken() {
    try {
      const r = await api('/pseudonym/token', { method: 'POST' });
      tokenStore.set(user.id, r.token);
      setUseOther(false);
      toast.success('Token issued and saved in this browser.');
      setDecision(null);
      setRev((n) => n + 1);
    } catch (e) { toast.error(e.message); }
  }

  const bl = decision?.blacklist;
  const svc = services.list.find((s) => s.id === selected);

  return (
    <>
      <PageHeader title="Service access" subtitle="Present your Nymble token to a service. The server checks it on every request, so a blacklist takes effect immediately." />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><KeyRound className="h-4 w-4 text-sky-400" /> Token in use</div>
            {!useOther ? (
              stored ? <p className="mono mt-2 break-all text-fog-300">{`${stored.slice(0, 13)}••••••••••••`}</p> : (
                <div className="mt-2"><p className="text-sm text-fog-400">No token is saved in this browser yet.</p><Button size="sm" className="mt-2" icon={KeyRound} onClick={getToken}>Get a token</Button></div>
              )
            ) : (
              <textarea className="input mono mt-2 min-h-[72px]" value={other} onChange={(e) => setOther(e.target.value)} placeholder="Paste any token to test a denial" aria-label="Token to present" />
            )}
            <button onClick={() => setUseOther((v) => !v)} className="mt-2 text-xs text-sky-400 hover:underline">{useOther ? 'Use my own token' : 'Try a different token'}</button>
          </Card>

          <div className="space-y-2">
            {!services.list.length ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />) : services.list.map((s) => (
              <button key={s.id} onClick={() => request(s.id)} disabled={busy}
                className={cx('w-full rounded-2xl border p-4 text-left transition disabled:opacity-70', selected === s.id ? 'border-mint-400/50 bg-mint-400/5' : 'border-line bg-ink-900 hover:border-sky-400/50')}>
                <div className="flex items-center justify-between gap-2"><span className="font-medium">{s.name}</span><Radio className="h-4 w-4 text-fog-500" /></div>
                <p className="mt-1 text-sm text-fog-400">{s.description}</p>
                <p className="mt-2 text-xs font-medium text-sky-400">{busy && selected === s.id ? 'Checking token…' : 'Request access'}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          {!decision ? (
            <Card><EmptyState icon={LockKeyhole} title="Choose a service to request access" hint="The result of the token check appears here. Granted requests open the service." /></Card>
          ) : decision.granted ? (
            <div className="space-y-4">
              <Card className="flex flex-wrap items-center justify-between gap-3 border-mint-400/30 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-mint-400" />
                  <div><p className="font-medium">Access granted to {decision.service.name}</p><p className="mono text-fog-400">{decision.nymbleId}</p></div>
                </div>
                <Badge tone="ok">Token valid until {fmtDateTime(decision.tokenExpiresAt)}</Badge>
              </Card>

              <Card className="p-4">
                <form onSubmit={post} className="space-y-3">
                  <label className="text-sm font-medium" htmlFor="draft">Post as {decision.nymbleId}</label>
                  <textarea id="draft" className="input min-h-[76px] resize-y" maxLength={280} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write something. Others will see your Nymble ID, not your name." />
                  <div className="flex items-center justify-between"><span className="text-xs text-fog-500">{draft.length}/280</span><Button type="submit" size="sm" loading={posting} disabled={!draft.trim()} icon={Send}>Post</Button></div>
                </form>
              </Card>

              <Card className="overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3.5"><h2 className="font-semibold">Latest in {decision.service.name}</h2><Button variant="ghost" size="sm" onClick={() => request(selected)}>Refresh</Button></div>
                {!decision.posts.length ? <div className="border-t border-line"><EmptyState icon={MessageSquare} title="Nothing here yet" hint="Be the first to post." /></div> : (
                  <ul className="divide-y divide-line/60 border-t border-line">
                    {decision.posts.map((p) => (
                      <li key={p.id} className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="mono text-sky-300">{p.nymbleId}{p.nymbleId === decision.nymbleId && <span className="ml-2 text-xs text-fog-500">(you)</span>}</span>
                          <span className="flex items-center gap-3 text-xs text-fog-500">{timeAgo(p.createdAt)}
                            {p.nymbleId !== decision.nymbleId && <button onClick={() => setReporting(p)} className="inline-flex items-center gap-1 text-fog-400 hover:text-alert-400"><Flag className="h-3.5 w-3.5" /> Report</button>}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-fog-100">{p.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          ) : (
            <Card className="border-alert-400/40 p-5">
              <div className="flex items-start gap-3">
                {decision.code === 'blacklisted' ? <Ban className="mt-0.5 h-6 w-6 shrink-0 text-alert-400" /> : <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-alert-400" />}
                <div className="min-w-0">
                  <p className="font-medium text-alert-400">Access denied{svc ? ` to ${svc.name}` : ''}</p>
                  <p className="mt-1 text-sm text-fog-300">{decision.message}</p>
                  <p className="mt-2 text-xs text-fog-500">Reason code: <span className="mono">{decision.code}</span></p>
                  {bl && (
                    <div className="mt-4 rounded-xl border border-alert-400/30 bg-alert-500/10 p-3.5 text-sm">
                      <p><span className="text-fog-400">Reason: </span>{bl.reason}</p>
                      <p className="mt-1"><span className="text-fog-400">Duration: </span>{bl.expiresAt ? `until ${fmtDateTime(bl.expiresAt)} (${humanRemaining(new Date(bl.expiresAt) - Date.now())} left)` : 'permanent'}</p>
                    </div>
                  )}
                  {decision.code !== 'blacklisted' && <p className="mt-3 text-sm text-fog-400">Get a fresh token from <Link to="/pseudonym" className="text-sky-400 hover:underline">My pseudonym</Link>, then try again.</p>}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal open={Boolean(reporting)} onClose={() => setReporting(null)} title="Report this post">
        {reporting && (
          <>
            <p className="mb-4 rounded-lg border border-line bg-ink-850 p-3 text-sm text-fog-300">“{reporting.body}”</p>
            <ReportForm initial={{ targetNymbleId: reporting.nymbleId, postId: reporting.id }} onCancel={() => setReporting(null)} onDone={() => setReporting(null)} />
          </>
        )}
      </Modal>
    </>
  );
}
