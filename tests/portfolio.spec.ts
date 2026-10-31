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
  await expect(page.getByRole('status')).toContainText('Saved in this browser');
  await page.reload();
  await expect(page.getByLabel('Your name')).toHaveValue('Mira');
  await page.getByRole('button', { name: 'Projects' }).click();
  await page.getByRole('button', { name: 'Add project' }).click();
  await page.getByLabel('Project title', { exact: true }).last().fill('New sample');
  await page.getByLabel('Description', { exact: true }).last().fill('A new sample project.');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved in this browser');
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete New sample', exact: true }).click();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Mira');
  await expect(page.locator('.project')).toHaveCount(4);
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
