
import React, { useState, useEffect, useCallback } from 'react';
import Game from './components/Game';
import Settings from './components/Settings';
import type { GameSettings, GameState } from './types';

const defaultSettings: GameSettings = {
    joystickSize: 160,
    buttonSize: 96,
    inventorySize: 64,
    showFps: false,
    showHitboxes: false,
    showPunchHitbox: false,
    layouts: {
        // Inventory
        player: { x: 50, y: 22, scale: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        crafting: { x: 50, y: 53, scale: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        grid: { x: 50, y: 82, scale: 1, gridStyle: 'grid', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        // HUD
        joystick: { x: 12, y: 85, scale: 1 },
        punchButton: { x: 92, y: 88, scale: 1, shape: 'square' },
        buildButton: { x: 92, y: 75, scale: 1, shape: 'square' },
        hotbar: { x: 50, y: 95, scale: 1, gridStyle: 'row', backgroundColor: 'rgba(0, 0, 0, 0.2)' },
    },
    inventoryBackgroundColor: 'rgba(0, 0, 0, 0.7)',
};

// A deep merge function to safely combine saved settings with defaults
const deepMerge = (target: any, source: any) => {
    const output = { ...target };
    if (target && typeof target === 'object' && source && typeof source === 'object') {
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && key in target) {
                output[key] = deepMerge(target[key], source[key]);
            } else {
                output[key] = source[key];
            }
        });
    }
    return output;
};


type GameMode = 'offline' | 'online';

const App: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>('menu');
    const [gameMode, setGameMode] = useState<GameMode>('offline');
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const [settings, setSettings] = useState<GameSettings>(() => {
        try {
            const savedSettings = localStorage.getItem('gameSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                // Deep merge with defaults to ensure new settings (like HUD layouts) are added
                return deepMerge(defaultSettings, parsed);
            }
        } catch (error) {
            console.error("Failed to load settings from localStorage", error);
        }
        return defaultSettings;
    });

    useEffect(() => {
        try {
            localStorage.setItem('gameSettings', JSON.stringify(settings));
        } catch (error) {
            console.error("Failed to save settings to localStorage", error);
        }
    }, [settings]);
    
    const cleanupConnection = useCallback(() => {
        if (socket) {
            socket.close(1000, "User initiated disconnect");
            setSocket(null);
        }
    }, [socket]);

    useEffect(() => {
        return () => {
            cleanupConnection();
        };
    }, [cleanupConnection]);

    const handlePlayClick = useCallback(() => {
        setGameState('mode-select');
    }, []);
    
    const handleSettingsClick = useCallback(() => {
        setGameState('settings');
    }, []);

    const handleOfflineClick = useCallback(() => {
        cleanupConnection();
        setGameMode('offline');
        setGameState('playing');
    }, [cleanupConnection]);

    const handleOnlineClick = useCallback(() => {
        setGameState('connecting');
        setConnectionError(null);
    
        const newSocket = new WebSocket('wss://nexussurvival.duckdns.org/websocket');
    
        newSocket.onopen = () => {
            console.log('WebSocket connection established.');
            setSocket(newSocket);
            setGameMode('online');
            setGameState('playing');
        };
    
        newSocket.onclose = (event) => {
            console.log('WebSocket connection closed.', event.reason);
            // Don't show an error if we closed it intentionally (code 1000)
            if (event.code === 1000) return;
            
            setConnectionError('Соединение с сервером потеряно.');
            setSocket(null);
            // Only change state if we are not already on a menu screen
            setGameState(prev => prev === 'playing' || prev === 'paused' || prev === 'connecting' ? 'mode-select' : prev);
        };
    
        newSocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            setConnectionError('Не удалось подключиться к серверу. Попробуйте снова позже.');
            setSocket(null);
            setGameState('mode-select');
        };
    }, []);
    
    const handleBackToMenu = useCallback(() => {
        cleanupConnection();
        setGameState('menu');
    }, [cleanupConnection]);
    
    const handleBackToMenuFromGame = useCallback(() => {
        cleanupConnection();
        setGameState('menu');
    }, [cleanupConnection]);

    const handleBackToModeSelect = useCallback(() => {
        cleanupConnection();
        setGameState('mode-select');
    }, [cleanupConnection]);


    const renderContent = () => {
        switch (gameState) {
            case 'menu':
                return (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-black">
                        <h1 className="text-6xl font-bold mb-8 animate-pulse">Survival Game</h1>
                        <div className="flex flex-col gap-4">
                            <button
                                onClick={handlePlayClick}
                                className="px-8 py-4 bg-green-600 text-white font-bold rounded-lg text-2xl hover:bg-green-700 transition-colors"
                            >
                                Играть
                            </button>
                             <button
                                onClick={handleSettingsClick}
                                className="px-8 py-4 bg-gray-600 text-white font-bold rounded-lg text-2xl hover:bg-gray-700 transition-colors"
                            >
                                Настройки
                            </button>
                        </div>
                    </div>
                );
            case 'settings':
            case 'customize-ui':
                return (
                    <Settings 
                        settings={settings}
                        setSettings={setSettings}
                        onBack={() => setGameState(gameState === 'customize-ui' ? 'settings' : 'menu')}
                        setGameState={setGameState}
                        customizeMode={gameState === 'customize-ui'}
                        defaultSettings={defaultSettings}
                    />
                );
            case 'mode-select':
                return (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-black p-4">
                        {connectionError && <p className="mb-4 text-center text-red-400 bg-red-900/50 p-3 rounded-md">{connectionError}</p>}
                        <h2 className="text-4xl font-bold mb-8">Выберите режим</h2>
                        <div className="flex gap-4">
                            <button
                                onClick={handleOfflineClick}
                                className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg text-2xl hover:bg-blue-700 transition-colors"
                            >
                                Офлайн
                            </button>
                            <button
                                onClick={handleOnlineClick}
                                className="px-8 py-4 bg-purple-600 text-white font-bold rounded-lg text-2xl hover:bg-purple-700 transition-colors"
                            >
                                Онлайн
                            </button>
                        </div>
                         <button
                            onClick={handleBackToMenu}
                            className="mt-8 px-6 py-2 bg-red-600 text-white font-bold rounded-lg text-lg hover:bg-red-700 transition-colors"
                        >
                            Назад
                        </button>
                    </div>
                );
            case 'connecting':
                 return (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-black">
                        <p className="text-2xl animate-pulse">Подключение к серверу...</p>
                        <button
                            onClick={handleBackToModeSelect}
                            className="mt-8 px-6 py-2 bg-red-600 text-white font-bold rounded-lg text-lg hover:bg-red-700 transition-colors"
                        >
                            Отмена
                        </button>
                    </div>
                );
            case 'playing':
            case 'paused':
            case 'inventory':
                return <Game 
                            gameState={gameState} 
                            setGameState={setGameState} 
                            settings={settings} 
                            gameMode={gameMode}
                            socket={socket}
                            onBackToMenu={handleBackToMenuFromGame}
                        />;
        }
    };

    return <>{renderContent()}</>;
};

export default App;