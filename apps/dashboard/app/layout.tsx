import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ThreadMerge Dashboard',
  description: 'Manage your ThreadMerge templates, settings, and audit log.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
