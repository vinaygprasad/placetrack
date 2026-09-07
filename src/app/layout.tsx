import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Student Performance — Training & Placement',
  description: 'Vallurupalli Nageswara Rao Vignana Jyothi Institute of Engineering & Technology — Student Performance and Training & Placement Data Management System.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

import { ImportProvider } from '@/context/ImportContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased">
        <ImportProvider>{children}</ImportProvider>
      </body>
    </html>
  );
}
