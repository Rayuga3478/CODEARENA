import { create } from 'zustand';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';

type ToastTone = 'info' | 'ok' | 'warn' | 'bad';

interface ToastItem {
  id: number;
  title: string;
  message?: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>, ttlMs?: number) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t, ttlMs = 4500) => {
    const id = ++seq;
    set({ toasts: [...get().toasts.slice(-3), { ...t, id }] });
    setTimeout(() => get().dismiss(id), ttlMs);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

/** Imperative helper: `toast.ok('Saved')`. */
export const toast = {
  info: (title: string, message?: string) => useToastStore.getState().push({ title, message, tone: 'info' }),
  ok: (title: string, message?: string) => useToastStore.getState().push({ title, message, tone: 'ok' }),
  warn: (title: string, message?: string) => useToastStore.getState().push({ title, message, tone: 'warn' }),
  bad: (title: string, message?: string) => useToastStore.getState().push({ title, message, tone: 'bad' }, 6500),
};

const ICONS = { info: Info, ok: CheckCircle2, warn: AlertTriangle, bad: XCircle };
const COLORS = { info: '#000080', ok: '#007a00', warn: '#9a6a00', bad: '#c00000' };

/** Tray-balloon style toast viewport. Mount once in App. */
export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="os-toasts" aria-live="polite" role="status">
      {toasts.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <div key={t.id} className="os-toast">
            <Icon size={18} style={{ color: COLORS[t.tone], flex: 'none', marginTop: 2 }} />
            <div className="flex-1 min-w-0">
              <div className="os-toast__title">{t.title}</div>
              {t.message && <div className="text-[13px] opacity-80 break-words">{t.message}</div>}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="opacity-60 hover:opacity-100 bg-transparent border-0 cursor-pointer p-0 text-inherit">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
