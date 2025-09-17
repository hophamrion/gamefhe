'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { useMetaMaskEthersSigner } from '@/hooks/metamask/useMetaMaskEthersSigner';

type Skill = 0|1|2; // Slash / Thrust / Bash
type Elem  = 0|1|2; // Fire / Water / Wood
const W = 1680, H = 900;

// Layout đối xứng theo W/H
const LAYOUT = {
  PAD_X: Math.round(W * 0.07),     // lề hai bên
  GROUND_Y: Math.round(H * 0.62),  // cao độ sàn
  CHAR_OFFSET: Math.round(W * 0.06) // khoảng cách nhân vật tới lề trong
};
const POS = {
  MID_X: Math.round(W * 0.5),
  HERO_X: Math.round(W * 0.5 - (W * 0.25)),
  OPP_X:  Math.round(W * 0.5 + (W * 0.25))
};

export default function AnimeDuelChibiPIXI() {
  const holderRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const scene = useRef<ReturnType<typeof buildScene> | null>(null);
  
  // MetaMask connection
  const { isConnected, connect, accounts, chainId } = useMetaMaskEthersSigner();
  
  // Game state
  const [gameState, setGameState] = useState<'connecting' | 'element-selection' | 'playing' | 'finished'>('connecting');
  const [elem, setElem] = useState<Elem|null>(null);
  const [round, setRound] = useState(1);
  const [myHP, setMyHP] = useState(100);
  const [oppHP, setOppHP] = useState(100);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const initPIXI = async () => {
      const app = new PIXI.Application();
      await app.init({
        width: W, height: H,
        antialias: true, backgroundAlpha: 0,
        resolution: Math.min(window.devicePixelRatio || 1, 2)
      });
      appRef.current = app;
      
      if (holderRef.current) {
        holderRef.current.appendChild(app.canvas);
      }
      
      scene.current = buildScene(app);
      const ro = new ResizeObserver(()=> fit(app, holderRef.current!)); 
      fit(app, holderRef.current!); 
      ro.observe(holderRef.current!);
      
      return () => { 
        ro.disconnect(); 
        app.destroy(true); 
      };
    };

    initPIXI().catch(console.error);
  }, []);

  // Force resize khi component mount và window resize
  useEffect(() => {
    if (appRef.current && holderRef.current) {
      const handleResize = () => {
        fit(appRef.current!, holderRef.current!);
      };
      
      // Delay một chút để đảm bảo DOM đã render xong
      setTimeout(handleResize, 100);
      
      // Listen window resize
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  // sync HP vào bar
  useEffect(()=> scene.current?.hpA.set(myHP), [myHP]);
  useEffect(()=> scene.current?.hpB.set(oppHP), [oppHP]);

  const winner = useMemo(()=>{
    if (myHP<=0 && oppHP<=0) return 'DRAW';
    if (myHP<=0) return 'YOU LOSE';
    if (oppHP<=0) return 'YOU WIN';
    return null;
  }, [myHP, oppHP]);

  // Check if connected to correct network (Sepolia)
  const isCorrectNetwork = chainId === 11155111; // Sepolia

  // Start game after element selection
  const startGame = () => {
    setGameState('playing');
  };

  // Connect MetaMask
  const handleConnect = () => {
    connect();
  };

  // Update game state based on winner
  useEffect(() => {
    if (winner) {
      setGameState('finished');
    }
  }, [winner]);

  const play = async (s: Skill) => {
    if (!scene.current || busy || gameState !== 'playing' || elem===null || winner) return;
    setBusy(true);

    // VFX + chuyển động chibi (hero tấn công, opp trúng)
    const sfx = [vfxSlash, vfxThrust, vfxBash][s];
    scene.current.hero.attack(s);
    sfx(scene.current);
    scene.current.opp.hit();

    // TODO: thay block fake này bằng encrypt K=3 → POST /api/batch → đợi checkpoint → decrypt HP của bạn
    const dmg = [26, 34, 22][s]; const coun = [18,22,16][Math.floor(Math.random()*3) as Skill];
    setTimeout(()=>{
      setOppHP(h=>Math.max(0,h-dmg));
      setMyHP(h=>Math.max(0,h-coun));
      setRound(r=>r+1);
      setBusy(false);
    }, 420);
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-[radial-gradient(ellipse_at_top,#0c1220,#060911)] overflow-hidden">
      <div ref={holderRef} className="absolute inset-0 w-full h-full" />

      {/* MetaMask Connection Screen */}
      {gameState === 'connecting' && (
        <div className="absolute inset-0 bg-black/80 grid place-items-center">
          <div className="uibox text-center px-6 py-4 max-w-md">
            <h2 className="text-xl font-bold mb-4">🎮 TrioDuel FHEVM</h2>
            {!isConnected ? (
              <div>
                <p className="mb-4">Connect your MetaMask wallet to start playing!</p>
                <button 
                  onClick={handleConnect}
                  className="btn-anime w-full"
                >
                  🔗 Connect MetaMask
                </button>
              </div>
            ) : !isCorrectNetwork ? (
              <div>
                <p className="mb-4 text-red-400">Please switch to Sepolia network</p>
                <p className="text-sm opacity-70">Chain ID: 11155111</p>
              </div>
            ) : (
              <div>
                <p className="mb-4 text-green-400">✅ Connected to Sepolia</p>
                <p className="text-sm opacity-70 mb-4">
                  Account: {accounts?.[0]?.slice(0, 6)}...{accounts?.[0]?.slice(-4)}
                </p>
                <button 
                  onClick={() => setGameState('element-selection')}
                  className="btn-anime w-full"
                >
                  🚀 Start Game
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Element Selection Screen */}
      {gameState === 'element-selection' && (
        <div className="absolute inset-0 grid place-items-center bg-black/40">
          <div className="uibox grid gap-3 p-4">
            <div className="text-base">Choose your element</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                {k:0, label:'FIRE',  emoji:'🔥'},
                {k:1, label:'WATER', emoji:'💧'},
                {k:2, label:'WOOD',  emoji:'🍃'},
              ].map(x=>(
                <button key={x.k} className="tile text-sm" onClick={()=>setElem(x.k as Elem)}>
                  <div className="text-2xl">{x.emoji}</div>
                  <div className="mt-1">{x.label}</div>
                </button>
              ))}
            </div>
            <div className="text-[12px] opacity-70">Bot element stays hidden</div>
            {elem !== null && (
              <button 
                onClick={startGame}
                className="btn-anime w-full mt-2"
              >
                ⚔️ Start Battle
              </button>
            )}
          </div>
        </div>
      )}

      {/* Game UI */}
      {gameState === 'playing' && (
        <>
          {/* Round & top HUD */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2">
            <div className="uibox dark text-sm px-4 py-1">Round {round}</div>
          </div>

          {/* Skill bar */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 grid grid-cols-3 gap-3">
            <button className="btn-anime" disabled={!!winner||busy} onClick={()=>play(0)}><span>✂️</span> Slash</button>
            <button className="btn-anime" disabled={!!winner||busy} onClick={()=>play(1)}><span>📏</span> Thrust</button>
            <button className="btn-anime" disabled={!!winner||busy} onClick={()=>play(2)}><span>💥</span> Bash</button>
          </div>
        </>
      )}

      {/* Winner Screen */}
      {gameState === 'finished' && winner && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="uibox text-center px-5 py-3 text-base">
            <div className="text-2xl mb-2">{winner}</div>
            <button 
              onClick={() => {
                setGameState('connecting');
                setMyHP(100);
                setOppHP(100);
                setRound(1);
                setElem(null);
              }}
              className="btn-anime mt-2"
            >
              🔄 Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- PIXI scene ---------------- */

function fit(app: PIXI.Application, el: HTMLElement) {
  const s = Math.min(el.clientWidth / W, el.clientHeight / H); // CONTAIN
  app.stage.scale.set(s);

  const css = app.canvas as HTMLCanvasElement; // PIXI v8
  css.style.position = 'absolute';
  css.style.width  = `${W * s}px`;
  css.style.height = `${H * s}px`;
  css.style.left   = `${(el.clientWidth  - W * s) / 2}px`;
  css.style.top    = `${(el.clientHeight - H * s) / 2}px`;
}

function buildScene(app: PIXI.Application) {
  const root = new PIXI.Container();
  app.stage.addChild(root);

  // --- BG & Floor ---
  const bg = new PIXI.Container(); root.addChild(bg);
  const stars = new PIXI.Container(); bg.addChild(stars);
  for (let i=0;i<80;i++){
    const g = new PIXI.Graphics().circle(0,0, Math.random()*1.2+0.6).fill(0xffffff);
    g.x = Math.random()*W; g.y = Math.random()*H; g.alpha = 0.25 + Math.random()*0.45;
    stars.addChild(g);
  }
  const floor = new PIXI.Graphics()
    .roundRect(LAYOUT.PAD_X, LAYOUT.GROUND_Y - 5, W - LAYOUT.PAD_X*2, Math.round(H*0.1), 24)
    .fill(0x0d1426);
  floor.alpha = 0.85; bg.addChild(floor);

  // --- Arena & Chibi ---
  const arena = new PIXI.Container(); root.addChild(arena);
  const hero = makeChibi(0x4c70ff);
  const opp  = makeChibi(0xff6a6a, true);

  hero.position.set(POS.HERO_X, LAYOUT.GROUND_Y);
  opp.position.set(POS.OPP_X, LAYOUT.GROUND_Y);
  arena.addChild(hero.view, opp.view);

  // Idle bob (tịnh tiến quanh GROUND_Y)
  let t = 0; app.ticker.add((tk)=>{
    t += tk.deltaTime/60;
    hero.view.y = LAYOUT.GROUND_Y + Math.sin(t*2)*2;
    opp.view.y  = LAYOUT.GROUND_Y + Math.sin(t*2 + Math.PI)*2;
    hero.idle(t); opp.idle(t);
  });

  // --- HP bars đối xứng quanh MID_X ---
  const BAR_W = Math.round(W * 0.32);
  const BAR_H = 16;
  const hpA = makeHpBar(POS.MID_X - BAR_W - 24, 40, BAR_W, BAR_H);
  const hpB = makeHpBar(POS.MID_X + 24,          40, BAR_W, BAR_H, true);
  root.addChild(hpA.view, hpB.view);

  return { root, arena, hero, opp, hpA, hpB };
}

/* ---------- Chibi rig ---------- */
function makeChibi(color: number, flip = false) {
  const view = new PIXI.Container();
  view.sortableChildren = true;
  view.pivot.set(0, 50); // 50 ≈ nửa chiều cao thân (vẽ từ -50..+50)

  const body = new PIXI.Graphics().roundRect(-36,-50,72,100,18).fill(color);
  body.zIndex = 0; view.addChild(body);

  // head
  const head = new PIXI.Graphics().roundRect(-30,-92,60,48,16).fill(0xfff3ea);
  head.zIndex = 2; view.addChild(head);

  // hair
  const hair = new PIXI.Graphics(); hair.zIndex = 1;
  hair.roundRect(-34,-96,68,22,12).fill(0x1a2540);
  // Draw triangle shapes manually using moveTo/lineTo
  hair.moveTo(-18,-75).lineTo(0,-60).lineTo(-8,-50).closePath().fill(0x1a2540);
  hair.moveTo(18,-75).lineTo(0,-60).lineTo(8,-50).closePath().fill(0x1a2540);
  view.addChild(hair);

  // eyes (blink)
  const eyeL = new PIXI.Graphics().roundRect(-14,-72,12,10,4).fill(0x222);
  const eyeR = new PIXI.Graphics().roundRect(  2,-72,12,10,4).fill(0x222);
  eyeL.zIndex = eyeR.zIndex = 3; view.addChild(eyeL, eyeR);

  // arm (weapon hand)
  const arm = new PIXI.Graphics().roundRect(-6,-10,12,36,6).fill(0xffdfcf);
  arm.pivot.set(0,0); arm.position.set(24,-34); arm.zIndex = 4; view.addChild(arm);

  // "weapon" (katana) – line
  const blade = new PIXI.Graphics();
  blade.lineStyle(3, 0xeaeaff).moveTo(0,0).lineTo(28,0);
  blade.position.set(36,-18); blade.zIndex = 4; view.addChild(blade);

  if (flip) { view.scale.x = -1; }

  // API
  const idle = (t:number) => {
    // Không đụng vào view.y nữa - bobbing được xử lý ở buildScene
    const bl = (Math.sin(t*3.2)+1)/2; const open = 1 - (bl<0.05?1:0); // blink ngắn
    eyeL.height = open?10:2; eyeR.height = open?10:2;
  };

  const hit = () => {
    // tiny shake
    const s = view; let life = 10;
    const fn = (ticker: PIXI.Ticker) => { if (life--<=0){ PIXI.Ticker.shared.remove(fn); s.position.x = 0; return; } s.position.x = (Math.random()-0.5)*4; };
    PIXI.Ticker.shared.add(fn);
  };

  const attack = (s:Skill) => {
    // swing arm + blade
    const startRot = -0.6, endRot = 0.9;
    let t = 0;
    const dur = 0.38;
    const fn = (ticker: PIXI.Ticker) => {
      const dt = ticker.deltaTime;
      t += dt/60;
      const p = Math.min(1, t/dur);
      const ease = 1 - Math.pow(1-p, 3);
      (arm as any).rotation = startRot + (endRot-startRot)*ease;
      blade.rotation = (arm as any).rotation;
      if (p>=1){ PIXI.Ticker.shared.remove(fn); setTimeout(()=>{ (arm as any).rotation = -0.2; blade.rotation = -0.2; }, 80); }
    };
    PIXI.Ticker.shared.add(fn);
  };

  return { view, position: view.position, idle, hit, attack };
}

/* ---------- HP bar ---------- */
function makeHpBar(x:number, y:number, w:number, h:number, right=false) {
  const view = new PIXI.Container(); view.position.set(x,y);
  const bg = new PIXI.Graphics().roundRect(0,0,w,h,8).fill(0x0e1b33);
  const border = new PIXI.Graphics().roundRect(0,0,w,h,8).stroke({ width:2, color:0x0b1220 });
  const bar = new PIXI.Graphics().roundRect(2,2,w-4,h-4,6).fill(0x67e56e);
  view.addChild(bg, bar, border);
  let cur = 100;
  const set = (pct:number)=>{
    const to = Math.max(0, Math.min(100, pct));
    const from = cur; const start = performance.now(); const dur = 160;
    const step = (now:number)=>{
      const p=Math.min(1,(now-start)/dur);
      cur = from + (to-from)*p;
      const ww = Math.floor((w-4)*cur/100);
      bar.width = Math.max(0, ww);
      if (right) bar.position.x = (w-4) - ww; else bar.position.x = 2;
      bar.tint = cur>50?0x67e56e: (cur>25?0xf4c95a:0xe36b6b);
      if (p<1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  set(100);
  return { view, set };
}

/* ---------- VFX ---------- */
function vfxSlash(sc: ReturnType<typeof buildScene>) {
  const g = new PIXI.Graphics(); sc.arena.addChild(g);
  let t=0, dur=0.32;
  const y = LAYOUT.GROUND_Y - 40;
  const from = POS.HERO_X + 40, to = POS.OPP_X - 40;
  const tick = (tk: PIXI.Ticker) => {
    t += tk.deltaTime/60;
    const p = Math.min(1, t/dur);
    g.clear();
    g.lineStyle(10*(1-p), 0xffffff, .9);
    const cx = from + (to-from)*p;
    g.arc(cx, y, Math.min(120, (to-from)*0.35), -1.2, -0.2);
    if (p>=1){ g.destroy(); PIXI.Ticker.shared.remove(tick); }
  };
  PIXI.Ticker.shared.add(tick);
}

function vfxThrust(sc: ReturnType<typeof buildScene>) {
  const g = new PIXI.Graphics(); sc.arena.addChild(g);
  let t=0, dur=0.30;
  const y = LAYOUT.GROUND_Y - 30;
  const x0 = POS.HERO_X + 50, x1 = POS.OPP_X - 50;
  const tick = (tk: PIXI.Ticker)=>{
    t += tk.deltaTime/60;
    const p = Math.min(1, t/dur);
    g.clear();
    g.lineStyle(6, 0xeaeaff, .95).moveTo(x0, y).lineTo(x0 + (x1-x0)*p, y);
    g.lineStyle(2, 0xbfd1ff, .7);
    for (let i=0;i<4;i++){ const yy = y-20 + i*10; g.moveTo(x0+20*p,yy).lineTo(x0+50*p,yy); }
    if (p>=1){ g.destroy(); PIXI.Ticker.shared.remove(tick); }
  };
  PIXI.Ticker.shared.add(tick);
}

function vfxBash(sc: ReturnType<typeof buildScene>) {
  const circle = new PIXI.Graphics(); sc.arena.addChild(circle);
  let t=0, dur=0.38;
  const cx = POS.OPP_X - 20, cy = LAYOUT.GROUND_Y - 20;
  const tick = (tk: PIXI.Ticker)=>{
    t += tk.deltaTime/60;
    const p = Math.min(1, t/dur); const r = 20 + (POS.OPP_X-POS.HERO_X)*0.22*p;
    circle.clear().lineStyle(8*(1-p), 0xffe29b, .9).drawCircle(cx, cy, r);
    const sAmt = (1-p)*2; sc.root.position.set((Math.random()-0.5)*sAmt,(Math.random()-0.5)*sAmt);
    if (p>=1){ circle.destroy(); PIXI.Ticker.shared.remove(tick); sc.root.position.set(0,0); }
  };
  PIXI.Ticker.shared.add(tick);
}
