# Content inventory (verbatim source of truth)

All content copied verbatim. Counts: **14 publications, 6 patents, 3 writings, 8 blog posts, 45 projects.**

## Home (`src/pages/index.astro`)
- Identity: "Hi, I'm / Aman Pathak / PhD Scholar working on hardware security, RISC-V, and low-level software."
- Bio: 3 paragraphs (BITS Pilani PhD → building close to the metal → naked-truth philosophy).
- Now: 5 items (`src/data/now.ts`).
- Skills: Languages (15), Systems (13), Domains (8) (`src/data/skills.ts`).

## Blog (8 posts, `src/content/blog/`)
| slug | title | date | tags |
|---|---|---|---|
| bytes-in-memory | Everything is just bytes in memory | 2026-05-20 | technical, c |
| welcome-to-the-blog | Welcome to the new site | 2026-06-10 | meta |
| math-with-latex | Writing math with LaTeX in Markdown | 2026-06-10 | meta, math (`math: true`) |
| unrequited-love | Unrequited Love | 2026-07-17 | personal, introspection |
| escape | Escape | 2026-08-04 | personal |
| compiling-and-executing-a-java-program | Compiling and Executing a Java Program | 2026-08-19 | java, technical, csf213 |
| compiling-and-running-the-linux-kernel | Compiling and Running the Linux Kernel | 2026-08-27 | linux, kernel, technical, build-guide |
| rebuilding-with-astro | Rebuilding this site with Astro | 2026-10-08 | meta, astro |

## Projects (45, `src/data/projects.ts`, 8 categories in `src/data/categories.ts`)
emulators & VMs (4): chip8, schip, commodore64, rv32i-emulator · systems (9): whale, vajrip,
memoria, slinep, lolfetch, ray-tracing-c, sell-shell, c-animation, RV-Sparse · web & backend (10):
nook, mridu, urls, alonzo, juice, attendance-system, LLM-Ping, deeptrace, pit, vectdb ·
ML & data (8): wthr, slm-bench, advx, lstm-weather, ml-nanosensor, vajranet, takenizer, smol ·
games (3): jetris, minejweeper, judoku · frontend (3): 2048, game-of-life, color-scheme ·
compilers (3): Luma-Lang, yasl, riscc · misc (5): DDownloader, chatbot, chatora, cst-pipeline, cst-plotter.
Featured (6): whale, vajrip, memoria, commodore64, mridu, nook.
GAP: `RV-Sparse` has a repo but **no description** — left blank, flagged in final report.

## Research
- Experience (3, `src/data/experience.ts`): PhD Scholar 2026–present; Undergrad Researcher May–Aug 2025; Undergrad Researcher Feb 2023–Aug 2024.
- Patents (6, `src/data/patents.ts`): DFI Monitor 202631036811, Fusion Engine 202631036816, HPC Malware 202631036812, Crypto Engine 202631036813, NUMA 202631036815, Trace BDT 202631036814.
- Publications (14, `src/data/publications.ts`): ARCHER (SCI-Q1), PACE (SCI-Q2), 1 under-review revision, 2× Scopus 2025 reviews, 4× accepted·Scopus 2026, 4× ISED 2026 under review.

## Writings (3 PDFs, `public/writings/`)
- Concurrency in Systems Programming.pdf · Fifty Thesis.pdf · The End of the One-Model Era.pdf

## URLs preserved
`/` `/blog/` `/blog/<slug>/` `/tags/#<tag>` `/tags/` `/projects/` `/research/` `/writings/`
`/writings/*.pdf` `/rss.xml` `/feed.xml` (alias) `/sitemap-index.xml` · `mailto:vajradevam@gmail.com` · new: `/colophon/` `/styleguide/` (noindex) `/404.html`.
