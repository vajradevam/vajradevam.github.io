import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;

export async function getSortedPosts(): Promise<BlogPost[]> {
  const posts = await getCollection('blog');
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatLongDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatRev(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function getAllTags(): Promise<{ tag: string; count: number }[]> {
  const posts = await getSortedPosts();
  const counts = new Map<string, number>();
  for (const p of posts) {
    for (const t of p.data.tags ?? []) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

export function searchableText(post: BlogPost): string {
  return [post.data.title, post.data.description ?? '', ...(post.data.tags ?? [])]
    .join(' ')
    .toLowerCase();
}

/** Build-time reading-time estimate (200 wpm, min 1). */
export function readingTime(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Headings for the margin TOC. */
export function tocFromBody(body: string): { id: string; text: string; level: number }[] {
  const out: { id: string; text: string; level: number }[] = [];
  for (const m of body.matchAll(/^(#{2,3})\s+(.+?)\s*$/gm)) {
    const text = m[2].replace(/[*_`]/g, '');
    out.push({ id: slugify(text), text, level: m[1].length });
  }
  return out;
}

/** BibTeX stub generated at build time from publications.json. */
export function toBibtex(pubs: { n: number; title: string; authors: string[]; venue: string; year?: number | null }[]): string {
  return pubs
    .map((p) => {
      const key = `pathak${p.year ?? 'nd'}${String(p.n).padStart(2, '0')}`;
      const author = p.authors.join(' and ');
      return `@misc{${key},\n  author = {${author}},\n  title = {${p.title}},\n  howpublished = {${p.venue}${p.year ? `, ${p.year}` : ''}},\n  year = {${p.year ?? ''}}\n}`;
    })
    .join('\n\n');
}
