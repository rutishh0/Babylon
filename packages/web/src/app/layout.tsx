// ============================================================================
// PHASE 1 — DEPRECATED. See PHASE1_DEPRECATED.md
// This frontend was deployed on Vercel and pointed at a remote VPS API.
// Phase 2 runs locally on an Alienware machine on the home LAN.
// ============================================================================

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import { ToastProvider } from '@/components/Toast';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Babylon',
  description: 'Your personal streaming platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-bg min-h-screen font-sans">
        <ToastProvider>
          <Navbar />
          <main>{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
