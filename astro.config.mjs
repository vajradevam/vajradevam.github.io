import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Static site for GitHub Pages (custom domain vajradevam.in).
export default defineConfig({
  site: 'https://vajradevam.in',
  output: 'static',
  trailingSlash: 'ignore',
  image: {
    // No processed images on this site; skip the sharp dependency.
    service: { entrypoint: 'astro/assets/services/noop' },
  },
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark-dimmed',
      },
    },
  },
});
