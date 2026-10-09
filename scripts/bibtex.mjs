/* Prebuild: generate public/research.bib from src/data/publications.json */
import { readFileSync, writeFileSync } from 'node:fs';

const pubs = JSON.parse(readFileSync(new URL('../src/data/publications.json', import.meta.url)));
const bib = pubs
  .map((p) => {
    const key = `pathak${p.year ?? 'nd'}${String(p.n).padStart(2, '0')}`;
    const author = p.authors.join(' and ');
    return `@misc{${key},\n  author = {${author}},\n  title = {{${p.title}}},\n  howpublished = {${p.venue}${p.year ? `, ${p.year}` : ''}},\n  year = {${p.year ?? ''}},${p.url ? `\n  url = {${p.url}},` : ''}\n  note = {${p.note}}\n}`;
  })
  .join('\n\n');
writeFileSync(new URL('../public/research.bib', import.meta.url), bib + '\n');
console.log(`research.bib: ${pubs.length} entries`);
