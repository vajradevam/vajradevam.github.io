# vajradevam.in

Personal site + blog for Aman Pathak. Static site built with [Jekyll](https://jekyllrb.com/)
and served by GitHub Pages (custom domain `vajradevam.in`). Light, typography-first theme.

## Structure

```
_config.yml          site config (plugins, permalinks)
_layouts/            default / page / post templates
_includes/           head, nav, footer partials
_posts/              blog posts (Markdown)
assets/css/style.css the theme
assets/js/ui.js      mobile-nav toggle
index.html           home
blog.html            blog index (by year)
tags.html            posts grouped by tag
research.html projects.html writings.html coursework.html
writings/            PDFs + auto-generated list.json
```

## Writing a blog post

Create `_posts/YYYY-MM-DD-title.md`:

```markdown
---
title: "Post title"
date: 2026-06-10
tags: [technical, c]
description: "One-line summary shown in the post list."
---

Body in Markdown. Fenced code blocks get syntax highlighting.
```

Push to `master`. GitHub Pages rebuilds and deploys automatically, no local toolchain
needed. Posts publish at `/blog/<title>/`, appear on the blog index grouped by year, and
their tags become clickable filters on `/tags/`.

## Local preview

```sh
bundle install
bundle exec jekyll serve
# http://localhost:4000
```

## Writings (PDFs)

Drop a PDF into `writings/`. A GitHub Action regenerates `writings/list.json`, which the
writings page reads.
