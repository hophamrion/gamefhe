'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const BASE_W = 256;
const BASE_H = 144;

export default function PixelDuelUI() {
  const [scale, setScale] = useState(1);
  const [myHP, setMyHP] = useState(100);
  const [oppHP, setOppHP] = useState(100);
  const [isActing, setIsActing] = useState(false);
  const [flashSide, setFlashSide] = useState<'me' | 'opp' | null>(null);
  const [shakeSide, setShakeSide] = useState<'me' | 'opp' | null>(null);

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const s = Math.max(1, Math.floor(Math.min(w / BASE_W, h / BASE_H)));
      setScale(s);
    };
    onResize(); window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const doFlash = (side: 'me' | 'opp') => { setFlashSide(side); setTimeout(()=>setFlashSide(null), 120); };
  const doShake = (side: 'me' | 'opp') => { setShakeSide(side); setTimeout(()=>setShakeSide(null), 220); };

  async function postJSON(url: string, body: any) {
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }

  const onPickSkill = async (idx: 0|1|2) => {
    if (isActing || myHP<=0 || oppHP<=0) return;
    setIsActing(true);
    try {
      const AGG = process.env.NEXT_PUBLIC_AGG!;
      const matchId = Number(process.env.NEXT_PUBLIC_MATCH_ID || 1);
      // @ts-ignore
      const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      // send my skill to aggregator; server will checkpoint automatically every K=3 rounds for both sides
      await postJSON(`${AGG}/api/skill`, { matchId, who: 'A', skill: idx, player: addr });

      // UI demo feedback (until you wire decrypt HP for "my side" after checkpoint):
      doFlash('opp'); // pretend we hit
      setOppHP(h => Math.max(0, h - [25,35,20][idx]));
    } finally {
      setIsActing(false);
    }
  };

  const winner = useMemo(() => {
    if (myHP <= 0 && oppHP <= 0) return 'DRAW';
    if (myHP <= 0) return 'YOU LOSE';
    if (oppHP <= 0) return 'YOU WIN';
    return null;
  }, [myHP, oppHP]);

  return (
    <div
      className="relative bg-[#7ec0ee] overflow-hidden pixel-frame"
      style={{ width: BASE_W, height: BASE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
      <div className="absolute top-2 left-2 right-2 grid grid-cols-2 gap-2">
        <div className="uibox">
          <div className="text-[8px] leading-none mb-1">YOU</div>
          <div className="hpbar"><div style={{ width: `${myHP}%` }} /></div>
        </div>
        <div className="uibox text-right">
          <div className="text-[8px] leading-none mb-1">OPP</div>
          <div className="hpbar"><div style={{ width: `${oppHP}%` }} /></div>
        </div>
      </div>

      <Sprite src="/sprites/hero.png"
        className={`absolute bottom-16 left-12 w-12 h-12 ${shakeSide==='me'?'shake':''} ${flashSide==='me'?'flash':''}`} />
      <Sprite src="/sprites/opp.png"
        className={`absolute bottom-16 right-12 w-12 h-12 ${shakeSide==='opp'?'shake':''} ${flashSide==='opp'?'flash':''}`} />

      <div className="absolute bottom-2 left-2 right-2 grid grid-cols-3 gap-2">
        {['SKILL A','SKILL B','SKILL C'].map((t,i)=>(
          <button key={t} className="btn-px" onClick={()=>onPickSkill(i as 0|1|2)} disabled={!!winner || isActing}>
            {t}
          </button>
        ))}
      </div>

      {winner && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="uibox text-center px-4 py-3 text-[10px]">{winner}</div>
        </div>
      )}
    </div>
  );
}

function Sprite({ src, className }: { src: string; className?: string }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    const im = imgRef.current;
    if (!im) return;
    const onErr = () => setErr(true);
    im.addEventListener('error', onErr);
    return () => im.removeEventListener('error', onErr);
  }, []);
  if (err) return <div className={`pixelated bg-[#333] border-2 border-[#111] ${className}`} />;
  return <img ref={imgRef} src={src} className={`pixelated ${className}`} alt="" />;
}
