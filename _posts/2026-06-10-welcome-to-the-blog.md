---
title: "Welcome to the new site"
date: 2026-06-10
tags: [meta]
description: "A fresh, typography-first redesign and a real blog. Here's how it's built and how new posts get published."
---

I rebuilt this site from the ground up. It's lighter, faster, and reads better; the
focus is on words and code rather than animated backgrounds.

More importantly, it now has a proper blog. Posts live as plain Markdown files, get
tagged by topic, and are listed by year on the [blog page](/blog/). You can browse
everything by topic on the [tags page](/tags/).

## Writing a new post

Drop a Markdown file into the `_posts/` folder named `YYYY-MM-DD-some-title.md` with a
small block of front matter at the top:

```markdown
---
title: "Your title here"
date: 2026-06-10
tags: [technical, c]
description: "A one-line summary shown in the post list."
---

Your post body goes here, in Markdown.
```

Push it to `master` and GitHub Pages builds and deploys it automatically, no toolchain
required on my end. Code blocks get syntax highlighting, and tags become clickable
filters across the whole blog.

That's it. Expect posts on computer architecture, hardware security, compilers, and C.
