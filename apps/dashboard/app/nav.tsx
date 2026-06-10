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
    <nav className="sticky top-0 z-50 flex items-center gap-1 px-6 h-16 border-b border-[rgba(82,255,82,0.12)] bg-[rgba(5,11,7,0.7)] backdrop-blur-xl">
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 mr-5 font-semibold text-[15px] tracking-tight text-[#eafff0]"
      >
        <svg
          viewBox="0 32 158 97"
          aria-hidden="true"
          className="w-6 h-auto drop-shadow-[0_0_10px_rgba(82,255,82,0.45)]"
        >
          <path
            fill="#52FF52"
            d="M95.7,34.74c-14.29,0-29.49,4.13-29.49,4.13-30.87,8.13-46.55,30.84-46.55,30.84C1.13,93.08,2.03,126.66,2.03,126.66h61.32c31.49-.46,48.6-11.18,48.6-11.18,24.67-12.46,35.06-34.05,35.06-34.05,8.72-13.71,11.01-46.69,11.01-46.69h-62.32ZM103.44,68.39c-8.12,12.13-20.86,20.29-38.23,24.48l-9.96,2.4c.43-.72.82-1.45,1.29-2.16,8.16-12.21,20.87-20.39,38.12-24.54l10.13-2.44c-.45.76-.85,1.53-1.35,2.27Z"
          />
          <path
            fill="#00C600"
            d="M56.54,93.01c8.16-12.2,20.87-20.38,38.12-24.54l9.81-2.36,53.24-31.37h-62.2c-14.27,0-29.42,4.12-29.42,4.12-30.81,8.12-46.45,30.78-46.45,30.78C1.14,92.96,2.04,126.47,2.04,126.47l53.27-31.39c.41-.69.78-1.39,1.23-2.06Z"
          />
        </svg>
        Nootro
      </Link>

      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`px-3.5 py-1.5 text-sm rounded-full transition-colors ${
            isActive(l.href)
              ? 'bg-[#0a2e16] text-[#52ff52] font-medium'
              : 'text-[#a7c4b2] hover:text-[#eafff0] hover:bg-[rgba(82,255,82,0.06)]'
          }`}
        >
          {l.label}
        </Link>
      ))}

      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        className="ml-auto px-3.5 py-1.5 text-sm rounded-full text-[#a7c4b2] hover:text-[#eafff0] hover:bg-[rgba(82,255,82,0.06)] transition-colors"
      >
        Sign out
      </button>
    </nav>
  );
}
