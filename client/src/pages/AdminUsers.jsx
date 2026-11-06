import { useState } from 'react';
import { Ban, Search, Trash2, Users } from 'lucide-react';
import { api } from '../lib/api';
import { useDebounced, useFetch } from '../lib/hooks';
import { fmtDate, fmtDateTime } from '../lib/format';
import { useToast } from '../context/ToastContext';
import BlacklistModal from '../components/BlacklistModal';
import { Badge, Button, Card, EmptyState, ErrorState, Modal, PageHeader, Pagination, TableSkeleton, tokenTone } from '../components/ui';

export default function AdminUsers() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const users = useFetch(`/admin/users?page=${page}&limit=10${q ? `&search=${encodeURIComponent(q)}` : ''}`);
  const [target, setTarget] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function blacklist(values) {
    await api('/admin/blacklist', { method: 'POST', body: values });
    toast.success(`${values.nymbleId} is now blacklisted.`);
    users.reload();
  }
  async function remove() {
    setDeleting(true);
    try {
      await api(`/admin/users/${toDelete.id}`, { method: 'DELETE' });
      toast.success(`Deleted ${toDelete.username}.`);
      setToDelete(null); users.reload();
    } catch (e) { toast.error(e.message); } finally { setDeleting(false); }
  }

  const d = users.data;
  return (
    <>
      <PageHeader title="Users" subtitle="Accounts and the pseudonyms they hold. Only the Pseudonym Manager (this console) can see the link between them." />
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 p-4">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fog-500" />
            <input className="input pl-9" placeholder="Search username, email or Nymble ID" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search users" />
          </div>
          {d && <span className="text-sm text-fog-500">{d.total} users</span>}
        </div>
        <div className="overflow-x-auto border-t border-line">
          {users.error && !d ? <div className="p-4"><ErrorState error={users.error} onRetry={users.reload} /></div> : users.loading && !d ? <TableSkeleton /> : !d.items.length ? (
            <EmptyState icon={Users} title="No users match" hint="Try a different search." />
          ) : (
            <table className="w-full min-w-[820px]">
              <thead><tr><th className="th">User</th><th className="th">Nymble ID</th><th className="th">Token</th><th className="th">Status</th><th className="th">Joined</th><th className="th text-right">Actions</th></tr></thead>
              <tbody>
                {d.items.map((u) => (
                  <tr key={u.id}>
                    <td className="td"><p className="font-medium text-fog-100">{u.username}</p><p className="text-xs text-fog-500">{u.email}</p></td>
                    <td className="td mono">{u.nymbleId}</td>
                    <td className="td">{u.activeToken ? <Badge tone={tokenTone.active}>Active</Badge> : <Badge tone="mute">None</Badge>}</td>
                    <td className="td">{u.blacklist ? <div><Badge tone="bad" dot>Blacklisted</Badge><p className="mt-1 text-xs text-fog-500">{u.blacklist.expiresAt ? `until ${fmtDateTime(u.blacklist.expiresAt)}` : 'permanent'}</p></div> : <Badge tone="ok">In good standing</Badge>}</td>
                    <td className="td whitespace-nowrap">{fmtDate(u.createdAt)}</td>
                    <td className="td">
                      <div className="flex justify-end gap-2">
                        <Button variant="danger" size="sm" icon={Ban} disabled={Boolean(u.blacklist)} onClick={() => setTarget(u)}>Blacklist</Button>
                        <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setToDelete(u)} aria-label={`Delete ${u.username}`} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {d && <Pagination page={d.page} pages={d.pages} onPage={setPage} />}
      </Card>

      <BlacklistModal open={Boolean(target)} onClose={() => setTarget(null)} nymbleId={target?.nymbleId} lockId title={`Blacklist ${target?.username || ''}`} onSubmit={blacklist} />
      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)} title="Delete this account?"
        footer={<><Button variant="ghost" onClick={() => setToDelete(null)}>Keep account</Button><Button variant="danger" loading={deleting} onClick={remove} icon={Trash2}>Delete account</Button></>}>
        <p className="text-sm text-fog-300">This removes <b>{toDelete?.username}</b> and their tokens. Access logs and posts stay, linked only to the pseudonym <span className="mono">{toDelete?.nymbleId}</span>. This cannot be undone.</p>
      </Modal>
    </>
  );
}
