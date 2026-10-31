import { useEffect, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const MOTION = '(prefers-reduced-motion: no-preference)';
let lenis: Lenis | null = null;

/** Lenis owns wheel scrolling on desktop; touch stays native. Nothing runs under reduced motion. */
export function useSmoothScroll() {
  useEffect(() => {
    if (!matchMedia(MOTION).matches) return;
    const instance = new Lenis({ lerp: .09, anchors: true });
    const tick = (time: number) => instance.raf(time * 1000);
    instance.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0);
    lenis = instance;
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => { gsap.ticker.remove(tick); instance.destroy(); lenis = null; };
  }, []);
}

export function lockScroll(locked: boolean) { if (locked) lenis?.stop(); else lenis?.start(); }

/** Page-level scroll choreography. Everything is a `from` or a scrub on top of finished CSS,
 * so the page is complete with JavaScript off or with reduced motion. Animations use opacity
 * rather than visibility so content stays reachable by keyboard and find-in-page. */
export function usePageMotion() {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add({ motion: MOTION, tall: '(min-height: 600px)' }, context => {
      gsap.to('.scroll-progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });
      ScrollTrigger.create({ start: 40, end: 1e7, toggleClass: { targets: '.site-header', className: 'is-scrolled' } });
      for (const id of ['work', 'about', 'contact']) ScrollTrigger.create({ trigger: `#${id}`, start: 'top center', end: 'bottom center', toggleClass: { targets: `.site-header a[href="#${id}"]`, className: 'is-active' } });
      const { motion, tall } = context.conditions!;
      if (!motion) return;

      // Hero: the copy clears while the work section slides up. The sheet carries the letters; see createLetterWorld.
      if (tall) gsap.to('.hero-lead', { opacity: 0, y: -48, ease: 'none', stagger: .08, scrollTrigger: { trigger: '.hero-stage', start: 'top top', end: () => `+=${innerHeight * .34}`, scrub: .4, invalidateOnRefresh: true } });

      gsap.utils.toArray<HTMLElement>('.line-in').forEach(line => gsap.from(line, { yPercent: 112, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: line.parentElement, start: 'top 90%', once: true } }));
      gsap.utils.toArray<HTMLElement>('.reveal').forEach(element => gsap.from(element, { y: 36, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 90%', once: true } }));

      // About: the two lines pass each other, then the statement inks in word by word.
      gsap.fromTo('.about-line-a', { xPercent: -7 }, { xPercent: 5, ease: 'none', scrollTrigger: { trigger: '.about-title', start: 'top bottom', end: 'bottom top', scrub: .6 } });
      gsap.fromTo('.about-line-b', { xPercent: 9 }, { xPercent: -3, ease: 'none', scrollTrigger: { trigger: '.about-title', start: 'top bottom', end: 'bottom top', scrub: .6 } });
      gsap.fromTo('.about-lead .word', { opacity: .16 }, { opacity: 1, ease: 'none', stagger: .05, scrollTrigger: { trigger: '.about-lead', start: 'top 80%', end: 'bottom 50%', scrub: .4 } });

      // Contact: the panel opens from an inset card to the full bleed of the viewport.
      gsap.fromTo('.contact-panel', { clipPath: 'inset(7% 5% 7% 5% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: '.contact-panel', start: 'top bottom', end: 'top 30%', scrub: .4 } });
      gsap.from('.footer-name > span', { yPercent: 55, ease: 'none', scrollTrigger: { trigger: '.site-footer', start: 'top bottom', end: 'bottom bottom', scrub: .5 } });

      // Touch has no hover, so what hover shows on desktop is driven by the scroll instead.
      if (matchMedia('(hover: none)').matches) {
        gsap.utils.toArray<HTMLElement>('.service').forEach(service => ScrollTrigger.create({ trigger: service, start: 'top 62%', end: 'bottom 38%', toggleClass: 'is-lit' }));
        gsap.fromTo('.contact-circle', { rotation: -135, scale: .6 }, { rotation: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '.contact-row', start: 'top 95%', end: 'top 45%', scrub: .5 } });
      }

      const circle = document.querySelector<HTMLElement>('.contact-circle');
      if (circle && matchMedia('(hover: hover)').matches) {
        const x = gsap.quickTo(circle, 'x', { duration: .5, ease: 'power3' }), y = gsap.quickTo(circle, 'y', { duration: .5, ease: 'power3' });
        const move = (e: PointerEvent) => { const box = circle.getBoundingClientRect(); x((e.clientX - box.left - box.width / 2) * .3); y((e.clientY - box.top - box.height / 2) * .3); };
        const leave = () => { x(0); y(0); };
        circle.addEventListener('pointermove', move); circle.addEventListener('pointerleave', leave);
        return () => { circle.removeEventListener('pointermove', move); circle.removeEventListener('pointerleave', leave); };
      }
    });
    return () => mm.revert();
  }, []);
}

type LetterMode = 'fall' | 'rest' | 'free' | 'held';
type WorldEvents = { impact: (x: number, y: number, power: number) => void; play: () => void };

/** The hero's letters as physical objects, in hero coordinates. They drop in and bounce, and any letter can be
 * grabbed, thrown or tapped; a flying letter knocks loose whatever it hits. Left alone, they hop home and spell
 * the name again. Home follows the top of the work section, so the rising sheet carries the word out of the hero.
 * The caller drives step() from its frame loop. Nothing here runs under reduced motion or with Motion off. */
export function createLetterWorld(hero: HTMLElement, name: HTMLElement, events: WorldEvents) {
  const GRAVITY = .55, BOUNCE = .5, MAX_SPEED = 46, RETURN_AFTER = 3400;
  const solid = Array.from(name.querySelectorAll<HTMLElement>('.hero-letter')).filter(el => el.offsetWidth > 0).map(el => ({
    el, mode: 'rest' as LetterMode, x: 0, y: 0, a: 0, vx: 0, vy: 0, va: 0, homeX: 0, homeY: 0, width: 0, height: 0, radius: 0,
    stiffness: .055 + Math.random() * .035, tilt: Math.random() - .5, wait: 0, pointer: -1, targetX: 0, targetY: 0, travelled: 0, grabbed: 0, transform: '',
  }));
  type Body = (typeof solid)[number];
  let floor = 0, roof = 0, right = 0, rise = 0, idle = 0, nextHop = 6200, live = true, played = false;

  function measure() {
    const style = getComputedStyle(name), ink = document.createElement('canvas').getContext('2d')!;
    ink.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    let left = name.offsetLeft, top = name.offsetTop;
    for (let parent = name.offsetParent as HTMLElement | null; parent && parent !== hero; parent = parent.offsetParent as HTMLElement | null) { left += parent.offsetLeft; top += parent.offsetTop; }
    right = hero.clientWidth; roof = document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 0; floor = 0;
    for (const b of solid) {
      // Physics follows the visible ink, not the tall line box around it.
      const glyph = ink.measureText(b.el.textContent!), ascent = glyph.fontBoundingBoxAscent, descent = glyph.fontBoundingBoxDescent;
      const baseline = (b.el.offsetHeight - ascent - descent) / 2 + ascent;
      const inkX = (glyph.actualBoundingBoxRight - glyph.actualBoundingBoxLeft) / 2, inkY = baseline + (glyph.actualBoundingBoxDescent - glyph.actualBoundingBoxAscent) / 2;
      const dx = b.mode === 'rest' ? b.x - b.homeX : 0, dy = b.mode === 'rest' ? b.y - b.homeY : 0;
      b.width = glyph.actualBoundingBoxRight + glyph.actualBoundingBoxLeft; b.height = glyph.actualBoundingBoxAscent + glyph.actualBoundingBoxDescent;
      b.radius = Math.sqrt(b.width * b.height) * .46;
      b.homeX = left + b.el.offsetLeft + inkX; b.homeY = top + b.el.offsetTop + inkY;
      b.el.style.transformOrigin = `${inkX}px ${inkY}px`;
      floor = Math.max(floor, top + b.el.offsetTop + baseline);
      if (b.mode === 'rest') { b.x = b.homeX + dx; b.y = b.homeY + dy; }
    }
    write();
  }
  function write() {
    for (const b of solid) {
      const transform = `translate3d(${(b.x - b.homeX).toFixed(1)}px,${(b.y - b.homeY).toFixed(1)}px,0) rotate(${b.a.toFixed(3)}rad)`;
      if (transform !== b.transform) b.el.style.transform = b.transform = transform; // Untouched letters cost nothing.
    }
  }
  function loosen(b: Body) { if (b.mode === 'rest') b.mode = 'free'; b.wait = 0; }

  function drop() {
    solid.forEach((b, i) => { b.mode = 'fall'; b.wait = 260 + i * 120; b.x = b.homeX + (Math.random() - .5) * 26; b.y = -b.height - 30; b.vx = b.vy = 0; b.a = (Math.random() - .5) * 1.1; b.va = (Math.random() - .5) * .12; });
    write();
  }

  function collide() {
    for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) {
      const a = solid[i], b = solid[j];
      if (a.mode === 'fall' || b.mode === 'fall' || (a.mode === 'rest' && b.mode === 'rest')) continue;
      const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy) || 1, overlap = a.radius + b.radius - distance;
      if (overlap <= 0) continue;
      const nx = dx / distance, ny = dy / distance, closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (closing > 2.5) { if (a.mode === 'rest' && Math.hypot(a.vx, a.vy) < 2) loosen(a); if (b.mode === 'rest' && Math.hypot(b.vx, b.vy) < 2) loosen(b); }
      const aMoves = a.mode === 'free', bMoves = b.mode === 'free', share = aMoves && bMoves ? .5 : 1;
      if (aMoves) { a.x -= nx * overlap * share; a.y -= ny * overlap * share; }
      if (bMoves) { b.x += nx * overlap * share; b.y += ny * overlap * share; }
      if (closing > 0) {
        const push = closing * 1.7 * share;
        if (aMoves) { a.vx -= nx * push; a.vy -= ny * push; a.va -= ny * push * .012; }
        if (bMoves) { b.vx += nx * push; b.vy += ny * push; b.va += ny * push * .012; }
        if (closing > 7) events.impact((a.x + b.x) / 2, (a.y + b.y) / 2, Math.min(.8, closing * .05));
      }
    }
  }

  function fly(b: Body, dt: number) {
    if (b.mode === 'fall' && b.wait > 0) { b.wait -= dt * 16.67; return; }
    b.vy += GRAVITY * dt; b.vx *= .997 ** dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.va * dt;
    const sin = Math.abs(Math.sin(b.a)), cos = Math.abs(Math.cos(b.a));
    const spanX = cos * b.width / 2 + sin * b.height / 2, spanY = cos * b.height / 2 + sin * b.width / 2;
    const ground = floor - rise - spanY;
    if (b.y >= ground) {
      b.y = ground;
      if (b.vy > 4) { events.impact(b.x, b.y + spanY, Math.min(1.1, b.vy * .045)); b.va += b.vx * .012 + (Math.random() - .5) * .05; }
      b.vy = b.vy > 2 ? -b.vy * BOUNCE : 0; b.vx *= .84 ** dt; b.va *= .86 ** dt;
      if (!b.vy) b.a += (Math.round(b.a / (Math.PI / 2)) * Math.PI / 2 - b.a) * .22 * dt; // Tips over onto a flat side.
      if (b.mode === 'fall' && !b.vy) { b.mode = 'rest'; b.va = 0; }
    }
    if (b.mode !== 'free') return;
    if (b.x < spanX) { b.x = spanX; b.vx = Math.abs(b.vx) * .72; b.va += b.vy * .008; }
    if (b.x > right - spanX) { b.x = right - spanX; b.vx = -Math.abs(b.vx) * .72; b.va -= b.vy * .008; }
    if (b.y < roof + spanY) { b.y = roof + spanY; b.vy = Math.abs(b.vy) * .6; }
    if (b.wait > 0 && (b.wait -= dt * 16.67) <= 0) { b.mode = 'rest'; b.vy = -7 - Math.random() * 3; }
  }

  function step(dt: number, lift: number, scrolled: number) {
    rise = lift;
    const riding = rise > 4, kick = Math.max(-24, Math.min(24, scrolled));
    name.classList.toggle('is-riding', riding);
    for (const b of solid) {
      if (b.mode === 'held') {
        b.vx += ((b.targetX - b.x) * .4 - b.vx) * .5; b.vy += ((b.targetY - b.y) * .4 - b.vy) * .5;
        b.x += b.vx * dt; b.y += b.vy * dt; b.a += (b.vx * .006 - b.a * .06) * dt;
        continue;
      }
      if (riding && b.mode !== 'rest') { b.mode = 'rest'; b.wait = 0; }
      if (b.mode === 'rest') {
        const damp = .85 ** dt, turn = Math.atan2(Math.sin(b.a), Math.cos(b.a));
        b.vx = (b.vx + (b.homeX - b.x) * b.stiffness * dt) * damp;
        b.vy = (b.vy + (b.homeY - rise - b.y) * b.stiffness * dt) * damp;
        b.va = (b.va + (kick * b.tilt * .006 - turn * .07) * dt) * .84 ** dt;
        b.x += b.vx * dt; b.y += b.vy * dt; b.a = turn + b.va * dt;
      } else fly(b, dt);
      const speed = Math.hypot(b.vx, b.vy);
      if (speed > MAX_SPEED) { b.vx *= MAX_SPEED / speed; b.vy *= MAX_SPEED / speed; }
    }
    collide();
    write();
    idle += dt * 16.67;
    if (idle > RETURN_AFTER && solid.some(b => b.mode === 'free' && !b.wait)) solid.forEach((b, i) => { if (b.mode === 'free') b.wait = 60 + i * 110; });
    if (!riding && solid.every(b => b.mode === 'rest') && (nextHop -= dt * 16.67) <= 0) { // The full stop bounces now and then, to show it's alive.
      const last = solid[solid.length - 1]; last.mode = 'fall'; last.wait = 0; last.vy = -13; last.va = .03; nextHop = 5200 + Math.random() * 3000;
    }
  }

  /** A press on empty space is a small shockwave that lifts the letters near it. */
  function shove(x: number, y: number) {
    if (!live || rise > 4) return;
    for (const b of solid) {
      const dx = b.x - x, dy = b.y - y, distance = Math.hypot(dx, dy) || 1;
      if (b.mode === 'held' || b.mode === 'fall' || distance > 240) continue;
      const force = 11 * (1 - distance / 240) + 3;
      loosen(b); idle = 0; b.vx += dx / distance * force; b.vy += dy / distance * force - 7; b.va += (Math.random() - .5) * .22;
    }
  }

  const place = (event: PointerEvent) => { const box = hero.getBoundingClientRect(); return { x: event.clientX - box.left, y: event.clientY - box.top }; };
  function grab(event: PointerEvent) {
    const b = solid.find(body => body.el === event.target);
    if (!b || !live || rise > 4 || b.mode === 'held') return;
    const point = place(event);
    b.el.setPointerCapture(event.pointerId);
    b.mode = 'held'; b.wait = 0; b.pointer = event.pointerId; b.targetX = point.x; b.targetY = point.y; b.travelled = 0; b.grabbed = performance.now(); b.vx = b.vy = 0;
    b.el.classList.add('is-held'); idle = 0;
    if (!played) { played = true; events.play(); }
  }
  function drag(event: PointerEvent) {
    const b = solid.find(body => body.pointer === event.pointerId);
    if (!b) return;
    const point = place(event);
    b.travelled += Math.hypot(point.x - b.targetX, point.y - b.targetY); b.targetX = point.x; b.targetY = point.y; idle = 0;
  }
  function release(event: PointerEvent) {
    const b = solid.find(body => body.pointer === event.pointerId);
    if (!b) return;
    b.pointer = -1; b.mode = 'free'; b.el.classList.remove('is-held'); idle = 0;
    if (b.travelled < 8 && performance.now() - b.grabbed < 300) { b.vx = (Math.random() - .5) * 12; b.vy = -15 - Math.random() * 6; b.va = (Math.random() - .5) * .3; } // A tap pops it into the air.
    else b.va = b.vx * .018;
  }
  name.addEventListener('pointerdown', grab); name.addEventListener('pointermove', drag); name.addEventListener('pointerup', release); name.addEventListener('pointercancel', release);

  /** Motion off: every letter is simply home. */
  function setLive(next: boolean) {
    if (next === live) return;
    live = next;
    if (live) return;
    for (const b of solid) { b.mode = 'rest'; b.pointer = -1; b.wait = 0; b.x = b.homeX; b.y = b.homeY; b.a = b.vx = b.vy = b.va = 0; b.el.classList.remove('is-held'); }
    name.classList.remove('is-riding'); write();
  }

  return {
    bodies: solid, measure, drop, step, shove, setLive,
    destroy() { name.removeEventListener('pointerdown', grab); name.removeEventListener('pointermove', drag); name.removeEventListener('pointerup', release); name.removeEventListener('pointercancel', release); for (const b of solid) b.el.style.removeProperty('transform'); },
  };
}

/** Project cards are rebuilt whenever the filter changes which cards exist. */
export function useProjectMotion(filter: string) {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(`${MOTION} and (min-width: 851px) and (min-height: 600px)`, () => {
      const cards = gsap.utils.toArray<HTMLElement>('.project');
      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (next) gsap.to(card.querySelector('.project-card'), { scale: .94 - (cards.length - i) * .004, ease: 'none', transformOrigin: '50% 0%', scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 20%', scrub: true } });
      });
    });
    mm.add(MOTION, () => {
      gsap.utils.toArray<HTMLElement>('.project').forEach(card => gsap.to(card.querySelector('.project-art > div'), { rotation: 0, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'top 25%', scrub: .5 } }));
    });
    mm.add(`${MOTION} and (max-width: 850px)`, () => {
      gsap.utils.toArray<HTMLElement>('.project').forEach((card, i) => gsap.from(card, { y: 70, scale: .9, rotation: i % 2 ? 2.5 : -2.5, opacity: .25, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'top 58%', scrub: .5 } }));
    });
    ScrollTrigger.refresh();
    return () => mm.revert();
  }, [filter]);
}
