'use client';
import dynamic from 'next/dynamic';
const AnimeDuelPIXI = dynamic(()=>import('@/components/anime/AnimeDuelPIXI'), { ssr:false });

export default function Page() {
  return <AnimeDuelPIXI />;
}
