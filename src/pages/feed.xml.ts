import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { site } from '../data/site';

// Back-compat alias: Jekyll's jekyll-feed emitted /feed.xml.
// Keep old subscribers working alongside the new /rss.xml.
export async function GET(context: { site: string | URL | undefined }) {
  const posts = await getCollection('blog');
  const sorted = posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
  return rss({
    title: `${site.title} · Blog`,
    description: site.description,
    site: context.site ?? site.url,
    items: sorted.map((post) => ({
      title: post.data.title,
      description: post.data.description ?? '',
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}/`,
      categories: post.data.tags ?? [],
    })),
  });
}
