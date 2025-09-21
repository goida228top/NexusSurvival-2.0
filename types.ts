export type Position = { x: number; y: number };

export type WorldObject = {
  id: number;
  type: 'tree' | 'rock';
  position: Position;
  health: number;
  emoji: string;
  size: number;
  hitbox?: { width: number; height: number; offsetY: number };
};

export type Player = {
  id: 'player';
  type: 'player';
  position: Position;
};

export type GameEntity = WorldObject | Player;

export type InventoryItemType = 'wood' | 'stone';

export type InventoryItem = {
  type: InventoryItemType;
  quantity: number;
};

export type GameSettings = {
  joystickSize: number;
  buttonSize: number;
  inventorySize: number;
  showFps: boolean;
  showHitboxes: boolean;
};

export type GameState = 'menu' | 'mode-select' | 'online-lobby' | 'playing' | 'paused' | 'settings';
