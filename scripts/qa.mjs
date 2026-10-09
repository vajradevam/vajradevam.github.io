import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const pages = ['/', '/blog/', '/blog/bytes-in-memory/', '/projects/', '/research/', '/writings/', '/colophon/', '/tags/'];
const widths = [360, 768, 1280, 1920];

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const path of pages) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push(String(e)));
    await page.goto('http://localhost:8933' + path, { waitUntil: 'networkidle' });
    // axe
    await page.addScriptTag({ content: axeSource });
    const axe = await page.evaluate(async () => await axe.run({ resultTypes: ['violations'] }));
    const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    console.log(`${path}: axe violations=${axe.violations.length} serious/critical=${serious.length}`);
    for (const v of serious) console.log('  SERIOUS:', v.id, v.nodes.length);
    for (const v of axe.violations) {
      if (v.impact === 'moderate' || v.impact === 'minor')
        console.log(`  ${v.impact}: ${v.id} x${v.nodes.length}`);
    }
    if (consoleErrors.length) { console.log(`${path}: CONSOLE ERRORS`, consoleErrors); errors.push(path); }
    for (const w of widths) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(150);
      const name = (path === '/' ? 'home' : path.replaceAll('/', '_').replace(/^_|_$/g, '')) + `-${w}.png`;
      await page.screenshot({ path: 'docs/screenshots/' + name, fullPage: false });
    }
    await page.close();
  }
  // keyboard: tab through home nav, check focus visible + bytes toggle via keyboard
  const page = await browser.newPage();
  await page.goto('http://localhost:8933/', { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab'); // skip link
  const skipFocused = await page.evaluate(() => document.activeElement.textContent);
  console.log('first-tab focus:', JSON.stringify(skipFocused.trim()));
  // tab to bytes toggle and activate with Enter
  await page.focus('#bytesToggle');
  const activeId = await page.evaluate(() => document.activeElement.id);
  console.log('reached control:', activeId);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  const hexVisible = await page.evaluate(() => !!document.querySelector('.hexdump'));
  console.log('bytes toggle via keyboard:', hexVisible ? 'ON' : 'FAILED');
  await page.keyboard.press('Shift+B');
  await page.waitForTimeout(200);
  console.log('bytes off via Shift+B:', !(await page.evaluate(() => !!document.querySelector('.hexdump'))) ? 'OK' : 'FAILED');
  // reduced motion + dark
  await page.emulateMedia({ reducedMotion: 'reduce' });
  console.log('reduced-motion emulated OK');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: 'docs/screenshots/home-dark-1280.png' });
  console.log('dark screenshot OK');
  await browser.close();
  console.log(errors.length ? 'PAGES WITH ERRORS: ' + errors : 'no console errors');
})().catch((e) => { console.error(e); process.exit(1); });
