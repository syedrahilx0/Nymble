import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, Info, XCircle, X } from 'lucide-react';

const Ctx = createContext(null);
export const useToast = () => useContext(Ctx);

const STYLE = {
  success: { icon: CheckCircle2, cls: 'text-mint-400' },
  error: { icon: XCircle, cls: 'text-alert-400' },
  info: { icon: Info, cls: 'text-sky-400' },
};

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const dismiss = useCallback((id) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback((type, message) => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l.slice(-3), { id, type, message }]);
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 4000);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }), [push]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 top-3 z-[100] flex flex-col items-end gap-2 sm:left-auto sm:right-4 sm:top-4 sm:w-96" aria-live="polite">
        {items.map((t) => {
          const { icon: Icon, cls } = STYLE[t.type];
          return (
            <div key={t.id} role="status" className="pointer-events-auto flex w-full animate-toastIn items-start gap-3 rounded-xl border border-line bg-ink-800/95 p-3.5 shadow-2xl shadow-black/40 backdrop-blur">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${cls}`} />
              <p className="flex-1 text-sm leading-snug text-fog-100">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-fog-500 hover:text-fog-100" aria-label="Dismiss"><X className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
