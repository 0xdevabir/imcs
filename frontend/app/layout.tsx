import type { Metadata } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';
import './globals.css';

const displayFont = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });
const bodyFont = Manrope({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'IMCS Frontend',
  description: 'Next.js frontend for IMCS full-stack starter',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>{children}</body>
    </html>
  );
}
