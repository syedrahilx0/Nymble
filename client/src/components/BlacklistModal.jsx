import { useEffect, useState } from 'react';
import { Ban } from 'lucide-react';
import { Button, Field, Modal } from './ui';
import { useToast } from '../context/ToastContext';

export const DURATIONS = [
  { v: 1, l: '1 hour' }, { v: 24, l: '24 hours' }, { v: 72, l: '3 days' }, { v: 168, l: '7 days' }, { v: 720, l: '30 days' }, { v: 0, l: 'Permanent' },
];

// onSubmit({ nymbleId, reason, durationHours }) should throw an ApiError on failure.
export default function BlacklistModal({ open, onClose, onSubmit, nymbleId = '', reason = '', lockId = false, title = 'Blacklist a Nymble ID' }) {
  const toast = useToast();
  const [f, setF] = useState({ nymbleId, reason, duration: 24 });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setF({ nymbleId, reason, duration: 24 }); setErrs({}); } }, [open, nymbleId, reason]);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErrs({ ...errs, [k]: undefined }); };

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit({ nymbleId: f.nymbleId, reason: f.reason, durationHours: Number(f.duration) === 0 ? null : Number(f.duration) });
      onClose();
    } catch (err) {
      setErrs(err.fields || {});
      if (!Object.keys(err.fields || {}).length) toast.error(err.message);
    } finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" form="bl-form" type="submit" loading={busy} icon={Ban}>Blacklist</Button></>}>
      <form id="bl-form" onSubmit={submit} className="space-y-4" noValidate>
        <p className="text-sm text-fog-400">Active tokens for this pseudonym are revoked right away, and every service request is denied until the blacklist ends.</p>
        <Field label="Nymble ID" error={errs.nymbleId}>
          <input className="input mono" value={f.nymbleId} onChange={set('nymbleId')} readOnly={lockId} placeholder="NYM-XXXX-XXXX-XXXX-XXXX" aria-invalid={Boolean(errs.nymbleId)} />
        </Field>
        <Field label="Reason shown to the user" error={errs.reason}>
          <textarea className="input min-h-[80px] resize-y" maxLength={300} value={f.reason} onChange={set('reason')} placeholder="e.g. Repeated spam on Whisper Board" aria-invalid={Boolean(errs.reason)} />
        </Field>
        <Field label="Duration" error={errs.durationHours}>
          <select className="input" value={f.duration} onChange={set('duration')}>{DURATIONS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}</select>
        </Field>
      </form>
    </Modal>
  );
}
