# vajradevam.in

Personal site and blog of **Aman Pathak**, PhD scholar in hardware security and
computer architecture at BITS Pilani, KK Birla Goa Campus.

Static [Astro](https://astro.build/) site in the style of Japanese web minimalism:
white ground, small system sans-serif, thin gray rules, dotted separators, a single
vermillion accent. No JavaScript anywhere, no web fonts, no trackers. Math renders
at build time with KaTeX.

## Editing content

- **Blog post**: add a Markdown file to `src/content/blog/` with `title`, `pubDate`,
  `tags`, optional `description` and `math: true` front matter. The blog index, RSS
  feed, and sitemap update themselves at build time.
- **Publications / patents / projects / experience / now**: edit the JSON files in
  `src/data/`.
- **Writings**: drop a PDF into `public/writings/`.
- **Site metadata & nav**: `src/data/site.ts`.

## Develop & deploy

```bash
npm install
npm run dev      # local dev server at localhost:4321
npm run build    # static build into dist/
```

Pushing to `master` triggers `.github/workflows/deploy.yml`, which builds and
deploys to GitHub Pages. The custom domain is carried by `public/CNAME`.
