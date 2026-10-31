import { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, Pause, Play } from 'lucide-react';
import type { Content } from '../data';
import './Hero.css';

/** Decorative, DPR-aware dot grid where every dot is a small spring. The name lands like a stone in water:
 * its shockwave draws the grid on, then slow currents drift through it, stray drops fall, the cursor drags a
 * wake that stretches the dots and they wobble home, and a click or tap sends out a ripple. Turning motion off
 * eases it flat; it stops off-screen, in background tabs, and under reduced motion. The glow is held back
 * behind the copy. No pointer trapping. */
export function ParticleCanvas({ paused = false }: { paused?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const wake = useRef(() => {});
  useEffect(() => { pausedRef.current = paused; wake.current(); }, [paused]);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const host = canvas.parentElement!;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const shouldStill = () => pausedRef.current || preference.matches;
    const LEVELS = 8, REACH = 190, STIFFNESS = .05, DAMPING = .86, RING = 74;
    let width = 1, height = 1, frame = 0, visible = true, last = 0, time = 0, lastScroll = scrollY, currents = 0, nextDrop = 3200;
    let energy = shouldStill() ? 0 : 1;
    let dots: { x: number; y: number; weight: number; ox: number; oy: number; vx: number; vy: number }[] = [];
    let ripples: { x: number; y: number; age: number; life: number; speed: number; power: number }[] = [];
    let opening: (typeof ripples)[number] | null = null;
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, presence: 0, inside: false };
    const paths = Array.from({ length: LEVELS }, () => new Path2D());
    function layout() {
      const gap = width < 650 ? 24 : 30;
      const offsetX = (width % gap) / 2, offsetY = (height % gap) / 2;
      const clamp = (value: number) => Math.min(1, Math.max(0, value));
      dots = [];
      for (let y = offsetY; y < height; y += gap) for (let x = offsetX; x < width; x += gap) {
        const overCopy = (width < 650 ? 1 : clamp((.62 - x / width) / .25)) * clamp((.62 - y / height) / .2);
        dots.push({ x, y, weight: 1 - .72 * overCopy, ox: 0, oy: 0, vx: 0, vy: 0 });
      }
    }
    function ripple(x: number, y: number, power: number, life: number, age = 0) {
      if (ripples.length < 7) ripples.push({ x, y, age, life, speed: .62, power });
    }
    function draw(now: number) {
      if (!ctx || !canvas) return;
      const dt = Math.max(0, Math.min(now - (last || now), 40)) / 16.67; last = now; // rAF timestamps can precede a manual redraw's performance.now().
      const target = shouldStill() ? 0 : 1;
      energy += (target - energy) * .06 * dt;
      if (Math.abs(target - energy) < .02) energy = target;
      if (!target) opening = null;
      if (!energy) ripples = [];
      time += (.009 * dt + (scrollY - lastScroll) * .0035) * energy; lastScroll = scrollY;
      currents += ((opening ? 0 : 1) - currents) * .025 * dt;
      const fromX = pointer.x, fromY = pointer.y;
      pointer.x += (pointer.targetX - pointer.x) * .18 * dt;
      pointer.y += (pointer.targetY - pointer.y) * .18 * dt;
      const dragX = dt ? (pointer.x - fromX) / dt : 0, dragY = dt ? (pointer.y - fromY) / dt : 0;
      pointer.presence += ((pointer.inside ? 1 : 0) - pointer.presence) * .08 * dt;
      nextDrop -= dt * 16.67;
      if (nextDrop <= 0 && energy === 1) { ripple(width * (.45 + Math.random() * .5), height * (.08 + Math.random() * .5), .3, 1900); nextDrop = 3800 + Math.random() * 3600; }
      for (const r of ripples) r.age += dt * 16.67;
      ripples = ripples.filter(r => r.age < r.life);
      const rings = ripples.filter(r => r.age > 0).map(r => ({ x: r.x, y: r.y, radius: r.age * r.speed, strength: r.power * (1 - r.age / r.life) ** 2 }));
      const front = opening && opening.age > 0 ? opening.age * opening.speed : 0;
      if (opening && opening.age >= opening.life) opening = null;
      const damp = DAMPING ** dt;
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < LEVELS; i++) paths[i] = new Path2D();
      for (const d of dots) {
        const u = d.x * .0036, v = d.y * .0036;
        const warp = Math.sin(v * 1.7 + time * .5) + Math.sin(u * 1.3 - time * .37);
        const current = Math.sin(u * 1.1 + warp * 1.1 - time * .9) * Math.sin(v * 1.4 - warp * .8 + time * .55);
        const wave = Math.max(0, current) ** 1.5 * d.weight * currents * energy;
        let forceX = 0, forceY = 0, ring = 0;
        for (const r of rings) {
          const rx = d.x - r.x, ry = d.y - r.y, distance = Math.sqrt(rx * rx + ry * ry) || 1, band = (distance - r.radius) / RING;
          if (Math.abs(band) > 2.2) continue;
          const lift = Math.exp(-band * band) * r.strength;
          ring += lift; forceX += rx / distance * lift * 1.5; forceY += ry / distance * lift * 1.5;
        }
        const dx = d.x - pointer.x, dy = d.y - pointer.y, distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const near = Math.max(0, 1 - distance / REACH) ** 2 * pointer.presence;
        forceX += dx / distance * near * .55 + dragX * near * .2;
        forceY += dy / distance * near * .55 + dragY * near * .2;
        d.vx = (d.vx + (forceX - d.ox * STIFFNESS) * dt) * damp;
        d.vy = (d.vy + (forceY - d.oy * STIFFNESS) * dt) * damp;
        d.ox += d.vx * dt; d.oy += d.vy * dt;
        let opened = 1;
        if (opening) {
          opened = Math.min(1, (front - Math.hypot(d.x - opening.x, d.y - opening.y)) / 150);
          if (opened <= 0) continue;
        }
        const glow = Math.min(1, wave + (near * .8 + ring * .85 * d.weight) * energy);
        const speed = Math.hypot(d.vx, d.vy) * energy;
        const x = d.x + d.ox * energy + Math.cos(warp * 2) * wave * 4, y = d.y + d.oy * energy + Math.sin(warp * 2) * wave * 4;
        const radius = (1 + glow * 2.1) * opened;
        const reach = radius + Math.min(speed * 1.5, 7) * opened, angle = Math.atan2(d.vy, d.vx);
        const path = paths[Math.min(LEVELS - 1, Math.floor(glow * LEVELS))];
        path.moveTo(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach);
        path.ellipse(x, y, reach, radius, angle, 0, Math.PI * 2);
      }
      const rgb = document.documentElement.dataset.theme === 'dark' ? '138,176,247' : '20,88,221';
      for (let i = 0; i < LEVELS; i++) { ctx.fillStyle = `rgba(${rgb},${.13 + i / (LEVELS - 1) * .67})`; ctx.fill(paths[i]); }
      if ((energy > 0 || target > 0) && visible && !document.hidden) frame = requestAnimationFrame(draw);
    }
    function sync() { cancelAnimationFrame(frame); last = 0; draw(performance.now()); }
    wake.current = sync;
    function resize() {
      const bounds = host.getBoundingClientRect(); width = bounds.width; height = bounds.height;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas!.width = Math.round(width * dpr); canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0); layout(); sync();
    }
    function move(event: PointerEvent) {
      if (event.pointerType === 'touch') return;
      const box = host.getBoundingClientRect();
      pointer.targetX = event.clientX - box.left; pointer.targetY = event.clientY - box.top;
      if (!pointer.inside) { pointer.x = pointer.targetX; pointer.y = pointer.targetY; pointer.inside = true; }
    }
    function leave() { pointer.inside = false; }
    function press(event: PointerEvent) {
      if (shouldStill()) return;
      const box = host.getBoundingClientRect();
      ripple(event.clientX - box.left, event.clientY - box.top, .9, 1700);
    }
    const observer = new ResizeObserver(resize); observer.observe(host);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }); intersection.observe(host);
    host.addEventListener('pointermove', move, { passive: true }); host.addEventListener('pointerleave', leave); host.addEventListener('pointerdown', press, { passive: true });
    document.addEventListener('visibilitychange', sync); preference.addEventListener('change', sync);
    const theme = new MutationObserver(sync); theme.observe(document.documentElement, { attributeFilter: ['data-theme'] });
    resize();
    if (!shouldStill()) { // Timed to the letters rising, with a softer echo behind the first wave.
      opening = { x: width * .5, y: height * .9, age: -240, life: 3000, speed: Math.hypot(width, height) / 2200, power: 1.5 };
      ripples.push(opening); ripple(opening.x, opening.y, .7, 2300, -620);
    }
    return () => { cancelAnimationFrame(frame); wake.current = () => {}; observer.disconnect(); theme.disconnect(); intersection.disconnect(); host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave); host.removeEventListener('pointerdown', press); document.removeEventListener('visibilitychange', sync); preference.removeEventListener('change', sync); };
  }, []);
  return <canvas ref={ref} className="particle-canvas" aria-hidden="true" />;
}

/** Long names shrink to keep the wordmark on one line. */
export function nameStyle(name: string): React.CSSProperties | undefined {
  return name.length > 6 ? { fontSize: `clamp(48px, ${180 / (name.length + 1)}vw, ${2300 / (name.length + 1)}px)` } : undefined;
}

export default function Hero({ content }: { content: Pick<Content, 'name' | 'role' | 'intro' | 'headline'> }) {
  const [paused, setPaused] = useState(false);
  return <div className="hero-stage"><section className="hero" aria-labelledby="hero-title">
    <ParticleCanvas paused={paused} />
    <div className="hero-inner wrap">
      <div className="hero-top hero-lead"><p className="hero-enter" style={{ '--delay': '40ms' } as React.CSSProperties}>{content.role}</p><span className="hero-note hero-enter" style={{ '--delay': '100ms' } as React.CSSProperties}>Independent by design.</span><button className="motion-toggle" aria-label={paused ? 'Play background animation' : 'Pause background animation'} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play size={14}/> : <Pause size={14}/>}<span>Motion {paused ? 'off' : 'on'}</span></button></div>
      <div className="hero-bottom hero-lead"><div><h2 className="hero-enter" style={{ '--delay': '520ms' } as React.CSSProperties}>{content.headline}</h2><p className="hero-intro hero-enter" style={{ '--delay': '620ms' } as React.CSSProperties}>{content.intro}</p></div><a className="button primary hero-enter" style={{ '--delay': '720ms' } as React.CSSProperties} href="#work">Explore my work <ArrowDownRight size={20}/></a></div>
      <h1 id="hero-title" className="hero-name" style={nameStyle(content.name)} aria-label={content.name}>{Array.from(content.name + '.').map((letter, i) => <span aria-hidden="true" className="hero-letter" key={i} style={{ '--delay': `${140 + i * 75}ms` } as React.CSSProperties}>{letter}</span>)}</h1>
    </div>
  </section></div>;
}
