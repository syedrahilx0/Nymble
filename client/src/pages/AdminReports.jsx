import { useState } from 'react';
import { Ban, Flag, X } from 'lucide-react';
import { api } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { fmtDateTime, timeAgo } from '../lib/format';
import { useToast } from '../context/ToastContext';
import BlacklistModal from '../components/BlacklistModal';
import { CATEGORIES } from '../components/ReportForm';
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Pagination, Skeleton, Tabs, reportTone } from '../components/ui';

export default function AdminReports() {
  const toast = useToast();
  const [tab, setTab] = useState('pending');
  const [page, setPage] = useState(1);
  const list = useFetch(`/admin/reports?status=${tab}&page=${page}&limit=8`, { interval: 15000 });
  const [target, setTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const cat = (v) => CATEGORIES.find((c) => c.v === v)?.l || v;

  async function dismiss(r) {
    setBusyId(r._id);
    try {
      await api(`/admin/reports/${r._id}`, { method: 'PATCH', body: { action: 'dismiss' } });
      toast.info('Report dismissed.'); list.reload();
    } catch (e) { toast.error(e.message); } finally { setBusyId(null); }
  }
  async function blacklist(values) {
    await api(`/admin/reports/${target._id}`, { method: 'PATCH', body: { action: 'blacklist', reason: values.reason, durationHours: values.durationHours } });
    toast.success(`${target.targetNymbleId} is blacklisted and its tokens were revoked.`);
    list.reload();
  }

  const d = list.data;
  return (
    <>
      <PageHeader title="Reports" subtitle="Misbehavior reports from users. Review the evidence, then dismiss the report or blacklist the pseudonym." />
      <div className="mb-4"><Tabs value={tab} onChange={(v) => { setTab(v); setPage(1); }} options={[{ value: 'pending', label: 'Needs review' }, { value: 'all', label: 'All reports' }]} /></div>
      {list.error && !d ? <ErrorState error={list.error} onRetry={list.reload} /> : list.loading && !d ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}</div>
      ) : !d.items.length ? (
        <Card><EmptyState icon={Flag} title={tab === 'pending' ? 'Nothing waiting for review' : 'No reports yet'} hint="New reports from users show up here." /></Card>
      ) : (
        <div className="space-y-3">
          {d.items.map((r) => (
            <Card key={r._id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mono text-fog-100">{r.targetNymbleId}</span>
                    <Badge tone="info">{cat(r.category)}</Badge>
                    <Badge tone={reportTone[r.status]}>{{ pending: 'Pending', actioned: 'Blacklisted', dismissed: 'Dismissed' }[r.status]}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-fog-300">{r.description}</p>
                  {r.post && <blockquote className="mt-2 rounded-lg border-l-2 border-sky-400/60 bg-ink-850 px-3 py-2 text-sm text-fog-300">“{r.post.body}”</blockquote>}
                  <p className="mt-2 text-xs text-fog-500">Reported by <span className="mono">{r.reporterNymbleId}</span> · {timeAgo(r.createdAt)}{r.resolvedAt ? ` · resolved ${fmtDateTime(r.resolvedAt)}` : ''}</p>
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" icon={X} loading={busyId === r._id} onClick={() => dismiss(r)}>Dismiss</Button>
                    <Button variant="danger" size="sm" icon={Ban} onClick={() => setTarget(r)}>Blacklist</Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
          <Card><Pagination page={d.page} pages={d.pages} onPage={setPage} />{d.pages <= 1 && <p className="px-4 py-3 text-sm text-fog-500">{d.total} report{d.total === 1 ? '' : 's'}</p>}</Card>
        </div>
      )}
      <BlacklistModal open={Boolean(target)} onClose={() => setTarget(null)} nymbleId={target?.targetNymbleId} lockId
        reason={target ? `${cat(target.category)}: ${target.description}`.slice(0, 300) : ''} title="Blacklist from report" onSubmit={blacklist} />
    </>
  );
}
