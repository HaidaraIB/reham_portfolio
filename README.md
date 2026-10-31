# Reham portfolio

A two-route React + TypeScript + Vite portfolio using blue and gray, inspired by the Webflow choice in [awesome-design-md](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/webflow/DESIGN.md).

## Run

Requires Node.js 22.12+.

```sh
npm install
npm run dev
```

On PowerShell with script execution disabled, use `npm.cmd` instead of `npm`.

- `/` — public portfolio, filtered projects, keyboard-accessible project dialogs, about, email contact.
- `/admin` — profile/hero editor, add/edit/delete projects, JSON export, unsaved-change notice, save feedback.

Without Supabase environment variables the editor is a **local demo**: saves persist only in that browser's localStorage. It has no fake password gate and does not pretend to publish globally. Browser storage failures are shown as errors. Export JSON for a backup; importing is not implemented.

## Complete reusable hero

Component: `src/components/Hero.tsx`. Styles: `src/components/Hero.css`.

```tsx
import Hero from './components/Hero';

<Hero content={{
  name: 'Reham',
  role: 'Designer & frontend developer',
  headline: 'Made for people.',
  intro: 'Thoughtful digital experiences, from first sketch to final interaction.',
}} />
```

The component needs React and lucide-react. Its type-only `Content` import comes from `src/data.ts`. Include the `.button`, `.primary` styles and `--blue`/`--muted` tokens from `src/styles.css`, and provide a destination with `id="work"`. The canvas is decorative and ignores pointer events. It uses a capped device pixel ratio, bounded particle count, smoothed mouse coordinates, ResizeObserver, and IntersectionObserver. It stops its animation loop when out of view or the tab is hidden. OS reduced-motion changes are observed live; CSS entrance animations also respect reduced motion. A visible pause button stops the canvas. Effects clean up observers, listeners, and frames, including React Strict Mode remounts.

## Loading, confirmations and notifications

Use `useToast` and `useConfirm` from `src/feedback.tsx`, and `Loader` and `LoadingScreen` from `src/components/Loader.tsx`. Don't use native browser dialogs. `AGENTS.md` has examples and the rules for when to use each.

## Secure shared editing with Supabase

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor once.
2. In Authentication > Users, create your administrator with an email and password. Disable public sign-ups if they are not needed.
3. Run the commented INSERT at the bottom of the SQL file with that user's UUID. Only allowlisted users can write; authenticated visitors cannot grant themselves membership.
4. Copy `.env.example` to `.env.local` and fill in the project URL and public anon/publishable key. Never use a service-role key in a VITE variable.
5. Restart the dev server. Open `/admin` and sign in. Edit any field and publish to seed the singleton content record. The public route reads this record on each page load.
6. Set the same environment variables in your hosting service before the production build.

RLS enforces writes in the database, not merely in the UI. The browser may read only public portfolio content and its own administrator membership. No admin password is shipped in source. Test anonymous reads, anonymous write rejection, non-admin write rejection, and administrator saves in your own Supabase project before launch. Live Supabase integration requires your project and has not been exercised without credentials.

## Recommended free deployment: Cloudflare Pages

Connect your GitHub repository to Cloudflare Pages:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | `22` |
| Environment variables | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

`public/_redirects` supplies the SPA fallback so `/admin` works on direct navigation and refresh. Cloudflare provides a `pages.dev` address. No custom domain purchase is needed. This repository is prepared for deployment; no account or live site has been created.

Cloudflare's Free plan currently allows 500 builds/month: https://developers.cloudflare.com/pages/platform/limits/
Supabase's Free plan is suitable for this small content store, but free projects pause after one week of inactivity: https://supabase.com/pricing
Review these limits before choosing a long-term plan. Static hosting stays independent of Supabase, but configured live content requires an available database.

## Validate

```sh
npm run build
npm test
```

Tests use locally installed Microsoft Edge (set `PLAYWRIGHT_CHANNEL=chrome` for Chrome). The Playwright server starts automatically. Tests cover filters, project dialog keyboard close, local save/reload, adding/removing a project, mobile overflow, and reduced motion.

Replace all sample content before sharing: biography, role, email (`hello@example.com`), project descriptions, years and concept covers. There is no contact-form backend; the email action opens the visitor's mail client. Cover art selection is implemented; arbitrary media uploads are not included.
