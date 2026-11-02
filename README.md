# vajradevam.in

Personal site and blog of **Aman Pathak**, PhD scholar in hardware security and
computer architecture at BITS Pilani, KK Birla Goa Campus.

Static [Astro](https://astro.build/) site in a Shangri-La theme: ivory parchment
under a golden radiance, vermillion and gold, hanko kanji seals, a prayer-flag strip,
a golden serpent between sections, snow peaks above the footer, and a white tiger
crest on the home page. All ornament is inline SVG and CSS. No JavaScript anywhere,
no web fonts, no trackers. Math renders at build time with KaTeX.

## Structure

```
src/
  content/blog/           blog posts (Markdown; front matter drives everything)
  data/                   publications, patents, projects, experience, skills,
                          now, and site metadata (site.ts)
  layouts/Base.astro      page shell: head, header, flags, peaks, footer
  components/
    PageHead.astro        page title with seal, subtitle, serpent divider
    ornaments/            Tiger, Serpent, Peaks (decorative inline SVG)
  pages/                  one file per route (+ blog/[...id] for posts, rss.xml)
  styles/
    global.css            imports the four sheets below
    tokens.css            design tokens: colour, shadow, type
    base.css              reset, typography, content primitives
    chrome.css            header, floating sheet, peaks, footer
    ornaments.css         seals, mantra, serpent, hero scene, motion
  lib/posts.ts            post sorting, dates, reading time
public/                   CNAME, favicon, robots, KaTeX css+fonts, PDFs, research.bib
```

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
