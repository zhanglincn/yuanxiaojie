
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Player, Platform, Obstacle, Coin, FloatingText } from './types';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, TILE_SIZE, 
  GRAVITY, MAX_FALL_SPEED, PLAYER_SPEED, PLAYER_ACCEL, 
  FRICTION, JUMP_STRENGTH, MAX_JUMP_CHARGE, 
  INVINCIBILITY_TIME, OBSTACLE_TEXTS, COIN_TEXTS 
} from './constants';
import { audioService } from './services/audioService';

interface SkyLantern {
  x: number;
  y: number;
  speed: number;
  size: number;
  flicker: number;
  drift: number;
}

interface CollectedEffect {
  x: number;
  y: number;
  text: string;
  subText?: string;
  life: number;
  type: 'coin' | 'monster';
  rotation?: number;
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(400);
  const [coins, setCoins] = useState(0);
  const [lives, setLives] = useState(3);

  const playerRef = useRef<Player>({
    x: 100, y: 300, width: 34, height: 46,
    vx: 0, vy: 0, score: 0, coins: 0, lives: 3,
    onGround: false, jumpCharge: 0, facingRight: true,
    isCrouching: false, invincible: 0
  } as Player);

  const cameraX = useRef(0);
  const platforms = useRef<Platform[]>([]);
  const obstacles = useRef<Obstacle[]>([]);
  const coinsList = useRef<Coin[]>([]);
  const skyLanterns = useRef<SkyLantern[]>([]);
  const collectedEffects = useRef<CollectedEffect[]>([]);
  const keys = useRef<{ [key: string]: boolean }>({});
  
  const victoryTargetX = useRef(0);
  const flagpoleX = useRef(0);
  const groundYLevel = CANVAS_HEIGHT - TILE_SIZE * 2;
  const victoryLanternY = useRef(0);
  const victoryLanternTargetY = 80;

  const COIN_SIZE = 31;

  const spawnCollectedEffect = (x: number, y: number, text: string, type: 'coin' | 'monster', rotation?: number, subText?: string) => {
    collectedEffects.current.push({ x, y, text, subText, life: 1.0, type, rotation });
  };

  const spawnSkyLanterns = useCallback(() => {
    const lanterns: SkyLantern[] = [];
    for (let i = 0; i < 100; i++) {
      lanterns.push({
        x: Math.random() * CANVAS_WIDTH,
        y: CANVAS_HEIGHT + Math.random() * (CANVAS_HEIGHT * 1.5),
        speed: 0.3 + Math.random() * 1.0,
        size: 12 + Math.random() * 15,
        flicker: Math.random() * Math.PI * 2,
        drift: Math.random() * 0.4 - 0.2
      });
    }
    skyLanterns.current = lanterns;
  }, []);

  const initLevel = useCallback(() => {
    const p: Platform[] = [];
    for (let i = 0; i < 250; i++) {
      p.push({ x: i * TILE_SIZE, y: CANVAS_HEIGHT - TILE_SIZE * 2, width: TILE_SIZE, height: TILE_SIZE * 2, type: 'ground' });
    }
    for (let i = 15; i < 220; i += 12) {
      p.push({ x: i * TILE_SIZE, y: CANVAS_HEIGHT - TILE_SIZE * 5, width: TILE_SIZE, height: TILE_SIZE, type: 'brick' });
      if (Math.random() > 0.4) {
        p.push({ x: (i + 1) * TILE_SIZE, y: CANVAS_HEIGHT - TILE_SIZE * 5, width: TILE_SIZE, height: TILE_SIZE, type: 'brick' });
      }
    }
    
    flagpoleX.current = 210 * TILE_SIZE;
    const castleX = 220 * TILE_SIZE;
    const castleWidth = TILE_SIZE * 6;
    const castleHeight = TILE_SIZE * 8;
    p.push({ x: castleX, y: CANVAS_HEIGHT - TILE_SIZE * 10, width: castleWidth, height: castleHeight, type: 'castle' });
    victoryTargetX.current = castleX + (castleWidth / 2);
    platforms.current = p;

    const obs: Obstacle[] = [];
    for (let i = 30; i < 200; i += 25) {
      obs.push({
        type: 'obstacle',
        x: i * TILE_SIZE,
        y: CANVAS_HEIGHT - TILE_SIZE * 3.1,
        width: 32, height: 32,
        vx: 1.5, vy: 0,
        startX: i * TILE_SIZE,
        range: 120 + Math.random() * 100,
        direction: 1,
        dead: false,
        deadTimer: 0,
        text: OBSTACLE_TEXTS[Math.floor(Math.random() * OBSTACLE_TEXTS.length)]
      });
    }
    obstacles.current = obs;

    const c: Coin[] = [];
    for (let i = 20; i < 205; i += 10) {
      c.push({
        type: 'coin',
        x: i * TILE_SIZE,
        y: CANVAS_HEIGHT - TILE_SIZE * (Math.random() > 0.5 ? 6.5 : 3.5),
        width: COIN_SIZE, height: COIN_SIZE,
        vx: 0, vy: 0,
        collected: false,
        collectAnim: 0,
        rotation: 0,
        text: COIN_TEXTS[Math.floor(Math.random() * COIN_TEXTS.length)]
      });
    }
    coinsList.current = c;
    collectedEffects.current = [];
    skyLanterns.current = [];
    victoryLanternY.current = groundYLevel - TILE_SIZE * 8;
  }, []);

  const resetGame = () => {
    playerRef.current = {
      x: 100, y: 300, width: 34, height: 46,
      vx: 0, vy: 0, score: 0, coins: 0, lives: 3,
      onGround: false, jumpCharge: 0, facingRight: true,
      isCrouching: false, invincible: 0
    };
    cameraX.current = 0;
    setTime(400);
    setScore(0);
    setCoins(0);
    setLives(3);
    initLevel();
    setGameState(GameState.PLAYING);
  };

  useEffect(() => {
    let timer: number;
    if (gameState === GameState.PLAYING) {
      timer = window.setInterval(() => {
        setTime(prev => {
          if (prev <= 1) {
            setGameState(GameState.GAME_OVER);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      keys.current[e.key] = true; 
      audioService.init(); 
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && playerRef.current.onGround && gameState === GameState.PLAYING) {
        const power = Math.min(playerRef.current.jumpCharge / MAX_JUMP_CHARGE, 1);
        playerRef.current.vy = JUMP_STRENGTH * (1 + power * 0.4);
        playerRef.current.onGround = false;
        playerRef.current.jumpCharge = 0;
        audioService.playJump();
      }
      keys.current[e.key] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  useEffect(() => {
    let frameId: number;
    const update = () => {
      const p = playerRef.current;
      if (gameState === GameState.PLAYING) {
        if (keys.current['ArrowLeft']) { p.vx -= PLAYER_ACCEL; p.facingRight = false; }
        else if (keys.current['ArrowRight']) { p.vx += PLAYER_ACCEL; p.facingRight = true; }
        else { p.vx *= FRICTION; }
        
        if (keys.current['ArrowUp'] && p.onGround) { p.jumpCharge = Math.min(p.jumpCharge + 1, MAX_JUMP_CHARGE); }
        p.isCrouching = !!keys.current['ArrowDown'];
        p.vx = Math.max(Math.min(p.vx, PLAYER_SPEED), -PLAYER_SPEED);
        p.vy += GRAVITY;
        p.vy = Math.min(p.vy, MAX_FALL_SPEED);
        p.x += p.vx;
        p.y += p.vy;

        p.x = Math.max(p.x, 0);
        if (p.invincible > 0) p.invincible--;
        p.onGround = false;

        if (p.x + p.width > flagpoleX.current && p.x < flagpoleX.current + 8 && p.y < groundYLevel) {
            setGameState(GameState.VICTORY_POLE);
            audioService.playBells();
            p.vx = 0;
            p.x = flagpoleX.current - 12;
            spawnSkyLanterns();
        }

        platforms.current.forEach(plat => {
          if (p.x < plat.x + plat.width && p.x + p.width > plat.x &&
              p.y < plat.y + plat.height && p.y + p.height > plat.y) {
            const overlapX = Math.min(p.x + p.width - plat.x, plat.x + plat.width - p.x);
            const overlapY = Math.min(p.y + p.height - plat.y, plat.y + plat.height - p.y);
            if (overlapX < overlapY) {
              if (p.x < plat.x) p.x -= overlapX; else p.x += overlapX; p.vx = 0;
            } else {
              if (p.y < plat.y) { p.y -= overlapY; p.vy = 0; p.onGround = true; }
              else { p.y += overlapY; p.vy = 1; }
            }
          }
        });

        obstacles.current.forEach(obs => {
          if (obs.dead) return;
          obs.x += obs.vx * obs.direction;
          if (Math.abs(obs.x - obs.startX) > obs.range) obs.direction *= -1;
          if (p.x < obs.x + obs.width && p.x + p.width > obs.x &&
              p.y < obs.y + obs.height && p.y + p.height > obs.y) {
            if (p.vy > 0 && p.y + p.height < obs.y + obs.height / 2 + p.vy) {
              obs.dead = true; 
              obs.deadTimer = 20; 
              p.vy = -7; 
              setScore(s => s + 500); 
              spawnCollectedEffect(obs.x, obs.y, "+500", 'monster');
              audioService.playJump();
            } else if (p.invincible <= 0) {
              p.lives--;
              setLives(p.lives);
              if (p.lives <= 0) {
                setGameState(GameState.GAME_OVER);
              } else {
                p.invincible = INVINCIBILITY_TIME;
                p.vx = (p.x < obs.x) ? -4 : 4;
                audioService.playHurt();
              }
            }
          }
        });

        coinsList.current.forEach(coin => {
          if (!coin.collected &&
              p.x < coin.x + coin.width && p.x + p.width > coin.x &&
              p.y < coin.y + coin.height && p.y + p.height > coin.y) {
            coin.collected = true; 
            audioService.playCoin(); 
            setScore(prev => prev + 200); 
            setCoins(prev => prev + 1);
            spawnCollectedEffect(coin.x, coin.y, coin.text, 'coin', coin.rotation, "+200");
          }
          coin.rotation += 0.08;
        });

        collectedEffects.current = collectedEffects.current.filter(e => {
          e.y -= 1.8;
          e.life -= 0.015;
          return e.life > 0;
        });

        let targetCamX = p.x - CANVAS_WIDTH / 2; 
        cameraX.current = Math.max(0, targetCamX);
        const levelWidth = 250 * TILE_SIZE;
        cameraX.current = Math.min(cameraX.current, levelWidth - CANVAS_WIDTH);

        if (p.y > CANVAS_HEIGHT) { 
          p.lives--;
          setLives(p.lives);
          if (p.lives <= 0) {
            setGameState(GameState.GAME_OVER); 
          } else {
            // 掉落惩罚：重置位置到起始点或上一个安全点
            p.x = 100;
            p.y = 300;
            p.vx = 0;
            p.vy = 0;
            p.invincible = INVINCIBILITY_TIME;
            audioService.playHurt();
          }
        }
      } 
      else if (gameState === GameState.VICTORY_POLE || gameState === GameState.VICTORY_WALK || gameState === GameState.VICTORY_CELEBRATION) {
          if (victoryLanternY.current > victoryLanternTargetY) {
            victoryLanternY.current -= 1.5;
          }

          if (gameState === GameState.VICTORY_POLE) {
            p.vy = 2.5; p.y += p.vy;
            if (p.y + p.height >= groundYLevel) {
                p.y = groundYLevel - p.height;
                setGameState(GameState.VICTORY_WALK);
            }
          }
          else if (gameState === GameState.VICTORY_WALK) {
            p.x += 2; p.facingRight = true;
            if (p.x >= victoryTargetX.current) { 
              p.vx = 0; 
              setGameState(GameState.VICTORY_CELEBRATION); 
              audioService.playFestive();
            }
          }
      }

      skyLanterns.current.forEach(l => {
        l.y -= l.speed;
        l.x += l.drift + Math.sin(Date.now() / 1500 + l.flicker) * 0.5;
        l.flicker += 0.05;
        if (l.y < -150 && (gameState === GameState.START || gameState === GameState.PLAYING)) {
          l.y = CANVAS_HEIGHT + 20;
          l.x = Math.random() * CANVAS_WIDTH;
        }
      });

      draw();
      frameId = requestAnimationFrame(update);
    };

    const drawPhotoBrick = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
        ctx.fillStyle = '#b83218'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x + w, y);
        ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
        ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h);
        ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h / 2);
        ctx.moveTo(x + w / 4, y + h / 2); ctx.lineTo(x + w / 4, y + h);
        ctx.moveTo(x + 3 * w / 4, y + h / 2); ctx.lineTo(x + 3 * w / 4, y + h);
        ctx.moveTo(x, y); ctx.lineTo(x, y + h);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(x + 2, y + 2, w / 2 - 4, 3);
    };

    // 更新角色样式以匹配参考图
    const drawRobotCat = (ctx: CanvasRenderingContext2D, p: Player) => {
      if (p.invincible % 10 < 5) {
        ctx.save();
        const bounce = Math.sin(Date.now() / 200) * 1.5;
        // 平移到角色中心并处理跳跃晃动
        ctx.translate(p.x + p.width / 2, p.y + p.height / 2 + bounce);
        if (!p.facingRight) ctx.scale(-1, 1);
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;

        // --- 1. 身体 (白色长方形，带特定青色块) ---
        ctx.fillStyle = '#ffffff';
        // 身体矩形居中下方
        ctx.fillRect(-15, 0, 30, 32);
        ctx.strokeRect(-15, 0, 30, 32);
        
        // 身体上的青色方块样式
        ctx.fillStyle = '#33ccff';
        // 左上角块
        ctx.fillRect(-15, 8, 8, 8);
        // 右上角块
        ctx.fillRect(7, 8, 8, 8);
        // 左下角长条块
        ctx.fillRect(-15, 24, 16, 8);

        // --- 2. 头部 (大方盒子) ---
        // 耳朵 (尖型)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-18, -32); ctx.lineTo(-24, -48); ctx.lineTo(-6, -32); ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(18, -32); ctx.lineTo(24, -48); ctx.lineTo(6, -32); ctx.fill(); ctx.stroke();

        // 头部方框
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-24, -36, 48, 36);
        ctx.strokeRect(-24, -36, 48, 36);
        
        // 深蓝色屏幕
        ctx.fillStyle = '#1a237e';
        ctx.fillRect(-20, -32, 40, 28);
        
        // 额头绿色指示灯
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(-4, -42, 8, 8);

        // 眼睛 (青色 A 字形像素)
        ctx.fillStyle = '#33ccff';
        // 左眼
        ctx.beginPath(); ctx.moveTo(-14, -14); ctx.lineTo(-10, -22); ctx.lineTo(-6, -14); ctx.fill();
        // 右眼
        ctx.beginPath(); ctx.moveTo(6, -14); ctx.lineTo(10, -22); ctx.lineTo(14, -14); ctx.fill();

        ctx.restore();
      }
    };

    const drawGoldCoin = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rot: number, opacity: number = 1, text?: string) => {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(Math.cos(rot), 1);
        ctx.globalAlpha = opacity;
        const radius = w / 2;
        ctx.fillStyle = COLORS.COIN_BASE;
        ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = COLORS.COIN_SHADOW; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
        if (text) drawLabel(ctx, x + w / 2, y - 18, text, '#ffd700', false, true, opacity, 10);
    };

    const drawMonster = (ctx: CanvasRenderingContext2D, obs: Obstacle, opacity: number = 1) => {
        ctx.save();
        const wobble = Math.sin(Date.now() / 120) * 2;
        ctx.translate(obs.x + obs.width/2, obs.y + obs.height/2);
        ctx.globalAlpha = opacity;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-10, -20 + wobble, 4, 4);
        ctx.fillRect(6, -20 + wobble, 4, 4);

        ctx.fillStyle = '#9c27b0';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.fillRect(-16, -16 + wobble, 32, 32);
        ctx.strokeRect(-16, -16 + wobble, 32, 32);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-12, -8 + wobble, 10, 10);
        ctx.fillRect(2, -8 + wobble, 10, 10);
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(-6, -2 + wobble, 4, 4);
        ctx.fillRect(8, -2 + wobble, 4, 4);

        ctx.restore();
        drawLabel(ctx, obs.x + obs.width / 2, obs.y - 18 + wobble, obs.text, '#ffffff', false, true, opacity, 9);
    };

    const drawLabel = (ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string = '#ffffff', flicker: boolean = false, shadow: boolean = true, opacity: number = 1, size: number = 10) => {
        if (flicker && Math.sin(Date.now() / 50) > 0) return;
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
        ctx.font = `${size}px "Press Start 2P"`;
        ctx.textAlign = 'center';
        if (shadow) { ctx.shadowBlur = 3; ctx.shadowColor = 'rgba(0,0,0,0.8)'; }
        ctx.fillText(text, x, y);
        ctx.restore();
    };

    const drawStaticRectLantern = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number = 32, h: number = 44) => {
      ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#ff1100'; ctx.fillRect(-w/2, -h/2, w, h);
      ctx.fillStyle = '#ffd700'; ctx.fillRect(-w/2, -h/2, w, 6); ctx.fillRect(-w/2, h/2 - 6, w, 6);
      ctx.restore();
    };

    const drawBush = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number) => {
      ctx.save(); ctx.translate(x, y); const arcRadius = 25; ctx.fillStyle = '#71c137'; ctx.strokeStyle = '#005a00'; ctx.lineWidth = 3;
      const drawPart = (ox: number, oy: number, r: number) => { ctx.beginPath(); ctx.arc(ox, oy, r, Math.PI, 0); ctx.fill(); ctx.stroke(); ctx.fillRect(ox - r, oy, r * 2, 5); };
      drawPart(0, 0, arcRadius); drawPart(25, -10, arcRadius * 1.2); drawPart(55, 0, arcRadius); ctx.restore();
    };

    const drawHill = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
      ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#008b00'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(50, -80, 100, 0); ctx.fill(); ctx.stroke(); ctx.restore();
    };

    const draw = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = COLORS.SKY; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      skyLanterns.current.forEach(l => {
          const f = Math.sin(l.flicker) * 0.2 + 0.8;
          ctx.save(); ctx.translate(l.x, l.y); ctx.fillStyle = 'rgba(150, 40, 0, 0.9)'; ctx.beginPath();
          ctx.moveTo(-l.size/2, -l.size/2); ctx.lineTo(l.size/2, -l.size/2); ctx.lineTo(l.size/1.3, l.size/2); ctx.lineTo(-l.size/1.3, l.size/2); ctx.closePath(); ctx.fill();
          ctx.fillStyle = `rgba(255, 190, 60, ${f})`; ctx.beginPath(); ctx.moveTo(-l.size/4, -l.size/6); ctx.lineTo(l.size/4, -l.size/6); ctx.lineTo(l.size/3, l.size/3); ctx.lineTo(-l.size/3, l.size/3); ctx.closePath(); ctx.fill(); ctx.restore();
      });

      ctx.save(); ctx.translate(-cameraX.current, 0);
      
      for (let i = 0; i < 30; i++) {
        const cx = i * 350 + 100; 
        const cy = 80 + Math.sin(i * 1.2) * 30;
        ctx.fillStyle = '#fff'; 
        ctx.beginPath(); 
        ctx.arc(cx, cy, 20, 0, Math.PI * 2); 
        ctx.arc(cx + 25, cy - 8, 26, 0, Math.PI * 2); 
        ctx.arc(cx + 45, cy + 2, 20, 0, Math.PI * 2); 
        ctx.fill();

        if (i % 2 === 0) {
            drawStaticRectLantern(ctx, cx + 150, 60);
        }
      }

      for (let i = 0; i < 40; i++) { 
        drawHill(ctx, 80 + i * 240, groundYLevel); 
        drawBush(ctx, 180 + i * 240, groundYLevel, 80); 
      }

      platforms.current.forEach(plat => {
        for (let tx = 0; tx < plat.width; tx += TILE_SIZE) {
          for (let ty = 0; ty < plat.height; ty += TILE_SIZE) { if (plat.type !== 'castle') drawPhotoBrick(ctx, plat.x + tx, plat.y + ty, TILE_SIZE, TILE_SIZE); }
        }
        if (plat.type === 'castle') {
            const h = plat.height; const w = plat.width; const y = plat.y; const x = plat.x;
            ctx.fillStyle = '#b83218'; ctx.fillRect(x, y + h*0.4, w, h*0.6); ctx.fillRect(x+w*0.15, y, w*0.7, h*0.4);
            ctx.fillStyle = '#000'; ctx.fillRect(x + w/2 - 24, y + h - 50, 48, 50); ctx.beginPath(); ctx.arc(x+w/2, y+h-50, 24, Math.PI, 0); ctx.fill();
        }
      });

      const poleX = flagpoleX.current; const poleTop = groundYLevel - TILE_SIZE * 8;
      ctx.fillStyle = '#888'; ctx.fillRect(poleX, poleTop, 6, groundYLevel - poleTop);
      ctx.fillStyle = '#ff1100'; ctx.beginPath(); ctx.arc(poleX+3, poleTop-12, 14, 0, Math.PI*2); ctx.fill();
      if (gameState === GameState.VICTORY_POLE || gameState === GameState.VICTORY_WALK || gameState === GameState.VICTORY_CELEBRATION) drawStaticRectLantern(ctx, poleX + 3, victoryLanternY.current, 36, 48);

      obstacles.current.forEach(obs => { if (!obs.dead) drawMonster(ctx, obs); });
      coinsList.current.forEach(coin => { if (!coin.collected) drawGoldCoin(ctx, coin.x, coin.y, coin.width, coin.height, coin.rotation, 1, coin.text); });
      
      collectedEffects.current.forEach(e => {
        const opacity = e.life;
        if (e.type === 'coin') {
          drawLabel(ctx, e.x + COIN_SIZE/2, e.y - 12, e.text, '#ffd700', false, true, opacity, 11);
          if (e.subText) drawLabel(ctx, e.x + COIN_SIZE/2, e.y + 12, e.subText, '#ffffff', false, true, opacity, 14);
        } else drawLabel(ctx, e.x + 16, e.y, e.text, '#ffffff', false, true, opacity, 16);
      });

      // 修正参数顺序以匹配定义 (ctx, player)
      drawRobotCat(ctx, playerRef.current.lives <= 0 ? { ...playerRef.current, invincible: 0 } : playerRef.current);
      ctx.restore();
    };

    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [gameState, initLevel, spawnSkyLanterns]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white select-none">
      <div className="relative border-4 border-gray-800 shadow-2xl overflow-hidden rounded-lg">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="bg-transparent" />

        <div className="absolute top-4 left-0 w-full px-12 flex justify-between items-start z-10 font-['Press_Start_2P'] pointer-events-none">
          <div className="flex flex-col gap-1">
            <span className="text-white text-[12px]">得分</span>
            <span className="text-white text-[18px] tracking-widest">{score.toString().padStart(6, '0')}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-white text-[12px]">生命值</span>
            <div className="flex items-center gap-2">
              <span className="text-red-500 text-[18px]">❤</span>
              <span className={`text-[18px] ${playerRef.current.invincible > 0 ? 'text-red-400 animate-pulse' : 'text-white'}`}>x{lives}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
             <div className="flex flex-col items-end">
                <span className="text-white text-[12px]">金币 x{coins.toString().padStart(2, '0')}</span>
                <span className="text-white text-[12px]">倒计时</span>
                <span className={`text-[18px] ${time < 50 ? "text-red-500 animate-pulse" : "text-white"}`}>{time}s</span>
             </div>
          </div>
        </div>

        {gameState === GameState.START && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-20">
            <h1 className="text-4xl mb-4 text-yellow-500 animate-pulse text-center leading-tight">百小望元宵节大冒险</h1>
            <p className="text-white text-[14px] mt-4 opacity-90 font-bold tracking-widest">BaiwangAI Xiaowang</p>
            <button onClick={() => { audioService.init(); resetGame(); }} className="mt-12 bg-red-600 hover:bg-red-700 text-white px-10 py-5 rounded-md border-b-4 border-red-900 transition-transform active:translate-y-1 text-lg font-bold">立即启航</button>
            <div className="mt-12 text-[9px] text-gray-400 text-center space-y-2">
                <p>方向键 [←][→] 左右移动 | [↑] 按住蓄力跳跃</p>
                <p>3条生命，小心怪兽！掉落会扣除生命并重置。</p>
            </div>
          </div>
        )}

        {gameState === GameState.VICTORY_CELEBRATION && (
          <div className="absolute inset-0 bg-red-950/40 flex flex-col items-center justify-center z-30 backdrop-blur-sm">
             <div className="p-10 bg-black/80 border-4 border-yellow-500 rounded-3xl text-center shadow-[0_0_40px_rgba(255,215,0,0.4)]">
               <h1 className="text-4xl text-yellow-400 mb-6 font-['Press_Start_2P']">元宵节快乐!</h1>
               <div className="text-sm text-white space-y-4 mb-8">
                 <p className="text-yellow-100 text-lg">恭喜你完成冒险！</p>
                 <p>本次得分: <span className="text-yellow-400">{score}</span></p>
                 <p className="text-orange-300 text-[9px] animate-pulse">团圆中国年，百小望伴你行</p>
               </div>
               <button onClick={() => { setGameState(GameState.START); initLevel(); }} className="bg-yellow-500 hover:bg-yellow-600 text-red-900 px-8 py-3 rounded-full font-bold text-sm transition-transform hover:scale-105">再玩一局</button>
             </div>
          </div>
        )}

        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20">
            <h1 className="text-5xl mb-10 text-red-600 font-bold">冒险中止</h1>
            <p className="mb-8 text-gray-400">{time <= 0 ? "时间耗尽了！" : lives <= 0 ? "生命耗尽，再接再厉！" : "注意脚下，不要掉下去！"}</p>
            <button onClick={() => { setGameState(GameState.START); initLevel(); }} className="bg-gray-800 hover:bg-gray-700 text-white px-10 py-4 rounded border border-gray-600 text-lg">重新开始</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
