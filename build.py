#!/usr/bin/env python3
"""vajradevam.in — static site generator.

Zero framework. Markdown goes through pandoc, everything else is Python
stdlib. Output lands in docs/ ready for GitHub Pages (deploy from branch,
/docs folder).

    python3 build.py

Requires: python3, pandoc.
"""

import html
import json
import re
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONTENT = ROOT / "content"
DATA = ROOT / "data"
STATIC = ROOT / "static"
OUT = ROOT / "docs"

SITE = {
    "title": "Aman Pathak",
    "brand": "vajradevam",
    "url": "https://vajradevam.in",
    "domain": "vajradevam.in",
    "description": (
        "PhD scholar in computer architecture, hardware security, and "
        "low-level systems. RISC-V, side-channel attacks, formal verification."
    ),
    "author": "Aman Pathak",
    "github": "https://github.com/vajradevam",
    "email": "vajradevam@gmail.com",
}

NAV = [
    ("/", "home"),
    ("/about/", "about"),
    ("/research/", "research"),
    ("/projects/", "projects"),
    ("/blog/", "blog"),
    ("/writings/", "writings"),
]

STATUS_CHIP = [
    ("JCR-Q2", "c-green", "JCR Q2"),
    ("Scopus-Q2", "c-cyan", "Scopus Q2"),
    ("Scopus", "c-cyan", "Scopus"),
    ("accepted", "c-yellow", "accepted"),
    ("under review", "c-orange", "under review"),
]

esc = html.escape


# --------------------------------------------------------------------------
# pandoc helpers
# --------------------------------------------------------------------------

def pandoc_meta(path: Path) -> dict:
    """Extract YAML frontmatter as JSON via pandoc's $meta-json$."""
    with tempfile.NamedTemporaryFile("w", suffix=".tpl", delete=False) as f:
        f.write("$meta-json$")
        tpl = f.name
    out = subprocess.run(
        ["pandoc", "-s", "--template", tpl, "-t", "html", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout
    Path(tpl).unlink()
    return json.loads(out)


def kramdown_math(text: str) -> str:
    """Old posts use kramdown semantics: $$..$$ inline inside a sentence,
    $$ on its own lines for display. Pandoc reads every $$ as display, so
    rewrite the inline ones to single-dollar math, skipping code fences."""
    out, fence = [], False
    for line in text.split("\n"):
        if line.lstrip().startswith("```"):
            fence = not fence
            out.append(line)
            continue
        if not fence and line.strip() != "$$":
            # transform only outside inline code spans
            parts = re.split(r"(`[^`]*`)", line)
            line = "".join(
                p if p.startswith("`") else re.sub(r"\$\$(.+?)\$\$", r"$\1$", p)
                for p in parts
            )
        out.append(line)
    return "\n".join(out)


def pandoc_body(path: Path, math: bool = False) -> str:
    args = ["pandoc", "-f", "markdown", "-t", "html", "--wrap=none"]
    src = path.read_text(encoding="utf-8")
    if math:
        args.append("--katex")
        src = kramdown_math(src)
    out = subprocess.run(args, input=src, capture_output=True, text=True,
                         check=True).stdout
    # language label on code blocks
    out = re.sub(
        r'<pre\s+class="sourceCode (\w+)"',
        r'<pre data-lang="\1" class="sourceCode \1"',
        out,
    )
    # tables scroll in their own container
    out = out.replace("<table>", '<div class="table-wrap"><table>')
    out = out.replace("</table>", "</table></div>")
    return out


# --------------------------------------------------------------------------
# base template
# --------------------------------------------------------------------------

def tabline(active: str) -> str:
    tabs = []
    for i, (href, label) in enumerate(NAV, 1):
        cur = ' aria-current="page"' if label == active else ""
        tabs.append(
            f'<a href="{href}"{cur}><span class="tab-no">{i}</span>{label}</a>'
        )
    return (
        '<nav class="tabline" aria-label="Site">'
        + "".join(tabs)
        + '<span class="tab-fill"></span>'
        + f'<a class="tab-ext" href="{SITE["github"]}" rel="me">github&#8599;</a>'
        + '<a class="tab-ext" href="/rss.xml">rss</a>'
        + "</nav>"
    )


def statusline(fname: str) -> str:
    return f"""<div class="statusline" aria-hidden="true">
  <span class="seg mode" id="sl-mode">NORMAL</span><span class="sep-r"></span>
  <span class="seg branch">master</span><span class="sep-r2"></span>
  <span class="seg file">~/{SITE['brand']}/{esc(fname)}</span>
  <span class="fill"></span>
  <span class="seg meta">unix &#9474; utf-8</span>
  <span class="sep-l2"></span><span class="seg lncol" id="sl-lncol">1:1</span>
  <span class="sep-l"></span><span class="seg pct" id="sl-pct">Top</span>
</div>"""


KEYHELP = """<div class="float" id="keyhelp" hidden role="dialog" aria-label="Keyboard mappings">
<h4>key mappings</h4>
<table>
<tr><td class="k">j / k</td><td>scroll down / up</td></tr>
<tr><td class="k">d / u</td><td>half page down / up</td></tr>
<tr><td class="k">gg / G</td><td>top / bottom</td></tr>
<tr><td class="k">gt / gT</td><td>next / previous tab</td></tr>
<tr><td class="k">?</td><td>toggle this help</td></tr>
</table>
</div>"""

EOB = '<div class="eob" aria-hidden="true">~<br>~<br>~<br>~</div>'


def page(*, title, nav, fname, content, desc=None, path="/", math=False) -> str:
    full_title = (
        f"{SITE['title']} &middot; {SITE['brand']}" if title is None
        else f"{esc(title)} &middot; {SITE['brand']}"
    )
    desc = esc(desc or SITE["description"])
    katex = ""
    if math:
        # pandoc --katex leaves bare TeX inside <span class="math">; render those.
        katex = (
            '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">\n'
            '<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" '
            'onload="document.querySelectorAll(\'.math\').forEach(function(el){'
            "katex.render(el.textContent,el,{displayMode:el.classList.contains('display'),throwOnError:false})"
            '})"></script>\n'
        )
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{full_title}</title>
<meta name="description" content="{desc}">
<meta name="author" content="{SITE['author']}">
<link rel="canonical" href="{SITE['url']}{path}">
<meta property="og:title" content="{full_title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{SITE['url']}{path}">
<meta property="og:type" content="website">
<meta name="theme-color" content="#11100f">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="alternate" type="application/rss+xml" title="{SITE['brand']} rss" href="/rss.xml">
<link rel="stylesheet" href="/css/style.css">
{katex}</head>
<body>
{tabline(nav)}
<main>
{content}
{EOB}
</main>
<footer class="cmdline">:w &middot; "{SITE['domain']}" [unix] &copy; {datetime.now().year} {SITE['author']} &middot; <a href="/rss.xml">rss</a> &middot; <a href="{SITE['github']}">github</a> &middot; <a href="mailto:{SITE['email']}">mail</a> &middot; press <kbd>?</kbd> for keys</footer>
{KEYHELP}
{statusline(fname)}
<script src="/js/vim.js"></script>
</body>
</html>
"""


def write(path: str, html_text: str):
    dest = OUT / path.lstrip("/")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(html_text, encoding="utf-8")


# --------------------------------------------------------------------------
# blog
# --------------------------------------------------------------------------

def load_posts():
    posts = []
    for md in sorted((CONTENT / "blog").glob("*.md")):
        meta = pandoc_meta(md)
        math = str(meta.get("math", "")).lower() == "true"
        body = pandoc_body(md, math=math)
        words = len(re.sub(r"<[^>]+>", " ", body).split())
        posts.append({
            "slug": md.stem,
            "title": meta["title"],
            "date": str(meta["pubDate"])[:10],
            "desc": meta.get("description", ""),
            "tags": meta.get("tags", []) or [],
            "math": math,
            "body": body,
            "mins": max(1, round(words / 220)),
        })
    posts.sort(key=lambda p: p["date"], reverse=True)
    return posts


def tag_spans(tags):
    return " ".join(f'<span class="tag">{esc(t)}</span>' for t in tags)


def entry_row(p):
    d = f'<p class="edesc">{esc(p["desc"])}</p>' if p["desc"] else ""
    return f"""<div class="entry">
<time datetime="{p['date']}">{p['date']}</time>
<div>
  <span class="etitle"><a href="/blog/{p['slug']}/">{esc(p['title'])}</a></span>
  {d}<span class="etags">{tag_spans(p['tags'])}</span>
</div>
</div>"""


def build_blog(posts):
    by_year = {}
    for p in posts:
        by_year.setdefault(p["date"][:4], []).append(p)
    sections = []
    for year in sorted(by_year, reverse=True):
        rows = "\n".join(entry_row(p) for p in by_year[year])
        sections.append(f'<h2 class="year-head" id="y{year}">{year}</h2>\n{rows}')
    content = f"""<p class="sec-label">~/{SITE['brand']}/blog &middot; {len(posts)} entries</p>
<h1>Journal</h1>
<p class="dim">Notes on architecture, compilers, C, the kernel &mdash; and the
occasional entry from further from the metal. Subscribe via <a href="/rss.xml">rss</a>.</p>
{"".join(sections)}"""
    write("blog/index.html", page(
        title="blog", nav="blog", fname="blog/index.md", path="/blog/",
        desc="Journal — posts on computer architecture, compilers, C, and the Linux kernel.",
        content=content,
    ))

    for i, p in enumerate(posts):
        older = posts[i + 1] if i + 1 < len(posts) else None
        newer = posts[i - 1] if i > 0 else None
        nav_bits = []
        if newer:
            nav_bits.append(f'<a href="/blog/{newer["slug"]}/">&larr; {esc(newer["title"])}</a>')
        if older:
            nav_bits.append(f'<a href="/blog/{older["slug"]}/">{esc(older["title"])} &rarr;</a>')
        pn = (
            '<hr><p class="dim" style="display:flex;justify-content:space-between;'
            'gap:1rem;flex-wrap:wrap">' + "".join(nav_bits) + "</p>"
        ) if nav_bits else ""
        content = f"""<p class="sec-label">blog &middot; {p['date']} &middot; {p['mins']} min read</p>
<h1>{esc(p['title'])}</h1>
<p class="etags">{tag_spans(p['tags'])}</p>
{p['body']}
{pn}"""
        write(f"blog/{p['slug']}/index.html", page(
            title=p["title"], nav="blog", fname=f"blog/{p['slug']}.md",
            path=f"/blog/{p['slug']}/", desc=p["desc"] or None,
            math=p["math"], content=content,
        ))


# --------------------------------------------------------------------------
# home
# --------------------------------------------------------------------------

HERO = """<p><span class="ps1"><span class="cwd">~/vajradevam</span> &#10095;</span> cat build.rs</p>
<pre><code><span class="tok-co">// Tells cargo where the researcher is.</span>
<span class="tok-kw">pub struct</span> <span class="tok-ty">Vajradevam</span> <span class="tok-fg">{
    name:   </span><span class="tok-st">"Aman Pathak"</span><span class="tok-fg">,
    role:   </span><span class="tok-st">"PhD scholar &middot; hardware security"</span><span class="tok-fg">,
    place:  </span><span class="tok-st">"BITS Pilani, KK Birla Goa Campus"</span><span class="tok-fg">,
    focus:  [</span><span class="tok-st">"RISC-V"</span><span class="tok-fg">, </span><span class="tok-st">"side channels"</span><span class="tok-fg">, </span><span class="tok-st">"formal verification"</span><span class="tok-fg">],
    editor: </span><span class="tok-st">"vim"</span><span class="tok-fg">,  </span><span class="tok-co">// non-negotiable</span><span class="tok-fg">
}</span>

<span class="tok-kw">fn</span> <span class="tok-fn">main</span><span class="tok-fg">() {
    </span><span class="tok-fn">println!</span><span class="tok-fg">(</span><span class="tok-st">"cargo:rustc-link-lib=static=metal"</span><span class="tok-fg">);
}</span><span class="cursor"></span></code></pre>"""


def build_home(posts, pubs, patents, projects):
    featured = [p for p in projects if p.get("featured")]
    latest = "\n".join(entry_row(p) for p in posts[:3])
    dirs = [
        ("about/", "who, experience, skills"),
        ("research/", f"{len(pubs)} publications, {len(patents)} patents, active threads"),
        ("projects/", f"{len(projects)} things built from scratch"),
        ("blog/", f"{len(posts)} journal entries"),
        ("writings/", "longer-form pdfs"),
    ]
    netrw_rows = "\n".join(
        f'<a href="/{d}">{d:<12} <span class="hint">" {esc(hint)}</span></a>'
        for d, hint in dirs
    )
    feat = " &middot; ".join(
        f'<a href="{p["repo"]}">{esc(p["name"])}</a>' for p in featured
    )
    content = f"""<p class="sec-label">~/{SITE['brand']} &middot; NORMAL &middot; writing, building, and all things close to the metal</p>
<h1>Aman Pathak &mdash; PhD scholar, hardware security. RISC-V, side channels, low-level software.</h1>

<div class="term">{HERO}</div>

<div class="stats">
  <span class="n-pink"><b>{len(pubs)}</b> publications</span>
  <span class="n-yellow"><b>{len(patents)}</b> patents filed</span>
  <span class="n-green"><b>{len(projects)}</b> projects</span>
  <span class="n-cyan"><b>{len(posts)}</b> journal entries</span>
</div>

<p>I break processors for a living and build things from scratch for fun.
Day job: microarchitectural side channels, cache coherency you can prove
things about, and security-aware certification for RISC-V. After hours:
a TCP/IP stack, a malloc, a container runtime, a 6502 &mdash; <a href="/projects/">no
layer of the stack is safe</a>.</p>

<div class="netrw">
<p class="nhead">" ====================================<br>
" Netrw Directory Listing &nbsp;(~/{SITE['brand']})<br>
" ====================================</p>
<pre style="background:none;border:0;padding:0;margin:0;overflow-x:auto">{netrw_rows}</pre>
</div>

<h2 id="latest">latest entries</h2>
{latest}
<p style="margin-top:1rem"><a href="/blog/">all entries &rarr;</a></p>

<h2 id="featured">featured repos</h2>
<p>{feat} &mdash; <a href="/projects/">full listing</a>.</p>"""
    write("index.html", page(
        title=None, nav="home", fname="index.html", path="/",
        content=content,
    ))


# --------------------------------------------------------------------------
# about
# --------------------------------------------------------------------------

def build_about(experience, skills):
    xp_html = []
    for x in experience:
        bullets = "".join(f"<li>{esc(b)}</li>" for b in x["bullets"])
        xp_html.append(f"""<div class="xp">
<span class="xrole">{esc(x['role'])}</span> <span class="xdate">[{esc(x['date'])}]</span><br>
<span class="xorg">{esc(x['org'])}</span>
<ul>{bullets}</ul>
</div>""")
    sk_html = []
    for g in skills:
        items = "".join(f'<span class="sitem">{esc(i)}</span>' for i in g["items"])
        sk_html.append(
            f'<p class="skillgroup"><span class="slabel">{esc(g["label"].lower())}</span>'
            f'<span class="sitems">{items}</span></p>'
        )
    content = f"""<p class="sec-label">~/{SITE['brand']}/about &middot; :set who?</p>
<h1>About</h1>

<p>I'm a PhD scholar in the Department of Computer Science and Information
Systems at <strong>BITS Pilani, KK Birla Goa Campus</strong>, working at the
intersection of hardware security, RISC-V architectures, and low-level
software. My current work spans side-channel mitigation, formal verification
of cache coherency, and ML-based malware analysis on embedded binaries.
Earlier, I designed Ku/X-band antennas at KIIT, and I have six patents filed
in the RISC-V space covering data-flow integrity, crypto engines, and
on-chip ML.</p>

<p>Outside of research I spend a lot of time building things close to the
metal: a TCP/IP stack from scratch, a malloc replacement, a cycle-accurate
6502 emulator, a container runtime using raw namespaces and seccomp, a
bytecode VM in Go, and neural networks built purely from matrix operations.
Not an exhaustive list &mdash; I keep <a href="{SITE['github']}">adding
repos</a> as a hobby. I also <a href="/blog/">write</a> about architecture,
compilers, and C. And I teach sometimes.</p>

<p>Low-level stuff intrigues me. A C program is nothing but bytes in memory;
there is no abstraction beyond that. Sure, memory is made of transistors, and
VLSI gives us gates and voltages and whatnot, but C &mdash; and the assembly
it compiles to &mdash; is quite magical. I know exactly what it is going to
do, and nothing is hidden. It is the naked, and quite often the bitter,
truth. More than low levels <em>per se</em>, to borrow from category theory,
I am interested in the stripped-down, non-abstracted, naked-truth stuff.</p>

<h2 id="experience">experience</h2>
{"".join(xp_html)}

<h2 id="skills">skills</h2>
{"".join(sk_html)}

<h2 id="contact">contact</h2>
<p><span class="muted">:!</span>mail <a href="mailto:{SITE['email']}">{SITE['email']}</a><br>
<span class="muted">:!</span>git clone <a href="{SITE['github']}">github.com/vajradevam</a></p>"""
    write("about/index.html", page(
        title="about", nav="about", fname="about/index.md", path="/about/",
        desc="About Aman Pathak — PhD scholar in hardware security and computer architecture at BITS Pilani Goa.",
        content=content,
    ))


# --------------------------------------------------------------------------
# research
# --------------------------------------------------------------------------

def status_chip(status):
    for key, cls, label in STATUS_CHIP:
        if status == key:
            return f'<span class="chip {cls}">{esc(label)}</span>'
    return f'<span class="chip">{esc(status)}</span>'


def build_research(pubs, patents, now):
    threads = "".join(f"<li>{esc(t)}</li>" for t in now)
    pub_rows = []
    for p in pubs:
        authors = ", ".join(
            f'<span class="me">{esc(a)}</span>' if a == "A. Pathak" else esc(a)
            for a in p["authors"]
        )
        title = esc(p["title"])
        if p.get("url"):
            title = f'<a href="{p["url"]}">{title}</a>'
        year = f' &middot; {p["year"]}' if p.get("year") else ""
        pub_rows.append(f"""<div class="pub" id="p{p['n']}">
<span class="no">[{p['n']}]</span>
<div>
  <span class="ptitle">{title}</span> {status_chip(p['status'])}
  <p class="pmeta">{authors}</p>
  <p class="pvenue">{esc(p['venue'])}{year} &middot; {esc(p['indexed'])}</p>
</div>
</div>""")
    pat_rows = "".join(
        f'<tr><td><code>{esc(p["application"])}</code></td>'
        f'<td><strong>{esc(p["short"])}</strong> &mdash; {esc(p["title"])}</td></tr>'
        for p in patents
    )
    n_pub = sum(1 for p in pubs if p["status"] not in ("under review",))
    n_rev = len(pubs) - n_pub
    content = f"""<p class="sec-label">~/{SITE['brand']}/research &middot; grep -r "side channel" /dev/silicon</p>
<h1>Research</h1>
<p class="dim">Hardware security of RISC-V architectures: microarchitectural
side channels, memory encryption, cache coherency you can formally verify,
and the certification gap between ISA spec and silicon.
{n_pub} published or accepted &middot; {n_rev} under review &middot;
<a href="/research.bib">research.bib</a></p>

<h2 id="threads">active threads</h2>
<ul>{threads}</ul>

<h2 id="publications">publications</h2>
{"".join(pub_rows)}

<h2 id="patents">patents</h2>
<p class="dim">Six Indian patent applications filed in the RISC-V space.</p>
<div class="table-wrap"><table>
<thead><tr><th>application</th><th>title</th></tr></thead>
<tbody>{pat_rows}</tbody>
</table></div>

<p class="muted">Full experience record on the <a href="/about/#experience">about page</a>.</p>"""
    write("research/index.html", page(
        title="research", nav="research", fname="research/index.md",
        path="/research/",
        desc="Publications, patents, and active research threads — RISC-V hardware security, side channels, formal verification.",
        content=content,
    ))


# --------------------------------------------------------------------------
# projects
# --------------------------------------------------------------------------

CATEGORIES = [
    ("systems", "systems", "C, close to the metal"),
    ("emulators", "emulators", "other people's silicon, reimplemented"),
    ("compilers", "compilers &amp; languages", "lexers, parsers, codegen"),
    ("web", "web &amp; tools", "databases, VMs, daemons"),
    ("ml", "machine learning", "from matrix ops up"),
    ("games", "games", "JavaFX arcade"),
    ("frontend", "frontend", "browser toys"),
    ("misc", "misc", "scripts that stuck around"),
]


def build_projects(projects):
    sections = []
    for key, label, blurb in CATEGORIES:
        rows = []
        items = [p for p in projects if p["category"] == key]
        items.sort(key=lambda p: (not p.get("featured"), p["ref"]))
        for p in items:
            desc = p["description"].strip()
            if desc in ("", "\\"):
                desc = "&mdash;"
            else:
                desc = esc(desc)
            star = '<span class="star">*</span> ' if p.get("featured") else ""
            rows.append(f"""<div class="proj">
<span class="pname">{star}<a href="{p['repo']}">{esc(p['name'])}</a></span>
<span class="plang">{esc(p['lang'])}</span>
<span class="pdesc">{desc}</span>
</div>""")
        sections.append(
            f'<h2 id="{key}">{label} <span class="muted" style="font-weight:400;'
            f'font-size:0.8rem">&mdash; {blurb} ({len(items)})</span></h2>'
            + "".join(rows)
        )
    content = f"""<p class="sec-label">~/{SITE['brand']}/projects &middot; ls -l --sort=depth</p>
<h1>Projects</h1>
<p class="dim">{len(projects)} repositories, most built from scratch to see
what the abstraction is hiding. <span class="chip c-yellow">*</span> marks
the ones worth reading first. All on
<a href="{SITE['github']}">github.com/vajradevam</a>.</p>
{"".join(sections)}"""
    write("projects/index.html", page(
        title="projects", nav="projects", fname="projects/index.md",
        path="/projects/",
        desc="Projects — container runtime, TCP/IP stack, malloc, emulators, compilers, and more, mostly from scratch.",
        content=content,
    ))


# --------------------------------------------------------------------------
# writings
# --------------------------------------------------------------------------

def build_writings():
    rows = []
    for pdf in sorted((STATIC / "writings").glob("*.pdf")):
        size = pdf.stat().st_size
        mb = f"{size / 1048576:.1f}M" if size > 1048576 else f"{size // 1024}K"
        rows.append(f"""<div class="pdf-row">
<span><a href="/writings/{esc(pdf.name)}">{esc(pdf.stem)}</a> <span class="muted">.pdf</span></span>
<span class="psize">{mb}</span>
</div>""")
    content = f"""<p class="sec-label">~/{SITE['brand']}/writings &middot; file *.pdf</p>
<h1>Writings</h1>
<p class="dim">Longer-form pieces that outgrew the blog, typeset properly
and frozen as PDFs.</p>
{"".join(rows)}"""
    write("writings/index.html", page(
        title="writings", nav="writings", fname="writings/index.md",
        path="/writings/",
        desc="Longer-form essays as PDFs.",
        content=content,
    ))


# --------------------------------------------------------------------------
# 404, feeds, sitemap
# --------------------------------------------------------------------------

def build_404():
    content = f"""<p class="sec-label">[No Name]</p>
<h1><span class="e404">E404</span>: Pattern not found</h1>
<div class="e404-box">
<p style="margin:0">The buffer you asked for does not exist on this machine.<br>
<span class="muted">Press <kbd>ENTER</kbd> or type command to continue</span></p>
</div>
<p><span class="muted">:e</span> <a href="/">index.html</a> &middot;
<span class="muted">:e</span> <a href="/blog/">blog/</a> &middot;
<span class="muted">:help</span> <a href="/about/">about</a></p>"""
    write("404.html", page(
        title="404", nav="home", fname="[No Name]", path="/404.html",
        desc="Page not found.", content=content,
    ))


def build_feeds(posts):
    items = []
    for p in posts:
        dt = datetime.strptime(p["date"], "%Y-%m-%d").replace(
            hour=12, tzinfo=timezone.utc)
        items.append(f"""<item>
<title>{esc(p['title'])}</title>
<link>{SITE['url']}/blog/{p['slug']}/</link>
<guid>{SITE['url']}/blog/{p['slug']}/</guid>
<pubDate>{format_datetime(dt)}</pubDate>
<description>{esc(p['desc'])}</description>
</item>""")
    rss = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>{esc(SITE['title'])} &#183; {SITE['brand']}</title>
<link>{SITE['url']}</link>
<description>{esc(SITE['description'])}</description>
<language>en</language>
{"".join(items)}
</channel></rss>
"""
    write("rss.xml", rss)
    write("feed.xml", rss)


def build_sitemap(posts):
    urls = ["/", "/about/", "/research/", "/projects/", "/blog/", "/writings/"]
    urls += [f"/blog/{p['slug']}/" for p in posts]
    body = "".join(f"<url><loc>{SITE['url']}{u}</loc></url>" for u in urls)
    write("sitemap.xml",
          '<?xml version="1.0" encoding="UTF-8"?>'
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
          f"{body}</urlset>\n")


# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------

def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()

    # static files
    for sub in ("css", "js", "fonts", "writings"):
        shutil.copytree(STATIC / sub, OUT / sub)
    for f in ("favicon.svg", "robots.txt", "research.bib"):
        shutil.copy(STATIC / f, OUT / f)
    (OUT / "CNAME").write_text(SITE["domain"] + "\n")
    (OUT / ".nojekyll").write_text("")

    pubs = json.loads((DATA / "publications.json").read_text())
    patents = json.loads((DATA / "patents.json").read_text())
    projects = json.loads((DATA / "projects.json").read_text())
    experience = json.loads((DATA / "experience.json").read_text())
    skills = json.loads((DATA / "skills.json").read_text())
    now = json.loads((DATA / "now.json").read_text())

    posts = load_posts()

    build_home(posts, pubs, patents, projects)
    build_about(experience, skills)
    build_research(pubs, patents, now)
    build_projects(projects)
    build_blog(posts)
    build_writings()
    build_404()
    build_feeds(posts)
    build_sitemap(posts)

    n = sum(1 for _ in OUT.rglob("*.html"))
    print(f":w  {n} pages written to docs/")


if __name__ == "__main__":
    main()
