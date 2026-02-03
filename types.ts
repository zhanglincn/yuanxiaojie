
export enum GameState {
  START,
  PLAYING,
  GAME_OVER,
  VICTORY_POLE,       // Sliding down the pole
  VICTORY_WALK,       // Walking to the castle
  VICTORY_CELEBRATION // Final screen
}

export interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
}

export interface Player extends Entity {
  score: number;
  coins: number;
  lives: number; // 玩家生命值
  onGround: boolean;
  jumpCharge: number;
  facingRight: boolean;
  isCrouching: boolean;
  invincible: number;
}

export interface Obstacle extends Entity {
  type: 'obstacle';
  text: string;
  startX: number;
  range: number;
  direction: number;
  dead: boolean;
  deadTimer: number;
}

export interface Coin extends Entity {
  type: 'coin';
  text: string;
  collected: boolean;
  collectAnim: number; // 0 to 1 for the floating animation
  rotation: number;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'ground' | 'brick' | 'pipe' | 'castle';
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number; // 0 to 1 life progress
  color: string;
}

export interface GameAssets {
  jump: () => void;
  coin: () => void;
  hurt: () => void;
  bells: () => void;
  festive: () => void;
}
