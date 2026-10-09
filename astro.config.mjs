import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { rehypeHeadings, rehypeCodeLines } from './src/lib/rehype-datasheet.mjs';

// Static site for GitHub Pages (custom domain vajradevam.in).
// https://docs.astro.build/en/guides/deploy/github/
export default defineConfig({
  site: 'https://vajradevam.in',
  output: 'static',
  integrations: [sitemap({ filter: (page) => !page.includes('/styleguide') })],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex, rehypeHeadings, rehypeCodeLines],
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
