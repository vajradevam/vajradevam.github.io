---
title: "Writing math with LaTeX in Markdown"
date: 2026-06-10
tags: [meta, math]
description: "A demonstration of the blog's LaTeX support: inline math, display equations, aligned derivations, matrices, and the syntax behind them."
math: true
---

This blog renders LaTeX math with [MathJax](https://www.mathjax.org/). Posts opt in with
`math: true` in the front matter, and then you can write mathematics inline with the rest
of your prose. This post doubles as a reference: every rendered equation is shown next to
the Markdown that produced it.

Kramdown (the Markdown engine GitHub Pages uses) treats `$$...$$` as math. It's smart about
context: `$$` in the middle of a sentence is rendered inline, while `$$` in its own
paragraph is rendered as a centered display block. Crucially, kramdown protects what's
inside from Markdown processing, so subscripts like `x_i` won't get mangled into emphasis.

## Inline math

You can drop symbols straight into a sentence. Euler's identity, $$e^{i\pi} + 1 = 0$$, is
hard to beat; merge sort runs in $$O(n \log n)$$; and a masked share might be written as
$$x = x_1 \oplus x_2$$.

```markdown
Euler's identity, $$e^{i\pi} + 1 = 0$$, is hard to beat; merge sort runs in
$$O(n \log n)$$; and a masked share might be written as $$x = x_1 \oplus x_2$$.
```

## Display equations

Put the math in its own paragraph to center it. Average memory access time:

$$
\text{AMAT} = t_{\text{hit}} + r_{\text{miss}} \times t_{\text{penalty}}
$$

```markdown
$$
\text{AMAT} = t_{\text{hit}} + r_{\text{miss}} \times t_{\text{penalty}}
$$
```

## Fractions, roots, sums, and integrals

The softmax used in a classifier's output layer:

$$
\sigma(\mathbf{z})_i = \frac{e^{z_i}}{\sum_{j=1}^{K} e^{z_j}}
$$

The continuous Fourier transform:

$$
\hat{f}(\xi) = \int_{-\infty}^{\infty} f(x)\, e^{-2\pi i x \xi}\, dx
$$

A classic limit and a root for good measure:

$$
\lim_{x \to 0} \frac{\sin x}{x} = 1
\qquad
\lVert \mathbf{v} \rVert_2 = \sqrt{\sum_{k=1}^{n} v_k^2}
$$

## Aligned, multi-step derivations

Use `\begin{aligned}` to line equations up on the `&`. Closed form of a geometric series,
the kind that shows up in amortized analysis:

$$
\begin{aligned}
S &= \sum_{k=0}^{n-1} a r^k \\
  &= a \left( 1 + r + r^2 + \cdots + r^{n-1} \right) \\
  &= a \, \frac{1 - r^n}{1 - r}, \qquad r \neq 1
\end{aligned}
$$

```markdown
$$
\begin{aligned}
S &= \sum_{k=0}^{n-1} a r^k \\
  &= a \, \frac{1 - r^n}{1 - r}, \qquad r \neq 1
\end{aligned}
$$
```

## Matrices and vectors

A $$2 \times 2$$ matrix and a matrix-vector product:

$$
A = \begin{bmatrix} a_{11} & a_{12} \\ a_{21} & a_{22} \end{bmatrix},
\qquad
A\mathbf{x} = \begin{bmatrix} a_{11} x_1 + a_{12} x_2 \\ a_{21} x_1 + a_{22} x_2 \end{bmatrix}
$$

## Piecewise definitions

The `cases` environment is perfect for recurrences. Factorial, written recursively:

$$
f(n) =
\begin{cases}
1 & \text{if } n = 0 \\
n \cdot f(n - 1) & \text{if } n > 0
\end{cases}
$$

## Symbols, Greek, and operators

A quick sampler of the things you'll reach for most:

$$
\alpha, \beta, \gamma, \delta, \quad \Delta, \Sigma, \Omega, \quad
\nabla, \partial, \infty, \quad \forall x \in \mathbb{R}, \ \exists\, \varepsilon > 0
$$

$$
\mathbb{Z} \subset \mathbb{Q} \subset \mathbb{R} \subset \mathbb{C}, \qquad
a \equiv b \pmod{m}, \qquad
\binom{n}{k} = \frac{n!}{k!\,(n-k)!}
$$

That's the whole toolkit. Anything LaTeX's math mode can express, MathJax will render here.
To use it in your own post, add `math: true` to the front matter and write away.
