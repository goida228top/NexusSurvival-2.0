import React, { useState, useRef, useEffect } from 'react';
import type { PeerJSDataConnection } from '../types';

// Declare PeerJS to TypeScript since it's loaded from a CDN in index.html
declare const Peer: any;

interface OnlineLobbyProps {
    onBack: () => void;
    onConnect: (dataChannel: PeerJSDataConnection) => void;
}

// A list of public PeerJS signaling servers.
// If one fails, the app will automatically try the next one.
const PEER_SIGNALING_SERVERS = [
    {
        host: 'peerjs.com',
        path: '/peerjs', // Correct path for the default peerjs server
        port: 443,
        secure: true,
    },
    { 
        host: 'peerjs-server.fly.dev',
        port: 443,
        path: '/',
        secure: true,
    },
    { 
        host: 'peerjs.re-chat.ru',
        port: 443,
        path: '/',
        secure: true,
    }
];

// Configuration for STUN and TURN servers to help establish a direct connection.
// TURN servers are used as a fallback relay when a direct P2P connection fails,
// which is crucial for getting through restrictive firewalls (causing ERR_TUNNEL_CONNECTION_FAILED).
const ICE_SERVERS = {
    'iceServers': [
        // STUN servers help peers discover each other's public IP address.
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // A free public TURN server.
        {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
        {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
        }
    ]
};


type LobbyState = 'initializing' | 'idle' | 'waiting' | 'connecting' | 'error';

const OnlineLobby: React.FC<OnlineLobbyProps> = ({ onBack, onConnect }) => {
    const [lobbyState, setLobbyState] = useState<LobbyState>('initializing');
    const [myId, setMyId] = useState<string>('');
    const [joinId, setJoinId] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [serverIndex, setServerIndex] = useState(0); // Index for PEER_SIGNALING_SERVERS array

    const peerRef = useRef<any | null>(null);
    const connRef = useRef<PeerJSDataConnection | null>(null);

    useEffect(() => {
        // If we've tried all servers and none worked
        if (serverIndex >= PEER_SIGNALING_SERVERS.length) {
            setError('Не удалось подключиться ни к одному из доступных онлайн-сервисов. Проверьте ваше интернет-соединение или попробуйте позже.');
            setLobbyState('error');
            return;
        }
        
        // Cleanup function to destroy peer connection on component unmount or retry
        const cleanup = () => {
            if (peerRef.current) {
                peerRef.current.destroy();
                peerRef.current = null;
            }
             if (connRef.current) {
                connRef.current.close();
                connRef.current = null;
            }
        };

        const signalingServerConfig = PEER_SIGNALING_SERVERS[serverIndex];
        console.log(`Attempting to connect to signaling server ${serverIndex + 1}/${PEER_SIGNALING_SERVERS.length}: ${signalingServerConfig.host}`);
        
        try {
            // We pass 'undefined' for the ID to let the server assign one.
            const peer = new Peer(undefined, {
                ...signalingServerConfig,
                config: ICE_SERVERS // Use the combined STUN/TURN configuration
            });
            peerRef.current = peer;

            // Set a timeout for the connection attempt
            const connectionTimeout = setTimeout(() => {
                if (!peer.open) {
                     console.error(`Connection to ${signalingServerConfig.host} timed out.`);
                     cleanup();
                     setServerIndex(prevIndex => prevIndex + 1); // Try next server
                }
            }, 10000); // 10 second timeout

            peer.on('open', (id: string) => {
                clearTimeout(connectionTimeout);
                console.log(`✅ Successfully connected to ${signalingServerConfig.host}. My peer ID is: ${id}`);
                setMyId(id);
                setLobbyState('idle');
            });

            peer.on('connection', (conn: PeerJSDataConnection) => {
                console.log(`Incoming connection from ${conn.peer}`);
                connRef.current = conn;
                conn.on('open', () => {
                    console.log('✅ Data connection is open (as host)');
                    onConnect(conn);
                });
            });
            
            peer.on('error', (err: any) => {
                clearTimeout(connectionTimeout);
                // If it's a server/network error during initialization, try the next server
                if (!peer.open && (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error' || err.type === 'browser-incompatible')) {
                    console.error(`Failed to connect to ${signalingServerConfig.host}. Error:`, err);
                    cleanup();
                    setServerIndex(prevIndex => prevIndex + 1); // Try next server
                    return;
                }
                
                // Handle other in-game errors
                console.error('PeerJS error:', err);
                let userMessage = 'Произошла неизвестная ошибка.';
                if (err.type === 'peer-unavailable') {
                    userMessage = `Не удалось найти игрока с кодом: ${joinId}. Проверьте код и попробуйте снова.`;
                } else if (err.type === 'server-error' || err.type === 'network') {
                     userMessage = 'Произошла ошибка сервера. Попробуйте перезагрузить страницу.';
                }
                setError(userMessage);
                setLobbyState('idle'); // Show error on idle screen
                setJoinId(''); // Clear join id on error
            });
            
             peer.on('disconnected', () => {
                if(lobbyState !== 'error') {
                    setError('Отключено от сигнального сервера. Попробуйте перезагрузить страницу.');
                    setLobbyState('error');
                }
            });

        } catch (e) {
            console.error('Failed to initialize PeerJS', e);
            setError('Не удалось загрузить библиотеку для онлайн-игры. Попробуйте обновить страницу.');
            setLobbyState('error');
        }

        return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serverIndex]);

    const handleCreateGame = () => setLobbyState('waiting');

    const handleJoinGame = () => {
        const trimmedId = joinId.trim();
        if (!trimmedId || !peerRef.current) {
            setError('Пожалуйста, введите код комнаты.');
            return;
        }
        setError(null);
        setLobbyState('connecting');

        const conn = peerRef.current.connect(trimmedId, { reliable: true });
        connRef.current = conn;
        
        // Add a timeout to prevent getting stuck
        const connectionTimeout = setTimeout(() => {
            if (connRef.current && !connRef.current.open) {
                console.error("Connection attempt timed out.");
                setError(
                    "Не удалось подключиться к игроку. Попробуйте снова.\n\n" +
                    "Совет: Убедитесь, что оба игрока находятся в одинаковых сетевых условиях (например, оба БЕЗ VPN, или оба в одной Wi-Fi сети)."
                );
                setLobbyState('idle'); // Go back to the main lobby view
                conn.close();
            }
        }, 15000); // 15 second timeout

        conn.on('open', () => {
            clearTimeout(connectionTimeout); // Success! Clear the timeout.
            console.log(`✅ Data connection is open (as client) to ${trimmedId}`);
            onConnect(conn);
        });
        
        // Handle connection-specific errors
        conn.on('error', (err: any) => {
            clearTimeout(connectionTimeout);
            console.error("Data connection error:", err);
            setError(`Ошибка подключения: ${err.message}. Проверьте код и сетевые настройки.`);
            setLobbyState('idle');
        });
    };
    
     const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            alert('Код скопирован в буфер обмена!');
        } catch (err) {
            alert('Не удалось скопировать. Пожалуйста, сделайте это вручную.');
        }
    };

    const renderContent = () => {
        switch (lobbyState) {
            case 'initializing':
                 return <p className="text-2xl animate-pulse text-center">Подключение к онлайн-сервису... (попытка {serverIndex + 1}/{PEER_SIGNALING_SERVERS.length})</p>;
            case 'error':
                return (
                    <div className="text-center">
                         <p className="text-red-500 mb-4 bg-red-900/50 p-3 rounded-md">{error}</p>
                         <button onClick={onBack} className="mt-4 px-6 py-2 bg-red-600 text-white font-bold rounded-lg text-lg hover:bg-red-700">Назад</button>
                    </div>
                );
            case 'waiting':
                return (
                    <div className="w-full max-w-lg text-center">
                        <h3 className="text-2xl font-bold mb-2">Код вашей комнаты:</h3>
                        <p className="mb-4 text-gray-400">Отправьте этот код другу.</p>
                        <div className="relative mb-6">
                            <input readOnly value={myId} className="px-4 py-3 bg-gray-800 text-white rounded-lg text-lg w-full text-center border-2 border-green-500 font-mono select-all" />
                            <button onClick={() => copyToClipboard(myId)} className="absolute top-2 right-2 px-3 py-1 bg-green-700 rounded-md text-sm">Копировать</button>
                        </div>
                        <p className="text-xl animate-pulse">Ожидание игрока...</p>
                        <p className="text-sm text-gray-500 mt-2">Если подключение не происходит, попросите друга проверить правильность кода.</p>
                    </div>
                );
            case 'connecting':
                return (
                    <div className="text-center">
                        <p className="text-2xl animate-pulse">Присоединение к игре...</p>
                        <p className="text-sm text-gray-500 mt-2">Если подключение занимает много времени, проверьте код или попробуйте создать игру заново.</p>
                    </div>
                );
            case 'idle':
            default:
                return (
                     <>
                        {error && <p className="mb-4 text-center text-red-400 bg-red-900/50 p-3 rounded-md whitespace-pre-wrap">{error}</p>}
                        <div className="flex flex-col gap-4 items-center mb-8">
                            <button
                                onClick={handleCreateGame}
                                className="px-8 py-4 bg-green-600 text-white font-bold rounded-lg text-2xl hover:bg-green-700 transition-colors w-64"
                            >
                                Создать игру
                            </button>
                            <div className="text-xl my-2">или</div>
                            <div className="flex flex-col gap-2 items-center">
                                <input
                                    type="text"
                                    value={joinId}
                                    onChange={(e) => setJoinId(e.target.value)}
                                    placeholder="Вставьте код комнаты..."
                                    className="px-4 py-3 bg-gray-800 text-white rounded-lg text-lg w-80 text-center placeholder-gray-500 border-2 border-gray-700 focus:border-purple-500 focus:outline-none"
                                />
                                <button
                                    onClick={handleJoinGame}
                                    disabled={!joinId}
                                    className="px-8 py-4 bg-purple-600 text-white font-bold rounded-lg text-2xl hover:bg-purple-700 transition-colors w-64 disabled:bg-gray-500"
                                >
                                    Присоединиться
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={onBack}
                            className="mt-8 px-6 py-2 bg-red-600 text-white font-bold rounded-lg text-lg hover:bg-red-700 transition-colors"
                        >
                            Назад
                        </button>
                    </>
                );
        }
    }

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white p-4">
            <h2 className="text-4xl font-bold mb-8">Онлайн Лобби</h2>
            {renderContent()}
        </div>
    );
};

export default OnlineLobby;
