import type { CSSProperties } from 'react';

/** The hero's dot grid in miniature: a ripple leaves the centre, as the name's shockwave does.
 * Decorative and inherits currentColor, so always pair it with visible text such as "Saving…". */
export default function Loader({ size = 17 }: { size?: number }) {
  return <span className="loader" aria-hidden="true" style={{ '--loader-size': `${size}px` } as CSSProperties}>{Array.from({ length: 9 }, (_, i) => <i key={i}/>)}</span>;
}

/** Full-page wait, for when there is nothing to show yet. */
export function LoadingScreen({ label }: { label: string }) {
  return <main className="loading loading-screen" role="status"><Loader size={44}/><p>{label}</p></main>;
}
