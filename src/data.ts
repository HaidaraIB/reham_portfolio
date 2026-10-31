export type Project = { id: string; title: string; category: string; year: string; description: string; url: string; visual: 'orbit' | 'folio' | 'form' | 'atlas' };
export type Content = { name: string; role: string; intro: string; about: string; email: string; headline: string; projects: Project[] };
export const initialContent: Content = {
  name: 'Reham', role: 'Designer & frontend developer', headline: 'Made for people.',
  intro: 'I turn complex ideas into thoughtful digital experiences. A balance of clear design, careful details, and code that brings it all to life.',
  about: 'I enjoy the space where design meets development. From the first sketch to the final interaction, I make websites and interfaces that feel considered, approachable, and easy to use.',
  email: 'hello@example.com',
  projects: [
    { id: 'orbit', title: 'Orbit', category: 'Product design', year: '2026', description: 'A concept workspace that brings projects, priorities, and the next small step into focus. Designed around a calmer working day.', url: '', visual: 'orbit' },
    { id: 'folio', title: 'Forma Studio', category: 'Web design', year: '2026', description: 'An editorial website concept for an architecture studio. Generous typography and a precise grid give the work room to speak.', url: '', visual: 'folio' },
    { id: 'form', title: 'Good Form', category: 'Development', year: '2025', description: 'An exploration of an accessible, responsive component system. Familiar interactions, clear feedback, and a consistent visual language.', url: '', visual: 'form' },
    { id: 'atlas', title: 'Atlas', category: 'Product design', year: '2025', description: 'A travel journal concept for collecting places and planning the next escape. A personal library of places worth remembering.', url: '', visual: 'atlas' },
  ],
};
export const STORAGE_KEY = 'reham-portfolio-v1';
export function isContent(value: unknown): value is Content {
  if (!value || typeof value !== 'object') return false;
  const v = value as Content;
  return ['name','role','intro','about','email','headline'].every(k => typeof v[k as keyof Content] === 'string') && Array.isArray(v.projects) && v.projects.every(p => p && ['id','title','category','year','description','url'].every(k => typeof p[k as keyof Project] === 'string') && ['orbit','folio','form','atlas'].includes(p.visual));
}
export function safeUrl(url: string) { try { const u = new URL(url); return ['https:', 'http:'].includes(u.protocol) ? u.href : undefined; } catch { return undefined; } }
