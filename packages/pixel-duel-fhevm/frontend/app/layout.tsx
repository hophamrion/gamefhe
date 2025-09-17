import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Pixel Duel', description: '3 hệ × 3 skill - pixel UI' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
