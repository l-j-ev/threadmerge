'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

const links = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/audit', label: 'Audit log' },
  { href: '/dashboard/templates', label: 'Templates' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="flex items-center gap-1 px-6 h-14 border-b border-gray-200 bg-white">
      <span className="text-brand-700 font-semibold mr-4">Nootro</span>
      {links.map((l) => (
        <Link key={l.href} href={l.href}
          className={`px-3 py-1.5 text-sm rounded ${
            isActive(l.href) ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
          }`}>
          {l.label}
        </Link>
      ))}
      <button onClick={() => signOut({ callbackUrl: '/' })}
        className="ml-auto px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded">
        Sign out
      </button>
    </nav>
  );
}
