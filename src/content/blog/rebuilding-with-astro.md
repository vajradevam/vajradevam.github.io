---
title: Rebuilding this site with Astro
pubDate: 2026-10-08
tags:
  - meta
  - astro
description: Why this site moved from Jekyll to Astro, what changed under the hood, and how posts work now.
---

I rebuilt this site again. It looks the same — same typography-first theme, same pages — but everything underneath is different. Jekyll is out, [Astro](https://astro.build/) is in. The output is still plain static HTML on GitHub Pages at `vajradevam.in`, just produced by a saner pipeline.

## Why leave Jekyll?

Nothing was broken, exactly. But the project had accumulated the usual Jekyll cruft: `_layouts`, `_includes`, `_data`, root-level `blog.html` / `tags.html` / `projects.html`, a `Gemfile` with `vendor/bundle` weighing 84 MB locally, a one-off `generate.js` plus a GitHub Action just to list PDFs, and client-side fallbacks hitting the GitHub API. Layout and structure were the mess, not the design.

Astro fits this site well: content collections for the blog, TypeScript data files instead of YAML sprawl, file-based routing, zero JavaScript by default, and static output that deploys to Pages via the official `deploy-pages` action. No Ruby toolchain, no `vendor/`, no `_site/` committed confusion.

## What changed

- **Posts** moved from `_posts/YYYY-MM-DD-slug.md` to `src/content/blog/slug.md`, with the date living in frontmatter as `pubDate`. A Zod schema in `src/content.config.ts` validates every post.
- **Data** moved from `_data/*.yml` to typed `src/data/*.ts` — projects, publications, patents, experience, skills, now, categories.
- **Layouts** are `src/layouts/Base.astro`, `Page.astro`, and `Post.astro` instead of Liquid templates. Components are just `Nav.astro` and `Footer.astro`.
- **Writings** got the biggest simplification. PDFs live in `public/writings/` and the page reads that directory at build time with `node:fs`. No `list.json`, no extra workflow, no API fallback.
- **Highlighting** switched from Rouge to Shiki (`github-dark`). Container styling stayed in `src/styles/global.css`.
- **Feeds**: canonical `/rss.xml`, with `/feed.xml` kept as an alias so old subscribers don't break. Sitemap is automatic.

Old URLs are preserved: `/blog/<slug>/`, `/tags/#<tag>`, `/projects/`, `/research/`, `/writings/`.

## Writing a post now

Create `src/content/blog/<slug>.md`:

```markdown
---
title: "Your title here"
pubDate: 2026-10-08
tags: [technical, c]
description: "A one-line summary shown in the post list."
---

Your post body goes here, in Markdown.
```

Fenced code blocks get Shiki highlighting. Add `math: true` to the frontmatter on posts that need LaTeX, and MathJax loads only there.

Push to `master` and the deploy action builds (`npm ci` + `npm run build`) and publishes `dist/`. Local preview is `npm run dev` at `http://localhost:4321` — note the port change from Jekyll's `4000`.

Same words, less machinery. That's the whole point.
