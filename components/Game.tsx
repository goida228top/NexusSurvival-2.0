import React, { useState, useEffect, useRef } from 'react';
import Joystick from './Joystick';
import Player from './Player';
import InteractionIndicator from './InteractionIndicator';
import type { Position, WorldObject, InventoryItem, InventoryItemType, GameSettings, GameEntity, GameState, RemotePlayer } from '../types';

type GameMode = 'offline' | 'online';
interface GameProps {
    gameState: GameState;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
    settings: GameSettings;
    gameMode: GameMode;
    socket: WebSocket | null;
    onBackToMenu: () => void;
}

const initialWorldObjects: WorldObject[] = [
    { id: 1, type: 'tree', position: { x: 300, y: 150 }, health: 5, emoji: '🌳', size: 6, hitbox: { width: 8, height: 10, offsetY: 50 } },
    { id: 2, type: 'rock', position: { x: 450, y: 300 }, health: 3, emoji: '🪨', size: 4, hitbox: { width: 55, height: 30, offsetY: 15 } },
    { id: 3, type: 'tree', position: { x: 600, y: 100 }, health: 5, emoji: '🌳', size: 6, hitbox: { width: 8, height: 10, offsetY: 50 } },
    { id: 4, type: 'tree', position: { x: 200, y: 400 }, health: 5, emoji: '🌳', size: 6, hitbox: { width: 8, height: 10, offsetY: 50 } },
    { id: 5, type: 'rock', position: { x: 700, y: 500 }, health: 3, emoji: '🪨', size: 4, hitbox: { width: 55, height: 30, offsetY: 15 } },
    { id: 6, type: 'tree', position: { x: 100, y: 600 }, health: 5, emoji: '🌳', size: 6, hitbox: { width: 8, height: 10, offsetY: 50 } },
];

const PLAYER_HITBOX_RADIUS = 10;
const PLAYER_HITBOX_OFFSET_Y = -5;

type AABB = { x: number; y: number; width: number; height: number };
type Circle = { x: number; y: number; radius: number };

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

const checkCircleAABBCollision = (circle: Circle, rect: AABB): boolean => {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
    const distanceX = circle.x - closestX;
    const distanceY = circle.y - closestY;
    const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
    return distanceSquared < (circle.radius * circle.radius);
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

const Game: React.FC<GameProps> = ({ gameState, setGameState, settings, gameMode, socket, onBackToMenu }) => {
    const [playerPosition, setPlayerPosition] = useState<Position>({ x: 100, y: 100 });
    const [playerRotation, setPlayerRotation] = useState(0);
    const [worldObjects, setWorldObjects] = useState<WorldObject[]>(initialWorldObjects);
    const [inventory, setInventory] = useState<(InventoryItem | undefined)[]>([]);
    const [hitEffects, setHitEffects] = useState<number[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [fps, setFps] = useState(0);
    const [showPunchIndicator, setShowPunchIndicator] = useState(false);

    const [remotePlayers, setRemotePlayers] = useState<{ [id: string]: RemotePlayer }>({});

    const keysPressed = useRef<{ [key: string]: boolean }>({});
    const joystickVector = useRef({ x: 0, y: 0 });
    const gameLoopRef = useRef<number | null>(null);
    const nextObjectId = useRef<number>(initialWorldObjects.length + 1);
    
    const playerVelocity = useRef({ x: 0, y: 0 });
    const targetRotation = useRef(0);
    
    const lastTimeRef = useRef<number>(performance.now());
    const frameCountRef = useRef<number>(0);
    const handlePunchRef = useRef(handlePunch);
    
    // --- WebSocket Online Logic ---
    useEffect(() => {
        if (gameMode !== 'online' || !socket) {
            setRemotePlayers({});
            return;
        }

        const handleMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                switch (data.type) {
                    case 'WORLD_STATE': {
                        const players: { [id: string]: { x: number; y: number; rotation: number } } = data.payload.players;
                        const newRemotePlayers: { [id: string]: RemotePlayer } = {};
                        for (const id in players) {
                            newRemotePlayers[id] = {
                                id,
                                type: 'remote-player',
                                position: { x: players[id].x, y: players[id].y },
                                rotation: players[id].rotation,
                            };
                        }
                        setRemotePlayers(newRemotePlayers);
                        break;
                    }
                    case 'PLAYER_UPDATE': {
                        const { id, x, y, rotation } = data.payload;
                        setRemotePlayers(prev => ({
                            ...prev,
                            [id]: {
                                id,
                                type: 'remote-player',
                                position: { x, y },
                                rotation,
                            }
                        }));
                        break;
                    }
                    case 'PLAYER_DISCONNECTED': {
                        const { id } = data.payload;
                        setRemotePlayers(prev => {
                            const newPlayers = { ...prev };
                            delete newPlayers[id];
                            return newPlayers;
                        });
                        break;
                    }
                }
            } catch (e) {
                console.error("Failed to process message from server", e);
            }
        };

        socket.addEventListener('message', handleMessage);

        return () => {
            socket.removeEventListener('message', handleMessage);
        };
    }, [gameMode, socket]);
    
    // Throttled update sender to server
    useEffect(() => {
        if (gameMode !== 'online' || !socket || socket.readyState !== WebSocket.OPEN) return;

        const interval = setInterval(() => {
            const payload = {
                x: playerPosition.x,
                y: playerPosition.y,
                rotation: playerRotation,
            };
            socket.send(JSON.stringify({ type: 'MOVE', payload }));
        }, 50); // Send updates 20 times per second

        return () => clearInterval(interval);

    }, [gameMode, socket, playerPosition, playerRotation]);


    const handlePause = () => setGameState('paused');
    const handleResume = () => setGameState('playing');

    useEffect(() => {
        handlePunchRef.current = handlePunch;
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === ' ' && !e.repeat) {
                e.preventDefault();
                handlePunchRef.current();
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
            const key = e.key.toLowerCase();
            keysPressed.current[key] = false;
            if (key === 'ц') keysPressed.current['w'] = false;
            if (key === 'ф') keysPressed.current['a'] = false;
            if (key === 'ы') keysPressed.current['s'] = false;
            if (key === 'в') keysPressed.current['d'] = false;
        };
        
        const handleBlur = () => { keysPressed.current = {}; };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
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
                
                const rotationSpeed = 0.25;
                let targetVelX = 0;
                let targetVelY = 0;

                if (hasMovementInput) {
                    const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
                    
                    if (magnitude > 0.01) { 
                        const normalizedX = moveX / magnitude;
                        const normalizedY = moveY / magnitude;
                        
                        targetRotation.current = Math.atan2(normalizedY, normalizedX) * (180 / Math.PI) + 90;

                        const baseSpeed = 2.5;
                        const isSprinting = keysPressed.current['shift'];
                        const sprintMultiplier = 1.6;
                        const speed = isSprinting ? baseSpeed * sprintMultiplier : baseSpeed;

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

                setPlayerRotation(prevRotation => lerpAngle(prevRotation, targetRotation.current, rotationSpeed));

                setPlayerPosition(currentPosition => {
                    const nextX = currentPosition.x + playerVelocity.current.x;
                    const nextY = currentPosition.y + playerVelocity.current.y;
                    let finalX = currentPosition.x;
                    let finalY = currentPosition.y;

                    const playerHitboxX = getPlayerHitbox({ x: nextX, y: currentPosition.y });
                    let canMoveX = true;
                    for (const obj of worldObjects) {
                        const objHitbox = getObjectHitbox(obj);
                        if (objHitbox && checkCircleAABBCollision(playerHitboxX, objHitbox)) {
                            canMoveX = false;
                            playerVelocity.current.x = 0;
                            break;
                        }
                    }
                    if (canMoveX) finalX = nextX;

                    const playerHitboxY = getPlayerHitbox({ x: finalX, y: nextY });
                    let canMoveY = true;
                    for (const obj of worldObjects) {
                        const objHitbox = getObjectHitbox(obj);
                        if (objHitbox && checkCircleAABBCollision(playerHitboxY, objHitbox)) {
                            canMoveY = false;
                            playerVelocity.current.y = 0;
                            break;
                        }
                    }
                    if (canMoveY) finalY = nextY;
                    
                    if (finalX !== currentPosition.x || finalY !== currentPosition.y) {
                        return { x: finalX, y: finalY };
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
    }, [gameState, worldObjects]);


    const handleJoystickMove = (x: number, y: number) => { joystickVector.current = { x, y }; };

    const addToInventory = (itemType: InventoryItemType) => {
        setInventory(prev => {
            let newInventory = [...prev];
            const existingItemIndex = newInventory.findIndex(item => item?.type === itemType);
    
            if (existingItemIndex > -1) {
                const item = newInventory[existingItemIndex]!;
                newInventory[existingItemIndex] = { ...item, quantity: item.quantity + 1 };
                return newInventory;
            }
    
            let firstEmptySlot = newInventory.findIndex(item => !item);
             if (firstEmptySlot === -1 && newInventory.length < 5) {
                firstEmptySlot = newInventory.length;
            }
    
            if (firstEmptySlot !== -1) {
                newInventory[firstEmptySlot] = { type: itemType, quantity: 1 };
                return newInventory;
            }
    
            return prev;
        });
    };
    
    function handlePunch() {
        if (gameState !== 'playing') return;
        setShowPunchIndicator(true);
        setTimeout(() => setShowPunchIndicator(false), 1000);

        const punchRange = 60;
        const punchAngle = 90;
        const playerAngleRad = (playerRotation - 90) * (Math.PI / 180);
        const forwardVec = { x: Math.cos(playerAngleRad), y: Math.sin(playerAngleRad) };

        let closestObject: WorldObject | null = null;
        let minDistance = Infinity;

        for (const obj of worldObjects) {
            const toObjectVec = { x: obj.position.x - playerPosition.x, y: obj.position.y - playerPosition.y };
            const distance = Math.sqrt(toObjectVec.x ** 2 + toObjectVec.y ** 2);
            if (distance > punchRange || distance === 0) continue;
            const normalizedToObjectVec = { x: toObjectVec.x / distance, y: toObjectVec.y / distance };
            const dotProduct = forwardVec.x * normalizedToObjectVec.x + forwardVec.y * normalizedToObjectVec.y;
            const angleThreshold = Math.cos((punchAngle / 2) * (Math.PI / 180));
            if (dotProduct > angleThreshold && distance < minDistance) {
                minDistance = distance;
                closestObject = obj;
            }
        }

        if (closestObject) {
            setHitEffects(prev => [...prev, closestObject!.id]);
            setTimeout(() => setHitEffects(prev => prev.filter(id => id !== closestObject!.id)), 200);

            const newHealth = closestObject.health - 1;

            if (newHealth <= 0) {
                if (closestObject.type === 'tree') addToInventory('wood');
                else if (closestObject.type === 'rock') addToInventory('stone');
                setWorldObjects(prev => prev.filter(o => o.id !== closestObject!.id));
            } else {
                setWorldObjects(prev =>
                    prev.map(o => o.id === closestObject!.id ? { ...o, health: newHealth } : o)
                );
            }
        }
    };
    
    const handleSlotClick = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        if (!inventory[index]) {
            setSelectedSlot(null);
            return;
        }
        setSelectedSlot(prev => (prev === index ? null : index));
    };

    const handlePlaceItem = () => {
        if (selectedSlot === null || !inventory[selectedSlot]) return;

        const itemToPlace = inventory[selectedSlot]!;
        const newObjectType = itemToPlace.type === 'wood' ? 'tree' : 'rock';
        const placeDistance = 50;
        const playerAngleRad = (playerRotation - 90) * (Math.PI / 180);
    
        const newPosition = {
            x: playerPosition.x + Math.cos(playerAngleRad) * placeDistance,
            y: playerPosition.y + Math.sin(playerAngleRad) * placeDistance
        };

        const newObject: WorldObject = {
            id: nextObjectId.current++,
            type: newObjectType,
            position: newPosition,
            health: newObjectType === 'tree' ? 5 : 3,
            emoji: newObjectType === 'tree' ? '🌳' : '🪨',
            size: newObjectType === 'tree' ? 6 : 4,
            hitbox: newObjectType === 'tree' 
                ? { width: 8, height: 10, offsetY: 50 }
                : { width: 55, height: 30, offsetY: 15 },
        };
        setWorldObjects(prev => [...prev, newObject]);

        setInventory(prev => {
            const newInventory = [...prev];
            const currentItem = newInventory[selectedSlot];

            if (currentItem && currentItem.quantity > 1) {
                newInventory[selectedSlot] = { ...currentItem, quantity: currentItem.quantity - 1 };
            } else {
                newInventory[selectedSlot] = undefined;
                setSelectedSlot(null);
            }
            return newInventory;
        });
    };

    const getItemEmoji = (type: InventoryItemType) => type === 'wood' ? '🪵' : '🪨';

    const handleActionPress = (e: React.SyntheticEvent, action: () => void) => {
        e.stopPropagation();
        e.preventDefault();
        action();
    };

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
    const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    return (
        <div className="relative w-full h-full bg-green-400 overflow-hidden select-none">
            {renderableEntities.map(entity => {
                if (entity.type === 'player') {
                     return (
                        <div key="player" style={{ position: 'absolute', left: entity.position.x, top: entity.position.y }}>
                            <InteractionIndicator rotation={playerRotation} type={selectedSlot !== null ? 'build' : (showPunchIndicator ? 'punch' : 'none')} />
                            <Player rotation={playerRotation} />
                        </div>
                    );
                }
                 if (entity.type === 'remote-player') {
                    return (
                        <div
                            key={entity.id}
                            style={{ position: 'absolute', left: entity.position.x, top: entity.position.y, transition: 'left 0.05s linear, top 0.05s linear' }}
                        >
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

            {settings.showHitboxes && (
                <>
                    <div style={{ position: 'absolute', left: `${playerHitbox.x}px`, top: `${playerHitbox.y}px`, width: `${playerHitbox.radius * 2}px`, height: `${playerHitbox.radius * 2}px`, backgroundColor: 'rgba(255, 0, 0, 0.4)', border: '1px solid red', borderRadius: '50%', transform: `translate(-50%, -50%)`, zIndex: 999 }} />
                    {worldObjects.map(obj => obj.hitbox && (
                        <div key={`hitbox-${obj.id}`} style={{ position: 'absolute', left: obj.position.x, top: obj.position.y + obj.hitbox.offsetY, width: `${obj.hitbox.width}px`, height: `${obj.hitbox.height}px`, backgroundColor: 'rgba(0, 0, 255, 0.4)', border: '1px solid blue', transform: 'translate(-50%, -50%)', zIndex: 998 }} />
                    ))}
                </>
            )}

            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-4 right-4 z-10 pointer-events-auto">
                    <button onClick={handlePause} className="w-12 h-12 bg-gray-500/50 text-white text-2xl rounded-md flex items-center justify-center active:bg-gray-600/50">||</button>
                </div>
                
                {settings.showFps && <div className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded-md z-10 pointer-events-auto">FPS: {fps}</div>}
                
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-2 bg-black/20 p-2 rounded-lg z-10 pointer-events-auto">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            onClick={(e) => i < 5 ? handleSlotClick(e, i) : undefined}
                            style={i < 5 ? hotbarSlotStyle : hotbarBagStyle}
                            className={`relative bg-black/30 border-2 rounded-md flex items-center justify-center transition-all ${ i < 5 ? `cursor-pointer ${selectedSlot === i ? 'border-yellow-400 scale-110' : 'border-gray-500'}` : 'border-gray-500'}`}
                        >
                            {i < 5 ? (
                                inventory[i] && (
                                    <>
                                        <span>{getItemEmoji(inventory[i]!.type)}</span>
                                        <span className="absolute bottom-0 right-1 text-white text-lg font-bold" style={{ textShadow: '1px 1px 2px black', fontSize: `${settings.inventorySize * 0.25}px` }}>
                                            {inventory[i]!.quantity}
                                        </span>
                                    </>
                                )
                            ) : '🎒'}
                        </div>
                    ))}
                </div>

                <div className="absolute bottom-4 right-4 flex flex-col gap-4 z-10 pointer-events-auto">
                    <button 
                        onMouseDown={(e) => handleActionPress(e, handlePunch)}
                        onTouchStart={(e) => handleActionPress(e, handlePunch)}
                        style={actionButtonStyle}
                        className="bg-red-500/80 rounded-lg flex items-center justify-center text-white font-bold border-2 border-red-800 active:bg-red-600"
                    >
                        Бить{!isTouchDevice && ' (Пробел)'}
                    </button>
                    <button 
                        onMouseDown={(e) => handleActionPress(e, handlePlaceItem)}
                        onTouchStart={(e) => handleActionPress(e, handlePlaceItem)}
                        disabled={selectedSlot === null}
                        style={actionButtonStyle}
                        className="bg-yellow-500/80 rounded-lg flex items-center justify-center text-white font-bold border-2 border-yellow-800 active:bg-yellow-600 disabled:bg-gray-600/80 disabled:border-gray-800 disabled:cursor-not-allowed"
                    >
                        Строить
                    </button>
                </div>

                <div className="absolute bottom-4 left-4 z-10 pointer-events-auto">
                    <Joystick onMove={handleJoystickMove} size={settings.joystickSize} />
                </div>
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
        </div>
    );
};

export default Game;