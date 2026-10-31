import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export type Theme = 'light' | 'dark';
const KEY = 'reham-theme';
const groundColor: Record<Theme, string> = { light: '#f2f3f5', dark: '#111318' };

function stored(): Theme | null { try { const value = localStorage.getItem(KEY); return value === 'light' || value === 'dark' ? value : null; } catch { return null; } }
function system(): Theme { return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', groundColor[theme]);
}

/** index.html sets data-theme before first paint; this keeps it in sync afterwards.
 * A saved choice wins; otherwise the page follows the system setting live. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => stored() ?? system());
  useEffect(() => {
    apply(theme);
    const query = matchMedia('(prefers-color-scheme: dark)');
    const follow = () => { if (!stored()) setTheme(system()); };
    query.addEventListener('change', follow);
    return () => query.removeEventListener('change', follow);
  }, [theme]);
  function toggle(origin?: { x: number; y: number }) {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, next); } catch { /* The choice simply won't persist. */ }
    const commit = () => { flushSync(() => setTheme(next)); apply(next); };
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) { commit(); return; }
    const toDark = next === 'dark';
    document.documentElement.dataset.wipe = next; // Going dark keeps the light page on top, so it can shrink away.
    const transition = document.startViewTransition(commit);
    const { x, y } = origin ?? { x: innerWidth, y: 0 };
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const closed = `circle(0px at ${x}px ${y}px)`, open = `circle(${radius}px at ${x}px ${y}px)`;
    // Light pours out of the button; going dark plays the same motion backwards, drawing it back in.
    transition.ready.then(() => {
      const wipe = document.documentElement.animate(
        { clipPath: toDark ? [open, closed] : [closed, open] },
        { duration: 750, easing: toDark ? 'cubic-bezier(.8,0,.35,1)' : 'cubic-bezier(.65,0,.2,1)', fill: 'both', pseudoElement: toDark ? '::view-transition-old(root)' : '::view-transition-new(root)' },
      );
      transition.finished.finally(() => wipe.cancel()); // A filled animation would otherwise clip the next transition's snapshot.
    }).catch(() => { /* Skipped transitions still apply the theme. */ });
  }
  return { theme, toggle };
}
