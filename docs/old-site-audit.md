# Old-site audit (pre-redesign, Oct 2026 Astro build)

Recorded before the datasheet redesign so the new site can deliberately avoid these patterns.

## Palette
- Light: bg `#f4f4f5`, card `#ffffff`/`#f9fafb`, ink `#18181b`, soft `#3f3f46`, muted `#71717a`
- Accent blue `#2563eb` (dark `#1d4ed8`), secondary teal `#0d9488`, highlight gold `#d97706`
- Colour-cycle extras: red `#ef4444`, amber `#d97706`, purple `#a21caf`, green `#15803d`
- Dark (One Dark): bg `#282c34`, card `#2f343e`, inset `#1e222a`, ink `#e7ebf2`
- Borders `#e2e3e8`, selection wash `#2563eb30`, code blocks `#f3f3f5`
- Avoid: grey zinc background, rainbow colour-cycling, gradient brand text, teal/gold pairing.

## Fonts (all remote Google Fonts — to be replaced with self-hosted WOFF2)
- Body: Karla (sans, 17px, lh 1.7)
- Display/headings: Space Grotesk
- Mono: Space Mono (tags, dates, labels)
- Avoid: geometric sans headings, Karla body, Space Mono.

## Layout
- Single column: reading 720px, listings 860px, centered `.container`
- Conventional top nav bar: brand left, `home · blog · projects · research · writings · github`, hamburger <640px
- Home: greeting line, big name, subtitle, three bio paragraphs, "Now" dash list, Skills chip rows
- Blog index: search bar, tag cloud (`#tag` colour-cycled), year groups, dashed post entries
- Projects: 8 category sections, rows of name/lang/desc, dashed separators
- Research: timeline (left-border items), pub cards with left colour bar, patent cards
- Writings: search + list rows (title + "open PDF")
- Footer: top-bordered bar, `blog · github · email · rss`, "built by Aman Pathak · © YEAR"
- Avoid: top-bar nav, single-column text home, tag-chip rows as main blog UI, card grids with hover-lift.

## Components / interactions
- Theme toggle (moon/sun circle button, localStorage + matchMedia)
- Client-side search filter on blog + writings (inline `<script is:inline>`)
- MathJax via CDN on `math: true` posts (to be replaced with build-time KaTeX)
- Shiki `github-dark` code highlighting
- Smooth scroll, hover translateX on pub items, rotate on theme button

## What must change
No top-bar nav (→ instruction-word bit-field nav), no plain single-column home (→ peel-the-abstraction
stack + register/pin-out tables), no tag-chip rows (→ numbered journal entries), no gradients/shadows/emoji,
no CDN fonts or JS.
