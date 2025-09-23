import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DiPietro',
  description: 'Configure your bot according to your needs',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
