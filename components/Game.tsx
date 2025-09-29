import React from 'react';
import Joystick from './Joystick';
import Player from './Player';
import InteractionIndicator from './InteractionIndicator';
import Inventory from './Inventory';
import type { Position, WorldObject, InventoryItem, InventoryItemType, GameSettings, GameEntity, GameState, RemotePlayer, Recipe } from '../types';
import ItemIcon from './ItemIcon';
import DebugMenu from './DebugMenu';

type GameMode = 'offline' | 'online';
interface GameProps {
    gameState: GameState;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
    settings: GameSettings;
    gameMode: GameMode;
    socket: WebSocket | null;
    playerId: string | null;
    nickname: string;
    initialPlayers: RemotePlayer[];
    onBackToMenu: () => void;
}

const TREE_HITBOX = { width: 18, height: 10, offsetY: 44 };
const ROCK_HITBOX = { width: 55, height: 30, offsetY: 15 };
const WORKBENCH_HITBOX = { width: 45, height: 25, offsetY: 10 };

const initialWorldObjects: WorldObject[] = [
    { id: 1, type: 'tree', position: { x: 300, y: 150 }, health: 70, maxHealth: 70, emoji: '🌳', size: 6, hitbox: TREE_HITBOX },
    { id: 2, type: 'rock', position: { x: 450, y: 300 }, health: 150, maxHealth: 150, emoji: '🪨', size: 4, hitbox: ROCK_HITBOX },
    { id: 3, type: 'tree', position: { x: 600, y: 100 }, health: 70, maxHealth: 70, emoji: '🌳', size: 6, hitbox: TREE_HITBOX },
    { id: 4, type: 'tree', position: { x: 200, y: 400 }, health: 70, maxHealth: 70, emoji: '🌳', size: 6, hitbox: TREE_HITBOX },
    { id: 5, type: 'rock', position: { x: 700, y: 500 }, health: 150, maxHealth: 150, emoji: '🪨', size: 4, hitbox: ROCK_HITBOX },
    { id: 6, type: 'tree', position: { x: 100, y: 600 }, health: 70, maxHealth: 70, emoji: '🌳', size: 6, hitbox: TREE_HITBOX },
];

const PLAYER_HITBOX_RADIUS = 10;
const PLAYER_HITBOX_OFFSET_Y = -3;
const INVENTORY_SIZE = 12; // 5 hotbar + 7 locked

const ALL_RECIPES: Recipe[] = [
    {
        id: 'sticks',
        output: { type: 'stick', quantity: 4 },
        ingredients: [{ type: 'plank', quantity: 2 }],
    },
    {
        id: 'workbench',
        output: { type: 'workbench', quantity: 1 },
        ingredients: [{ type: 'plank', quantity: 4 }],
    },
    {
        id: 'plank_from_sticks',
        output: { type: 'plank', quantity: 1 },
        ingredients: [{ type: 'stick', quantity: 4 }],
    },
    {
        id: 'sticks_from_plank',
        output: { type: 'stick', quantity: 2 },
        ingredients: [{ type: 'plank', quantity: 1 }],
    },
];


type AABB = { x: number; y: number; width: number; height: number };
type Circle = { x: number; y: number; radius: number };
type CollisionResolution = { push: Position; normal: Position; };
type HealthIndicatorInfo = {
    current: number;
    max: number;
    timeoutId: number;
    position: Position;
    size: number;
};
type DraggedItem = { item: InventoryItem; source: { index: number; type: 'inventory' | 'crafting' | 'output' } };

// Type for incoming player data from the server to ensure type safety.
type IncomingPlayer = {
    id: string; x: number; y: number; rotation: number;
    nickname: string; health?: number;
};


const getPlayerHitbox = (position: Position): Circle => {
    return {
        x: position.x,
        y: position.y + PLAYER_HITBOX_OFFSET_Y,
        radius: PLAYER_HITBOX_RADIUS,
    };
};

const getObjectHitbox = (obj: WorldObject): AABB | null => {
    if (!obj.hitbox) return null;
    const { width, height, offsetY } = obj.hitbox;
    const centerX = obj.position.x;
    const centerY = obj.position.y + offsetY;
    return {
        x: centerX - width / 2,
        y: centerY - height / 2,
        width: width,
        height: height,
    };
};

// Resolves circle-AABB collisions, returning a vector to push the circle out and the collision normal.
const resolveCircleAABBCollision = (circle: Circle, rect: AABB): CollisionResolution | null => {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

    const distanceX = circle.x - closestX;
    const distanceY = circle.y - closestY;
    const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

    if (distanceSquared >= (circle.radius * circle.radius)) {
        return null; // No collision
    }

    const distance = Math.sqrt(distanceSquared);
    const overlap = circle.radius - distance;

    // Handle the case where the circle center is inside the rectangle
    if (distance === 0) {
        // Find the smallest distance to move to exit the rectangle
        const dx1 = circle.x - rect.x;
        const dx2 = (rect.x + rect.width) - circle.x;
        const dy1 = circle.y - rect.y;
        const dy2 = (rect.y + rect.height) - circle.y;
        const minDist = Math.min(dx1, dx2, dy1, dy2);
        
        if (minDist === dx1) return { push: { x: -dx1, y: 0 }, normal: { x: -1, y: 0 } };
        if (minDist === dx2) return { push: { x: dx2, y: 0 }, normal: { x: 1, y: 0 } };
        if (minDist === dy1) return { push: { x: 0, y: -dy1 }, normal: { x: 0, y: -1 } };
        return { push: { x: 0, y: dy2 }, normal: { x: 0, y: 1 } };
    }

    // Normal collision: push out from the closest point
    const push = {
        x: (distanceX / distance) * overlap,
        y: (distanceY / distance) * overlap,
    };
    
    // The collision normal points from the obstacle to the player
    const normal = {
        x: distanceX / distance,
        y: distanceY / distance,
    };

    return { push, normal };
};


const lerp = (start: number, end: number, amt: number) => {
    return (1 - amt) * start + amt * end;
}

const lerpAngle = (start: number, end: number, amt: number) => {
    const difference = Math.abs(end - start);
    if (difference > 180) {
        if (end > start) start += 360;
        else end += 360;
    }
    const value = (start + ((end - start) * amt));
    return value % 360;
}

const Game: React.FC<GameProps> = ({ gameState, setGameState, settings, gameMode, socket, playerId, nickname, initialPlayers, onBackToMenu }) => {
    const { useState, useEffect, useRef } = React;
    const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const [playerPosition, setPlayerPosition] = useState<Position>({ x: 100, y: 100 });
    const [playerRotation, setPlayerRotation] = useState(0);
    const [worldObjects, setWorldObjects] = useState<WorldObject[]>(initialWorldObjects);
    const [inventory, setInventory] = useState<(InventoryItem | undefined)[]>(Array(INVENTORY_SIZE).fill(undefined));
    const [hitEffects, setHitEffects] = useState<number[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<number | null>(0);
    const [fps, setFps] = useState(0);
    const [showPunchIndicator, setShowPunchIndicator] = useState({ isVisible: false, isCrit: false });
    const [healthIndicators, setHealthIndicators] = useState<{ [id: number]: HealthIndicatorInfo }>({});
    
    const [isCharging, setIsCharging] = useState(false);
    const [chargeLevel, setChargeLevel] = useState(0);
    const [critShake, setCritShake] = useState(false);
    const [lockRotation, setLockRotation] = useState(false);

    const [remotePlayers, setRemotePlayers] = useState<{ [id: string]: RemotePlayer }>({});

    // Crafting State
    const [craftingInput, setCraftingInput] = useState<(InventoryItem | undefined)[]>(Array(4).fill(undefined));
    const [craftingOutput, setCraftingOutput] = useState<InventoryItem | undefined>(undefined);
    const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);

    const [showDebugMenu, setShowDebugMenu] = useState(false);

    const keysPressed = useRef<{ [key: string]: boolean }>({});
    const joystickVector = useRef({ x: 0, y: 0 });
    const gameLoopRef = useRef<number | null>(null);
    const nextObjectId = useRef<number>(initialWorldObjects.length + 1);
    
    const punchChargeStartRef = useRef<number | null>(null);
    const chargeUpdateLoopRef = useRef<number | null>(null);
    const punchIndicatorTimeoutRef = useRef<number | null>(null);
    const punchAvailableTimeRef = useRef(0);

    // Refs for real-time position/rotation to solve stale state issues in event handlers
    const playerPositionRef = useRef<Position>({ x: 100, y: 100 });
    const playerRotationRef = useRef(0);

    const playerVelocity = useRef({ x: 0, y: 0 });
    const targetRotation = useRef(0);
    const lockedRotationRef = useRef(0);
    const cameraFollowFactor = useRef(0.2); // For smoothing camera transitions
    
    const cameraPosition = useRef<Position>({ x: 0, y: 0 });
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const gameWorldRef = useRef<HTMLDivElement>(null);
    const healthIndicatorsRef = useRef<{ [id: number]: HealthIndicatorInfo }>(healthIndicators);
    healthIndicatorsRef.current = healthIndicators;

    const lastTimeRef = useRef<number>(performance.now());
    const frameCountRef = useRef<number>(0);
    
    const selectedItem = selectedSlot !== null ? inventory[selectedSlot] : null;
    const canBuild = !!selectedItem && (selectedItem.type === 'stone' || selectedItem.type === 'workbench');
    
    // This effect handles the initial population of players and resets the state on reconnect.
    useEffect(() => {
        if (gameMode === 'online' && playerId) {
            const now = performance.now();
            const newRemotePlayers: { [id: string]: RemotePlayer } = {};
            const initialPlayersData = initialPlayers as any[] as IncomingPlayer[];

            for (const p of initialPlayersData) {
                const id = String(p.id).trim();
                if (id === playerId) continue; // Always ignore self
                const pos = { x: p.x, y: p.y };
                newRemotePlayers[id] = {
                    id: id,
                    type: 'remote-player',
                    position: pos,
                    targetPosition: pos,
                    rotation: p.rotation,
                    targetRotation: p.rotation,
                    nickname: p.nickname || `Player_${id.substring(0, 4)}`,
                    health: p.health || 100,
                    lastUpdateTime: now,
                    lastPositionChangeTime: now,
                };
            }
            setRemotePlayers(newRemotePlayers);
        }
    }, [gameMode, initialPlayers, playerId]);

    // --- WebSocket Online Logic ---
    useEffect(() => {
        if (gameMode !== 'online' || !socket) {
            setRemotePlayers({});
            return;
        }

        const handleMessage = (event: MessageEvent) => {
            try {
                const data: { type: string, [key: string]: any } = JSON.parse(event.data);
                const now = performance.now();
                switch (data.type) {
                    case 'players_update': {
                        const playersUpdate = data.players as IncomingPlayer[];
                        if (!playersUpdate) break;
    
                        setRemotePlayers(prev => {
                            const newPlayersState: { [id: string]: RemotePlayer } = {};
                            
                            for (const p of playersUpdate) {
                                const id = String(p.id).trim();
                                // This is the most important check: never render ourselves as a remote player.
                                if (id === playerId) continue;
    
                                const existingPlayer = prev[id];
                                
                                if (existingPlayer) {
                                    // Player exists: update target, keep current position for interpolation
                                    const positionChanged = existingPlayer.targetPosition.x !== p.x || existingPlayer.targetPosition.y !== p.y;
                                    newPlayersState[id] = {
                                        ...existingPlayer,
                                        targetPosition: { x: p.x, y: p.y },
                                        targetRotation: p.rotation,
                                        nickname: p.nickname,
                                        health: p.health || 100,
                                        lastUpdateTime: now,
                                        lastPositionChangeTime: positionChanged ? now : existingPlayer.lastPositionChangeTime,
                                    };
                                } else {
                                    // New player: initialize with position set to target
                                    const pos = { x: p.x, y: p.y };
                                    newPlayersState[id] = {
                                        id: id,
                                        type: 'remote-player',
                                        position: pos,
                                        targetPosition: pos,
                                        rotation: p.rotation,
                                        targetRotation: p.rotation,
                                        nickname: p.nickname,
                                        health: p.health || 100,
                                        lastUpdateTime: now,
                                        lastPositionChangeTime: now,
                                    };
                                }
                            }
                            // By creating a new state object from scratch based on the server's list,
                            // we automatically handle players who have left, as they won't be in the message.
                            return newPlayersState;
                        });
                        break;
                    }
                }
            } catch (e) {
                console.error("Failed to process message from server", e, event.data);
            }
        };

        socket.addEventListener('message', handleMessage);

        return () => {
            socket.removeEventListener('message', handleMessage);
        };
    }, [gameMode, socket, playerId]);

    // Throttled update sender to server
    useEffect(() => {
        if (gameMode !== 'online' || !socket || socket.readyState !== WebSocket.OPEN) return;

        const interval = setInterval(() => {
            socket.send(JSON.stringify({
                type: 'move',
                x: playerPositionRef.current.x,
                y: playerPositionRef.current.y,
                rotation: playerRotationRef.current,
            }));
        }, 50); // Send updates 20 times per second

        return () => clearInterval(interval);

    }, [gameMode, socket]);

    const handlePause = () => setGameState('paused');
    const handleResume = () => setGameState('playing');

    const toggleInventory = () => {
        setGameState(prev => prev === 'inventory' ? 'playing' : 'inventory');
    };

    // Return crafting items to inventory when closing it, and also any dragged item
    useEffect(() => {
        if (gameState !== 'inventory') {
            handleReturnDraggedItem(); // Return any held item
            const itemsToReturn = craftingInput.filter(Boolean) as InventoryItem[];
            if (itemsToReturn.length > 0) {
                let currentInventory = [...inventory];
                for (const item of itemsToReturn) {
                    currentInventory = addToInventory(item.type, item.quantity, currentInventory);
                }
                setInventory(currentInventory);
                setCraftingInput(Array(4).fill(undefined));
            }
        }
    }, [gameState, inventory, craftingInput]);


    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'p') {
                e.preventDefault();
                setShowDebugMenu(prev => !prev);
                return;
            }

            if (showDebugMenu) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    setShowDebugMenu(false);
                }
                return;
            }

            if (e.key.toLowerCase() === 'tab') {
                e.preventDefault(); 
                if (gameState === 'playing' && !e.repeat && canBuild) {
                    setLockRotation(true);
                    lockedRotationRef.current = targetRotation.current;
                }
            }

            if (e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'у') {
                e.preventDefault();
                toggleInventory();
                return;
            }

            if (gameState !== 'playing') return;

            if (e.key === ' ' && !e.repeat) {
                e.preventDefault();
                handlePunchStart();
                return;
            }
            const key = e.key.toLowerCase();
            keysPressed.current[key] = true;
            if (key === 'ц') keysPressed.current['w'] = true;
            if (key === 'ф') keysPressed.current['a'] = true;
            if (key === 'ы') keysPressed.current['s'] = true;
            if (key === 'в') keysPressed.current['d'] = true;
        };

        const handleKeyUp = (e: KeyboardEvent) => {
             if (e.key === ' ') {
                e.preventDefault();
                handlePunchEnd();
                return;
            }
            if (e.key.toLowerCase() === 'tab') {
                setLockRotation(false);
            }
            const key = e.key.toLowerCase();
            keysPressed.current[key] = false;
            if (key === 'ц') keysPressed.current['w'] = false;
            if (key === 'ф') keysPressed.current['a'] = false;
            if (key === 'ы') keysPressed.current['s'] = false;
            if (key === 'в') keysPressed.current['d'] = false;
        };
        
        const handleBlur = () => { 
            keysPressed.current = {};
            if (isCharging) handlePunchEnd();
            setLockRotation(false);
            setShowDebugMenu(false);
        };
        
        const handleWheel = (e: WheelEvent) => {
            if (gameState === 'playing') {
                e.preventDefault();
                const direction = Math.sign(e.deltaY);
                setSelectedSlot(prev => {
                    const newSlot = ( (prev ?? 0) + direction + 5) % 5;
                    return newSlot;
                });
            }
        };
        
        const handleContextMenu = (e: MouseEvent) => {
            if (gameState === 'playing') {
                e.preventDefault();
                handlePlaceItem();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('contextmenu', handleContextMenu);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('wheel', handleWheel);
            window.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [gameState, isCharging, canBuild, showDebugMenu]);
    
    // Effect for cleaning up health indicator timeouts on component unmount
    useEffect(() => {
        return () => {
            Object.keys(healthIndicatorsRef.current).forEach(id => {
                const indicator = healthIndicatorsRef.current[Number(id)];
                if (indicator) {
                    clearTimeout(indicator.timeoutId);
                }
            });
            if (punchIndicatorTimeoutRef.current) {
                clearTimeout(punchIndicatorTimeoutRef.current);
            }
            if (chargeUpdateLoopRef.current) {
                cancelAnimationFrame(chargeUpdateLoopRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const gameLoop = () => {
            const now = performance.now();
            frameCountRef.current++;
            if (now - lastTimeRef.current >= 1000) {
                setFps(frameCountRef.current);
                frameCountRef.current = 0;
                lastTimeRef.current = now;
            }

            if (gameState === 'playing') {
                let moveX = 0;
                let moveY = 0;
                let hasMovementInput = false;

                if (keysPressed.current['w']) { moveY -= 1; hasMovementInput = true; }
                if (keysPressed.current['s']) { moveY += 1; hasMovementInput = true; }
                if (keysPressed.current['a']) { moveX -= 1; hasMovementInput = true; }
                if (keysPressed.current['d']) { moveX += 1; hasMovementInput = true; }
                
                if (joystickVector.current.x !== 0 || joystickVector.current.y !== 0) {
                    moveX += joystickVector.current.x;
                    moveY += joystickVector.current.y;
                    hasMovementInput = true;
                }

                const joystickMagnitude = Math.sqrt(joystickVector.current.x**2 + joystickVector.current.y**2);
                const isSprinting = keysPressed.current['shift'] || joystickMagnitude > 0.9;
                
                let speedMultiplier = 1.0;
                if (isSprinting) speedMultiplier = 2.0;
                if (lockRotation) speedMultiplier = 0.25;

                const rotationSpeed = 0.25;
                let targetVelX = 0;
                let targetVelY = 0;

                if (hasMovementInput) {
                    const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
                    
                    if (magnitude > 0.01) { 
                        const normalizedX = moveX / magnitude;
                        const normalizedY = moveY / magnitude;
                        
                        if (!lockRotation) {
                           targetRotation.current = Math.atan2(normalizedY, normalizedX) * (180 / Math.PI) + 90;
                        }

                        const baseSpeed = 2.0;
                        const speed = baseSpeed * speedMultiplier;

                        targetVelX = normalizedX * speed;
                        targetVelY = normalizedY * speed;
                    }
                }
                
                const moveResponsiveness = 0.25;
                const stopResponsiveness = 0.4;
                const responsiveness = hasMovementInput ? moveResponsiveness : stopResponsiveness;
                
                playerVelocity.current.x = lerp(playerVelocity.current.x, targetVelX, responsiveness);
                playerVelocity.current.y = lerp(playerVelocity.current.y, targetVelY, responsiveness);

                if (!hasMovementInput) {
                    if (Math.abs(playerVelocity.current.x) < 0.05) playerVelocity.current.x = 0;
                    if (Math.abs(playerVelocity.current.y) < 0.05) playerVelocity.current.y = 0;
                }

                setPlayerRotation(prevRotation => {
                    const finalTargetRotation = lockRotation ? lockedRotationRef.current : targetRotation.current;
                    const newRotation = lerpAngle(prevRotation, finalTargetRotation, rotationSpeed);
                    playerRotationRef.current = newRotation;
                    return newRotation;
                });
                
                // Remote players interpolation
                setRemotePlayers(currentRemotePlayers => {
                    const updatedPlayers: { [id:string]: RemotePlayer } = {};
                    let hasChanged = false;
                    for (const id in currentRemotePlayers) {
                        const player = currentRemotePlayers[id];
                        const distanceToTarget = Math.sqrt(
                            (player.targetPosition.x - player.position.x) ** 2 +
                            (player.targetPosition.y - player.position.y) ** 2
                        );
                
                        let newPos = player.position;
                        // If the player is very far, teleport them closer to avoid long "running" animations
                        if (distanceToTarget > 150) {
                            newPos = player.targetPosition;
                        } else if (distanceToTarget > 1.0) { 
                             // Otherwise, move them at a constant speed towards the target
                            const angle = Math.atan2(player.targetPosition.y - player.position.y, player.targetPosition.x - player.position.x);
                            const moveSpeed = 4.0; // Should match player's sprint speed for realism
                            newPos = {
                                x: player.position.x + Math.cos(angle) * moveSpeed,
                                y: player.position.y + Math.sin(angle) * moveSpeed,
                            };
                        } else {
                            // If close, smoothly lerp to the final position to avoid jittering
                            newPos = {
                                x: lerp(player.position.x, player.targetPosition.x, 0.25),
                                y: lerp(player.position.y, player.targetPosition.y, 0.25),
                            };
                        }

                        const newRot = lerpAngle(player.rotation, player.targetRotation, 0.25);

                        if (
                            Math.abs(player.position.x - newPos.x) > 0.01 || 
                            Math.abs(player.position.y - newPos.y) > 0.01 ||
                            Math.abs(player.rotation - newRot) > 0.01
                        ) {
                            hasChanged = true;
                        }

                        updatedPlayers[id] = {
                            ...player,
                            position: newPos,
                            rotation: newRot,
                        };
                    }
                    return hasChanged ? updatedPlayers : currentRemotePlayers;
                });

                setPlayerPosition(currentPosition => {
                    if (gameContainerRef.current && gameWorldRef.current) {
                        const zoom = isTouchDevice ? 0.9 : 1.7;
                        const viewportWidth = gameContainerRef.current.clientWidth;
                        const viewportHeight = gameContainerRef.current.clientHeight;
    
                        const targetCameraX = currentPosition.x - (viewportWidth / zoom) / 2;
                        const targetCameraY = currentPosition.y - (viewportHeight / zoom) / 2;
                        
                        const walkCameraFactor = 0.2;
                        const sprintCameraFactor = 0.05;
                        
                        const targetCameraFollowFactor = isSprinting ? sprintCameraFactor : walkCameraFactor;

                        cameraFollowFactor.current = lerp(cameraFollowFactor.current, targetCameraFollowFactor, 0.04);
                        
                        cameraPosition.current.x = lerp(cameraPosition.current.x, targetCameraX, cameraFollowFactor.current);
                        cameraPosition.current.y = lerp(cameraPosition.current.y, targetCameraY, cameraFollowFactor.current);
                        
                        const worldEl = gameWorldRef.current;
                        worldEl.style.transformOrigin = 'top left';
                        worldEl.style.transform = `scale(${zoom}) translate(${-cameraPosition.current.x.toFixed(2)}px, ${-cameraPosition.current.y.toFixed(2)}px)`;
                    }

                    let nextPosition = {
                        x: currentPosition.x + playerVelocity.current.x,
                        y: currentPosition.y + playerVelocity.current.y,
                    };

                    for (const obj of worldObjects) {
                        const playerHitbox = getPlayerHitbox(nextPosition);
                        const objHitbox = getObjectHitbox(obj);
                        if (objHitbox) {
                            const resolution = resolveCircleAABBCollision(playerHitbox, objHitbox);
                            if (resolution) {
                                nextPosition.x += resolution.push.x;
                                nextPosition.y += resolution.push.y;

                                const normal = resolution.normal;
                                const dot = playerVelocity.current.x * normal.x + playerVelocity.current.y * normal.y;
                                
                                if (dot < 0) {
                                    playerVelocity.current.x -= dot * normal.x;
                                    playerVelocity.current.y -= dot * normal.y;
                                }
                            }
                        }
                    }
                    
                    playerPositionRef.current = nextPosition;

                    if (nextPosition.x !== currentPosition.x || nextPosition.y !== currentPosition.y) {
                        return nextPosition;
                    }
                    return currentPosition;
                });
            }

            gameLoopRef.current = requestAnimationFrame(gameLoop);
        };
        
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        
        return () => {
            if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        };
    }, [gameState, worldObjects, isTouchDevice, lockRotation]);

    const handleJoystickMove = (x: number, y: number) => { joystickVector.current = { x, y }; };

    const addToInventory = (itemType: InventoryItemType, quantityToAdd: number, currentInventory: (InventoryItem | undefined)[]) => {
        let newInventory = [...currentInventory];
        for (let i = 0; i < newInventory.length; i++) {
            if (newInventory[i]?.type === itemType) {
                newInventory[i] = { ...newInventory[i]!, quantity: newInventory[i]!.quantity + quantityToAdd };
                return newInventory;
            }
        }
    
        const firstEmptySlot = newInventory.findIndex(item => !item);
        if (firstEmptySlot !== -1) {
            newInventory[firstEmptySlot] = { type: itemType, quantity: quantityToAdd };
            return newInventory;
        }
    
        return newInventory;
    };
    
    const executePunch = (damage: number, isCrit: boolean) => {
        if (showPunchIndicator.isCrit && !isCrit) {
        } else {
            if (punchIndicatorTimeoutRef.current) {
                clearTimeout(punchIndicatorTimeoutRef.current);
            }
            setShowPunchIndicator({ isVisible: true, isCrit });
            punchIndicatorTimeoutRef.current = window.setTimeout(() => {
                setShowPunchIndicator(currentIndicator => {
                    if (currentIndicator.isVisible && currentIndicator.isCrit === isCrit) {
                        return { isVisible: false, isCrit: false };
                    }
                    return currentIndicator;
                });
            }, 1000);
        }

        if (isCrit) {
            setCritShake(true);
            setTimeout(() => setCritShake(false), 300);
        }

        const punchRange = 42;
        const punchAngle = 80;
        const playerAngleRad = (playerRotationRef.current - 90) * (Math.PI / 180);

        let closestObject: WorldObject | null = null;
        let minDistance = Infinity;

        const playerPos = playerPositionRef.current;

        for (const obj of worldObjects) {
            const objHitbox = getObjectHitbox(obj);
            if (!objHitbox) continue;

            const closestX = Math.max(objHitbox.x, Math.min(playerPos.x, objHitbox.x + objHitbox.width));
            const closestY = Math.max(objHitbox.y, Math.min(playerPos.y, objHitbox.y + objHitbox.height));
            
            const toClosestPointVec = { x: closestX - playerPos.x, y: closestY - playerPos.y };
            const distanceSq = toClosestPointVec.x ** 2 + toClosestPointVec.y ** 2;

            if (distanceSq > punchRange ** 2) continue;

            const distance = Math.sqrt(distanceSq);
            
            if (distance < 0.01) {
                if (distance < minDistance) {
                    minDistance = distance;
                    closestObject = obj;
                }
                continue;
            }

            const forwardVec = { x: Math.cos(playerAngleRad), y: Math.sin(playerAngleRad) };
            const normalizedToObjectVec = { x: toClosestPointVec.x / distance, y: toClosestPointVec.y / distance };
            const dotProduct = forwardVec.x * normalizedToObjectVec.x + forwardVec.y * normalizedToObjectVec.y;
            const angleThreshold = Math.cos((punchAngle / 2) * (Math.PI / 180));

            const isVeryClose = distance <= PLAYER_HITBOX_RADIUS + 5;

            if (isVeryClose || dotProduct > angleThreshold) {
                if (distance < minDistance) {
                    minDistance = distance;
                    closestObject = obj;
                }
            }
        }

        if (closestObject) {
            setHitEffects(prev => [...prev, closestObject!.id]);
            setTimeout(() => setHitEffects(prev => prev.filter(id => id !== closestObject!.id)), 200);

            const newHealth = closestObject.health - damage;
            
            setHealthIndicators(prev => {
                const existingIndicator = prev[closestObject!.id];
                if (existingIndicator) clearTimeout(existingIndicator.timeoutId);

                const timeoutId = window.setTimeout(() => {
                    setHealthIndicators(current => {
                        const newIndicators = { ...current };
                        delete newIndicators[closestObject!.id];
                        return newIndicators;
                    });
                }, 3000);

                return {
                    ...prev,
                    [closestObject!.id]: {
                        current: newHealth > 0 ? newHealth : 0,
                        max: closestObject!.maxHealth,
                        timeoutId,
                        position: closestObject!.position,
                        size: closestObject!.size,
                    }
                };
            });

            if (newHealth <= 0) {
                let itemsDropped = false;
                if (closestObject.type === 'tree') {
                    const planksToDrop = Math.floor(Math.random() * 3) + 4;
                    setInventory(prev => addToInventory('plank', planksToDrop, prev));
                    itemsDropped = true;
                }
                else if (closestObject.type === 'rock') {
                     setInventory(prev => addToInventory('stone', 1, prev));
                     itemsDropped = true;
                }
                if (itemsDropped) {
                    setWorldObjects(prev => prev.filter(o => o.id !== closestObject!.id));
                    setHealthIndicators(prev => {
                        const existingIndicator = prev[closestObject!.id];
                        if (existingIndicator) {
                            clearTimeout(existingIndicator.timeoutId);
                            const newIndicators = { ...prev };
                            delete newIndicators[closestObject!.id];
                            return newIndicators;
                        }
                        return prev;
                    });
                }
            } else {
                setWorldObjects(prev =>
                    prev.map(o => o.id === closestObject!.id ? { ...o, health: newHealth } : o)
                );
            }
        }
    };
    
    const handlePunchStart = () => {
        if (gameState !== 'playing' || punchChargeStartRef.current !== null) return;
    
        punchChargeStartRef.current = performance.now();
        setIsCharging(true);
        setChargeLevel(0);
    
        const chargeLoop = () => {
            if (punchChargeStartRef.current === null) return;
            const elapsed = performance.now() - punchChargeStartRef.current;
            
            if (elapsed >= 1000) setChargeLevel(2);
            else if (elapsed >= 500) setChargeLevel(1);
            else setChargeLevel(0);

            chargeUpdateLoopRef.current = requestAnimationFrame(chargeLoop);
        };
        chargeUpdateLoopRef.current = requestAnimationFrame(chargeLoop);
    };

    const handlePunchEnd = () => {
        if (!punchChargeStartRef.current) return;
    
        if (chargeUpdateLoopRef.current) {
            cancelAnimationFrame(chargeUpdateLoopRef.current);
            chargeUpdateLoopRef.current = null;
        }
    
        setIsCharging(false);
        setChargeLevel(0);
    
        const duration = performance.now() - punchChargeStartRef.current;
        punchChargeStartRef.current = null;

        if (performance.now() < punchAvailableTimeRef.current) {
            return;
        }
    
        let damage = 1;
        let isCrit = false;
        let cooldown = 250;

        if (duration < 500) {
            damage = 1;
            cooldown = 250;
        } else if (duration < 1000) {
            damage = 5;
            cooldown = 500;
        } else {
            damage = 10;
            isCrit = true;
            cooldown = 1000;
        }
        
        executePunch(damage, isCrit);

        punchAvailableTimeRef.current = performance.now() + cooldown;
    };

    const handlePlaceItem = () => {
        if (selectedSlot === null || !inventory[selectedSlot]) return;

        const itemToPlace = inventory[selectedSlot]!;
        const placeableItems: InventoryItemType[] = ['stone', 'workbench'];

        if (!placeableItems.includes(itemToPlace.type)) {
            return;
        }

        const { position: newPosition } = getPlacementPreview();

        let newObject: WorldObject;

        if (itemToPlace.type === 'stone') {
             newObject = {
                id: nextObjectId.current++,
                type: 'rock',
                position: newPosition,
                health: 150,
                maxHealth: 150,
                emoji: '🪨',
                size: 4,
                hitbox: ROCK_HITBOX,
            };
        } else { // 'workbench'
             newObject = {
                id: nextObjectId.current++,
                type: 'workbench',
                position: newPosition,
                health: 30,
                maxHealth: 30,
                emoji: '🛠️',
                size: 4,
                hitbox: WORKBENCH_HITBOX,
            };
        }
        setWorldObjects(prev => [...prev, newObject]);

        setInventory(prev => {
            const newInventory = [...prev];
            const currentItem = newInventory[selectedSlot!];

            if (currentItem && currentItem.quantity > 1) {
                newInventory[selectedSlot!] = { ...currentItem, quantity: currentItem.quantity - 1 };
            } else {
                newInventory[selectedSlot!] = undefined;
            }
            return newInventory;
        });
    };

    const handleActionPress = (e: React.SyntheticEvent, action: () => void) => {
        e.stopPropagation();
        e.preventDefault();
        action();
    };

    useEffect(() => {
        const inputCounts: { [key in InventoryItemType]?: number } = {};
        for (const item of craftingInput) {
            if (item) {
                inputCounts[item.type] = (inputCounts[item.type] || 0) + item.quantity;
            }
        }
        
        let output: InventoryItem | undefined = undefined;
        for (const recipe of ALL_RECIPES) {
            let match = true;
            for (const ingredient of recipe.ingredients) {
                if (!inputCounts[ingredient.type] || inputCounts[ingredient.type] < ingredient.quantity) {
                    match = false;
                    break;
                }
            }
            if (match) {
                 for (const inputType in inputCounts) {
                    if (!recipe.ingredients.some(ing => ing.type === inputType)) {
                        match = false;
                        break;
                    }
                }
            }
            if (match) {
                output = recipe.output;
                break;
            }
        }
        setCraftingOutput(output);

    }, [craftingInput]);

    const handleSlotClick = (e: React.MouseEvent, index: number, type: 'inventory' | 'crafting' | 'output') => {
        e.preventDefault();
        e.stopPropagation();
    
        if (draggedItem) {
            if (type === 'output') {
                return;
            }
    
            const isLMB = e.button === 0;
            const isRMB = e.button === 2;
    
            const targetArray = type === 'inventory' ? [...inventory] : [...craftingInput];
            const targetSetState = type === 'inventory' ? setInventory : setCraftingInput;
            const targetItem = targetArray[index];
            
            let newDraggedItem: DraggedItem | null = JSON.parse(JSON.stringify(draggedItem));
    
            if (isLMB) {
                if (targetItem && targetItem.type === newDraggedItem.item.type) {
                    targetItem.quantity += newDraggedItem.item.quantity;
                    newDraggedItem = null;
                } else {
                    targetArray[index] = newDraggedItem.item;
                    newDraggedItem = targetItem ? { ...newDraggedItem, item: targetItem } : null;
                }
            } else if (isRMB) {
                if (!targetItem) {
                    targetArray[index] = { type: newDraggedItem.item.type, quantity: 1 };
                    newDraggedItem.item.quantity--;
                } else if (targetItem.type === newDraggedItem.item.type) {
                    targetItem.quantity++;
                    newDraggedItem.item.quantity--;
                }
                if (newDraggedItem.item.quantity <= 0) {
                    newDraggedItem = null;
                }
            }
            
            setDraggedItem(newDraggedItem);
            targetSetState(targetArray);
            return;
        }
    
        if (!draggedItem) {
            const isLMB = e.button === 0;
            const isRMB = e.button === 2;
            
            let itemToPick: InventoryItem | undefined;
            let sourceArray: (InventoryItem | undefined)[] | null = null;
            let sourceSetState: Function | null = null;
            
            if (type === 'inventory') {
                itemToPick = inventory[index];
                sourceArray = [...inventory];
                sourceSetState = setInventory;
            } else if (type === 'crafting') {
                itemToPick = craftingInput[index];
                sourceArray = [...craftingInput];
                sourceSetState = setCraftingInput;
            } else if (type === 'output') {
                itemToPick = craftingOutput;
            }
    
            if (!itemToPick || (!isLMB && !isRMB)) return;
    
            let itemForDrag: InventoryItem;
            let remainingQuantity = 0;
    
            if (isLMB) {
                itemForDrag = { ...itemToPick };
            } else {
                const half = Math.ceil(itemToPick.quantity / 2);
                itemForDrag = { type: itemToPick.type, quantity: half };
                remainingQuantity = itemToPick.quantity - half;
            }
    
            setDraggedItem({ item: itemForDrag, source: { index, type } });
    
            if (sourceArray && sourceSetState) {
                sourceArray[index] = remainingQuantity > 0 ? { ...itemToPick, quantity: remainingQuantity } : undefined;
                sourceSetState(sourceArray);
            } else if (type === 'output') {
                setDraggedItem({ item: { ...itemToPick }, source: { index, type } });
                setCraftingInput(Array(4).fill(undefined));
            }
        }
    };

    const handleReturnDraggedItem = () => {
        if (!draggedItem) return;

        const { item, source } = draggedItem;
        
        if (source.type === 'inventory') {
            const newInv = [...inventory];
            const existingItem = newInv[source.index];
            newInv[source.index] = existingItem ? { ...existingItem, quantity: existingItem.quantity + item.quantity } : item;
            setInventory(newInv);
        } else if (source.type === 'crafting') {
            const newCrafting = [...craftingInput];
            const existingItem = newCrafting[source.index];
            newCrafting[source.index] = existingItem ? { ...existingItem, quantity: existingItem.quantity + item.quantity } : item;
            setCraftingInput(newCrafting);
        }
        
        setDraggedItem(null);
    };

    const handleGiveItemDebug = (itemType: InventoryItemType, quantity: number) => {
        setInventory(prev => addToInventory(itemType, quantity, prev));
    };

    const handleSpawnObjectDebug = (objectType: WorldObject['type']) => {
        const angle = Math.random() * 2 * Math.PI;
        const distance = 60 + Math.random() * 50;
        const spawnPos = {
            x: playerPositionRef.current.x + Math.cos(angle) * distance,
            y: playerPositionRef.current.y + Math.sin(angle) * distance,
        };

        let newObject: WorldObject | null = null;
        if (objectType === 'tree') {
            newObject = { id: nextObjectId.current++, type: 'tree', position: spawnPos, health: 70, maxHealth: 70, emoji: '🌳', size: 6, hitbox: TREE_HITBOX };
        } else if (objectType === 'rock') {
            newObject = { id: nextObjectId.current++, type: 'rock', position: spawnPos, health: 150, maxHealth: 150, emoji: '🪨', size: 4, hitbox: ROCK_HITBOX };
        } else if (objectType === 'workbench') {
            newObject = { id: nextObjectId.current++, type: 'workbench', position: spawnPos, health: 30, maxHealth: 30, emoji: '🛠️', size: 4, hitbox: WORKBENCH_HITBOX };
        }

        if (newObject) {
            setWorldObjects(prev => [...prev, newObject]);
        }
    };

    const getLayoutStyles = (layout: typeof settings.layouts.joystick): React.CSSProperties => ({
        position: 'absolute',
        left: `${layout.x}%`,
        top: `${layout.y}%`,
        transform: `translate(-50%, -50%) scale(${layout.scale})`,
        willChange: 'transform',
    });
    
    const hotbarLayout = settings.layouts.hotbar;
    const hotbarStyle = getLayoutStyles(hotbarLayout);
    const hotbarFlexDirection = hotbarLayout.gridStyle === 'column' ? 'flex-col' : 'flex-row';

    const punchButtonLayout = settings.layouts.punchButton;
    const punchButtonStyle = getLayoutStyles(punchButtonLayout);
    const punchButtonShapeClass = punchButtonLayout.shape === 'circle' ? 'rounded-full' : 'rounded-lg';
    
    const buildButtonLayout = settings.layouts.buildButton;
    const buildButtonStyle = getLayoutStyles(buildButtonLayout);
    const buildButtonShapeClass = buildButtonLayout.shape === 'circle' ? 'rounded-full' : 'rounded-lg';

    const joystickLayout = settings.layouts.joystick;
    const joystickStyle = getLayoutStyles(joystickLayout);

    const actionButtonStyle: React.CSSProperties = { width: `${settings.buttonSize}px`, height: `${settings.buttonSize}px`, fontSize: `${settings.buttonSize / 5}px` };
    const hotbarSlotStyle: React.CSSProperties = { width: `${settings.inventorySize}px`, height: `${settings.inventorySize}px`, fontSize: `${settings.inventorySize * 0.6}px` };
    const hotbarBagStyle: React.CSSProperties = { ...hotbarSlotStyle, fontSize: `${settings.inventorySize * 0.5}px` };
    
    const getEntityFeetY = (entity: GameEntity) => {
        if (entity.type === 'player' || entity.type === 'remote-player') return entity.position.y;
        const obj = entity as WorldObject;
        return obj.hitbox ? obj.position.y + obj.hitbox.offsetY + obj.hitbox.height / 2 : obj.position.y;
    };

    const playerAsEntity: GameEntity = { id: 'player', type: 'player', position: playerPosition, rotation: playerRotation };

    const renderableEntities: GameEntity[] = [
        ...worldObjects,
        ...Object.values(remotePlayers),
        playerAsEntity
    ].sort((a, b) => getEntityFeetY(a) - getEntityFeetY(b));

    const playerHitbox = getPlayerHitbox(playerPosition);
    
    const hotbarItems = inventory.slice(0, 5);

    const getPlacementPreview = () => {
        const placeDistance = 50;
        const playerAngleRad = (playerRotationRef.current - 90) * (Math.PI / 180);
        const playerPos = playerPositionRef.current;
        const position = {
            x: playerPos.x + Math.cos(playerAngleRad) * placeDistance,
            y: playerPos.y + Math.sin(playerAngleRad) * placeDistance
        };
        const rotation = playerRotationRef.current;
        return { position, rotation };
    };

    const placementPreview = canBuild ? getPlacementPreview() : null;

    return (
        <div ref={gameContainerRef} className={`relative w-full h-full bg-green-400 overflow-hidden select-none ${critShake ? 'animate-screen-shake' : ''}`}>
            <div ref={gameWorldRef} style={{ willChange: 'transform' }}>
                {placementPreview && selectedItem && (
                    <div
                        className="absolute select-none opacity-35"
                        style={{
                            left: placementPreview.position.x,
                            top: placementPreview.position.y,
                            fontSize: `${selectedItem.type === 'stone' ? 4 : 4}rem`,
                            transform: 'translate(-50%, -50%)',
                            lineHeight: 1
                        }}
                    >
                        {selectedItem.type === 'stone' ? '🪨' : '🛠️'}
                    </div>
                )}
                {renderableEntities.map(entity => {
                    if (entity.type === 'player') {
                         return (
                            <div key="player" style={{ position: 'absolute', left: entity.position.x, top: entity.position.y }}>
                                {isCharging && (
                                    <InteractionIndicator
                                        rotation={playerRotation}
                                        type="charging"
                                        chargeLevel={chargeLevel}
                                    />
                                )}
                                {showPunchIndicator.isVisible && (
                                    <InteractionIndicator
                                        rotation={playerRotation}
                                        type="punch"
                                        isCrit={showPunchIndicator.isCrit}
                                    />
                                )}
    
                                {settings.showPunchHitbox && !isCharging && !showPunchIndicator.isVisible && (
                                    <InteractionIndicator rotation={playerRotation} type="punch" isDebug />
                                )}
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">
                                    {nickname}
                                </div>
                                <Player rotation={playerRotation} />
                            </div>
                        );
                    }
                     if (entity.type === 'remote-player') {
                        return (
                            <div
                                key={entity.id}
                                style={{ position: 'absolute', left: entity.position.x, top: entity.position.y }}
                            >
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">
                                    {entity.nickname}
                                </div>
                                <Player rotation={entity.rotation} />
                            </div>
                        );
                    }
                    const obj = entity as WorldObject;
                    return (
                        <div
                            key={obj.id}
                            className={`absolute select-none transition-transform duration-200 ${hitEffects.includes(obj.id) ? 'animate-shake' : ''}`}
                            style={{ left: obj.position.x, top: obj.position.y, fontSize: `${obj.size}rem`, transform: 'translate(-50%, -50%)', lineHeight: 1 }}
                        >
                            {obj.emoji}
                        </div>
                    );
                })}

                {Object.keys(healthIndicators).map((id) => {
                    const indicator = healthIndicators[Number(id) as keyof typeof healthIndicators];
                    const { position, size, current, max } = indicator;
                    const topOffset = (size * 16) / 2 + 10;
                    return (
                        <div
                            key={`hp-${id}`}
                            className="absolute bg-black/60 text-white text-sm font-bold px-2 py-0.5 rounded-full z-20"
                            style={{
                                left: position.x,
                                top: position.y - topOffset,
                                transform: 'translateX(-50%)',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {current} / {max}
                        </div>
                    );
                })}


                {settings.showHitboxes && (
                    <>
                        <div style={{ position: 'absolute', left: `${playerHitbox.x}px`, top: `${playerHitbox.y}px`, width: `${playerHitbox.radius * 2}px`, height: `${playerHitbox.radius * 2}px`, backgroundColor: 'rgba(255, 0, 0, 0.4)', border: '1px solid red', borderRadius: '50%', transform: `translate(-50%, -50%)`, zIndex: 999 }} />
                        {worldObjects.map(obj => obj.hitbox && (
                            <div key={`hitbox-${obj.id}`} style={{ position: 'absolute', left: obj.position.x, top: obj.position.y + obj.hitbox.offsetY, width: `${obj.hitbox.width}px`, height: `${obj.hitbox.height}px`, backgroundColor: 'rgba(0, 0, 255, 0.4)', border: '1px solid blue', transform: 'translate(-50%, -50%)', zIndex: 998 }} />
                        ))}
                    </>
                )}
            </div>
            
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-4 right-4 z-10 pointer-events-auto">
                    <button onClick={handlePause} className="w-12 h-12 bg-gray-500/50 text-white text-2xl rounded-md flex items-center justify-center active:bg-gray-600/50">||</button>
                </div>
                
                {settings.showFps && <div className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded-md z-10 pointer-events-auto">FPS: {fps}</div>}
                
                {hotbarLayout.visible !== false && (
                    <div 
                        style={{ ...hotbarStyle, backgroundColor: hotbarLayout.backgroundColor }}
                        className={`flex items-end gap-2 p-2 rounded-lg z-10 pointer-events-auto ${hotbarFlexDirection}`}
                    >
                        {hotbarItems.map((item, i) => (
                            <div
                                key={i}
                                onClick={() => setSelectedSlot(i)}
                                style={hotbarSlotStyle}
                                className={`relative bg-black/30 border-2 rounded-md flex items-center justify-center transition-all cursor-pointer ${selectedSlot === i ? 'border-yellow-400 scale-110' : 'border-gray-500'}`}
                            >
                                {item && (
                                    <>
                                        <ItemIcon 
                                            type={item.type} 
                                            className={item.type === 'stone' ? '' : 'w-full h-full p-1.5'}
                                        />
                                        <span className="absolute bottom-0 right-1 text-white text-lg font-bold" style={{ textShadow: '1px 1px 2px black', fontSize: `${settings.inventorySize * 0.25}px` }}>
                                            {item.quantity}
                                        </span>
                                    </>
                                )}
                            </div>
                        ))}
                        <button
                            onClick={toggleInventory}
                            style={hotbarBagStyle}
                            aria-label="Открыть инвентарь"
                            className="bg-black/30 border-2 border-gray-500 rounded-md flex items-center justify-center transition-all hover:border-gray-400 active:scale-95"
                        >
                           🎒
                        </button>
                    </div>
                )}


                {punchButtonLayout.visible !== false && (
                    <div style={punchButtonStyle} className="z-10 pointer-events-auto">
                        <button 
                            onMouseDown={(e) => handleActionPress(e, handlePunchStart)}
                            onTouchStart={(e) => handleActionPress(e, handlePunchStart)}
                            onMouseUp={(e) => handleActionPress(e, handlePunchEnd)}
                            onTouchEnd={(e) => handleActionPress(e, handlePunchEnd)}
                            onMouseLeave={(e) => { if(isCharging) handleActionPress(e, handlePunchEnd)} }
                            onTouchCancel={(e) => { if(isCharging) handleActionPress(e, handlePunchEnd)} }
                            style={actionButtonStyle}
                            className={`bg-red-500/80 flex items-center justify-center text-white font-bold border-2 border-red-800 active:bg-red-600 touch-none ${punchButtonShapeClass}`}
                        >
                            Бить{!isTouchDevice && ' (Пробел)'}
                        </button>
                    </div>
                )}
                
                {buildButtonLayout.visible !== false && (isTouchDevice || !isTouchDevice) && (
                    <div style={buildButtonStyle} className={`z-10 pointer-events-auto ${isTouchDevice ? '' : 'hidden'}`}>
                        <button 
                            onMouseDown={(e) => handleActionPress(e, handlePlaceItem)}
                            onTouchStart={(e) => handleActionPress(e, handlePlaceItem)}
                            disabled={!canBuild}
                            style={actionButtonStyle}
                            className={`bg-yellow-500/80 flex items-center justify-center text-white font-bold border-2 border-yellow-800 active:bg-yellow-600 disabled:bg-gray-600/80 disabled:border-gray-800 disabled:cursor-not-allowed ${buildButtonShapeClass}`}
                        >
                            Строить
                        </button>
                    </div>
                )}


                {joystickLayout.visible !== false && (
                    <div style={joystickStyle} className="z-10 pointer-events-auto">
                        <Joystick onMove={handleJoystickMove} size={settings.joystickSize} />
                    </div>
                )}
            </div>
            
            {gameState === 'paused' && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20">
                    <h2 className="text-5xl font-bold mb-8">Пауза</h2>
                     <button onClick={handleResume} className="px-8 py-4 bg-green-600 text-white font-bold rounded-lg text-2xl hover:bg-green-700 transition-colors mb-4">
                        Продолжить
                    </button>
                    <button onClick={onBackToMenu} className="px-8 py-4 bg-red-600 text-white font-bold rounded-lg text-2xl hover:bg-red-700 transition-colors">
                        В меню
                    </button>
                </div>
            )}

             {gameState === 'inventory' && (
                <Inventory
                    inventory={inventory}
                    onClose={toggleInventory}
                    craftingInput={craftingInput}
                    craftingOutput={craftingOutput}
                    allRecipes={ALL_RECIPES}
                    settings={settings}
                    draggedItem={draggedItem}
                    onSlotClick={handleSlotClick}
                    onReturnDraggedItem={handleReturnDraggedItem}
                />
            )}

            {showDebugMenu && (
                <DebugMenu
                    onClose={() => setShowDebugMenu(false)}
                    onGiveItem={handleGiveItemDebug}
                    onSpawnObject={handleSpawnObjectDebug}
                />
            )}
        </div>
    );
};

export default Game;