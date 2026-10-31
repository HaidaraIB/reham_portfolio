import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowUpRight, Check, Download, LayoutGrid, LogOut, Plus, Save, Trash2, UserRound } from 'lucide-react';
import { supabase } from './client';
import Loader, { LoadingScreen } from './components/Loader';
import ThemeToggle from './components/ThemeToggle';
import { STORAGE_KEY, safeUrl } from './data';
import type { Content, Project } from './data';
import { useConfirm, useToast } from './feedback';

export default function Admin({ content, onSave }: { content: Content; onSave: (content: Content) => void }) {
  const [draft, setDraft] = useState<Content>(structuredClone(content));
  const [tab, setTab] = useState<'profile' | 'projects'>('profile');
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [signingOut, setSigningOut] = useState(false); const [error, setError] = useState('');
  const toast = useToast(); const confirm = useConfirm();
  const leaving = useRef(false);
  const dirty = JSON.stringify(content) !== JSON.stringify(draft);
  const saveLabel = supabase ? 'Publish changes' : 'Save changes';
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data, error }) => { setSession(data.session); setAuthLoading(false); if (error) setError(error.message); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => data.subscription.unsubscribe();
  }, []);
  // Browsers only allow their own prompt on reload or tab close. Links inside the app use the confirm dialog instead.
  useEffect(() => { const warn = (e: BeforeUnloadEvent) => { if (dirty && !leaving.current) e.preventDefault(); }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  function field(key: keyof Omit<Content, 'projects'>, value: string) { setDraft(d => ({ ...d, [key]: value })); }
  function projectField(id: string, key: keyof Project, value: string) { setDraft(d => ({ ...d, projects: d.projects.map(p => p.id === id ? { ...p, [key]: value } : p) })); }
  async function login(e: React.FormEvent) { e.preventDefault(); setBusy(true); setError(''); try { const { error } = await supabase!.auth.signInWithPassword({ email, password }); if (error) throw error; setPassword(''); toast.success('Signed in.'); } catch (e) { setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.'); } finally { setBusy(false); } }
  async function signOut() {
    const confirmed = await confirm(dirty
      ? { title: 'Sign out and discard changes?', message: 'Your unsaved edits will be lost.', confirmLabel: 'Discard and sign out', cancelLabel: 'Keep editing', danger: true }
      : { title: 'Sign out?', message: 'You will need to sign in again to edit your portfolio.', confirmLabel: 'Sign out', cancelLabel: 'Stay signed in' });
    if (!confirmed) return;
    setSigningOut(true);
    try { const { error } = await supabase!.auth.signOut(); if (error) throw error; setDraft(structuredClone(content)); toast.success('Signed out.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to sign out. Please try again.'); } finally { setSigningOut(false); }
  }
  async function leave(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!dirty || e.metaKey || e.ctrlKey) return;
    e.preventDefault(); const { href } = e.currentTarget;
    if (await confirm({ title: 'Leave without saving?', message: 'Your unsaved edits will be lost.', confirmLabel: 'Discard changes', cancelLabel: 'Keep editing', danger: true })) { leaving.current = true; location.href = href; }
  }
  async function deleteProject(project: Project) {
    const name = project.title || 'this project';
    if (!await confirm({ title: `Delete ${name}?`, message: `It leaves the portfolio when you choose ${saveLabel}.`, confirmLabel: 'Delete project', cancelLabel: 'Keep project', danger: true })) return;
    setDraft(d => ({ ...d, projects: d.projects.filter(x => x.id !== project.id) }));
    toast.info(`${project.title || 'Project'} removed. ${saveLabel} to apply this.`);
  }
  function addProject() {
    setDraft(d => ({ ...d, projects: [...d.projects, { id: crypto.randomUUID(), title: 'New project', category: 'Web design', year: String(new Date().getFullYear()), description: '', url: '', visual: 'orbit' }] }));
    toast.success('Project added. Fill in its details below.');
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      if (draft.projects.some(p => p.url && !safeUrl(p.url))) throw new Error('Project links must be valid HTTP or HTTPS URLs.');
      if (supabase) { const { error } = await supabase.from('portfolio').upsert({ id: 1, content: draft }); if (error) throw error; }
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      onSave(structuredClone(draft)); toast.success(supabase ? 'Published. Your portfolio is up to date.' : 'Saved in this browser. Open the portfolio to see your changes.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Unable to save. Your edits are still here.'); } finally { setBusy(false); }
  }
  function download() { const link = document.createElement('a'); const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' })); link.href = url; link.download = 'portfolio-content.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast.success('Exported portfolio-content.json.'); }
  if (authLoading) return <LoadingScreen label="Checking your session…"/>;
  if (supabase && !session) return <main className="login-page"><a className="wordmark" href={import.meta.env.BASE_URL}>reham<span>.</span></a><form className="login-form" onSubmit={login}><h1>Welcome back.</h1><p>Sign in to manage your work and profile.</p><label>Email<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)}/></label><label>Password<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}/></label>{error && <p role="alert" className="error-message">{error}</p>}<button className="button primary" disabled={busy} aria-busy={busy}>{busy && <Loader/>}{busy ? 'Signing in…' : 'Sign in'}</button><a href={import.meta.env.BASE_URL}>Back to portfolio</a></form></main>;
  return <div className="admin-shell"><aside className="admin-sidebar"><a className="wordmark" href={import.meta.env.BASE_URL} onClick={leave}>{draft.name.toLowerCase()}<span>.</span></a><p className="studio-label">Portfolio studio</p><nav aria-label="Editor sections"><button aria-current={tab === 'profile' ? 'page' : undefined} onClick={() => setTab('profile')}><UserRound size={18}/> Profile & hero</button><button aria-current={tab === 'projects' ? 'page' : undefined} onClick={() => setTab('projects')}><LayoutGrid size={18}/> Projects <span>{draft.projects.length}</span></button></nav><a href={import.meta.env.BASE_URL} target="_blank" rel="noreferrer">View portfolio <ArrowUpRight size={16}/></a>{supabase && <button className="signout" disabled={signingOut} aria-busy={signingOut} onClick={signOut}>{signingOut ? <Loader size={16}/> : <LogOut size={16}/>} {signingOut ? 'Signing out…' : 'Sign out'}</button>}</aside><main className="admin-main"><header className="admin-header"><span>Your workspace</span><span className="admin-status"><span className="save-state">{dirty ? 'Unsaved changes' : <><Check size={14}/> Up to date</>}</span><ThemeToggle/></span></header><div className="admin-body"><div className="editor-title"><div><h1>{tab === 'profile' ? 'Make it yours.' : 'Your selected work.'}</h1><p>{tab === 'profile' ? 'A good introduction starts with you.' : 'Curate the projects you want people to remember.'}</p></div><button className="button secondary" onClick={download}><Download size={16}/> Export JSON</button></div>{!supabase && <div className="demo-banner"><b>Local demo</b><span>Changes stay in this browser. Connect Supabase to enable secure sign-in and publish changes for everyone. Setup instructions are in README.md.</span></div>}
      <form onSubmit={save} onInvalidCapture={e => { e.preventDefault(); const target = e.target as HTMLInputElement; setTab(target.closest(".project-editor") ? "projects" : "profile"); toast.error("Please complete the required fields and check their format before saving."); requestAnimationFrame(() => target.focus()); }}><div hidden={tab !== 'profile'} className="editor-panel"><div className="panel-heading"><h2>Profile & hero</h2><p>The first things people see.</p></div><div className="field-grid"><label>Your name<input required maxLength={12} value={draft.name} onChange={e => field('name', e.target.value)}/><small>Up to 12 characters for the display headline.</small></label><label>Role<input required maxLength={80} value={draft.role} onChange={e => field('role', e.target.value)}/></label><label className="wide">Hero headline<input required maxLength={45} value={draft.headline} onChange={e => field('headline', e.target.value)}/></label><label className="wide">Introduction<textarea required rows={3} maxLength={400} value={draft.intro} onChange={e => field('intro', e.target.value)}/></label><label className="wide">About you<textarea required rows={4} maxLength={1200} value={draft.about} onChange={e => field('about', e.target.value)}/></label><label className="wide">Contact email<input required type="email" value={draft.email} onChange={e => field('email', e.target.value)}/></label></div></div>
      <div hidden={tab !== 'projects'}>{draft.projects.map((p, index) => <div className="editor-panel project-editor" key={p.id}><div className="panel-heading"><h2>{p.title || `Project ${index + 1}`}</h2><button type="button" className="delete-button" aria-label={`Delete ${p.title}`} onClick={() => deleteProject(p)}><Trash2 size={17}/></button></div><div className="field-grid"><label>Project title<input required value={p.title} maxLength={80} onChange={e => projectField(p.id, 'title', e.target.value)}/></label><label>Category<input required list="categories" value={p.category} maxLength={40} onChange={e => projectField(p.id, 'category', e.target.value)}/></label><label>Year<input required maxLength={4} pattern="[0-9]{4}" value={p.year} onChange={e => projectField(p.id, 'year', e.target.value)}/></label><label>Cover artwork<select value={p.visual} onChange={e => projectField(p.id, 'visual', e.target.value)}><option value="orbit">Orbit / workspace</option><option value="folio">Forma / architecture</option><option value="form">Good Form / components</option><option value="atlas">Atlas / landscape</option></select></label><label className="wide">Description<textarea required rows={3} value={p.description} onChange={e => projectField(p.id, 'description', e.target.value)}/></label><label className="wide">Project URL (optional)<input type="url" placeholder="https://" value={p.url} onChange={e => projectField(p.id, 'url', e.target.value)}/></label></div></div>)}<datalist id="categories"><option>Product design</option><option>Web design</option><option>Development</option></datalist><button type="button" className="add-project" onClick={addProject}><Plus size={18}/> Add project</button></div>
      <div className="editor-actions"><div>{dirty ? 'Ready when you are.' : 'Your content is saved.'}</div><button className="button primary" disabled={busy || !dirty} aria-busy={busy} type="submit">{busy ? <Loader/> : <Save size={17}/>}{busy ? 'Saving…' : saveLabel}</button></div></form></div></main></div>;
}
