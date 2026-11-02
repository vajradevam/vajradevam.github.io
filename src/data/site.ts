export const site = {
  title: 'Aman Pathak',
  brand: 'vajradevam',
  tagline: 'Hardware security · RISC-V · low-level systems',
  description:
    'Aman Pathak: PhD scholar in computer architecture, hardware security, and low-level systems. RISC-V, side-channel attacks, formal verification.',
  url: 'https://vajradevam.in',
  author: 'Aman Pathak',
  github: 'https://github.com/vajradevam',
  email: 'vajradevam@gmail.com',
  affiliation: 'BITS Pilani, KK Birla Goa Campus',
};

export const navItems = [
  { href: '/', label: 'Home', key: 'home' },
  { href: '/about/', label: 'About', key: 'about' },
  { href: '/research/', label: 'Research', key: 'research' },
  { href: '/projects/', label: 'Projects', key: 'projects' },
  { href: '/blog/', label: 'Blog', key: 'blog' },
  { href: '/writings/', label: 'Writings', key: 'writings' },
] as const;

export type NavKey = (typeof navItems)[number]['key'];
