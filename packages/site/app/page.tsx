import { FHECounterDemo } from "@/components/FHECounterDemo";
import Link from "next/link";

export default function Home() {
  return (
    <main className="">
      <div className="flex flex-col gap-8 items-center sm:items-start w-full px-3 md:px-0">
        <FHECounterDemo />
        
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4">Games</h2>
          <div className="space-y-3">
            <Link 
              href="/pixel-duel"
              className="block w-full p-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-center"
            >
              🎮 Pixel Duel FHEVM
            </Link>
            <Link 
              href="/anime-duel"
              className="block w-full p-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors text-center"
            >
              ⚔️ Anime Duel PIXI.js
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
