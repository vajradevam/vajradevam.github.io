export const site = {
  title: 'Aman Pathak',
  brand: 'vajradevam',
  tagline: 'Writing, building, and all things close to the metal',
  description:
    'PhD Scholar in computer architecture, hardware security, and low-level systems. RISC-V, side-channel attacks, formal verification.',
  url: 'https://vajradevam.in',
  author: 'Aman Pathak',
  github: 'https://github.com/vajradevam',
  email: 'mailto:vajradevam@gmail.com',
};

export type NavKey = 'home' | 'blog' | 'projects' | 'research' | 'writings' | 'colophon';

export const navItems: { href: string; label: string; key: NavKey | 'github' }[] = [
  { href: '/', label: 'home', key: 'home' },
  { href: '/blog/', label: 'blog', key: 'blog' },
  { href: '/projects/', label: 'projects', key: 'projects' },
  { href: '/research/', label: 'research', key: 'research' },
  { href: '/writings/', label: 'writings', key: 'writings' },
];
