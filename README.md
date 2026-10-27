# vajradevam.in

Personal site + blog for Aman Pathak. Pure static HTML themed after
**Monokai Pro (Spectrum)** — the palette is sampled directly from a Neovim
screenshot (`image.png`). Hack (Nerd Font when installed locally),
vim tabline navigation, a live statusline, end-of-buffer tildes, and
working vim motions. Served by GitHub Pages.

## Build

```sh
python3 build.py     # requires python3 + pandoc, nothing else
```

Output lands in `docs/`, ready to serve. Preview locally:

```sh
python3 -m http.server -d docs 4321
# http://localhost:4321
```

## Deploy (GitHub Pages)

1. Push this repo to GitHub (`master` or `main`).
2. Repo → Settings → Pages → Source: **Deploy from a branch**,
   branch `master`, folder `/docs`.
3. `docs/CNAME` already carries `vajradevam.in`; point the domain's
   DNS at GitHub Pages and it goes live.

No Actions, no Node, no dependencies. Rebuild + commit + push = deploy.

## Structure

```
build.py            the whole static site generator (~500 lines, stdlib + pandoc)
content/blog/*.md   blog posts, YAML frontmatter (title, pubDate, tags, math)
data/*.json         publications, patents, projects, experience, skills, now
static/css/         the Monokai Pro theme
static/js/vim.js    statusline + vim motions (j k d u gg G gt gT ?)
static/fonts/       Hack woff2, self-hosted
static/writings/    longer-form PDFs
docs/               generated output (commit it; GitHub Pages serves it)
image.png           the Neovim screenshot the theme was sampled from
```

## Writing a post

Create `content/blog/<slug>.md`:

```markdown
---
title: "Post title"
pubDate: 2026-06-10
tags: [technical, c]
description: "One-line summary shown in the post list."
math: false
---

Body in Markdown. Fenced code blocks are highlighted by pandoc and
styled in Monokai Pro. Set `math: true` for KaTeX.
```

Run `python3 build.py`, commit, push. The post renders at `/blog/<slug>/`,
joins the index grouped by year, and lands in `/rss.xml` (+ the
`/feed.xml` back-compat alias) and `/sitemap.xml`.

## Vim keys on the site

`j`/`k` scroll · `d`/`u` half page · `gg`/`G` top/bottom ·
`gt`/`gT` cycle tabs · `?` help float · selecting text flips the
statusline to VISUAL.
