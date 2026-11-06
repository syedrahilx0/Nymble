import { Link } from 'react-router-dom';
import { CheckCircle2, Globe, KeyRound, ShieldCheck, ShieldOff, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFetch, useServices } from '../lib/hooks';
import { fmtDateTime, REASONS, timeAgo } from '../lib/format';
import NymbleCard from '../components/NymbleCard';
import { Badge, Card, EmptyState, ErrorState, PageHeader, TableSkeleton, tokenTone } from '../components/ui';

export function HistoryTable({ items, loading, limit }) {
  const svc = useServices();
  if (loading && !items) return <TableSkeleton rows={4} />;
  const rows = limit ? items?.slice(0, limit) : items;
  if (!rows?.length) return <EmptyState icon={Globe} title="No access requests yet" hint="Request access to a service and each attempt will appear here." action={<Link to="/service" className="mt-2 text-sm font-medium text-sky-400 hover:underline">Go to service access</Link>} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px]">
        <thead><tr><th className="th">When</th><th className="th">Service</th><th className="th">Action</th><th className="th">Result</th><th className="th">Detail</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._id}>
              <td className="td whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
              <td className="td">{svc.name(r.resource)}</td>
              <td className="td">{r.action === 'post' ? 'Post' : 'Open'}</td>
              <td className="td"><Badge tone={r.outcome === 'granted' ? 'ok' : 'bad'}>{r.outcome === 'granted' ? 'Granted' : 'Denied'}</Badge></td>
              <td className="td text-fog-400">{REASONS[r.reason]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Tile({ icon: Icon, label, value, tone, sub }) {
  const c = { ok: 'text-mint-400 bg-mint-400/10', bad: 'text-alert-400 bg-alert-500/10', warn: 'text-amber-400 bg-amber-400/10', mute: 'text-fog-400 bg-fog-500/10' }[tone];
  return (
    <Card className="flex items-start gap-3 p-4">
      <span className={`rounded-lg p-2 ${c}`}><Icon className="h-5 w-5" /></span>
      <div className="min-w-0"><p className="text-sm text-fog-400">{label}</p><p className="mt-0.5 font-medium">{value}</p>{sub && <p className="mt-0.5 truncate text-xs text-fog-500">{sub}</p>}</div>
    </Card>
  );
}

export default function UserDashboard() {
  const { user } = useAuth();
  const ps = useFetch('/pseudonym/me', { interval: 15000 });
  const hist = useFetch('/service/history', { interval: 15000 });
  const info = ps.data;
  const bl = info?.blacklist?.state === 'active' ? info.blacklist : null;
  const tok = info?.currentToken && new Date(info.currentToken.expiresAt) > new Date() ? info.currentToken : null;
  const reload = () => { ps.reload(); hist.reload(); };

  return (
    <>
      <PageHeader title={`Welcome, ${user.username}`} subtitle="Here is how services see you, and the state of your access." />
      {ps.error && !info ? <ErrorState error={ps.error} onRetry={ps.reload} /> : <NymbleCard info={info} loading={ps.loading} onChange={reload} />}

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Tile icon={UserCheck} tone="ok" label="Authentication" value="Signed in" sub={`Role: ${user.role} · ${user.email}`} />
        <Tile icon={KeyRound} tone={tok ? 'ok' : 'warn'} label="Nymble token" value={tok ? 'Active' : info?.currentToken ? 'Expired' : 'None'} sub={tok ? `Expires ${fmtDateTime(tok.expiresAt)}` : 'Get a token to use services'} />
        <Tile icon={bl ? ShieldOff : ShieldCheck} tone={bl ? 'bad' : 'ok'} label="Blacklist status" value={bl ? 'Blacklisted' : 'Clear'} sub={bl ? bl.reason : 'No active restrictions'} />
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5">
          <h2 className="text-base font-semibold">Recent access requests</h2>
          <Link to="/service" className="text-sm text-sky-400 hover:underline">Open services</Link>
        </div>
        <div className="border-t border-line"><HistoryTable items={hist.data?.items} loading={hist.loading} limit={8} /></div>
      </Card>
    </>
  );
}
