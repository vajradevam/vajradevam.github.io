import { chromium } from 'playwright-core';
const browser = await chromium.launch();
// print research to PDF, count pages
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto('http://localhost:8933/research/', { waitUntil: 'networkidle' });
await page.pdf({ path: '/tmp/research-print.pdf', format: 'A4', printBackground: false });
await ctx.close();
// no-JS pass
const ctx2 = await browser.newContext({ javaScriptEnabled: false });
for (const p of ['/', '/blog/', '/blog/escape/', '/projects/', '/research/', '/writings/', '/tags/']) {
  const pg = await ctx2.newPage();
  await pg.goto('http://localhost:8933' + p, { waitUntil: 'domcontentloaded' });
  const navLinks = await pg.$$eval('.instr-word a', (els) => els.map((e) => e.getAttribute('href')));
  const main = await pg.$eval('#main', (el) => el.innerText.length);
  const rows = await pg.$$eval('table.spec tbody tr', (els) => els.length).catch(() => 0);
  const togglesVisible = await pg.$eval('.corner-controls', (el) => getComputedStyle(el).display).catch(() => 'n/a');
  console.log(`${p}: text=${main} chars, nav=${navLinks.length} links, tableRows=${rows}, toggles=${togglesVisible}`);
  await pg.close();
}
await ctx2.close();
await browser.close();
