

export type Position = { x: number; y: number };

export type WorldObject = {
  id: number;
  type: 'tree' | 'rock' | 'workbench';
  position: Position;
  health: number;
  maxHealth: number;
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
  lastUpdateTime: number;
};

export type GameEntity = WorldObject | Player | RemotePlayer;

export type InventoryItemType = 'plank' | 'stone' | 'stick' | 'workbench';

export type InventoryItem = {
  type: InventoryItemType;
  quantity: number;
};

export type Recipe = {
  id: string;
  output: InventoryItem;
  ingredients: InventoryItem[];
};

export type UILayout = {
  x: number; // percentage
  y: number; // percentage
  scale: number;
  visible?: boolean;
  backgroundColor?: string;
  shape?: 'square' | 'circle';
  gridStyle?: 'grid' | 'row' | 'column';
};

export type GameSettings = {
  joystickSize: number;
  buttonSize: number;
  inventorySize: number;
  showFps: boolean;
  showHitboxes: boolean;
  showPunchHitbox: boolean;
  layouts: {
    // Inventory panels
    player: UILayout;
    crafting: UILayout;
    grid: UILayout;
    // HUD elements
    joystick: UILayout;
    punchButton: UILayout;
    buildButton: UILayout;
    hotbar: UILayout;
  };
  inventoryBackgroundColor: string;
};

export type GameState = 'menu' | 'mode-select' | 'connecting' | 'playing' | 'paused' | 'settings' | 'inventory' | 'customize-ui';

// FIX: Added PeerJSDataConnection type to resolve import error in OnlineLobby.tsx
export type PeerJSDataConnection = {
  on(event: 'data' | 'open' | 'close' | 'error', cb: (data?: any) => void): void;
  send(data: any): void;
  close(): void;
  open: boolean;
  peer: string;
};