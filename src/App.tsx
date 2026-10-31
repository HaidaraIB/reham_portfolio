import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, X, Plus } from 'lucide-react';
import Hero, { nameStyle } from './components/Hero';
import ThemeToggle from './components/ThemeToggle';
import { initialContent, isContent, safeUrl, STORAGE_KEY } from './data';
import type { Content, Project } from './data';
import { supabase } from './client';
import Admin from './Admin';
import { lockScroll, usePageMotion, useProjectMotion, useSmoothScroll } from './motion';

export function ProjectArt({ visual }: { visual: Project['visual'] }) {
  return <div className={`project-art art-${visual}`} aria-hidden="true">
    {visual === 'orbit' && <div className="orbit-window"><div className="mock-nav"><b>◉ orbit</b><span>Workspace</span><span>Projects</span><span>Overview</span></div><div className="mock-main"><span className="mock-small">YOUR WORK, IN FOCUS</span><h3>A little clarity.<br/>A lot of possibility.</h3><div className="mock-columns"><div><span>In progress</span><b>Website refresh</b><p>A fresh perspective for a new chapter.</p><div className="mock-progress"/></div><div><span>Up next</span><b>Brand exploration</b><p>Make room for your next big idea.</p><div className="mock-dots">● ● ●</div></div></div></div></div>}
    {visual === 'folio' && <div className="forma-window"><div className="forma-nav"><b>forma.</b><span>Spaces for living.</span></div><div className="architecture"><div className="building building-one"/><div className="building building-two"/><div className="building building-three"/></div><h3>Space to<br/><i>feel at home.</i></h3><span className="forma-caption">Architecture & interiors</span></div>}
    {visual === 'form' && <div className="form-window"><span className="mock-small">GOOD FORM / COMPONENT LIBRARY</span><h3>Details make<br/>the difference.</h3><div className="swatches"><i/><i/><i/><i/></div><div className="component-row"><span className="mock-button">Let's get started ↗</span><span className="mock-toggle"/></div><div className="component-input">Your next good idea <Plus size={16}/></div></div>}
    {visual === 'atlas' && <div className="atlas-window"><div className="forma-nav"><b>atlas</b><span>A place for your places.</span></div><div className="landscape"><div className="sun"/><div className="mountain back"/><div className="mountain front"/></div><div className="atlas-caption"><h3>Take the<br/>scenic route.</h3><span>Somewhere new.<br/>Something to remember.</span></div></div>}
  </div>;
}

const services = [
  ['Interface design', 'Clear user journeys, responsive layouts, and visual systems that make complex products feel simple.'],
  ['Web development', 'Responsive React interfaces with accessible components and considered motion.'],
  ['Visual direction', 'Typography, color, and a coherent visual language shaped around the story you want to tell.'],
];

function Line({ children }: { children: React.ReactNode }) {
  return <span className="line"><span className="line-in">{children}</span></span>;
}

function Portfolio({ content }: { content: Content }) {
  const [filter, setFilter] = useState('All work');
  const [selected, setSelected] = useState<Project | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useSmoothScroll(); usePageMotion(); useProjectMotion(filter);
  useEffect(() => { if (selected) dialog.current?.showModal(); lockScroll(Boolean(selected)); }, [selected]);
  const categories = ['All work', ...new Set(content.projects.map(p => p.category))];
  const projects = content.projects.filter(p => filter === 'All work' || p.category === filter);
  return <><a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><div className="header-bar wrap"><a className="wordmark" href={import.meta.env.BASE_URL} aria-label={`${content.name} home`}>{content.name.toLowerCase()}<span>.</span></a><nav aria-label="Main navigation"><a href="#work">Work</a><a href="#about">About</a><a href="#contact">Let's talk</a><ThemeToggle/></nav></div><div className="scroll-progress" aria-hidden="true"/></header>
    <main id="main"><Hero content={content}/>
      <section id="work" className="work-section" aria-labelledby="work-heading"><div className="wrap">
        <div className="section-heading"><h2 id="work-heading"><Line>Selected work</Line><span className="count">({content.projects.length})</span></h2><p className="reveal">A few ideas, brought to life.</p></div>
        <div className="work-tools reveal"><div className="filters" aria-label="Filter projects">{categories.map(category => <button key={category} aria-pressed={filter === category} onClick={() => setFilter(category)}>{category}</button>)}</div><p className="sample-note">Concept projects · Sample portfolio content</p></div>
        <div className="project-grid">{projects.map((project, i) => <article className="project" key={project.id} style={{ '--i': i } as React.CSSProperties}><div className="project-card">
          <div className="project-meta"><div className="project-index"><span>{String(i + 1).padStart(2, '0')}</span><span>{project.year}</span></div><div><h3><button onClick={() => setSelected(project)}>{project.title}</button></h3><p className="project-category">{project.category}</p><p className="project-description">{project.description}</p></div></div>
          <button className="project-open" onClick={() => setSelected(project)} aria-label={`View ${project.title} project`}><ProjectArt visual={project.visual}/><span className="project-arrow"><ArrowUpRight size={22}/></span></button>
        </div></article>)}</div>
        {projects.length === 0 && <p>No projects in this category yet.</p>}
      </div></section>
      <section className="about-section" id="about" aria-labelledby="about-heading">
        <h2 className="about-title" id="about-heading"><span className="about-line-a">Curiosity first.</span><span className="about-line-b">Details always.</span></h2>
        <div className="wrap">
          <div className="about-grid"><aside className="about-aside"><p className="about-tag reveal">About</p><p className="about-note reveal">I care about how a product works just as much as how it looks. My approach connects thoughtful visual design with practical, accessible development.</p></aside><p className="about-lead">{content.about.split(/\s+/).map((word, i) => <span className="word" key={i}>{word} </span>)}</p></div>
          <ol className="services">{services.map(([title, text], i) => <li className="service reveal" key={title}><span className="service-index">{String(i + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{text}</p></li>)}</ol>
        </div>
      </section>
      <section id="contact" className="contact-section"><div className="contact-panel"><div className="wrap contact-inner"><p className="reveal">Have something in mind?</p><div className="contact-row"><h2><Line>Let's make it</Line><Line>something good.</Line></h2><a className="contact-circle" href={`mailto:${content.email}`} aria-label={`Email ${content.name}`}><ArrowUpRight/></a></div><a className="email-link" href={`mailto:${content.email}`}>{content.email}</a></div></div></section>
    </main>
    <footer className="site-footer"><div className="wrap footer-bar"><p>© {new Date().getFullYear()} {content.name}</p><span>Designed with intention. Built with care.</span></div><div className="footer-name" aria-hidden="true" style={nameStyle(content.name)}><span>{content.name}.</span></div></footer>
    <dialog ref={dialog} data-lenis-prevent className="project-dialog" aria-labelledby="project-title" onCancel={() => setSelected(null)} onClose={() => setSelected(null)} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>{selected && <><button autoFocus className="dialog-close" aria-label="Close project" onClick={() => dialog.current?.close()}><X/></button><ProjectArt visual={selected.visual}/><div className="dialog-copy"><p>{selected.category} · {selected.year} · Concept project</p><h2 id="project-title">{selected.title}</h2><p>{selected.description}</p>{safeUrl(selected.url) && <a className="button primary" href={safeUrl(selected.url)} target="_blank" rel="noreferrer">Visit project <ArrowRight size={18}/></a>}</div></>}</dialog>
  </>;
}

export default function App() {
  const [content, setContent] = useState<Content>(initialContent);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (supabase) {
      supabase.from('portfolio').select('content').eq('id', 1).maybeSingle().then(({ data, error }) => { if (!active) return; if (error || (data && !isContent(data.content))) setError('Content could not be loaded. Please refresh to try again.'); else if (data && isContent(data.content)) setContent(data.content); setLoading(false); }, () => { if (active) { setError('Content could not be loaded. Please refresh to try again.'); setLoading(false); } });
    } else { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); if (isContent(saved)) setContent(saved); } catch { /* Storage may be unavailable; the default portfolio remains usable. */ } setLoading(false); }
    return () => { active = false; };
  }, []);
  if (loading) return <main className="loading" role="status">Loading portfolio…</main>;
  if (error) return <main className="loading" role="alert">{error}<button onClick={() => location.reload()}>Try again</button></main>;
  return location.pathname.replace(/\/$/, '') === `${import.meta.env.BASE_URL}admin` ? <Admin content={content} onSave={setContent}/> : <Portfolio content={content}/>;
}
