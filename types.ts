export type Position = { x: number; y: number };

export type WorldObject = {
  id: number;
  type: 'tree' | 'rock';
  position: Position;
  health: number;
  emoji: string;
  size: number;
};

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
};
