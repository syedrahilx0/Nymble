import { useFetch } from '../lib/hooks';
import { fmtDate, fmtDateTime } from '../lib/format';
import NymbleCard from '../components/NymbleCard';
import { Badge, Card, ErrorState, PageHeader, ScopeNote, TableSkeleton, tokenTone } from '../components/ui';

const REVOKE = { rotated: 'Replaced by a newer token', user: 'Revoked by you', blacklisted: 'Revoked by a blacklist', admin: 'Revoked by an administrator' };

export default function Pseudonym() {
  const ps = useFetch('/pseudonym/me', { interval: 15000 });
  const info = ps.data;
  return (
    <>
      <PageHeader title="My pseudonym" subtitle="The identity services see in place of your account." />
      {ps.error && !info ? <ErrorState error={ps.error} onRetry={ps.reload} /> : <NymbleCard info={info} loading={ps.loading} onChange={ps.reload} />}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">What a service sees</h2>
          <ul className="mt-3 space-y-2 text-sm text-fog-300">
            <li>Your Nymble ID and the token you present</li>
            <li>When you ask for access and whether it was granted</li>
            <li>What you post under your pseudonym</li>
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">What stays with the Pseudonym Manager</h2>
          <ul className="mt-3 space-y-2 text-sm text-fog-300">
            <li>The link between your account and your Nymble ID</li>
            <li>Your email and password hash (the password itself is never stored)</li>
            <li>A hash of each token, not the token</li>
          </ul>
        </Card>
      </div>
      <ScopeNote className="mt-4" />

      <Card className="mt-6 overflow-hidden">
        <div className="px-4 py-3.5"><h2 className="text-base font-semibold">Token history</h2><p className="text-xs text-fog-500">Pseudonym created {fmtDate(info?.createdAt)}</p></div>
        <div className="overflow-x-auto border-t border-line">
          {ps.loading && !info ? <TableSkeleton rows={3} /> : (
            <table className="w-full min-w-[560px]">
              <thead><tr><th className="th">Token</th><th className="th">Status</th><th className="th">Issued</th><th className="th">Expires</th><th className="th">Note</th></tr></thead>
              <tbody>
                {info?.tokens?.map((t) => (
                  <tr key={t.id}>
                    <td className="td mono">{t.prefix}…</td>
                    <td className="td"><Badge tone={tokenTone[t.status]}>{t.status[0].toUpperCase() + t.status.slice(1)}</Badge></td>
                    <td className="td whitespace-nowrap">{fmtDateTime(t.issuedAt)}</td>
                    <td className="td whitespace-nowrap">{fmtDateTime(t.expiresAt)}</td>
                    <td className="td text-fog-400">{t.revokedReason ? REVOKE[t.revokedReason] : t.status === 'expired' ? 'Expired on its own' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </>
  );
}
