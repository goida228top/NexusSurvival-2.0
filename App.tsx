
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Game from './components/Game';
import Settings from './components/Settings';
import type { GameSettings, GameState, RemotePlayer } from './types';

const defaultSettings: GameSettings = {
    joystickSize: 160,
    buttonSize: 96,
    inventorySize: 64,
    showFps: false,
    showHitboxes: false,
    showPunchHitbox: false,
    layouts: {
        // Inventory
        player: { x: 50, y: 22, scale: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', visible: true },
        crafting: { x: 50, y: 53, scale: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', visible: true },
        grid: { x: 50, y: 82, scale: 1, gridStyle: 'grid', backgroundColor: 'rgba(0, 0, 0, 0.5)', visible: true },
        // HUD
        joystick: { x: 12, y: 85, scale: 1, visible: true },
        punchButton: { x: 92, y: 88, scale: 1, shape: 'square', visible: true },
        buildButton: { x: 92, y: 75, scale: 1, shape: 'square', visible: true },
        hotbar: { x: 50, y: 95, scale: 1, gridStyle: 'row', backgroundColor: 'rgba(0, 0, 0, 0.2)', visible: true },
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

const WEBSOCKET_URL = 'wss://nexussurvival.duckdns.org/websocket';
const MAX_RECONNECT_ATTEMPTS = 5;

const App: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>('menu');
    const [gameMode, setGameMode] = useState<GameMode>('offline');
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [initialPlayers, setInitialPlayers] = useState<RemotePlayer[]>([]);
    const [nickname, setNickname] = useState<string>(
        () => localStorage.getItem('playerNickname') || `Guest${Math.floor(Math.random() * 10000)}`
    );
    const [finalNickname, setFinalNickname] = useState<string>(nickname);

    const pingIntervalRef = useRef<number | null>(null);
    const pongTimeoutRef = useRef<number | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const reconnectTimeoutRef = useRef<number | null>(null);

    const [settings, setSettings] = useState<GameSettings>(() => {
        try {
            const savedSettings = localStorage.getItem('gameSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
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

    useEffect(() => {
        localStorage.setItem('playerNickname', nickname);
    }, [nickname]);

    const handleAppMessages = useCallback((event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'pong') {
                if (pongTimeoutRef.current) {
                    clearTimeout(pongTimeoutRef.current);
                    pongTimeoutRef.current = null;
                }
            } else if (data.type === 'init') {
                console.log("Received init from server, my ID:", data.playerId);
                
                setPlayerId(data.playerId);
                setInitialPlayers(data.players || []);
                setGameMode('online');
                setGameState('playing');
                setConnectionError(null);
                
                // After getting our ID, we tell the server our desired nickname.
                // The server is the authority and will confirm/change it.
                socket?.send(JSON.stringify({
                    type: 'set_nickname',
                    nickname: nickname.trim() || `Guest${Math.floor(Math.random() * 10000)}`
                }));

            } else if (data.type === 'nickname_updated') {
                // The server confirms our (or a new) nickname.
                if (data.playerId === playerId) {
                    console.log(`Server confirmed my nickname: ${data.nickname}`);
                    setFinalNickname(data.nickname);
                }
            }
        } catch (e) { /* ignore non-json messages */ }
    }, [nickname, playerId, socket]);
    
    const cleanupConnection = useCallback(() => {
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        pingIntervalRef.current = null;
        pongTimeoutRef.current = null;
        reconnectTimeoutRef.current = null;
        reconnectAttemptsRef.current = 0;

        if (socket) {
            socket.removeEventListener('message', handleAppMessages);
            socket.close(1000, "User initiated disconnect");
            setSocket(null);
            setPlayerId(null);
        }
    }, [socket, handleAppMessages]);

    useEffect(() => {
        return () => {
            cleanupConnection();
        };
    }, [cleanupConnection]);

    const handleConnectClick = useCallback(() => {
        setGameState('connecting');
        setConnectionError(null);
    
        const newSocket = new WebSocket(WEBSOCKET_URL);
    
        const startPing = () => {
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = window.setInterval(() => {
                if (newSocket.readyState === WebSocket.OPEN) {
                    newSocket.send(JSON.stringify({ type: 'ping' }));
                    if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);
                    pongTimeoutRef.current = window.setTimeout(() => {
                        console.warn("Pong not received in time. Connection is likely dead.");
                        newSocket.close(); // This will trigger the 'onclose' handler for reconnection
                    }, 5000); // 5 seconds to receive a pong
                }
            }, 10000); // Ping every 10 seconds
        };
    
        newSocket.onopen = () => {
            console.log('WebSocket connection established.');
            reconnectAttemptsRef.current = 0;
            setSocket(newSocket);
            startPing();
            // The server will now send an 'init' message, which is handled in handleAppMessages.
        };
    
        newSocket.addEventListener('message', handleAppMessages);
    
        newSocket.onclose = (event) => {
            console.log('WebSocket connection closed.', event.reason, 'Code:', event.code);
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);
            
            newSocket.removeEventListener('message', handleAppMessages);
            setSocket(null);
    
            // If the close was intentional (by user backing out) or we've hit max retries, stop.
            if (gameState !== 'playing' && (event.code === 1000 || reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS)) {
                 setGameState('mode-select'); // Go back if cancellation or final failure
                 setConnectionError('Не удалось подключиться.');
                 return;
            }
    
            // Reconnection logic
            const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000;
            reconnectAttemptsRef.current++;
            console.log(`Connection lost. Attempting to reconnect in ${delay / 1000}s... (Attempt ${reconnectAttemptsRef.current})`);
            
            setGameState('connecting');
            setConnectionError(`Соединение потеряно. Попытка переподключения... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
            
            reconnectTimeoutRef.current = window.setTimeout(handleConnectClick, delay);
        };
    
        newSocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            if (reconnectAttemptsRef.current === 0) {
                 setConnectionError('Не удалось подключиться к серверу. Проверьте ваше интернет-соединение.');
            }
            // The onclose event will fire after onerror, triggering reconnection logic.
        };
    }, [handleAppMessages, gameState]);

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
    
    const handleBackToMenu = useCallback(() => {
        cleanupConnection();
        setGameState('menu');
    }, [cleanupConnection]);
    
    const handleBackToModeSelect = useCallback(() => {
        cleanupConnection();
        setGameState('mode-select');
        setConnectionError(null);
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
                        <div className="mb-6 w-full max-w-xs">
                            <label htmlFor="nickname" className="block text-center text-gray-400 mb-2">Ваш никнейм</label>
                            <input
                                id="nickname"
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                maxLength={16}
                                className="px-4 py-3 bg-gray-800 text-white rounded-lg text-lg w-full text-center placeholder-gray-500 border-2 border-gray-700 focus:border-purple-500 focus:outline-none"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={handleOfflineClick}
                                className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg text-2xl hover:bg-blue-700 transition-colors"
                            >
                                Офлайн
                            </button>
                            <button
                                onClick={handleConnectClick}
                                disabled={!nickname.trim()}
                                className="px-8 py-4 bg-purple-600 text-white font-bold rounded-lg text-2xl hover:bg-purple-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
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
                        {connectionError && <p className="mt-4 text-center text-yellow-400">{connectionError}</p>}
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
                            playerId={playerId}
                            nickname={finalNickname}
                            initialPlayers={initialPlayers}
                            onBackToMenu={handleBackToMenu}
                        />;
        }
    };

    return <>{renderContent()}</>;
};

export default App;
