import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, CheckCircle2, Flag, KeyRound, ShieldBan, ShieldX, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFetch } from '../lib/hooks';
import { REASONS, timeAgo } from '../lib/format';
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton, StatCard } from '../components/ui';

const tip = { background: '#0F1B30', border: '1px solid #1E2F4D', borderRadius: 12, color: '#E8EEF8', fontSize: 12 };
const DOT = { info: 'bg-sky-400', success: 'bg-mint-400', warning: 'bg-amber-400', danger: 'bg-alert-400' };
const weekday = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString([], { weekday: 'short', timeZone: 'UTC' });

export default function AdminDashboard() {
  const stats = useFetch('/admin/stats', { interval: 10000 });
  const act = useFetch('/admin/logs/activity?limit=10', { interval: 10000 });
  const s = stats.data;
  const loading = stats.loading && !s;
  const series = s?.series.map((d) => ({ ...d, label: weekday(d.day) }));
  const reasons = s?.denialReasons.map((r) => ({ name: REASONS[r.reason] || r.reason, count: r.count }));

  return (
    <>
      <PageHeader title="Overview" subtitle="Live view of pseudonyms, tokens and access decisions. Refreshes every 10 seconds."
        actions={<Button variant="outline" size="sm" onClick={() => { stats.reload(); act.reload(); }}>Refresh now</Button>} />
      {stats.error && !s ? <ErrorState error={stats.error} onRetry={stats.reload} /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard loading={loading} label="Registered users" value={s?.totalUsers} icon={Users} tone="sky" />
            <StatCard loading={loading} label="Active Nymble tokens" value={s?.activeTokens} icon={KeyRound} tone="mint" hint="Valid and not expired" />
            <StatCard loading={loading} label="Blacklisted users" value={s?.blacklisted} icon={ShieldBan} tone="alert" hint="Currently blocked" />
            <StatCard loading={loading} label="Successful access requests" value={s?.granted} icon={CheckCircle2} tone="mint" />
            <StatCard loading={loading} label="Denied access requests" value={s?.denied} icon={ShieldX} tone="amber" />
            <StatCard loading={loading} label="Reports waiting for review" value={s?.pendingReports} icon={Flag} tone="amber" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-5">
            <Card className="p-4 lg:col-span-3">
              <h2 className="font-semibold">Access requests, last 7 days</h2>
              <div className="mt-4 h-64">
                {loading ? <Skeleton className="h-full w-full" /> : (
                  <ResponsiveContainer>
                    <AreaChart data={series} margin={{ left: -20, right: 8, top: 4 }}>
                      <defs>
                        <linearGradient id="gGrant" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2DE2A6" stopOpacity=".35" /><stop offset="1" stopColor="#2DE2A6" stopOpacity="0" /></linearGradient>
                        <linearGradient id="gDeny" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FB7185" stopOpacity=".35" /><stop offset="1" stopColor="#FB7185" stopOpacity="0" /></linearGradient>
                      </defs>
                      <CartesianGrid stroke="#162640" vertical={false} />
                      <XAxis dataKey="label" stroke="#63748F" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#63748F" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={tip} cursor={{ stroke: '#1F3355' }} />
                      <Area type="monotone" dataKey="granted" name="Granted" stroke="#2DE2A6" strokeWidth={2} fill="url(#gGrant)" />
                      <Area type="monotone" dataKey="denied" name="Denied" stroke="#FB7185" strokeWidth={2} fill="url(#gDeny)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-2 flex gap-4 text-xs text-fog-400"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-mint-400" />Granted</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-alert-400" />Denied</span></div>
            </Card>

            <Card className="p-4 lg:col-span-2">
              <h2 className="font-semibold">Why requests were denied</h2>
              <div className="mt-4 h-64">
                {loading ? <Skeleton className="h-full w-full" /> : !reasons?.length ? <EmptyState title="No denials yet" /> : (
                  <ResponsiveContainer>
                    <BarChart data={reasons} layout="vertical" margin={{ left: 10, right: 12 }}>
                      <CartesianGrid stroke="#162640" horizontal={false} />
                      <XAxis type="number" stroke="#63748F" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" stroke="#8A9BB8" fontSize={12} width={104} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tip} cursor={{ fill: '#0F1B30' }} />
                      <Bar dataKey="count" name="Denied" fill="#22D3EE" radius={[0, 6, 6, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>

          <Card className="mt-4 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5"><h2 className="font-semibold">Recent activity</h2><Link to="/admin/logs" className="text-sm text-sky-400 hover:underline">All logs</Link></div>
            <div className="border-t border-line">
              {!act.data?.items?.length ? <EmptyState icon={Activity} title="No activity yet" /> : (
                <ul className="divide-y divide-line/60">
                  {act.data.items.map((a) => (
                    <li key={a._id} className="flex items-start gap-3 px-4 py-3">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[a.severity]}`} />
                      <p className="flex-1 text-sm text-fog-300">{a.message}</p>
                      <span className="shrink-0 text-xs text-fog-500">{timeAgo(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </>
      )}
    </>
  );
}
