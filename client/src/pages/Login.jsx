import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Logo from '../components/Logo';
import { AuthShell } from './Register';
import { Button, Field } from '../components/ui';

export default function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErrs({ ...errs, [k]: undefined }); };

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(f.email, f.password);
      toast.success(`Signed in as ${u.username}.`);
      nav(u.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      setErrs(err.fields || {});
      if (!Object.keys(err.fields || {}).length) toast.error(err.message);
    } finally { setBusy(false); }
  }

  return (
    <AuthShell>
      <div className="mb-8 flex items-center gap-3 lg:hidden"><Logo /><span className="text-lg font-semibold">Nymble</span></div>
      <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
      <p className="mt-1 text-sm text-fog-400">Use your account to manage your pseudonym.</p>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Field label="Email" error={errs.email}>
          <input className="input" type="email" autoComplete="email" value={f.email} onChange={set('email')} aria-invalid={Boolean(errs.email)} />
        </Field>
        <Field label="Password" error={errs.password}>
          <input className="input" type="password" autoComplete="current-password" value={f.password} onChange={set('password')} aria-invalid={Boolean(errs.password)} />
        </Field>
        <Button type="submit" className="w-full" loading={busy} icon={LogIn}>Sign in</Button>
      </form>
      <p className="mt-5 text-sm text-fog-400">New here? <Link to="/register" className="font-medium text-sky-400 hover:underline">Create an account</Link></p>

      <div className="mt-8 rounded-xl border border-line bg-ink-850 p-3.5">
        <p className="text-xs text-fog-400">Demo accounts from the seed script</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="rounded-lg border border-line px-2.5 py-1 text-xs text-fog-300 hover:border-mint-400/50 hover:text-fog-100" onClick={() => setF({ email: 'alice@nymble.local', password: 'Demo@12345' })}>Fill user (alice)</button>
          <button type="button" className="rounded-lg border border-line px-2.5 py-1 text-xs text-fog-300 hover:border-mint-400/50 hover:text-fog-100" onClick={() => setF({ email: 'admin@nymble.local', password: 'Admin@12345' })}>Fill administrator</button>
        </div>
      </div>
    </AuthShell>
  );
}
