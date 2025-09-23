
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Game from './components/Game';
import Settings from './components/Settings';
import OnlineLobby from './components/OnlineLobby';
import type { GameSettings, GameState, PeerJSDataConnection } from './types';

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
    const [peer, setPeer] = useState<any | null>(null);
    const [dataConnection, setDataConnection] = useState<PeerJSDataConnection | null>(null);

    const [settings, setSettings] = useState<GameSettings>(() => {
        try {
            const savedSettings = localStorage.getItem('gameSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
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
    
    const cleanupConnection = useCallback(() => {
        if (dataConnection) {
            dataConnection.close();
            setDataConnection(null);
        }
        if (peer) {
            if (!peer.destroyed) {
                peer.destroy();
            }
            setPeer(null);
        }
    }, [dataConnection, peer]);

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
        cleanupConnection();
        setGameMode('online');
        setGameState('online-lobby');
    }, [cleanupConnection]);

    const handleConnect = useCallback((conn: PeerJSDataConnection, peerInstance: any) => {
        setDataConnection(conn);
        setPeer(peerInstance);
        setGameState('playing');
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
            case 'online-lobby':
                return (
                    <OnlineLobby 
                        onBack={handleBackToModeSelect}
                        onConnect={handleConnect}
                    />
                );
            case 'playing':
            case 'paused':
                return <Game 
                            gameState={gameState} 
                            setGameState={setGameState} 
                            settings={settings} 
                            gameMode={gameMode}
                            dataConnection={dataConnection}
                            peer={peer}
                            onBackToMenu={handleBackToMenuFromGame}
                        />;
        }
    };

    return <>{renderContent()}</>;
};

export default App;