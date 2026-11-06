import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { useFetch, useServices } from '../lib/hooks';
import { fmtDateTime, REASONS } from '../lib/format';
import { Badge, Card, EmptyState, ErrorState, PageHeader, Pagination, TableSkeleton, Tabs } from '../components/ui';

const SEV = { info: 'info', success: 'ok', warning: 'warn', danger: 'bad' };

export default function AdminLogs() {
  const svc = useServices();
  const [tab, setTab] = useState('access');
  const [outcome, setOutcome] = useState('');
  const [page, setPage] = useState(1);
  const path = tab === 'access' ? `/admin/logs/access?page=${page}&limit=15${outcome ? `&outcome=${outcome}` : ''}` : `/admin/logs/activity?page=${page}&limit=15`;
  const logs = useFetch(path, { interval: 10000 });
  const d = logs.data;

  return (
    <>
      <PageHeader title="Logs" subtitle="Access decisions the service made, and an audit trail of administrative events." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={tab} onChange={(v) => { setTab(v); setPage(1); }} options={[{ value: 'access', label: 'Access requests' }, { value: 'activity', label: 'Activity' }]} />
        {tab === 'access' && (
          <select className="input w-auto" value={outcome} onChange={(e) => { setOutcome(e.target.value); setPage(1); }} aria-label="Filter by outcome">
            <option value="">All outcomes</option><option value="granted">Granted</option><option value="denied">Denied</option>
          </select>
        )}
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {logs.error && !d ? <div className="p-4"><ErrorState error={logs.error} onRetry={logs.reload} /></div> : logs.loading && !d ? <TableSkeleton rows={8} /> : !d.items.length ? (
            <EmptyState icon={ScrollText} title="Nothing logged yet" />
          ) : tab === 'access' ? (
            <table className="w-full min-w-[720px]">
              <thead><tr><th className="th">Time</th><th className="th">Nymble ID</th><th className="th">Service</th><th className="th">Action</th><th className="th">Outcome</th><th className="th">Detail</th></tr></thead>
              <tbody>
                {d.items.map((l) => (
                  <tr key={l._id}>
                    <td className="td whitespace-nowrap">{fmtDateTime(l.createdAt)}</td>
                    <td className="td mono">{l.nymbleId || <span className="text-fog-500">unknown token</span>}</td>
                    <td className="td">{svc.name(l.resource)}</td>
                    <td className="td">{l.action === 'post' ? 'Post' : 'Open'}</td>
                    <td className="td"><Badge tone={l.outcome === 'granted' ? 'ok' : 'bad'}>{l.outcome === 'granted' ? 'Granted' : 'Denied'}</Badge></td>
                    <td className="td text-fog-400">{REASONS[l.reason]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[560px]">
              <thead><tr><th className="th">Time</th><th className="th">Event</th><th className="th">Details</th></tr></thead>
              <tbody>
                {d.items.map((a) => (
                  <tr key={a._id}>
                    <td className="td whitespace-nowrap">{fmtDateTime(a.createdAt)}</td>
                    <td className="td"><Badge tone={SEV[a.severity]}>{a.type}</Badge></td>
                    <td className="td">{a.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {d && <Pagination page={d.page} pages={d.pages} onPage={setPage} />}
      </Card>
    </>
  );
}
