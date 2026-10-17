import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'The Quiet Stacks', description: 'A little virtual library for your real books.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
