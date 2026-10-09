import { visit } from 'unist-util-visit';

function textOf(node) {
  let s = '';
  visit(node, 'text', (n) => { s += n.value; });
  return s;
}

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Add ids + § anchor links to h2/h3 in Markdown content. */
export function rehypeHeadings() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'h2' && node.tagName !== 'h3') return;
      const text = textOf(node);
      const id = slugify(text);
      node.properties = node.properties || {};
      if (!node.properties.id) node.properties.id = id;
      node.children.push({
        type: 'element',
        tagName: 'a',
        properties: { href: `#${id}`, className: ['anchor'], ariaLabel: `Link to ${text}`, tabindex: '-1' },
        children: [{ type: 'text', value: ' §' }],
      });
    });
  };
}

/** Split code blocks into per-line spans for line numbers (CSS counters). */
export function rehypeCodeLines() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'pre') return;
      const code = (node.children || []).find((c) => c.type === 'element' && c.tagName === 'code');
      if (!code) return;
      // Flatten inline tree into segments, tracking open elements.
      const segs = [];
      const flatten = (n) => {
        if (n.type === 'text') {
          n.value.split('\n').forEach((p, i) => {
            if (i > 0) segs.push(null); // line-break marker
            segs.push({ type: 'text', value: p });
          });
        } else if (n.type === 'element' && (n.tagName === 'br' || n.tagName === 'wbr')) {
          segs.push(null);
        } else if (n.type === 'element') {
          segs.push({ type: 'open', tag: n.tagName, props: n.properties });
          (n.children || []).forEach(flatten);
          segs.push({ type: 'close' });
        }
      };
      (code.children || []).forEach(flatten);
      // Rebuild per-line children, reopening spans after each break.
      const out = [];
      const reopen = [];
      let line = [];
      const pushOpen = (s) => {
        const el = { type: 'element', tagName: s.tag, properties: s.props, children: [] };
        const parent = openStack[openStack.length - 1];
        (parent ? parent.children : line).push(el);
        openStack.push(el);
      };
      const openStack = [];
      const pending = () => reopen.slice();
      for (const s of segs) {
        if (s === null) {
          out.push(line);
          line = [];
          openStack.length = 0;
          for (const r of reopen) pushOpen(r);
        } else if (s.type === 'open') {
          reopen.push(s);
          pushOpen(s);
        } else if (s.type === 'close') {
          reopen.pop();
          openStack.pop();
        } else {
          const parent = openStack[openStack.length - 1];
          const t = { type: 'text', value: s.value };
          if (parent) parent.children.push(t);
          else line.push(t);
        }
      }
      void pending;
      out.push(line);
      if (out.length > 1 && out[out.length - 1].length === 0) out.pop();
      code.children = out.map((kids) => ({
        type: 'element',
        tagName: 'span',
        properties: { className: ['code-line'] },
        children: kids.length ? kids : [{ type: 'text', value: ' ' }],
      }));
      node.properties = node.properties || {};
      node.properties.className = [...new Set([...(node.properties.className || []), 'has-lines'])];
    });
  };
}
