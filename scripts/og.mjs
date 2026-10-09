/* Prebuild: generate OG PNGs (title on paper background with etched border) via sharp. */
import { mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const dir = path.join(process.cwd(), 'public', 'og');
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const pages = {
  'default': 'Aman Pathak',
  home: 'Aman Pathak · hardware security · RISC-V',
  blog: 'Blog · journal entries',
  projects: 'Projects · component catalog',
  research: 'Research · spec document',
  writings: 'Writings · library shelf',
  colophon: 'Colophon · about this site',
};

function svg(title) {
  const esc = title.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<rect width="1200" height="630" fill="#F4F1EA"/>
<rect x="24" y="24" width="1152" height="582" fill="none" stroke="#14130F" stroke-width="3"/>
<rect x="40" y="40" width="1120" height="550" fill="none" stroke="#14130F" stroke-width="1"/>
<text x="80" y="120" font-family="monospace" font-size="28" letter-spacing="6" fill="#6E6A5E">VAJRADEVAM-01 · PERSONAL DATASHEET</text>
<text x="80" y="330" font-family="Georgia, serif" font-size="72" font-weight="bold" fill="#14130F">${esc.slice(0, 42)}</text>
<text x="80" y="420" font-family="monospace" font-size="30" fill="#1F4FD8">vajradevam.in</text>
<text x="80" y="540" font-family="monospace" font-size="24" fill="#6E6A5E">Rev 2026.10 · nothing hidden</text>
</svg>`;
}

for (const [name, title] of Object.entries(pages)) {
  await sharp(Buffer.from(svg(title))).png().toFile(path.join(dir, `${name}.png`));
  console.log(`og/${name}.png`);
}
