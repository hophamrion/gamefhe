'use client';

import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Providers } from '../providers';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPixelDuel = pathname.includes('/pixel-duel');

  if (isPixelDuel) {
    return (
      <div className="bg-gradient-to-b from-[#8ec5ff] to-[#6fb1ff] min-h-screen flex items-center justify-center p-4">
        <Providers>{children}</Providers>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 w-full h-full zama-bg z-[-20] min-w-[850px]"></div>
      <main className="flex flex-col max-w-screen-lg mx-auto pb-20 min-w-[850px]">
        <nav className="flex w-full px-3 md:px-0 h-fit py-10 justify-between items-center">
          <Image
            src="/zama-logo.svg"
            alt="Zama Logo"
            width={120}
            height={120}
          />
        </nav>
        <Providers>{children}</Providers>
      </main>
    </>
  );
}
