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

      // Hero: the copy clears, the name rises to the centre, then the work slides over it.
      if (tall) {
        const name = document.querySelector<HTMLElement>('.hero-name')!;
        const hero = document.querySelector<HTMLElement>('.hero')!;
        gsap.timeline({ scrollTrigger: { trigger: '.hero-stage', start: 'top top', end: () => `+=${innerHeight * .4}`, scrub: .5, invalidateOnRefresh: true } })
          .to('.hero-lead', { opacity: 0, y: -48, ease: 'none', stagger: .08 }, 0)
          .to('.hero-name', { y: () => -(hero.clientHeight - name.offsetHeight) / 2 + 40, ease: 'none', duration: 1.1 }, 0);
      }
      gsap.to('.hero-inner', { scale: .93, opacity: .25, ease: 'none', transformOrigin: '50% 50%', scrollTrigger: { trigger: '.work-section', start: 'top bottom', end: 'top top', scrub: true } });

      gsap.utils.toArray<HTMLElement>('.line-in').forEach(line => gsap.from(line, { yPercent: 112, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: line.parentElement, start: 'top 90%', once: true } }));
      gsap.utils.toArray<HTMLElement>('.reveal').forEach(element => gsap.from(element, { y: 36, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 90%', once: true } }));

      // About: the two lines pass each other, then the statement inks in word by word.
      gsap.fromTo('.about-line-a', { xPercent: -7 }, { xPercent: 5, ease: 'none', scrollTrigger: { trigger: '.about-title', start: 'top bottom', end: 'bottom top', scrub: .6 } });
      gsap.fromTo('.about-line-b', { xPercent: 9 }, { xPercent: -3, ease: 'none', scrollTrigger: { trigger: '.about-title', start: 'top bottom', end: 'bottom top', scrub: .6 } });
      gsap.fromTo('.about-lead .word', { opacity: .16 }, { opacity: 1, ease: 'none', stagger: .05, scrollTrigger: { trigger: '.about-lead', start: 'top 80%', end: 'bottom 50%', scrub: .4 } });

      // Contact: the panel opens from an inset card to the full bleed of the viewport.
      gsap.fromTo('.contact-panel', { clipPath: 'inset(7% 5% 7% 5% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: '.contact-panel', start: 'top bottom', end: 'top 30%', scrub: .4 } });
      gsap.from('.footer-name > span', { yPercent: 55, ease: 'none', scrollTrigger: { trigger: '.site-footer', start: 'top bottom', end: 'bottom bottom', scrub: .5 } });

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
    mm.add(`${MOTION} and (min-width: 1101px)`, () => {
      gsap.utils.toArray<HTMLElement>('.project').forEach(card => gsap.to(card.querySelector('.project-art > div'), { rotation: 0, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'top 25%', scrub: .5 } }));
    });
    mm.add(`${MOTION} and (max-width: 850px)`, () => {
      gsap.utils.toArray<HTMLElement>('.project').forEach(card => gsap.from(card, { y: 44, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: card, start: 'top 90%', once: true } }));
    });
    ScrollTrigger.refresh();
    return () => mm.revert();
  }, [filter]);
}
