# Instructions for AI agents

React + TypeScript + Vite portfolio. Read `DESIGN.md` before changing anything visual.

## Feedback UI: reuse, don't rebuild

Never call `window.alert`, `window.confirm` or `window.prompt`, and don't add a toast, modal or spinner library. Use these instead. They are themed for light and dark, accessible, and respect reduced motion.

| Need | Use | From |
| --- | --- | --- |
| Result of an action | `const toast = useToast()`, then `toast.success(msg)`, `toast.error(msg)` or `toast.info(msg)` | `src/feedback.tsx` |
| Ask before acting | `const confirm = useConfirm()`, then `await confirm({ title, message, confirmLabel, cancelLabel, danger })` | `src/feedback.tsx` |
| Busy button or inline wait | `<Loader size={17}/>` beside visible text such as "Saving…" | `src/components/Loader.tsx` |
| Nothing to show yet | `<LoadingScreen label="Loading portfolio…"/>` | `src/components/Loader.tsx` |

`FeedbackProvider` is already mounted in `src/main.tsx`, so the hooks work in any component. Don't mount it again.

```tsx
const toast = useToast();
const confirm = useConfirm();

async function remove() {
  if (!await confirm({ title: 'Delete Orbit?', confirmLabel: 'Delete project', cancelLabel: 'Keep project', danger: true })) return;
  setBusy(true);
  try { await deleteIt(); toast.success('Orbit deleted.'); }
  catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to delete. Please try again.'); }
  finally { setBusy(false); }
}

<button className="button primary" disabled={busy} aria-busy={busy}>{busy ? <Loader/> : <Trash2 size={17}/>}{busy ? 'Deleting…' : 'Delete'}</button>
```

- Every user action that succeeds or fails gets a toast, unless the screen itself already makes the result obvious.
- `confirm` is for destructive or hard-to-undo actions. Set `danger: true` when something is lost, and name the action in `confirmLabel` ("Delete project", not "OK").
- Keep errors from a form the user is filling in, such as a failed sign-in, inline beside that form.
- `Loader` is decorative (`aria-hidden`), so it always needs visible text next to it.
- The one exception is the `beforeunload` warning in `src/Admin.tsx`. Browsers allow only their own prompt on reload or tab close, so keep it. Links inside the app go through `confirm` first.

## Conventions

- Styles live in `src/styles.css` and use the tokens on `:root`. Don't hardcode colours that a token covers, and check both themes.
- Motion goes through `src/motion.ts`. Everything must work with reduced motion.
- `npm run build` and `npm test` before finishing. Run tests with `--workers=1`; parallel browsers overload this machine. Record verification in `QA.md`.
