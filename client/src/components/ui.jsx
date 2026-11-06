import { useEffect, useState } from 'react';
import { Check, Copy, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';

export const cx = (...c) => c.filter(Boolean).join(' ');

const BTN = {
  primary: 'bg-gradient-to-r from-mint-400 to-sky-400 text-ink-950 font-semibold hover:brightness-110 disabled:brightness-75',
  outline: 'border border-line bg-ink-850 text-fog-100 hover:border-sky-400/60 hover:bg-ink-800',
  ghost: 'text-fog-300 hover:bg-ink-800 hover:text-fog-100',
  danger: 'bg-alert-500/15 text-alert-400 border border-alert-500/40 hover:bg-alert-500/25',
};
export function Button({ variant = 'primary', size = 'md', loading, icon: Icon, children, className, disabled, ...p }) {
  return (
    <button
      disabled={disabled || loading}
      className={cx('inline-flex items-center justify-center gap-2 rounded-[10px] text-sm transition disabled:cursor-not-allowed disabled:opacity-60 active:scale-[.98]',
        size === 'sm' ? 'px-3 py-1.5' : 'px-4 py-2.5', BTN[variant], className)}
      {...p}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export const Card = ({ className, children, ...p }) => (
  <div className={cx('rounded-2xl border border-line bg-ink-900', className)} {...p}>{children}</div>
);

const TONE = {
  ok: 'bg-mint-400/10 text-mint-400 ring-mint-400/30',
  bad: 'bg-alert-500/10 text-alert-400 ring-alert-400/30',
  warn: 'bg-amber-400/10 text-amber-400 ring-amber-400/30',
  info: 'bg-sky-400/10 text-sky-400 ring-sky-400/30',
  mute: 'bg-fog-500/10 text-fog-400 ring-fog-500/30',
};
export const Badge = ({ tone = 'mute', dot, children }) => (
  <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', TONE[tone])}>
    {dot && <span className={cx('h-1.5 w-1.5 rounded-full bg-current', dot === 'pulse' && 'animate-breathe')} />}
    {children}
  </span>
);

export const tokenTone = { active: 'ok', expired: 'warn', revoked: 'mute' };
export const reportTone = { pending: 'warn', actioned: 'bad', dismissed: 'mute' };
export const blacklistTone = { active: 'bad', expired: 'mute', lifted: 'ok' };

export const Skeleton = ({ className }) => <div className={cx('skeleton', className)} />;
export const Spinner = ({ className }) => <Loader2 className={cx('h-5 w-5 animate-spin text-sky-400', className)} />;

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fog-100">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-fog-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ label, error, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-fog-300">{label}</span>
      {children}
      {error ? <span className="mt-1.5 block text-xs text-alert-400">{error}</span> : hint ? <span className="mt-1.5 block text-xs text-fog-500">{hint}</span> : null}
    </label>
  );
}

export function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      {Icon && <div className="mb-1 rounded-full border border-line bg-ink-850 p-3"><Icon className="h-5 w-5 text-fog-400" /></div>}
      <p className="text-sm font-medium text-fog-100">{title}</p>
      {hint && <p className="max-w-sm text-sm text-fog-400">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <Card className="p-6">
      <p className="text-sm font-medium text-alert-400">{error?.message || 'Could not load this data.'}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>Try again</Button>}
    </Card>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'mint', hint, loading }) {
  const color = { mint: 'text-mint-400 bg-mint-400/10', sky: 'text-sky-400 bg-sky-400/10', alert: 'text-alert-400 bg-alert-500/10', amber: 'text-amber-400 bg-amber-400/10' }[tone];
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-fog-400">{label}</p>
        <span className={cx('rounded-lg p-2', color)}><Icon className="h-4 w-4" /></span>
      </div>
      {loading ? <Skeleton className="mt-3 h-8 w-20" /> : <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-fog-100">{value}</p>}
      {hint && <p className="mt-1 text-xs text-fog-500">{hint}</p>}
    </Card>
  );
}

export function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ } }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs text-fog-300 transition hover:border-sky-400/60 hover:text-fog-100"
    >
      {done ? <Check className="h-3.5 w-3.5 text-mint-400" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? 'Copied' : label}
    </button>
  );
}

export function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full animate-toastIn overflow-y-auto rounded-t-2xl border border-line bg-ink-900 shadow-2xl shadow-black/60 sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-fog-400 hover:bg-ink-800 hover:text-fog-100" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-fog-400">
      <span>Page {page} of {pages}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export function Tabs({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-ink-850 p-1">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={cx('rounded-lg px-3.5 py-1.5 text-sm transition', value === o.value ? 'bg-ink-600 text-fog-100' : 'text-fog-400 hover:text-fog-100')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="space-y-2 p-4">{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
);

export const ScopeNote = ({ className }) => (
  <div className={cx('rounded-xl border border-sky-400/25 bg-sky-400/5 p-3.5 text-xs leading-relaxed text-fog-300', className)}>
    <span className="font-medium text-sky-300">Academic prototype.</span> This app simulates the Nymble architecture with ordinary server-side tokens. It does not implement the
    original cryptographic protocol or Tor. A Nymble ID is a pseudonym: the server can still link it to an account, so this demonstrates pseudonymity, not true anonymity.
  </div>
);
