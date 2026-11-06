import { useSearchParams } from 'react-router-dom';
import { Flag } from 'lucide-react';
import { useFetch } from '../lib/hooks';
import { fmtDateTime } from '../lib/format';
import ReportForm, { CATEGORIES } from '../components/ReportForm';
import { Badge, Card, EmptyState, PageHeader, TableSkeleton, reportTone } from '../components/ui';

export default function Reports() {
  const [params] = useSearchParams();
  const mine = useFetch('/reports/mine');
  return (
    <>
      <PageHeader title="Report misbehavior" subtitle="Flag a pseudonym that broke the rules. Administrators review each report before anyone is blocked." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="h-fit p-5"><ReportForm key={mine.data?.reports?.length ?? 0} initial={{ targetNymbleId: params.get('target') || '' }} onDone={mine.reload} /></Card>
        <Card className="overflow-hidden">
          <div className="px-4 py-3.5"><h2 className="text-base font-semibold">Your reports</h2></div>
          <div className="border-t border-line">
            {mine.loading && !mine.data ? <TableSkeleton rows={3} /> : !mine.data?.reports?.length ? (
              <EmptyState icon={Flag} title="You have not filed any reports" hint="Reports you send will show up here with their status." />
            ) : (
              <ul className="divide-y divide-line/60">
                {mine.data.reports.map((r) => (
                  <li key={r._id} className="px-4 py-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="mono text-fog-100">{r.targetNymbleId}</span>
                      <Badge tone={reportTone[r.status]}>{{ pending: 'Pending review', actioned: 'Action taken', dismissed: 'Dismissed' }[r.status]}</Badge>
                    </div>
                    <p className="mt-1.5 text-sm text-fog-300">{r.description}</p>
                    <p className="mt-1 text-xs text-fog-500">{CATEGORIES.find((c) => c.v === r.category)?.l} · {fmtDateTime(r.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
