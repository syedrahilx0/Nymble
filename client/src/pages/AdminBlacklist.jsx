import { useState } from 'react';
import { Ban, ShieldCheck, ShieldOff } from 'lucide-react';
import { api } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { durationLabel, fmtDateTime, humanRemaining, useNow } from '../lib/format';
import { useToast } from '../context/ToastContext';
import BlacklistModal from '../components/BlacklistModal';
import { Badge, Button, Card, EmptyState, ErrorState, Modal, PageHeader, Pagination, TableSkeleton, Tabs, blacklistTone } from '../components/ui';

const LABEL = { active: 'Active', expired: 'Ran out', lifted: 'Lifted' };

export default function AdminBlacklist() {
  const toast = useToast();
  const now = useNow(30000);
  const [tab, setTab] = useState('active');
  const [page, setPage] = useState(1);
  const list = useFetch(`/admin/blacklist?status=${tab}&page=${page}&limit=10`, { interval: 15000 });
  const [adding, setAdding] = useState(false);
  const [lifting, setLifting] = useState(null);
  const [busy, setBusy] = useState(false);

  async function add(values) {
    await api('/admin/blacklist', { method: 'POST', body: values });
    toast.success(`${values.nymbleId} is now blacklisted. Its tokens were revoked.`);
    list.reload();
  }
  async function lift() {
    setBusy(true);
    try {
      await api(`/admin/blacklist/${lifting.id}`, { method: 'DELETE' });
      toast.success(`${lifting.nymbleId} was removed from the blacklist.`);
      setLifting(null); list.reload();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  const d = list.data;
  return (
    <>
      <PageHeader title="Blacklist" subtitle="Blocked pseudonyms. Entries show only the Nymble ID, the same view a service operator would have."
        actions={<Button variant="danger" icon={Ban} onClick={() => setAdding(true)}>Blacklist a Nymble ID</Button>} />
      <div className="mb-4"><Tabs value={tab} onChange={(v) => { setTab(v); setPage(1); }} options={[{ value: 'active', label: 'Active' }, { value: 'all', label: 'History' }]} /></div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {list.error && !d ? <div className="p-4"><ErrorState error={list.error} onRetry={list.reload} /></div> : list.loading && !d ? <TableSkeleton /> : !d.items.length ? (
            <EmptyState icon={ShieldCheck} title={tab === 'active' ? 'Nobody is blacklisted' : 'No blacklist history'} hint="Blocked pseudonyms will appear here." />
          ) : (
            <table className="w-full min-w-[860px]">
              <thead><tr><th className="th">Nymble ID</th><th className="th">Reason</th><th className="th">Duration</th><th className="th">Started</th><th className="th">Remaining</th><th className="th">State</th><th className="th" /></tr></thead>
              <tbody>
                {d.items.map((b) => (
                  <tr key={b.id}>
                    <td className="td mono text-fog-100">{b.nymbleId}</td>
                    <td className="td max-w-[260px]">{b.reason}</td>
                    <td className="td whitespace-nowrap">{durationLabel(b.durationHours)}</td>
                    <td className="td whitespace-nowrap">{fmtDateTime(b.createdAt)}</td>
                    <td className="td whitespace-nowrap">{b.state !== 'active' ? '—' : b.expiresAt ? humanRemaining(new Date(b.expiresAt) - now) : 'Never ends'}</td>
                    <td className="td"><Badge tone={blacklistTone[b.state]} dot={b.state === 'active'}>{LABEL[b.state]}</Badge></td>
                    <td className="td text-right">{b.state === 'active' && <Button variant="outline" size="sm" icon={ShieldOff} onClick={() => setLifting(b)}>Lift</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {d && <Pagination page={d.page} pages={d.pages} onPage={setPage} />}
      </Card>

      <BlacklistModal open={adding} onClose={() => setAdding(false)} onSubmit={add} />
      <Modal open={Boolean(lifting)} onClose={() => setLifting(null)} title="Lift this blacklist entry?"
        footer={<><Button variant="ghost" onClick={() => setLifting(null)}>Keep blocked</Button><Button loading={busy} onClick={lift} icon={ShieldOff}>Lift blacklist</Button></>}>
        <p className="text-sm text-fog-300"><span className="mono">{lifting?.nymbleId}</span> will be able to request a new token. Tokens revoked by the blacklist stay revoked.</p>
      </Modal>
    </>
  );
}
