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
  rotation: number;
};

export type RemotePlayer = {
  id: string;
  type: 'remote-player';
  position: Position;
  targetPosition: Position; // For smooth interpolation
  rotation: number;
  targetRotation: number; // For smooth interpolation
  nickname: string;
  health: number;
};

export type GameEntity = WorldObject | Player | RemotePlayer;

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

export type GameState = 'menu' | 'mode-select' | 'connecting' | 'playing' | 'paused' | 'settings';

// FIX: Added PeerJSDataConnection type to resolve import error in OnlineLobby.tsx
export type PeerJSDataConnection = {
  on(event: 'data' | 'open' | 'close' | 'error', cb: (data?: any) => void): void;
  send(data: any): void;
  close(): void;
  open: boolean;
  peer: string;
};
