export const site = {
  title: 'Aman Pathak',
  brand: 'vajradevam',
  tagline: 'Hardware security · RISC-V · close to the metal',
  description:
    'Aman Pathak — PhD Scholar in computer architecture, hardware security, and low-level systems. RISC-V, side-channel attacks, formal verification.',
  url: 'https://vajradevam.in',
  author: 'Aman Pathak',
  github: 'https://github.com/vajradevam',
  email: 'vajradevam@gmail.com',
  affiliation: 'BITS Pilani · KK Birla Goa Campus · CSIS',
};

export const navItems = [
  { href: '/', label: 'home', key: 'home' },
  { href: '/about/', label: 'about', key: 'about' },
  { href: '/research/', label: 'research', key: 'research' },
  { href: '/projects/', label: 'projects', key: 'projects' },
  { href: '/blog/', label: 'blog', key: 'blog' },
  { href: '/writings/', label: 'writings', key: 'writings' },
] as const;

export type NavKey = (typeof navItems)[number]['key'];
