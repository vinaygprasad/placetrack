import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Student Performance — Training & Placement',
  description: 'Vallurupalli Nageswara Rao Vignana Jyothi Institute of Engineering & Technology — Student Performance and Training & Placement Data Management System.',
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
    ],
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.png" type="image/png" sizes="any" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
