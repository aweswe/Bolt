import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bolt OS',
  description: 'Production-grade Bolt.new clone architecture starter'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
