import { expect, test } from '@playwright/test';

test('project filters and accessible dialog', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.project')).toHaveCount(4);
  await page.getByRole('button', { name: 'Product design', exact: true }).click();
  await expect(page.locator('.project')).toHaveCount(2);
  await page.getByRole('button', { name: 'View Orbit project', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Pause background animation' }).click();
  await expect(page.getByRole('button', { name: 'Play background animation' })).toHaveAttribute('aria-pressed', 'true');
});

test('admin persists profile and project changes', async ({ page }) => {
  await page.goto('/admin');
  await page.getByLabel('Your name').fill('Mira');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.locator('.toast').last()).toContainText('Saved in this browser');
  await page.reload();
  await expect(page.getByLabel('Your name')).toHaveValue('Mira');
  await page.getByRole('button', { name: 'Projects' }).click();
  await page.getByRole('button', { name: 'Add project' }).click();
  await page.getByLabel('Project title', { exact: true }).last().fill('New sample');
  await page.getByLabel('Description', { exact: true }).last().fill('A new sample project.');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.locator('.toast').last()).toContainText('Saved in this browser');
  await page.getByRole('button', { name: 'Delete New sample', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete project' }).click();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Mira');
  await expect(page.locator('.project')).toHaveCount(4);
});

test('editor feedback uses the app dialog and toasts, never a native prompt', async ({ page }) => {
  const native: string[] = []; page.on('dialog', dialog => { native.push(dialog.type()); dialog.accept(); });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Projects' }).click();
  const remove = page.getByRole('button', { name: 'Delete Orbit', exact: true });
  const dialog = page.getByRole('alertdialog');

  await remove.click();
  await expect(dialog).toContainText('Delete Orbit?');
  await expect(dialog.getByRole('button', { name: 'Keep project' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(remove).toBeFocused();

  await remove.click();
  await page.mouse.click(5, 5);
  await expect(dialog).not.toBeVisible();
  await expect(remove).toBeVisible();

  await remove.click();
  await dialog.getByRole('button', { name: 'Delete project' }).click();
  await expect(remove).toHaveCount(0);
  await expect(page.locator('.toast')).toContainText('Orbit removed');
  await page.getByLabel('Dismiss notification').click();
  await expect(page.locator('.toast')).toHaveCount(0);

  await page.getByRole('button', { name: 'Export JSON' }).click();
  await expect(page.locator('.toast')).toContainText('Exported');

  await page.getByRole('button', { name: 'Profile & hero' }).click();
  await page.getByLabel('Your name').fill('');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(page.getByRole('alert')).toContainText('complete the required fields');

  await page.getByRole('link', { name: /^\./ }).click();
  await expect(dialog).toContainText('Leave without saving?');
  await dialog.getByRole('button', { name: 'Discard changes' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('.project')).toHaveCount(4);
  expect(native).toEqual([]);
});

test('mobile layouts and reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.hero-letter').first()).toHaveCSS('animation-name', 'none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  await page.goto('/admin');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'test-results/admin-mobile.png', fullPage: true });
});

test('desktop renders without runtime errors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/'); await page.waitForTimeout(1300);
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
  expect(errors).toEqual([]);
  await page.goto('/admin');
  await page.screenshot({ path: 'test-results/admin-desktop.png', fullPage: true });
});

test('dark theme toggles, persists, and themes the editor', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto('/');
  const ground = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await ground()).toBe('rgb(242, 243, 245)');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await ground()).toBe('rgb(17, 19, 24)');
  await page.goto('/admin');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('dark theme follows the system until a choice is saved', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('scroll drives the page and stays usable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/'); await page.waitForTimeout(1500);
  const opacity = () => page.locator('.about-lead .word').last().evaluate(el => Number(getComputedStyle(el).opacity));
  expect(await opacity()).toBeLessThan(.5);
  await page.getByRole('link', { name: 'About', exact: true }).click();
  await expect(page.locator('.site-header a[href="#about"]')).toHaveClass(/is-active/, { timeout: 5000 });
  await expect.poll(async () => { const y = await page.evaluate(() => scrollY); await page.waitForTimeout(150); return y === await page.evaluate(() => scrollY); }, { timeout: 8000 }).toBeTruthy(); // Lenis would drag the scroll below back to the anchor.
  const end = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= end; y += 400) { await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(30); }
  await page.waitForTimeout(800);
  expect(await opacity()).toBeGreaterThan(.95);
  await expect(page.locator('.site-header')).toHaveClass(/is-scrolled/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('motion toggle visibly runs and stops the background', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/'); await page.waitForTimeout(800);
  const frame = () => page.evaluate(() => document.querySelector<HTMLCanvasElement>('.particle-canvas')!.toDataURL());
  const before = await frame(); await page.waitForTimeout(300);
  expect(await frame()).not.toBe(before);
  await page.getByRole('button', { name: 'Pause background animation' }).click();
  await page.waitForTimeout(2000);
  const stopped = await frame(); await page.waitForTimeout(300);
  expect(await frame()).toBe(stopped);
  await page.getByRole('button', { name: 'Play background animation' }).click();
  await page.waitForTimeout(500);
  expect(await frame()).not.toBe(stopped);
});

test('the public site never links to the editor', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a[href*="admin"]')).toHaveCount(0);
  await page.goto('/admin');
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeVisible();
});

test('light pours out of the toggle and is drawn back in', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const wipe = async (name: string) => {
    await page.getByRole('button', { name }).click();
    await expect.poll(() => page.evaluate(`document.getAnimations().filter(a => a.effect.getKeyframes().some(f => 'clipPath' in f)).length`)).toBeGreaterThan(0);
    const found = await page.evaluate(() => { const effect = document.getAnimations().map(a => a.effect as KeyframeEffect).find(e => e.getKeyframes().some(frame => 'clipPath' in frame))!; const frames = effect.getKeyframes(); return { pseudo: effect.pseudoElement, from: String(frames[0].clipPath), to: String(frames[1].clipPath) }; });
    await page.waitForTimeout(900);
    return found;
  };
  const dark = await wipe('Switch to dark theme');
  expect(dark.pseudo).toBe('::view-transition-old(root)');
  expect(dark.to).toContain('circle(0px');
  const light = await wipe('Switch to light theme');
  expect(light.pseudo).toBe('::view-transition-new(root)');
  expect(light.from).toContain('circle(0px');
});

test('the wipe is centred on the toggle at phone size', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/'); await page.waitForTimeout(400);
  const toggle = page.locator('.theme-toggle'), box = (await toggle.boundingBox())!;
  await toggle.click();
  await expect.poll(() => page.evaluate(`document.getAnimations().filter(a => a.effect.getKeyframes().some(f => 'clipPath' in f)).length`)).toBeGreaterThan(0);
  const clip = await page.evaluate(() => String((document.getAnimations().map(a => a.effect as KeyframeEffect).find(e => e.getKeyframes().some(frame => 'clipPath' in frame))!).getKeyframes()[1].clipPath));
  const [, x, y] = clip.match(/at ([\d.]+)px ([\d.]+)px/)!.map(Number);
  expect(x).toBeCloseTo(box.x + box.width / 2, 0);
  expect(y).toBeCloseTo(box.y + box.height / 2, 0);
  await page.waitForTimeout(900);
  expect(await toggle.evaluate(el => el.style.getPropertyValue('view-transition-name'))).toBe('');
});

test('letters drop in, can be thrown, and return home', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(() => { const w = window as unknown as { peak: number }; w.peak = 0; const read = () => { const el = document.querySelector('.hero-letter:last-child'); if (el) w.peak = Math.max(w.peak, Math.abs(new DOMMatrix(getComputedStyle(el).transform).m42)); requestAnimationFrame(read); }; requestAnimationFrame(read); });
  await page.goto('/');
  const offset = (index: number) => page.locator('.hero-letter').nth(index).evaluate(el => Math.hypot(new DOMMatrix(getComputedStyle(el).transform).m41, new DOMMatrix(getComputedStyle(el).transform).m42));
  await expect.poll(() => offset(5), { timeout: 8000 }).toBeLessThan(2);
  expect(await page.evaluate(() => (window as unknown as { peak: number }).peak)).toBeGreaterThan(100);
  await expect(page.locator('.hero-hint')).not.toHaveClass(/is-gone/);
  const box = (await page.locator('.hero-letter').first().boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(640, 300, { steps: 6 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect(page.locator('.hero-hint')).toHaveClass(/is-gone/);
  await page.waitForTimeout(150);
  expect(await offset(0)).toBeGreaterThan(100);
  await expect.poll(() => offset(0), { timeout: 12000 }).toBeLessThan(2);
});

test('motion off sends the letters home and turns play off', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Pause background animation' }).click();
  await page.waitForTimeout(300);
  const moved = await page.locator('.hero-letter').evaluateAll(all => all.map(el => new DOMMatrix(getComputedStyle(el).transform).m42));
  expect(moved.every(y => y === 0)).toBeTruthy();
  await expect(page.locator('.hero-letter').first()).toHaveCSS('pointer-events', 'none');
});

test.describe('on a phone', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('a tap pops a letter, and scrolling lifts the word and lights the services', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await expect.poll(() => page.locator('.hero-letter').last().evaluate(el => Math.abs(new DOMMatrix(getComputedStyle(el).transform).m42)), { timeout: 10000 }).toBeLessThan(2);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    const box = (await page.locator('.hero-letter').nth(2).boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(() => page.locator('.hero-letter').nth(2).evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m42)).toBeLessThan(-30);
    await expect(page.locator('.hero-hint')).toHaveClass(/is-gone/);
    await page.evaluate(() => scrollTo(0, innerHeight * .6));
    await expect(page.locator('.hero-name')).toHaveClass(/is-riding/);
    await page.evaluate(() => document.querySelector('.services')!.scrollIntoView({ block: 'center' }));
    await expect(page.locator('.service.is-lit')).not.toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

test('footer name stays white in both themes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.footer-name')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('.footer-name')).toHaveCSS('color', 'rgb(255, 255, 255)');
});

test('tablet and small-phone layout', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [768, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: `test-results/viewport-${width}.png`, fullPage: true });
  }
});
