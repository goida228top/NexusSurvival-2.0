
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Game from './components/Game';
import Settings from './components/Settings';
import type { GameSettings, GameState } from './types';

const defaultSettings: GameSettings = {
    joystickSize: 160,
    buttonSize: 96,
    inventorySize: 64,
    showFps: false,
    showHitboxes: false,
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
                // Ensure all keys are present, falling back to default if not
                return { ...defaultSettings, ...parsed };
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

    useEffect(() => {
        // General cleanup for the socket when the App component unmounts.
        return () => {
            if (socket?.readyState === WebSocket.OPEN) {
                console.log("App unmounting, closing socket.");
                socket.close();
            }
        };
    }, [socket]);

    const handlePlayClick = useCallback(() => {
        setGameState('mode-select');
    }, []);
    
    const handleSettingsClick = useCallback(() => {
        setGameState('settings');
    }, []);

    const handleOfflineClick = useCallback(() => {
        setGameMode('offline');
        if (socket) {
            socket.close();
            setSocket(null);
        }
        setGameState('playing');
    }, [socket]);

    const handleOnlineClick = useCallback(() => {
        setGameState('connecting');
        setConnectionError(null);

        const newSocket = new WebSocket('ws://64.188.92.134:8080');

        newSocket.onopen = () => {
            console.log('WebSocket connection established.');
            setSocket(newSocket);
            setGameMode('online');
            setGameState('playing');
        };

        newSocket.onclose = (event) => {
            console.log('WebSocket connection closed.', event.reason);
            // Don't show an error if we closed it intentionally
            if (event.wasClean) return;

            setConnectionError('Соединение с сервером потеряно.');
            setSocket(null);
            setGameState('mode-select');
        };

        newSocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            setConnectionError('Не удалось подключиться к серверу. Убедитесь, что сервер запущен и доступен.');
            setSocket(null);
            setGameState('mode-select');
        };
    }, []);

    const handleBackToMenu = useCallback(() => {
        if (socket) {
            socket.close();
            setSocket(null);
        }
        setGameState('menu');
    }, [socket]);
    
    const handleBackToMenuFromGame = useCallback(() => {
        if (socket) {
            socket.close();
            setSocket(null);
        }
        setGameState('menu');
    }, [socket]);

    const handleBackToModeSelect = useCallback(() => {
        if (socket) {
            socket.close();
            setSocket(null);
        }
        setGameState('mode-select');
    }, [socket]);


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
                return (
                    <Settings 
                        settings={settings}
                        setSettings={setSettings}
                        onBack={handleBackToMenu}
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