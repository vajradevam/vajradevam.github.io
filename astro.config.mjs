import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static site for GitHub Pages (custom domain vajradevam.in).
// https://docs.astro.build/en/guides/deploy/github/
export default defineConfig({
  site: 'https://vajradevam.in',
  output: 'static',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
