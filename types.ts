
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
  id: 'player' | string;
  type: 'player';
  position: Position;
  rotation: number;
  name?: string;
};

export type RemotePlayer = {
  id: string;
  type: 'remote-player';
  position: Position;
  targetPosition: Position;
  rotation: number;
  targetRotation: number;
  nickname: string;
  health: number;
  lastUpdateTime: number;
  lastPositionChangeTime: number;
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

export type GameState = 'menu' | 'playing' | 'paused' | 'settings' | 'inventory' | 'customize-ui' | 'mode-select' | 'connecting';
