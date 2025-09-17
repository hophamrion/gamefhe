'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import * as PIXI from 'pixi.js';
import { useMetaMaskEthersSigner } from '@/hooks/metamask/useMetaMaskEthersSigner';

type Skill = 0|1|2; // 0 Slash, 1 Thrust, 2 Bash
type Elem  = 0|1|2; // 0 Fire, 1 Water, 2 Wood

const BASE_W = 640;
const BASE_H = 360;

// Bot AI logic
class BotAI {
  private element: Elem;
  private skillHistory: Skill[] = [];
  
  constructor() {
    // Bot chọn element ngẫu nhiên
    this.element = Math.floor(Math.random() * 3) as Elem;
  }
  
  getElement(): Elem {
    return this.element;
  }
  
  chooseSkill(playerElement: Elem, playerSkillHistory: Skill[]): Skill {
    // Simple AI: 30% random, 70% strategic
    if (Math.random() < 0.3) {
      return Math.floor(Math.random() * 3) as Skill;
    }
    
    // Strategic: Counter player's most used skill
    const skillCounts = [0, 0, 0];
    playerSkillHistory.forEach(skill => skillCounts[skill]++);
    const mostUsedSkill = skillCounts.indexOf(Math.max(...skillCounts)) as Skill;
    
    // Counter strategy: if player uses same skill often, use different one
    if (skillCounts[mostUsedSkill] > 2) {
      return ((mostUsedSkill + 1) % 3) as Skill;
    }
    
    return mostUsedSkill;
  }
}

export default function AnimeDuelGame() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const appRef  = useRef<PIXI.Application | null>(null);
  const sceneRef= useRef<{ root:PIXI.Container, bg:PIXI.Container, arena:PIXI.Container,
                           hero:PIXI.Container, opp:PIXI.Container,
                           hpA:{set:(v:number)=>void}, hpB:{set:(v:number)=>void} } | null>(null);
  
  // MetaMask connection
  const { isConnected, connect, accounts, chainId } = useMetaMaskEthersSigner();
  
  // Game state
  const [gameState, setGameState] = useState<'connecting' | 'element-selection' | 'playing' | 'finished'>('connecting');
  const [playerElement, setPlayerElement] = useState<Elem|null>(null);
  const [botElement, setBotElement] = useState<Elem|null>(null);
  const [myHP, setMyHP] = useState(100);
  const [oppHP, setOppHP] = useState(100);
  const [round, setRound] = useState(1);
  const [busy, setBusy] = useState(false);
  const [playerSkillHistory, setPlayerSkillHistory] = useState<Skill[]>([]);
  
  // Bot AI
  const botRef = useRef<BotAI | null>(null);

  // Initialize bot when game starts
  useEffect(() => {
    if (gameState === 'element-selection') {
      botRef.current = new BotAI();
      setBotElement(botRef.current.getElement());
    }
  }, [gameState]);

  // Initialize PIXI
  useEffect(() => {
    if (!wrapRef.current) return;

    const initPIXI = async () => {
      const app = new PIXI.Application();
      
      await app.init({
        width: BASE_W, 
        height: BASE_H, 
        backgroundAlpha: 0,
        antialias: true, 
        powerPreference: 'high-performance'
      });
      
      appRef.current = app;
      
      if (app.canvas && wrapRef.current) {
        app.canvas.style.width = '100%';
        app.canvas.style.height = '100%';
        app.canvas.style.display = 'block';
        wrapRef.current.appendChild(app.canvas);
      }

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
      const bgSprite = new PIXI.Sprite(grad);
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
      app.ticker.add((ticker)=> {
        const dt = ticker.deltaTime;
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
        const w = wrapRef.current.clientWidth;
        const h = wrapRef.current.clientHeight;
        
        // Resize PIXI renderer to match container
        app.renderer.resize(w, h);
        
        // Scale the root container to fit the screen while maintaining aspect ratio
        const scale = Math.min(w/BASE_W, h/BASE_H);
        root.scale.set(scale);
        
        // Center the content
        root.position.set(
          (w - BASE_W * scale) / 2,
          (h - BASE_H * scale) / 2
        );
      };
      onResize();
      let ro: ResizeObserver | null = null;
      if (wrapRef.current) {
        ro = new ResizeObserver(onResize); 
        ro.observe(wrapRef.current);
      }

      return () => { 
        if (ro) ro.disconnect(); 
        app.destroy(true); 
      };
    };

    initPIXI().catch(console.error);
  }, []);

  // Reflect HP to bars
  useEffect(()=>{
    sceneRef.current?.hpA.set(myHP);
    sceneRef.current?.hpB.set(oppHP);
  }, [myHP, oppHP]);

  // Check win condition
  const winner = useMemo(()=>{
    if (myHP<=0 && oppHP<=0) return 'DRAW';
    if (myHP<=0) return 'YOU LOSE';
    if (oppHP<=0) return 'YOU WIN';
    return null;
  }, [myHP,oppHP]);

  // Update game state based on winner
  useEffect(() => {
    if (winner) {
      setGameState('finished');
    }
  }, [winner]);

  // Calculate damage with element advantage
  const calculateDamage = (attackerElement: Elem, defenderElement: Elem, skill: Skill): number => {
    const baseDamage = [24, 32, 20][skill];
    let totalDamage = baseDamage;
    
    // Element advantage: +10 damage
    if ((attackerElement === 0 && defenderElement === 2) || // Fire beats Wood
        (attackerElement === 1 && defenderElement === 0) || // Water beats Fire
        (attackerElement === 2 && defenderElement === 1)) { // Wood beats Water
      totalDamage += 10;
    }
    
    return totalDamage;
  };

  // Player skill action
  const sendSkill = async (skill: Skill) => {
    if (busy || gameState !== 'playing' || myHP<=0 || oppHP<=0 || !botRef.current) return;
    setBusy(true);

    // Play VFX
    if (skill===0 && sceneRef.current) playSlash(sceneRef.current);     // Slash
    if (skill===1 && sceneRef.current) playThrust(sceneRef.current);    // Thrust
    if (skill===2 && sceneRef.current) playBash(sceneRef.current);      // Bash

    // Calculate player damage to bot
    const playerDamage = calculateDamage(playerElement!, botElement!, skill);
    
    // Bot chooses skill
    const botSkill = botRef.current.chooseSkill(playerElement!, playerSkillHistory);
    const botDamage = calculateDamage(botElement!, playerElement!, botSkill);
    
    // Apply damage after animation
    setTimeout(()=>{ 
      setOppHP(h => Math.max(0, h - playerDamage)); 
      setMyHP(h => Math.max(0, h - botDamage)); 
      setRound(r => r + 1);
      setPlayerSkillHistory(prev => [...prev, skill]);
      setBusy(false); 
    }, 380);
  };

  // Start game after element selection
  const startGame = () => {
    setGameState('playing');
  };

  // Connect MetaMask
  const handleConnect = () => {
    connect();
  };

  // Check if connected to correct network (Sepolia)
  const isCorrectNetwork = chainId === 11155111; // Sepolia

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Canvas holder */}
      <div ref={wrapRef} className="absolute inset-0" />

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
        <div className="absolute inset-0 bg-black/40 grid place-items-center">
          <div className="uibox grid gap-3 p-4">
            <div className="text-sm">Choose your element</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                {k:0,label:'FIRE',emoji:'🔥'},
                {k:1,label:'WATER',emoji:'💧'},
                {k:2,label:'WOOD',emoji:'🍃'},
              ].map(x=>(
                <button key={x.k} className="tile text-xs" onClick={()=>setPlayerElement(x.k as Elem)}>
                  <div className="text-2xl">{x.emoji}</div>
                  <div className="mt-1">{x.label}</div>
                </button>
              ))}
            </div>
            <div className="text-[11px] opacity-70">Bot element stays hidden</div>
            {playerElement !== null && (
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
          {/* Round badge */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2">
            <div className="uibox dark text-xs px-3 py-1 shadow">Round {round}</div>
          </div>

          {/* Skill buttons */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 grid grid-cols-3 gap-3">
            <button className="btn-anime" disabled={!!winner||busy} onClick={()=>sendSkill(0)}>
              <span className="text-lg">✂️</span><span>Slash</span>
            </button>
            <button className="btn-anime" disabled={!!winner||busy} onClick={()=>sendSkill(1)}>
              <span className="text-lg">📏</span><span>Thrust</span>
            </button>
            <button className="btn-anime" disabled={!!winner||busy} onClick={()=>sendSkill(2)}>
              <span className="text-lg">💥</span><span>Bash</span>
            </button>
          </div>
        </>
      )}

      {/* Winner Screen */}
      {gameState === 'finished' && winner && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="uibox text-center px-4 py-3 text-base">
            <div className="text-2xl mb-2">{winner}</div>
            <button 
              onClick={() => {
                setGameState('connecting');
                setMyHP(100);
                setOppHP(100);
                setRound(1);
                setPlayerElement(null);
                setBotElement(null);
                setPlayerSkillHistory([]);
                botRef.current = null;
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

/* ---------- helpers / VFX ---------- */

function makeGradientTexture(renderer: PIXI.Renderer, colors: string[]) {
  const canvas = document.createElement('canvas');
  canvas.width = 16; canvas.height = 256;
  const g = canvas.getContext('2d')!;
  const grd = g.createLinearGradient(0,0,0,256);
  const step = 1/(colors.length-1);
  colors.forEach((c,i)=>grd.addColorStop(i*step, c));
  g.fillStyle = grd; g.fillRect(0,0,16,256);
  return PIXI.Texture.from(canvas.toDataURL());
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
function playSlash(s: { root:PIXI.Container, bg:PIXI.Container, arena:PIXI.Container,
                        hero:PIXI.Container, opp:PIXI.Container,
                        hpA:{set:(v:number)=>void}, hpB:{set:(v:number)=>void} }) {
  const { arena } = s;
  const g = new PIXI.Graphics(); arena.addChild(g);
  let t=0;
  const tick = (ticker: PIXI.Ticker)=>{
    const dt = ticker.deltaTime;
    t += dt/60;
    const prog = Math.min(1, t/0.28);
    g.clear();
    g.lineStyle(8*(1-prog), 0xffffff, 0.9);
    const cx = 320 + 120*prog, cy = 210 - 20*Math.sin(prog*Math.PI);
    g.arc(cx, cy, 60, -1.2, -0.2);
    if (prog>=1){ g.destroy(); PIXI.Ticker.shared.remove(tick); }
  };
  PIXI.Ticker.shared.add(tick);
}

// Thrust: speed lines + tia đâm
function playThrust(s: { root:PIXI.Container, bg:PIXI.Container, arena:PIXI.Container,
                         hero:PIXI.Container, opp:PIXI.Container,
                         hpA:{set:(v:number)=>void}, hpB:{set:(v:number)=>void} }) {
  const { arena } = s;
  const beam = new PIXI.Graphics(); arena.addChild(beam);
  let t=0;
  const tick = (ticker: PIXI.Ticker)=>{
    const dt = ticker.deltaTime;
    t += dt/60;
    const prog = Math.min(1, t/0.28);
    const x0 = 220, x1 = 420;
    beam.clear();
    beam.lineStyle(6, 0xeaeaff, 0.95);
    beam.moveTo(x0, 220).lineTo(x0 + (x1-x0)*prog, 220);
    // speed lines
    beam.lineStyle(2, 0xd0d8ff, 0.7);
    for (let i=0;i<4;i++){
      const y = 200 + i*10;
      beam.moveTo(x0+30*prog, y).lineTo(x0+60*prog, y);
    }
    if (prog>=1){ beam.destroy(); PIXI.Ticker.shared.remove(tick); }
  };
  PIXI.Ticker.shared.add(tick);
}

// Bash: shockwave tròn + rung
function playBash(s: { root:PIXI.Container, bg:PIXI.Container, arena:PIXI.Container,
                       hero:PIXI.Container, opp:PIXI.Container,
                       hpA:{set:(v:number)=>void}, hpB:{set:(v:number)=>void} }) {
  const { arena, root } = s;
  const wave = new PIXI.Graphics(); arena.addChild(wave);
  let t=0;
  const tick = (ticker: PIXI.Ticker)=>{
    const dt = ticker.deltaTime;
    t += dt/60;
    const prog = Math.min(1, t/0.35);
    const r = 8 + 80*prog;
    wave.clear();
    wave.lineStyle(6*(1-prog), 0xffe4a8, 0.85);
    wave.drawCircle(500, 220, r);
    // shake
    const sAmt = (1-prog)*2;
    root.position.set(Math.random()*sAmt - sAmt/2, Math.random()*sAmt - sAmt/2);
    if (prog>=1){ wave.destroy(); PIXI.Ticker.shared.remove(tick); root.position.set(0,0); }
  };
  PIXI.Ticker.shared.add(tick);
}
