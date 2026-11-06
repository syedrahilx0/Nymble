import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Logo from '../components/Logo';
import { Button, Field, ScopeNote } from '../components/ui';

export function AuthShell({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden border-r border-line bg-ink-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="grid-bg absolute inset-0" aria-hidden="true" />
        <div className="relative flex items-center gap-3"><Logo size={36} /><span className="text-xl font-semibold">Nymble</span></div>
        <div className="relative max-w-lg">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">Use a service without handing over who you are.</h1>
          <ul className="mt-8 space-y-4 text-[15px] text-fog-300">
            <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-mint-400" />Your account stays with the Pseudonym Manager. Services only see a Nymble ID and a short-lived token.</li>
            <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />Misbehaving pseudonyms can be blocked, and their tokens stop working on the next request.</li>
            <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-mint-400" />Everyone else keeps using the service as before.</li>
          </ul>
        </div>
        <ScopeNote className="relative max-w-lg" />
      </section>
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm">{children}<ScopeNote className="mt-8 lg:hidden" /></div>
      </section>
    </div>
  );
}

export default function Register() {
  const { user, register } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [f, setF] = useState({ username: '', email: '', password: '', confirm: '' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErrs({ ...errs, [k]: undefined }); };

  async function submit(e) {
    e.preventDefault();
    if (f.password !== f.confirm) return setErrs({ confirm: 'Passwords do not match' });
    setBusy(true);
    try {
      const u = await register({ username: f.username, email: f.email, password: f.password });
      toast.success(`Account created. Your Nymble ID is ${u.nymbleId}.`);
      nav('/dashboard', { replace: true });
    } catch (err) {
      setErrs(err.fields || {});
      if (!Object.keys(err.fields || {}).length) toast.error(err.message);
    } finally { setBusy(false); }
  }

  return (
    <AuthShell>
      <div className="mb-8 flex items-center gap-3 lg:hidden"><Logo /><span className="text-lg font-semibold">Nymble</span></div>
      <h2 className="text-2xl font-semibold tracking-tight">Create your account</h2>
      <p className="mt-1 text-sm text-fog-400">You get a Nymble ID and a first token right away.</p>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Field label="Username" error={errs.username}><input className="input" autoComplete="username" value={f.username} onChange={set('username')} aria-invalid={Boolean(errs.username)} /></Field>
        <Field label="Email" error={errs.email}><input className="input" type="email" autoComplete="email" value={f.email} onChange={set('email')} aria-invalid={Boolean(errs.email)} /></Field>
        <Field label="Password" error={errs.password} hint="At least 8 characters with a letter and a number."><input className="input" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} aria-invalid={Boolean(errs.password)} /></Field>
        <Field label="Confirm password" error={errs.confirm}><input className="input" type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} aria-invalid={Boolean(errs.confirm)} /></Field>
        <Button type="submit" className="w-full" loading={busy} icon={UserPlus}>Create account</Button>
      </form>
      <p className="mt-5 text-sm text-fog-400">Already registered? <Link to="/login" className="font-medium text-sky-400 hover:underline">Sign in</Link></p>
    </AuthShell>
  );
}
