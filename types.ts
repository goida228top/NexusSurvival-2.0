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
  rotation: number;
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

export type GameState = 'menu' | 'mode-select' | 'online-lobby' | 'playing' | 'paused' | 'settings';

// Fix: Add PeerJSDataConnection type definition.
// This represents the DataConnection object from the PeerJS library.
// Since PeerJS is loaded from a CDN, we define its type here for TypeScript to resolve the import error.
export type PeerJSDataConnection = {
  send: (data: any) => void;
  close: () => void;
  on: (event: 'data' | 'open' | 'close' | 'error', cb: (data?: any) => void) => void;
  off: (event: 'data' | 'open' | 'close' | 'error', cb: (data?: any) => void) => void;
  open: boolean;
  peer: string;
  reliable: boolean;
};