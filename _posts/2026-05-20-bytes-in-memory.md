---
title: "Everything is just bytes in memory"
date: 2026-05-20
tags: [technical, c]
description: "A short musing on why C feels honest: there's no abstraction hiding underneath the bytes."
---

One of the reasons I keep coming back to C is that it doesn't lie to you. A C program is,
at the end of the day, nothing but bytes in memory. There is no abstraction beyond that
you have to take on faith.

Consider a struct:

```c
struct point {
    int   x;   // 4 bytes
    int   y;   // 4 bytes
    char  tag;  // 1 byte
};              // sizeof == 12, not 9
```

The `sizeof` is 12, not 9: the compiler pads `tag` so the next `point` in an array stays
aligned. Nothing magical happened; the rules are knowable, and you can predict the layout
exactly. That predictability is the whole appeal.

You can walk the raw bytes yourself:

```c
struct point p = { .x = 1, .y = 2, .tag = 'a' };
unsigned char *raw = (unsigned char *)&p;
for (size_t i = 0; i < sizeof p; i++)
    printf("%02x ", raw[i]);
```

Higher-level languages give you objects, garbage collection, hidden allocations. Useful,
often. But C, and the assembly it compiles to, hands you the naked, sometimes bitter,
truth: you know exactly what the machine is going to do, and nothing is hidden.

That's the stuff I find worth writing about.
