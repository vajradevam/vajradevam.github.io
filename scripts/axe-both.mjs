import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  for (const path of ['/', '/blog/', '/blog/bytes-in-memory/', '/projects/', '/research/', '/writings/', '/colophon/', '/tags/']) {
    const ctx = await browser.newContext({ colorScheme: theme });
    const page = await ctx.newPage();
    await page.goto('http://localhost:8933' + path, { waitUntil: 'networkidle' });
    await page.addScriptTag({ content: axeSource });
    const res = await page.evaluate(async () => await axe.run());
    const bad = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    console.log(`${theme} ${path}: serious/critical=${bad.length}` + (bad.length ? ' ' + bad.map((v) => v.id + ':' + v.nodes[0].html.slice(0, 80)).join(' | ') : ''));
    await ctx.close();
  }
}
await browser.close();
