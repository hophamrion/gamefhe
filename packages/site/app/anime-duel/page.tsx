'use client';
import dynamic from 'next/dynamic';
const AnimeDuelChibiPIXI = dynamic(()=>import('@/components/anime/AnimeDuelChibiPIXI'), { ssr:false });

export default function Page() {
  return <AnimeDuelChibiPIXI />;
}
