import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, Check, Info, X } from 'lucide-react';
import { lockScroll } from './motion';

type ToastKind = 'success' | 'error' | 'info';
type ToastItem = { id: number; kind: ToastKind; message: string; leaving?: boolean };
export type ConfirmOptions = { title: string; message?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean };
type Feedback = {
  toast: Record<ToastKind, (message: string) => void>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<Feedback | null>(null);
const icons = { success: Check, error: AlertCircle, info: Info };
const VISIBLE_TOASTS = 3;
const LEAVE_MS = 200; // Matches toast-out in styles.css.

function useFeedback() {
  const feedback = useContext(FeedbackContext);
  if (!feedback) throw new Error('Wrap the app in <FeedbackProvider>.');
  return feedback;
}

/** `const toast = useToast(); toast.success('Published.');` for the result of any action. */
export function useToast() { return useFeedback().toast; }

/** `const confirm = useConfirm(); if (await confirm({ title: 'Delete it?', danger: true })) …`
 * Resolves false on Cancel, Escape, or a click on the backdrop. */
export function useConfirm() { return useFeedback().confirm; }

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onDismiss(item.id), item.kind === 'error' ? 8000 : 4500); // Errors get longer: they usually need reading.
    return () => clearTimeout(timer);
  }, [paused, item.id, item.kind, onDismiss]);
  const Icon = icons[item.kind];
  return <li className={`toast toast-${item.kind}${item.leaving ? ' is-leaving' : ''}`} role={item.kind === 'error' ? 'alert' : 'status'} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
    <span className="toast-icon"><Icon size={15}/></span><p>{item.message}</p><button aria-label="Dismiss notification" onClick={() => onDismiss(item.id)}><X size={15}/></button>
  </li>;
}

/** Mounted once in main.tsx. Everything else reaches it through useToast and useConfirm. */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [request, setRequest] = useState<ConfirmOptions | null>(null);
  const nextId = useRef(0);
  const pending = useRef<((confirmed: boolean) => void) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const dismiss = useCallback((id: number) => {
    setToasts(all => all.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts(all => all.filter(t => t.id !== id)), LEAVE_MS);
  }, []);
  // A repeated message replaces its older copy, so one invalid form can't stack identical toasts.
  const show = useCallback((kind: ToastKind, message: string) => {
    const id = ++nextId.current;
    setToasts(all => [...all.filter(t => t.message !== message), { id, kind, message }].slice(-VISIBLE_TOASTS));
  }, []);
  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>(resolve => {
    pending.current?.(false);
    pending.current = resolve;
    setRequest(options);
  }), []);
  function settle(confirmed: boolean) { pending.current?.(confirmed); pending.current = null; setRequest(null); }

  useEffect(() => {
    const element = dialog.current!;
    if (request && !element.open) element.showModal(); // Takes focus to the first button, Cancel, so Enter never confirms by accident.
    else if (!request && element.open) element.close();
    lockScroll(Boolean(request));
  }, [request]);

  const value = useMemo<Feedback>(() => ({
    toast: { success: message => show('success', message), error: message => show('error', message), info: message => show('info', message) },
    confirm,
  }), [show, confirm]);

  return <FeedbackContext.Provider value={value}>{children}
    <ol className="toasts" aria-label="Notifications">{toasts.map(item => <Toast key={item.id} item={item} onDismiss={dismiss}/>)}</ol>
    <dialog ref={dialog} data-lenis-prevent className="confirm-dialog" role="alertdialog" aria-labelledby="confirm-title" aria-describedby={request?.message ? 'confirm-message' : undefined} onCancel={e => { e.preventDefault(); settle(false); }} onClick={e => { if (e.target === e.currentTarget) settle(false); }}>
      {request && <div className="confirm-body"><h2 id="confirm-title">{request.title}</h2>{request.message && <p id="confirm-message">{request.message}</p>}<div className="confirm-actions"><button className="button secondary" onClick={() => settle(false)}>{request.cancelLabel ?? 'Cancel'}</button><button className={`button ${request.danger ? 'danger' : 'primary'}`} onClick={() => settle(true)}>{request.confirmLabel ?? 'Confirm'}</button></div></div>}
    </dialog>
  </FeedbackContext.Provider>;
}
