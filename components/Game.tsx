import React, { useState, useEffect, useRef } from 'react';
import Joystick from './Joystick';
import type { Position, WorldObject, InventoryItem, InventoryItemType } from '../types';

type GameState = 'menu' | 'mode-select' | 'playing' | 'paused';

interface GameProps {
    gameState: GameState;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

const initialWorldObjects: WorldObject[] = [
    { id: 1, type: 'tree', position: { x: 300, y: 150 }, health: 5, emoji: '🌳', size: 6 },
    { id: 2, type: 'rock', position: { x: 450, y: 300 }, health: 3, emoji: '🪨', size: 4 },
    { id: 3, type: 'tree', position: { x: 600, y: 100 }, health: 5, emoji: '🌳', size: 6 },
    { id: 4, type: 'tree', position: { x: 200, y: 400 }, health: 5, emoji: '🌳', size: 6 },
    { id: 5, type: 'rock', position: { x: 700, y: 500 }, health: 3, emoji: '🪨', size: 4 },
    { id: 6, type: 'tree', position: { x: 100, y: 600 }, health: 5, emoji: '🌳', size: 6 },
];


const Game: React.FC<GameProps> = ({ gameState, setGameState }) => {
    const [playerPosition, setPlayerPosition] = useState<Position>({ x: 100, y: 100 });
    const [worldObjects, setWorldObjects] = useState<WorldObject[]>(initialWorldObjects);
    const [inventory, setInventory] = useState<(InventoryItem | undefined)[]>([]);
    const [hitEffects, setHitEffects] = useState<number[]>([]); // stores IDs of hit objects for animation
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const keysPressed = useRef<{ [key: string]: boolean }>({});
    const gameLoopRef = useRef<number | null>(null);
    const nextObjectId = useRef<number>(initialWorldObjects.length + 1);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const handlePause = () => {
        setGameState('paused');
    };

    const handleResume = () => {
        setGameState('playing');
    };
    
    const handleBackToMenu = () => {
        setGameState('menu');
    }

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keysPressed.current[e.key.toLowerCase()] = true;
            // Map Russian layout
            if (e.key === 'ц') keysPressed.current['w'] = true;
            if (e.key === 'ф') keysPressed.current['a'] = true;
            if (e.key === 'ы') keysPressed.current['s'] = true;
            if (e.key === 'в') keysPressed.current['d'] = true;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            keysPressed.current[e.key.toLowerCase()] = false;
            if (e.key === 'ц') keysPressed.current['w'] = false;
            if (e.key === 'ф') keysPressed.current['a'] = false;
            if (e.key === 'ы') keysPressed.current['s'] = false;
            if (e.key === 'в') keysPressed.current['d'] = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Game loop
    useEffect(() => {
        const gameLoop = () => {
            if (gameState === 'playing') {
                setPlayerPosition(prev => {
                    let { x, y } = prev;
                    const speed = 3;
                    if (keysPressed.current['w']) y -= speed;
                    if (keysPressed.current['s']) y += speed;
                    if (keysPressed.current['a']) x -= speed;
                    if (keysPressed.current['d']) x += speed;
                    return { x, y };
                });
            }
            gameLoopRef.current = requestAnimationFrame(gameLoop);
        };
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return () => {
            if (gameLoopRef.current) {
                cancelAnimationFrame(gameLoopRef.current);
            }
        };
    }, [gameState]);

    const handleJoystickMove = (x: number, y: number) => {
         if (gameState !== 'playing') return;
        setPlayerPosition(prev => ({
            x: prev.x + x * 3,
            y: prev.y + y * 3
        }));
    };

    const addToInventory = (itemType: InventoryItemType) => {
        setInventory(prev => {
            let newInventory = [...prev];
            const existingItemIndex = newInventory.findIndex(item => item?.type === itemType);
    
            if (existingItemIndex > -1) {
                const item = newInventory[existingItemIndex]!;
                newInventory[existingItemIndex] = { ...item, quantity: item.quantity + 1 };
                return newInventory;
            }
    
            let firstEmptySlot = -1;
            for (let i = 0; i < 5; i++) {
                if (!newInventory[i]) {
                    firstEmptySlot = i;
                    break;
                }
            }
    
            if (firstEmptySlot !== -1) {
                newInventory[firstEmptySlot] = { type: itemType, quantity: 1 };
                return newInventory;
            }
    
            return prev; // Hotbar is full
        });
    };
    

    const handlePunch = () => {
        if (gameState !== 'playing') return;

        const punchRange = 60;
        let closestObject: WorldObject | null = null;
        let minDistance = Infinity;

        for (const obj of worldObjects) {
            const distance = Math.sqrt(
                Math.pow(playerPosition.x - obj.position.x, 2) +
                Math.pow(playerPosition.y - obj.position.y, 2)
            );
            if (distance < punchRange && distance < minDistance) {
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
    
    const handleSlotClick = (index: number) => {
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

        const newObject: WorldObject = {
            id: nextObjectId.current++,
            type: newObjectType,
            position: { x: playerPosition.x, y: playerPosition.y },
            health: newObjectType === 'tree' ? 5 : 3,
            emoji: newObjectType === 'tree' ? '🌳' : '🪨',
            size: newObjectType === 'tree' ? 6 : 4,
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


    const getItemEmoji = (type: InventoryItemType) => {
        switch(type) {
            case 'wood': return '🪵';
            case 'stone': return '🪨';
            default: return '';
        }
    }

    return (
        <div className="relative w-full h-full bg-green-400 overflow-hidden select-none">
            {/* World Objects */}
            {worldObjects.map(obj => (
                 <div
                    key={obj.id}
                    className={`absolute select-none transition-transform duration-200 ${hitEffects.includes(obj.id) ? 'animate-shake' : ''}`}
                    style={{
                        left: obj.position.x,
                        top: obj.position.y,
                        fontSize: `${obj.size}rem`,
                        transform: 'translate(-50%, -50%)',
                        lineHeight: 1,
                    }}
                 >
                    {obj.emoji}
                </div>
            ))}

            {/* Player */}
            <div
                className="absolute w-10 h-10 bg-blue-500 rounded-full border-2 border-black"
                style={{ left: playerPosition.x, top: playerPosition.y, transform: 'translate(-50%, -50%)' }}
            />

            {/* UI */}
            <div className="absolute top-4 right-4">
                <button onClick={handlePause} className="w-12 h-12 bg-gray-500/50 text-white text-2xl rounded-md flex items-center justify-center active:bg-gray-600/50">||</button>
            </div>
            
            {/* Inventory Hotbar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-2 bg-black/20 p-2 rounded-lg">
                {Array.from({ length: 6 }).map((_, i) => {
                    if (i < 5) {
                        const item = inventory[i];
                        const isSelected = selectedSlot === i;
                        return (
                            <div
                                key={i}
                                onClick={() => handleSlotClick(i)}
                                className={`relative w-16 h-16 bg-black/30 border-2 rounded-md flex items-center justify-center text-4xl cursor-pointer transition-all ${isSelected ? 'border-yellow-400 scale-110' : 'border-gray-500'}`}
                            >
                               {item && (
                                    <>
                                        <span>{getItemEmoji(item.type)}</span>
                                        <span className="absolute bottom-0 right-1 text-white text-lg font-bold" style={{ textShadow: '1px 1px 2px black' }}>
                                            {item.quantity}
                                        </span>
                                    </>
                                )}
                            </div>
                        );
                    } else {
                        return (
                            <div key={i} className="w-16 h-16 bg-black/50 border-2 border-gray-500 rounded-md flex items-center justify-center text-3xl">🎒</div>
                        );
                    }
                })}
            </div>


            <div className="absolute bottom-4 right-4 flex flex-col gap-4">
                 <button onClick={handlePunch} className="w-24 h-24 bg-red-500/80 rounded-lg flex items-center justify-center text-white text-xl font-bold border-2 border-red-800 active:bg-red-600">Бить</button>
                 <button 
                    onClick={handlePlaceItem}
                    disabled={selectedSlot === null}
                    className="w-24 h-24 bg-yellow-500/80 rounded-lg flex items-center justify-center text-white text-xl font-bold border-2 border-yellow-800 active:bg-yellow-600 disabled:bg-gray-600/80 disabled:border-gray-800 disabled:cursor-not-allowed"
                 >
                    Строить
                </button>
            </div>

            {isTouchDevice && (
                 <div className="absolute bottom-4 left-4">
                    <Joystick onMove={handleJoystickMove} />
                 </div>
            )}
            
            {/* Pause Menu */}
            {gameState === 'paused' && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                    <h2 className="text-5xl font-bold mb-8">Пауза</h2>
                     <button onClick={handleResume} className="px-8 py-4 bg-green-600 text-white font-bold rounded-lg text-2xl hover:bg-green-700 transition-colors mb-4">
                        Продолжить
                    </button>
                    <button onClick={handleBackToMenu} className="px-8 py-4 bg-red-600 text-white font-bold rounded-lg text-2xl hover:bg-red-700 transition-colors">
                        В меню
                    </button>
                </div>
            )}
        </div>
    );
};

export default Game;