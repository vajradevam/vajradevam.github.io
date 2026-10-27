# vajradevam.in

Personal site and blog of **Aman Pathak** — PhD scholar in hardware security and
computer architecture at BITS Pilani, KK Birla Goa Campus.

Static [Astro](https://astro.build/) site, served by GitHub Pages at the custom
domain `vajradevam.in`.

## Design

The theme is **"tape-out"**: the visual language of a silicon die, PCB silkscreen,
and an engineering notebook. Dark-first (die-shot black with bond-wire copper and
phosphor green), with a paper light mode. Prose is set in Source Serif 4, labels
and code in JetBrains Mono — both self-hosted, no CDNs, no trackers. Math renders
at build time with KaTeX; every page works with JavaScript disabled (JS is only
used for the theme toggle and the project/tag filters).

## Pages

| Route | Contents |
|---|---|
| `/` | hero, abstraction stack, selected research/projects, now, latest posts |
| `/about/` | bio, experience timeline, skills, contact |
| `/research/` | publications (published + under review), patents, open problems |
| `/projects/` | all projects with category filter (`/projects/#systems` deep-links) |
| `/blog/` | journal with tag filter; posts live in `src/content/blog/*.md` |
| `/writings/` | PDF shelf — drop PDFs into `public/writings/` and rebuild |

## Editing content

- **Blog post**: add a Markdown file to `src/content/blog/` with `title`,
  `pubDate`, `tags`, optional `description` and `math: true` front matter.
- **Publications / patents / projects / experience / now**: edit the JSON files
  in `src/data/`.
- **Site metadata & nav**: `src/data/site.ts`.

## Develop & deploy

```bash
npm install
npm run dev      # local dev server
npm run build    # static build into dist/
```

Pushing to `master`/`main` triggers `.github/workflows/deploy.yml`, which builds
the site and deploys it to GitHub Pages. In the repo settings, set
**Pages → Source → GitHub Actions** once. The custom domain is carried by
`public/CNAME`.
