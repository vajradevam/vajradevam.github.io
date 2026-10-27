import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getSortedPosts } from '../lib/posts';
import { site } from '../data/site';

export async function GET(context: APIContext) {
  const posts = await getSortedPosts();
  return rss({
    title: site.title,
    description: site.description,
    site: context.site ?? site.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}/`,
    })),
  });
}
