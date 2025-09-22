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

/**
 * Represents the PeerJS DataConnection object for type-safe communication.
 */
export interface PeerJSDataConnection {
  on(event: 'data', callback: (data: any) => void): this;
  on(event: 'open', callback: () => void): this;
  on(event: 'close', callback: () => void): this;
  on(event: 'error', callback: (err: Error) => void): this;
  send(data: any): void;
  close(): void;
  open: boolean;
  peer: string;
  label: string;
  reliable: boolean;
  serialization: string;
  type: string;
  metadata: any;
}
