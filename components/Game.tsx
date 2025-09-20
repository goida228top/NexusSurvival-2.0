import React, { useState, useEffect, useRef } from 'react';
import Joystick from './Joystick';

type GameState = 'menu' | 'mode-select' | 'playing' | 'paused';
type Position = { x: number; y: number };

interface GameProps {
    gameState: GameState;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

const Game: React.FC<GameProps> = ({ gameState, setGameState }) => {
    const [playerPosition, setPlayerPosition] = useState<Position>({ x: 100, y: 100 });
    const keysPressed = useRef<{ [key: string]: boolean }>({});
    // FIX: Initialize useRef with null to avoid errors when no initial value is provided.
    const gameLoopRef = useRef<number | null>(null);
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

    return (
        <div className="relative w-full h-full bg-green-400 overflow-hidden select-none">
            {/* World Objects */}
            <div className="absolute text-6xl" style={{ left: '300px', top: '150px' }}>🌳</div>
            <div className="absolute text-4xl" style={{ left: '450px', top: '300px' }}>🪨</div>

            {/* Player */}
            <div
                className="absolute w-10 h-10 bg-blue-500 rounded-full border-2 border-black"
                style={{ left: playerPosition.x, top: playerPosition.y, transform: 'translate(-50%, -50%)' }}
            />

            {/* UI */}
            <div className="absolute top-4 right-4">
                <button onClick={handlePause} className="w-12 h-12 bg-gray-500/50 text-white text-2xl rounded-md flex items-center justify-center">||</button>
            </div>
            
            <div className="absolute bottom-4 left-4 flex items-end gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="w-16 h-16 bg-black/30 border-2 border-gray-500 rounded-md" />
                ))}
                <div className="w-12 h-12 bg-black/50 border-2 border-gray-500 rounded-md flex items-center justify-center text-3xl">🎒</div>
            </div>

            <div className="absolute bottom-4 right-4 flex flex-col gap-4">
                 <button className="w-20 h-20 bg-red-500/80 rounded-full flex items-center justify-center text-white text-xl font-bold border-2 border-red-800">Бить</button>
                 <button className="w-20 h-20 bg-yellow-500/80 rounded-full flex items-center justify-center text-white text-xl font-bold border-2 border-yellow-800">🖐️</button>
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