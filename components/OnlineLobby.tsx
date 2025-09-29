
import React, { useState, useEffect, useRef } from 'react';
import Game from './Game';
import type { GameSettings, GameState, RemotePlayer } from '../types';

interface OnlineLobbyProps {
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
    settings: GameSettings;
    onBackToMenu: () => void;
}

// The server is expected to be running at the root of the domain.
const WEBSOCKET_URL = "wss://nexussurvival.duckdns.org/websocket";

const OnlineLobby: React.FC<OnlineLobbyProps> = ({ setGameState, settings, onBackToMenu }) => {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [error, setError] = useState<string>('');
    const wsRef = useRef<WebSocket | null>(null);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [initialPlayers, setInitialPlayers] = useState<RemotePlayer[]>([]);
    const [nickname, setNickname] = useState<string>(
        () => localStorage.getItem('playerNickname') || `Guest${Math.floor(Math.random() * 10000)}`
    );

    useEffect(() => {
        if (wsRef.current) return;

        const ws = new WebSocket(WEBSOCKET_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('Connected to WebSocket server.');
        };

        ws.onmessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'init') {
                    console.log('Lobby: Received init from server, my ID:', data.playerId);
                    setPlayerId(String(data.playerId));
                    setInitialPlayers(data.players || []);
                    
                    ws.send(JSON.stringify({
                        type: 'set_nickname',
                        nickname: nickname.trim() || `Guest${Math.floor(Math.random() * 10000)}`
                    }));

                    // A short delay gives the user feedback that the connection was successful
                    setTimeout(() => {
                        setStatus('connected');
                    }, 500);
                }
            } catch (e) {
                console.warn('Lobby: Failed to process message', e);
            }
        };

        ws.onerror = (event) => {
            console.error('WebSocket error:', event);
            setError('Не удалось подключиться к серверу. Возможно, он в данный момент не в сети или неверный адрес.');
            setStatus('error');
            if (wsRef.current) wsRef.current = null;
        };

        ws.onclose = (event) => {
            console.log('WebSocket connection closed.', event);
            // If the connection closes while the game is running, go back to the menu
             if (status === 'connected') {
                alert('Соединение с сервером потеряно.');
                onBackToMenu();
            }
            // If it closes before connecting, it's an error
            else if (status === 'connecting') {
                setError('Соединение с сервером было закрыто.');
                setStatus('error');
            }
            if (wsRef.current) wsRef.current = null;
        };

        // Cleanup on component unmount
        return () => {
            if (wsRef.current && wsRef.current.readyState < 2) { // CLOSING or CLOSED
                wsRef.current.close();
            }
            wsRef.current = null;
        };
    }, [status, onBackToMenu, nickname]);

    // Once connected, render the Game component in online mode
    if (status === 'connected' && wsRef.current && playerId) {
        // FIX: The `online` prop is not valid for the `Game` component.
        // Replaced it with the correct props for online mode: `gameMode`, `socket`,
        // `playerId`, `nickname`, and `initialPlayers`.
        return (
            <Game
                gameState="playing"
                setGameState={setGameState}
                settings={settings}
                onBackToMenu={onBackToMenu}
                gameMode="online"
                socket={wsRef.current}
                playerId={playerId}
                nickname={nickname}
                initialPlayers={initialPlayers}
            />
        );
    }
    
    if (status === 'error') {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white">
                <h1 className="text-4xl font-bold mb-4 text-red-500">Ошибка подключения</h1>
                <p className="text-lg text-gray-300 max-w-md text-center mb-6">{error}</p>
                <button
                    onClick={onBackToMenu}
                    className="px-8 py-4 bg-gray-600 text-white font-bold rounded-lg text-2xl hover:bg-gray-700 transition-colors"
                >
                    Назад в меню
                </button>
            </div>
        );
    }

    // Default to connecting screen
    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white">
            <h1 className="text-4xl font-bold mb-4 animate-pulse">Подключение к серверу...</h1>
            <p className="text-lg text-gray-400">{WEBSOCKET_URL}</p>
        </div>
    );
};

export default OnlineLobby;
