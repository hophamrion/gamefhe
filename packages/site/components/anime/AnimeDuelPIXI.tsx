'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import * as PIXI from 'pixi.js';

type Skill = 0|1|2; // 0 Slash, 1 Thrust, 2 Bash
type Elem  = 0|1|2; // 0 Fire, 1 Water, 2 Wood

const BASE_W = 640;  // to hơn, mượt hơn
const BASE_H = 360;

export default function AnimeDuelPIXI() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const appRef  = useRef<PIXI.Application>();
  const sceneRef= useRef<{ root:PIXI.Container, bg:PIXI.Container, arena:PIXI.Container,
                           hero:PIXI.Container, opp:PIXI.Container,
                           hpA:{set:(v:number)=>void}, hpB:{set:(v:number)=>void} }>();
  const [elem, setElem] = useState<Elem|null>(null);
  const [myHP, setMyHP] = useState(100);
  const [oppHP, setOppHP] = useState(100);
  const [round, setRound] = useState(1);
  const [busy, setBusy]   = useState(false);

  // init PIXI
  useEffect(() => {
    if (!wrapRef.current) return;

    const app = new PIXI.Application({
      width: BASE_W, height: BASE_H, backgroundAlpha: 0,
      antialias: true, powerPreference: 'high-performance'
    });
    appRef.current = app;
    wrapRef.current.appendChild(app.view as HTMLCanvasElement);

    // Root layers
    const root   = new PIXI.Container();
    const bg     = new PIXI.Container();
    const arena  = new PIXI.Container();
    const hero   = new PIXI.Container();
    const opp    = new PIXI.Container();
    root.addChild(bg, arena, hero, opp);
    app.stage.addChild(root);

    // Background gradient + particles
    const grad = makeGradientTexture(app.renderer, ['#a8d8ff','#7eb8ff','#66a8ff']);
    const bgSprite = new PIXI.Sprite(PIXI.Texture.from(grad));
    bgSprite.width = BASE_W; bgSprite.height = BASE_H;
    bg.addChild(bgSprite);
    const particles = makeParticles(28, BASE_W, BASE_H);
    bg.addChild(particles);

    // Arena floor (subtle)
    const floor = new PIXI.Graphics();
    floor.beginFill(0x1a2a4a, 0.15).drawRoundedRect(40, 220, BASE_W-80, 90, 18).endFill();
    arena.addChild(floor);

    // Characters as simple anime blocks (placeholder) – dễ thay bằng Live2D/Spine sau
    const heroChar = makeChar(0x4a7dff, 0xffffff);
    const oppChar  = makeChar(0xff6a6a, 0xffffff);
    heroChar.position.set(140, 220);
    oppChar.position.set(BASE_W-140, 220);
    hero.addChild(heroChar); opp.addChild(oppChar);

    // Idle bobbing
    let t = 0;
    app.ticker.add((dt)=> {
      t += dt/60;
      heroChar.y = 220 + Math.sin(t*2)*2;
      oppChar.y  = 220 + Math.sin(t*2+Math.PI)*2;
      // particles drift
      particles.children.forEach((p:any)=>{
        p.y -= p.speed; if (p.y < -10) { p.y = BASE_H + Math.random()*30; p.x = 20+Math.random()*(BASE_W-40); }
        p.alpha = 0.4 + 0.3*Math.sin((t+p.seed)*2);
      });
    });

    // HP bars
    const hpA = makeHpBar(40, 24, BASE_W/2-60, 14);
    const hpB = makeHpBar(BASE_W/2+20, 24, BASE_W/2-60, 14, true);
    arena.addChild(hpA.view, hpB.view);

    sceneRef.current = { root, bg, arena, hero, opp, hpA, hpB };

    // resize to parent
    const onResize = () => {
      if (!wrapRef.current) return;
      const w = wrapRef.current.clientWidth, h = wrapRef.current.clientHeight || (w*BASE_H/BASE_W);
      const scale = Math.min(w/BASE_W, h/BASE_H);
      root.scale.set(scale);
      const padX = (w - BASE_W*scale)/2, padY = (h - BASE_H*scale)/2;
      (app.view as HTMLCanvasElement).style.width  = `${BASE_W*scale}px`;
      (app.view as HTMLCanvasElement).style.height = `${BASE_H*scale}px`;
      (app.view as HTMLCanvasElement).style.marginLeft = `${padX}px`;
      (app.view as HTMLCanvasElement).style.marginTop  = `${padY}px`;
    };
    onResize();
    const ro = new ResizeObserver(onResize); ro.observe(wrapRef.current);

    return () => { ro.disconnect(); app.destroy(true); };
  }, []);

  // Reflect HP to bars
  useEffect(()=>{
    sceneRef.current?.hpA.set(myHP);
    sceneRef.current?.hpB.set(oppHP);
  }, [myHP, oppHP]);

  // ---- skill triggers (demo animation; bạn gắn encrypt/batch vào đây) ----
  const sendSkill = async (s: Skill) => {
    if (busy || elem===null || myHP<=0 || oppHP<=0) return;
    setBusy(true);

    // Play VFX
    if (s===0) playSlash(sceneRef.current!);     // Slash
    if (s===1) playThrust(sceneRef.current!);    // Thrust
    if (s===2) playBash(sceneRef.current!);      // Bash

    // TODO: Thay block dưới bằng: encrypt 3 lượt → POST aggregator /api/batch → đợi checkpoint → decrypt HP của bạn
    const dmg = [24, 32, 20][s];
    const oppDmg = [18,22,16][Math.floor(Math.random()*3) as Skill];
    setTimeout(()=>{ setOppHP(h=>Math.max(0,h-dmg)); setMyHP(h=>Math.max(0,h-oppDmg)); setRound(r=>r+1); setBusy(false); }, 380);
  };

  const winner = useMemo(()=>{
    if (myHP<=0 && oppHP<=0) return 'DRAW';
    if (myHP<=0) return 'YOU LOSE';
    if (oppHP<=0) return 'YOU WIN';
    return null;
  }, [myHP,oppHP]);

  return (
    <div className="relative w-full h-[80dvh] min-h-[520px] overflow-hidden bg-[linear-gradient(90deg,#f7f7fb_0,#f1f6ff_100%)]">
      {/* Canvas holder */}
      <div ref={wrapRef} className="absolute inset-0" />

      {/* Round badge */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2">
        <div className="uibox dark text-xs px-3 py-1 shadow">Round {round}</div>
      </div>

      {/* Element picker (chọn 1 lần) */}
      {elem===null && (
        <div className="absolute inset-0 bg-black/40 grid place-items-center">
          <div className="uibox grid gap-3 p-4">
            <div className="text-sm">Choose your element</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                {k:0,label:'FIRE',emoji:'🔥'},
                {k:1,label:'WATER',emoji:'💧'},
                {k:2,label:'WOOD',emoji:'🍃'},
              ].map(x=>(
                <button key={x.k} className="tile text-xs" onClick={()=>setElem(x.k as Elem)}>
                  <div className="text-2xl">{x.emoji}</div>
                  <div className="mt-1">{x.label}</div>
                </button>
              ))}
            </div>
            <div className="text-[11px] opacity-70">Opp element stays hidden</div>
          </div>
        </div>
      )}

      {/* Skill buttons */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 grid grid-cols-3 gap-3">
        <button className="btn-anime" disabled={!elem||!!winner||busy} onClick={()=>sendSkill(0)}>
          <span className="text-lg">✂️</span><span>Slash</span>
        </button>
        <button className="btn-anime" disabled={!elem||!!winner||busy} onClick={()=>sendSkill(1)}>
          <span className="text-lg">📏</span><span>Thrust</span>
        </button>
        <button className="btn-anime" disabled={!elem||!!winner||busy} onClick={()=>sendSkill(2)}>
          <span className="text-lg">💥</span><span>Bash</span>
        </button>
      </div>

      {/* Winner */}
      {winner && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="uibox text-center px-4 py-3 text-base">{winner}</div>
        </div>
      )}
    </div>
  );
}

/* ---------- helpers / VFX ---------- */

function makeGradientTexture(renderer: PIXI.Renderer, colors: string[]) {
  const canvas = document.createElement('canvas');
  canvas.width = 16; canvas.height = 256;
  const g = canvas.getContext('2d')!;
  const grd = g.createLinearGradient(0,0,0,256);
  const step = 1/(colors.length-1);
  colors.forEach((c,i)=>grd.addColorStop(i*step, c));
  g.fillStyle = grd; g.fillRect(0,0,16,256);
  return PIXI.Texture.from(canvas);
}

function makeParticles(n:number, W:number, H:number) {
  const c = new PIXI.Container();
  for (let i=0;i<n;i++){
    const g = new PIXI.Graphics();
    g.beginFill(0xffffff, 0.35).drawCircle(0,0, 1 + Math.random()*1.2).endFill();
    g.x = 20 + Math.random()*(W-40);
    g.y = Math.random()*H;
    (g as any).speed = 0.15 + Math.random()*0.25;
    (g as any).seed  = Math.random()*10;
    c.addChild(g);
  }
  return c;
}

function makeChar(color:number, highlight:number) {
  const c = new PIXI.Container();
  const body = new PIXI.Graphics()
    .roundRect(-28,-48,56,96,14).fill(color);
  const shine = new PIXI.Graphics()
    .roundRect(-18,-12,24,18,6).fill(highlight).alpha = 0.6;
  c.addChild(body);
  // face plate
  const face = new PIXI.Graphics().roundRect(-12,-36,24,18,4).fill(0xffffff);
  face.alpha = 0.85; c.addChild(face);
  c.pivot.set(0,0);
  return c;
}

function makeHpBar(x:number, y:number, w:number, h:number, right=false) {
  const view = new PIXI.Container();
  view.position.set(x,y);
  const bg = new PIXI.Graphics().roundRect(0,0,w,h,4).fill(0x1b1b1b);
  const inner = new PIXI.Graphics().roundRect(2,2,w-4,h-4,3).fill(0x23344d);
  const bar = new PIXI.Graphics();
  const border = new PIXI.Graphics().roundRect(0,0,w,h,4).stroke({ width:2, color:0x111111 });
  view.addChild(bg, inner, bar, border);
  const set = (pct:number)=>{
    const clamped = Math.max(0, Math.min(100, pct));
    const W = Math.floor((w-6) * clamped/100);
    bar.clear().roundRect(3,3, Math.max(0,W), h-6, 3).fill(0x67e56e);
    if (right) { bar.position.x = (w-6) - W; } else { bar.position.x = 0; }
  };
  set(100);
  return { view, set };
}

// Slash: cung trắng quét nhanh
function playSlash(s: NonNullable<typeof sceneRef.current>) {
  const { arena } = s;
  const g = new PIXI.Graphics(); arena.addChild(g);
  let t=0;
  const tick = (dt:number)=>{
    t += dt/60;
    const prog = Math.min(1, t/0.28);
    g.clear();
    g.lineStyle({ width: 8*(1-prog), color: 0xffffff, alpha: 0.9 });
    const cx = 320 + 120*prog, cy = 210 - 20*Math.sin(prog*Math.PI);
    g.arc(cx, cy, 60, -1.2, -0.2);
    if (prog>=1){ g.destroy(); PIXI.Ticker.shared.remove(tick); }
  };
  PIXI.Ticker.shared.add(tick);
}

// Thrust: speed lines + tia đâm
function playThrust(s: NonNullable<typeof sceneRef.current>) {
  const { arena } = s;
  const beam = new PIXI.Graphics(); arena.addChild(beam);
  let t=0;
  const tick = (dt:number)=>{
    t += dt/60;
    const prog = Math.min(1, t/0.28);
    const x0 = 220, x1 = 420;
    beam.clear();
    beam.lineStyle({ width: 6, color: 0xeaeaff, alpha: 0.95 });
    beam.moveTo(x0, 220).lineTo(x0 + (x1-x0)*prog, 220);
    // speed lines
    beam.lineStyle({ width: 2, color: 0xd0d8ff, alpha: 0.7 });
    for (let i=0;i<4;i++){
      const y = 200 + i*10;
      beam.moveTo(x0+30*prog, y).lineTo(x0+60*prog, y);
    }
    if (prog>=1){ beam.destroy(); PIXI.Ticker.shared.remove(tick); }
  };
  PIXI.Ticker.shared.add(tick);
}

// Bash: shockwave tròn + rung
function playBash(s: NonNullable<typeof sceneRef.current>) {
  const { arena, root } = s;
  const wave = new PIXI.Graphics(); arena.addChild(wave);
  let t=0;
  const tick = (dt:number)=>{
    t += dt/60;
    const prog = Math.min(1, t/0.35);
    const r = 8 + 80*prog;
    wave.clear();
    wave.lineStyle({ width: 6*(1-prog), color: 0xffe4a8, alpha: 0.85 });
    wave.drawCircle(500, 220, r);
    // shake
    const sAmt = (1-prog)*2;
    root.position.set(Math.random()*sAmt - sAmt/2, Math.random()*sAmt - sAmt/2);
    if (prog>=1){ wave.destroy(); PIXI.Ticker.shared.remove(tick); root.position.set(0,0); }
  };
  PIXI.Ticker.shared.add(tick);
}
