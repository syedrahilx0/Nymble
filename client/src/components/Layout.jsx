import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Flag, Fingerprint, Globe, LayoutDashboard, LogOut, Menu, ScrollText, ShieldBan, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../lib/hooks';
import Logo from './Logo';
import { Badge, cx } from './ui';

const NAV = {
  user: [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/pseudonym', label: 'My pseudonym', icon: Fingerprint },
    { to: '/service', label: 'Service access', icon: Globe },
    { to: '/reports', label: 'Reports', icon: Flag },
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/blacklist', label: 'Blacklist', icon: ShieldBan },
    { to: '/admin/reports', label: 'Reports', icon: Flag, badge: true },
    { to: '/admin/logs', label: 'Logs', icon: ScrollText },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const isAdmin = user.role === 'admin';
  const pending = useFetch(isAdmin ? '/admin/stats' : null, { interval: 20000, enabled: isAdmin });
  useEffect(() => setOpen(false), [pathname]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <Logo />
        <div>
          <p className="text-base font-semibold leading-none">Nymble</p>
          <p className="mt-1 text-xs text-fog-500">{isAdmin ? 'Admin console' : 'Pseudonymous access'}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Main">
        {NAV[user.role].map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => cx('flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm transition',
              isActive ? 'bg-mint-400/10 text-mint-300 ring-1 ring-inset ring-mint-400/25' : 'text-fog-400 hover:bg-ink-800 hover:text-fog-100')}>
            <Icon className="h-[18px] w-[18px]" />
            <span className="flex-1">{label}</span>
            {badge && pending.data?.pendingReports > 0 && <Badge tone="warn">{pending.data.pendingReports}</Badge>}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-line p-4">
        <div className="mb-3 min-w-0">
          <p className="truncate text-sm font-medium">{user.username}</p>
          <p className="truncate text-xs text-fog-500">{isAdmin ? 'Administrator' : user.nymbleId}</p>
        </div>
        <button onClick={logout} className="flex w-full items-center gap-2 rounded-[10px] border border-line px-3 py-2 text-sm text-fog-300 transition hover:border-alert-400/50 hover:text-alert-400">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-ink-900 lg:block">{sidebar}</aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink-900/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5"><Logo size={26} /><span className="font-semibold">Nymble</span></div>
        <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-fog-300 hover:bg-ink-800" aria-label="Open menu"><Menu className="h-6 w-6" /></button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-toastIn border-r border-line bg-ink-900">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-lg p-1 text-fog-400 hover:bg-ink-800" aria-label="Close menu"><X className="h-5 w-5" /></button>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="mx-auto max-w-6xl animate-pageIn px-4 py-6 sm:px-6 lg:px-8 lg:py-8" key={pathname}>
        <Outlet />
      </main>
    </div>
  );
}
