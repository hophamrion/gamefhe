'use client';

import { useEffect, useMemo, useState } from 'react';
const BASE_W = 256; const BASE_H = 144;
type Elem = 0|1|2; type Skill = 0|1|2;

export default function PixelDuelUI() {
  const [scale, setScale] = useState(1);
  const [myHP, setMyHP] = useState(100);
  const [oppHP, setOppHP] = useState(100);
  const [round, setRound] = useState(1);
  const [elem, setElem] = useState<Elem|null>(null);
  const [animHero, setAnimHero] = useState<'idle'|'atk'>('idle');
  const [animOpp, setAnimOpp] = useState<'idle'|'atk'>('idle');
  const [busy, setBusy] = useState(false);
  useEffect(()=>{ const r=()=>{ const s=Math.max(1,Math.floor(Math.min(window.innerWidth/BASE_W, window.innerHeight/BASE_H))); setScale(s);}; r(); window.addEventListener('resize',r); return()=>window.removeEventListener('resize',r);},[]);
  const winner = useMemo(()=> (myHP<=0&&oppHP<=0?'DRAW': myHP<=0?'YOU LOSE': oppHP<=0?'YOU WIN': null), [myHP,oppHP]);

  async function sendSkill(skill: Skill) {
    setBusy(true);
    setAnimHero('atk'); setAnimOpp('atk');
    setTimeout(()=>{ setAnimHero('idle'); setAnimOpp('idle'); }, 300);
    const dmg = [25,35,20][skill]; setOppHP(h=>Math.max(0,h-dmg));
    const oppDmg = [20,25,15][Math.floor(Math.random()*3) as Skill]; setMyHP(h=>Math.max(0,h-oppDmg));
    setRound(r=>r+1); setBusy(false);
  }

  return (<div className="relative bg-gradient-to-b from-[#8ec5ff] to-[#6fb1ff] overflow-hidden pixel-frame" style={{width:BASE_W,height:BASE_H, transform:`scale(${scale})`, transformOrigin:'top left'}}>
    <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20"><div className="uibox dark text-[10px] px-2 py-1">Round {round}</div></div>
    <div className="absolute top-2 left-2 right-2 grid grid-cols-2 gap-2">
      <div className="uibox"><div className="text-[9px] mb-1">YOU</div><div className="hpbar"><div style={{width:`${myHP}%`}}/></div><div className="mt-1 text-[10px]">{myHP}/100</div></div>
      <div className="uibox text-right"><div className="text-[9px] mb-1">OPP</div><div className="hpbar"><div style={{width:`${oppHP}%`}}/></div><div className="mt-1 text-[10px]">{oppHP}/100</div></div>
    </div>
    <div className="absolute inset-0 grid grid-cols-2 items-end pb-12">
      <div className="pl-10"><div className={`sprite hero ${animHero}`} /></div>
      <div className="pr-10 justify-self-end"><div className={`sprite opp ${animOpp}`} /></div>
    </div>
    <div className="absolute bottom-2 left-2 right-2 grid grid-cols-3 gap-2">
      <button className="btn-px btn-icon" disabled={!!winner||busy||elem===null} onClick={()=>sendSkill(0)}><img src="/sprites/skills/slash.png" alt=""/> Slash</button>
      <button className="btn-px btn-icon" disabled={!!winner||busy||elem===null} onClick={()=>sendSkill(1)}><img src="/sprites/skills/thrust.png" alt=""/> Thrust</button>
      <button className="btn-px btn-icon" disabled={!!winner||busy||elem===null} onClick={()=>sendSkill(2)}><img src="/sprites/skills/bash.png" alt=""/> Bash</button>
    </div>
    {elem===null && (<div className="overlay"><div className="picker"><div className="text-[12px]">Choose your element</div>
      <div className="grid3">
        <div className="tile" onClick={()=>setElem(0 as Elem)}><img src="/sprites/elements/fire.png" alt=""/><div className="text-[10px] mt-1">FIRE</div></div>
        <div className="tile" onClick={()=>setElem(1 as Elem)}><img src="/sprites/elements/water.png" alt=""/><div className="text-[10px] mt-1">WATER</div></div>
        <div className="tile" onClick={()=>setElem(2 as Elem)}><img src="/sprites/elements/wood.png" alt=""/><div className="text-[10px] mt-1">WOOD</div></div>
      </div><div className="text-[10px] opacity-70">Opp element stays hidden</div></div></div>)}
    {winner && (<div className="absolute inset-0 grid place-items-center"><div className="uibox text-center px-4 py-3 text-[12px]">{winner}</div></div>)}
  </div>);
}
