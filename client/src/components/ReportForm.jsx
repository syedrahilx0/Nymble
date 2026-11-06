import { useState } from 'react';
import { Send } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Button, Field } from './ui';

export const CATEGORIES = [
  { v: 'spam', l: 'Spam or scams' },
  { v: 'harassment', l: 'Harassment' },
  { v: 'abuse', l: 'Abusive content' },
  { v: 'illegal', l: 'Illegal activity' },
  { v: 'other', l: 'Something else' },
];

export default function ReportForm({ initial = {}, onDone, onCancel }) {
  const toast = useToast();
  const [f, setF] = useState({ targetNymbleId: initial.targetNymbleId || '', category: 'spam', description: '' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErrs({ ...errs, [k]: undefined }); };

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/reports', { method: 'POST', body: { ...f, ...(initial.postId ? { postId: initial.postId } : {}) } });
      toast.success('Report sent. An administrator will review it.');
      onDone?.();
    } catch (err) {
      setErrs(err.fields || {});
      if (!Object.keys(err.fields || {}).length) toast.error(err.message);
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Nymble ID to report" error={errs.targetNymbleId}>
        <input className="input mono" placeholder="NYM-XXXX-XXXX-XXXX-XXXX" value={f.targetNymbleId} onChange={set('targetNymbleId')}
          readOnly={Boolean(initial.targetNymbleId)} aria-invalid={Boolean(errs.targetNymbleId)} autoComplete="off" />
      </Field>
      <Field label="What kind of problem is it?" error={errs.category}>
        <select className="input" value={f.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}</select>
      </Field>
      <Field label="What happened?" error={errs.description} hint={`${f.description.length}/500`}>
        <textarea className="input min-h-[96px] resize-y" maxLength={500} value={f.description} onChange={set('description')} placeholder="Describe the behavior so an administrator can judge it." aria-invalid={Boolean(errs.description)} />
      </Field>
      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" loading={busy} icon={Send}>Send report</Button>
      </div>
    </form>
  );
}
