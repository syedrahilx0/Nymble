import { useState } from 'react';
import { Eye, EyeOff, KeyRound, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { api, tokenStore } from '../lib/api';
import { clock, fmtDateTime, humanRemaining, useNow } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge, Button, CopyButton, Skeleton, cx } from './ui';

const R = 62;
const C = 2 * Math.PI * R;

export default function NymbleCard({ info, loading, onChange }) {
  const { user } = useAuth();
  const toast = useToast();
  const now = useNow(1000);
  const [busy, setBusy] = useState(null);
  const [reveal, setReveal] = useState(false);

  if (loading && !info) return <Skeleton className="h-56 w-full rounded-2xl" />;

  const cur = info?.currentToken;
  const bl = info?.blacklist?.state === 'active' ? info.blacklist : null;
  const left = cur ? new Date(cur.expiresAt) - now : 0;
  const total = cur ? new Date(cur.expiresAt) - new Date(cur.issuedAt) : 1;
  const state = bl ? 'blocked' : cur && left > 0 ? 'active' : cur ? 'expired' : 'none';
  const progress = state === 'active' ? Math.min(1, left / total) : state === 'none' ? 0 : 1;

  const stored = tokenStore.get(user.id);
  const canReveal = stored && cur && stored.startsWith(cur.prefix);

  const ring = { active: 'url(#ring)', blocked: '#FB7185', expired: '#FBBF24', none: '#1F3355' }[state];
  const border = { active: 'border-mint-400/30', blocked: 'border-alert-400/40', expired: 'border-amber-400/30', none: 'border-line' }[state];

  async function issue() {
    setBusy('issue');
    try {
      const r = await api('/pseudonym/token', { method: 'POST' });
      tokenStore.set(user.id, r.token);
      setReveal(false);
      toast.success(state === 'active' ? 'New token issued. The previous one no longer works.' : 'Token issued. You can use it on the Service access page.');
      onChange?.();
    } catch (e) { toast.error(e.message); onChange?.(); } finally { setBusy(null); }
  }
  async function revoke() {
    setBusy('revoke');
    try {
      await api('/pseudonym/token', { method: 'DELETE' });
      tokenStore.clear(user.id);
      toast.info('Token revoked.');
      onChange?.();
    } catch (e) { toast.error(e.message); } finally { setBusy(null); }
  }

  const parts = (info?.nymbleId || user.nymbleId || '').split('-');

  return (
    <div className={cx('rounded-2xl border bg-gradient-to-br from-ink-800 to-ink-900 p-5 sm:p-6', border)}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative mx-auto h-[150px] w-[150px] shrink-0" role="img" aria-label={`Token status: ${state}`}>
          <svg viewBox="0 0 150 150" className="-rotate-90">
            <defs><linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2DE2A6" /><stop offset="1" stopColor="#22D3EE" /></linearGradient></defs>
            <circle cx="75" cy="75" r={R} fill="none" stroke="#162640" strokeWidth="9" />
            <circle cx="75" cy="75" r={R} fill="none" stroke={ring} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - progress)} className={cx('transition-[stroke-dashoffset] duration-1000 ease-linear', state === 'blocked' && 'animate-breathe')} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {state === 'active' && (<><span className="font-mono text-xl font-medium tabular-nums tracking-tight">{clock(left)}</span><span className="text-xs text-fog-400">until expiry</span></>)}
            {state === 'blocked' && (<><ShieldAlert className="mb-1 h-6 w-6 text-alert-400" /><span className="text-sm font-medium text-alert-400">Blocked</span></>)}
            {state === 'expired' && <span className="text-sm font-medium text-amber-400">Expired</span>}
            {state === 'none' && <span className="text-sm text-fog-400">No token</span>}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-fog-400">Your Nymble ID</p>
            <Badge tone={{ active: 'ok', blocked: 'bad', expired: 'warn', none: 'mute' }[state]} dot={state === 'active' ? 'pulse' : true}>
              {{ active: 'Token active', blocked: 'Blacklisted', expired: 'Token expired', none: 'No active token' }[state]}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="font-mono text-xl font-medium sm:text-2xl" aria-label="Nymble ID">
              {parts.map((p, i) => <span key={i}>{i > 0 && <span className="px-0.5 text-fog-500">-</span>}{p}</span>)}
            </p>
            <CopyButton text={info?.nymbleId || user.nymbleId || ''} />
          </div>

          {cur && state !== 'blocked' && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <KeyRound className="h-4 w-4 text-fog-500" />
              <span className="mono break-all text-fog-300">{canReveal && reveal ? stored : `${cur.prefix}••••••••••••`}</span>
              {canReveal ? (
                <>
                  <button onClick={() => setReveal((v) => !v)} className="rounded-md p-1 text-fog-400 hover:bg-ink-700 hover:text-fog-100" aria-label={reveal ? 'Hide token' : 'Show token'}>
                    {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <CopyButton text={stored} label="Copy token" />
                </>
              ) : <span className="text-xs text-fog-500">Full token is only shown when issued. Rotate to get a new one.</span>}
            </div>
          )}
          {cur && <p className="mt-2 text-xs text-fog-500">Issued {fmtDateTime(cur.issuedAt)} · expires {fmtDateTime(cur.expiresAt)}</p>}

          {bl && (
            <div className="mt-3 rounded-xl border border-alert-400/30 bg-alert-500/10 p-3 text-sm">
              <p className="font-medium text-alert-400">This pseudonym is blocked from services.</p>
              <p className="mt-1 text-fog-300">Reason: {bl.reason}</p>
              <p className="mt-1 text-xs text-fog-400">
                {bl.expiresAt ? `Until ${fmtDateTime(bl.expiresAt)} (${humanRemaining(new Date(bl.expiresAt) - now)} left)` : 'Permanent'} · started {fmtDateTime(bl.createdAt)}
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={issue} loading={busy === 'issue'} disabled={Boolean(bl)} icon={state === 'active' ? RefreshCw : KeyRound}>
              {state === 'active' ? 'Rotate token' : 'Get a token'}
            </Button>
            {state === 'active' && <Button variant="outline" onClick={revoke} loading={busy === 'revoke'} icon={Trash2}>Revoke</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
