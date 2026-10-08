# vajradevam.in

Personal site + blog for Aman Pathak. Static site built with
[Astro](https://astro.build/) and served by GitHub Pages (custom domain
`vajradevam.in`). Typography-first theme, zero JS by default.

## Structure

```
astro.config.mjs       site URL, static output, sitemap
src/content.config.ts  blog collection schema (title, pubDate, tags, math)
src/content/blog/      blog posts (Markdown, one file per post)
src/data/              site + structured content (now, skills, projects,
                       publications, patents, experience, categories)
src/layouts/           Base / Page / Post shells
src/components/        Nav / Footer
src/pages/             index, blog/, blog/[...slug], tags, projects,
                       research, writings, rss.xml + feed.xml, 404
src/lib/posts.ts       post helpers (sorting, tags, dates)
src/styles/global.css  the theme (tokens + components)
public/                copied verbatim to output (CNAME, favicon,
                       robots.txt, writings/*.pdf)
.github/workflows/
  deploy.yml           build + deploy to Pages on push to master
```

## Writing a blog post

Create `src/content/blog/<slug>.md`:

```markdown
---
title: "Post title"
pubDate: 2026-06-10
tags: [technical, c]
description: "One-line summary shown in the post list."
math: false
---

Body in Markdown. Fenced code blocks get Shiki highlighting.
Set `math: true` to load MathJax on that post.
```

Push to `master`. The `deploy` Action builds with Astro and publishes to
GitHub Pages. Posts render at `/blog/<slug>/`, appear on the blog index
grouped by year, and tags feed `/tags/` plus search.

## Local preview

```sh
npm ci
npm run dev
# http://localhost:4321
npm run build  # verify static output in dist/
```

## Writings (PDFs)

Drop a PDF into `public/writings/`. The writings page reads that directory
at build time — no `list.json`, no extra Action, no client-side GitHub API
fallback. Search filters client-side with zero dependencies.

## Notes

- Old Jekyll URLs are preserved: `/blog/<slug>/`, `/tags/#<tag>`,
  `/projects/`, `/research/`, `/writings/`.
- `/feed.xml` is kept as a back-compat alias for old RSS subscribers;
  the canonical feed is `/rss.xml`. Sitemap at `/sitemap-index.xml`.
- Code blocks use Shiki (`github-dark`) instead of Rouge; container
  styling lives in `src/styles/global.css`.
```

