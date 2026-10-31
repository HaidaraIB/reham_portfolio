# Verification

## Editor header on phones (2026-10-31)

- TypeScript check and Vite build passed. All 17 Playwright tests passed in Microsoft Edge with `--workers=1` and `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set empty. With `.env.local` loaded, 5 fail because the app runs in Supabase mode (sign-in gate, live project count); the suite expects local mode.
- Signed-in layout checked on a temporary dev server with a fake Supabase config and session: 390 wide in light and dark, 320 wide in dark, the 12-character name limit (the wordmark truncates) and the "Signing out…" state. Overflow is 0 and the tabs, View portfolio and Sign out are all at least 44px tall.
- Real sign-out against Supabase and physical phones have not been tested.

## Throwable letters, phone motion, wipe origin (2026-10-31)

- Vite build passed and all 17 Playwright tests passed on three consecutive full serial runs, with the Supabase variables blanked. One earlier repeat run hit a single 30-second page load timeout that did not recur.
- New coverage: letters drop, throw and return home; Motion off sends them home and disables play; on an emulated phone a tap pops a letter, scrolling lifts the word, and service rows light up; the wipe is centred on the toggle at phone size. A real touch drag was reviewed in screenshots at 393x780: drop, settled, thrown and scroll lift in dark, a frozen mid-wipe frame, and a throw at 1440 in light.
- The intermittent scroll test failure noted in earlier passes was a test race: it scrolled while Lenis was still animating to the About anchor, so the page was dragged back. It now waits for the scroll to settle.
- `.env.local` points the dev server at the live Supabase project, which fails six tests on unmodified code too (live content has 2 projects, `/admin` shows sign-in). Run the suite with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set to empty in the shell.
- Hero frame time at 1920x1080 measured 33ms median on both old and new code in the same session, so the letters add no measurable cost, but this is above the 16.6ms recorded earlier; the machine was slower that day or the earlier measure differed.
- Not verified on a real phone. Emulation has no URL bar, so the wipe bug itself was not reproduced; the cause is reasoned from how view transition layers are sized, and the emulator only confirms the new measurement matches the button. Device feel of throws, and iOS Safari, are also untested.

## Loader, confirm dialog and toasts (2026-10-31)

- Build passed and all 13 Playwright tests passed in a serial run, including new coverage that the editor raises no native dialog: confirm by Cancel focus, Escape and backdrop, delete, export and validation toasts, and leaving with unsaved changes. Sign out is not in that suite because it only renders with Supabase configured, so it was checked in a separate scripted run against a mocked Supabase, with no live project: confirm when clean, the destructive variant when dirty, cancel, the busy state, publish, and the signed-out toast. No native dialogs or page errors. Reviewed in screenshots: dialog and toasts in both themes, 320 wide, button loaders, loading screen in both themes and reduced motion. Sign out overlapped the Projects tab at 320, so it now has its own row on mobile. Browsers show their own prompt on reload or tab close with unsaved changes; that can't be replaced.

## GitHub Pages subpath (2026-10-31)

- All twelve Playwright tests passed in a full serial run. A production build with `--base=/reham_portfolio/`, served from a local stand-in for Pages with the `404.html` fallback, loaded home, opened `/admin` directly, and linked back home with no failed assets. The tablet layout test timed out twice while a stray preview server was running, then passed three of three on this code and on the previous commit. The workflow itself has not run on GitHub yet. On Git Bash, set `MSYS_NO_PATHCONV=1` when passing `--base`, or the path is rewritten and the page is blank.

## Fraunces, plain nav link, icon toggle, reversible theme wipe (2026-10-31)

- Vite build passed and all twelve Playwright tests passed on two consecutive full serial runs, including new coverage that going dark shrinks the old page into the toggle and going light grows the new page out of it. The filled wipe animation has to be cancelled when each transition ends, or it clips the next transition's snapshot. Frames frozen mid-wipe were reviewed in both directions. The hero and footer names fit at the eight sizes measured from 320 to 2560 wide. Hero name sizing is now column width / 3.05, capped at 445px, for Fraunces.

## Space Grotesk, plain header button, editor link removed (2026-10-31)

- The header button now matches the theme toggle. The footer link to `/admin` is gone; a new test confirms the public page has no link to it and the route still opens when typed directly. The section below records the Outfit pass; the hero name cap is now 400px for Space Grotesk. Hero name and footer name fit at the same eight sizes. All 11 tests passed on four of five full runs. The scroll test failed on the other, as it did once in the motion pass; the next build-then-test repeats did not reproduce it, so a build is not the trigger. Full runs ranged from 34 seconds to 1.4 minutes on this machine and the test uses fixed waits, so load is the likely cause, but that is unproven.

## Outfit and blue header button (2026-10-31)

- Vite build passed and all ten Playwright tests passed in Microsoft Edge. Reviewed in screenshots: hero in both themes at 1785, button hover in dark, 390 and 320 in light, full page at 1440 in light. The hero name fits its box and the footer name fits the viewport at all eight sizes measured from 320 to 2560 wide, with no horizontal overflow. The hero name's size now derives from its column width, divided by 3.4 to suit Outfit; recheck that divisor if the font changes.

## Hero motion, header button, footer name (2026-10-31)

- TypeScript check and Vite build passed. Ten Playwright tests passed in Microsoft Edge on three consecutive full serial runs, including new coverage for the white footer name in both themes. The scroll test failed once on the run straight after a production build, reading the about text before it had inked in, then passed five of five alone and all three full runs. Not reproduced; watch it if it recurs.
- Reviewed the opening, idle currents, cursor wake, click ripple and button hover in screenshots; the wake, ripple and hover in dark, idle in both themes, footer name in light. Header fits at 320 and 390. Hero frame time at 1920x1080: 16.6ms median, 25ms p95.

## Premium redesign (2026-10-31)

- TypeScript check and Vite build passed. Nine Playwright tests passed in Microsoft Edge, including new coverage for the theme toggle and persistence, following the system theme, scroll-driven behaviour, and the Motion switch running, stopping and restarting the canvas (frame comparison). Hero dot grid frame time on the dev machine: about 8ms at 1440x900; typically 17ms at 1920x1080. The Motion button survived 12 rapid on/off rounds with no page errors, and 16 serial repeats of the two motion tests passed. Run repeats with --workers=1: parallel headless browsers overload software rendering here and time out.
- Reviewed scroll checkpoints in light and dark at 1440x900, dark at 390x844, 1366x650, and the dark editor. Horizontal overflow is 0 at the widths measured.
- Contrast on dark: blue display type 3.07:1 (large text only), muted text 6.8:1 or better, accent text 7.66:1.
- The smoothness of scrolling on real low-end and touch devices has not been measured. The theme circle transition uses the View Transitions API; browsers without it switch instantly.

## Original build


- Production TypeScript check and Vite build passed.
- Five Playwright tests passed in installed Microsoft Edge: project filters/dialog dismissal/particle pause; admin profile persistence and project add/delete; reduced motion and mobile overflow; desktop runtime errors; tablet and small-phone overflow.
- Screenshots reviewed at 1440, 768, 390, and 320 pixels. Editor screenshots reviewed at desktop and 390 pixels.
- Fixed an actual local-content initialization bug exposed by save/reload testing: the editor now mounts only after stored content is loaded.
- Adjusted mobile contact text and scaled the concept-cover artwork so it remains composed within narrow viewports.
- Source design lint passed with no findings. The additional design-taste browser inspector timed out on `Page.enable` in Chrome and Edge; its automated visual rules were not verified. Playwright browser execution and screenshots succeeded independently.
- Supabase live authentication, RLS enforcement, and remote publishing require the owner's configured project and were not integration-tested. Deployment has not been performed.

Visual critique: the blue personal wordmark establishes the focal point; spacing, palette, and controls remain consistent between public and editor routes. Mobile keeps the headline and primary action readable. The strongest limitation is sample content and conceptual artwork rather than real work. Design 7.5/10, usability 8/10, creativity 7/10, content 6/10; weighted 7.4/10. Replace the sample portfolio with real projects and biography before launch.
