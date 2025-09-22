import React, { useState, useRef, useEffect } from 'react';
import type { PeerJSDataConnection } from '../types';

// Declare PeerJS to TypeScript since it's loaded from a CDN in index.html
declare const Peer: any;

interface OnlineLobbyProps {
    onBack: () => void;
    onConnect: (dataChannel: PeerJSDataConnection) => void;
}

// ПРИМЕЧАНИЕ: Мы перешли на использование PeerJS.
// Эта библиотека упрощает WebRTC и использует свой собственный, более надежный 
// публичный сигнальный сервер, что должно решить проблемы с подключением.
type LobbyState = 'initializing' | 'idle' | 'waiting' | 'connecting' | 'error';

const OnlineLobby: React.FC<OnlineLobbyProps> = ({ onBack, onConnect }) => {
    const [lobbyState, setLobbyState] = useState<LobbyState>('initializing');
    const [myId, setMyId] = useState<string>('');
    const [joinId, setJoinId] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const peerRef = useRef<any | null>(null);
    const connRef = useRef<PeerJSDataConnection | null>(null);

    useEffect(() => {
        // Prevent double initialization in React.StrictMode
        if (peerRef.current) return;

        // Cleanup function to destroy peer connection on component unmount or error
        const cleanup = () => {
            if (connRef.current) {
                connRef.current.close();
                connRef.current = null;
            }
            if (peerRef.current) {
                peerRef.current.destroy();
                peerRef.current = null;
            }
        };

        try {
            const peer = new Peer();
            peerRef.current = peer;

            // Fired when the peer connects to the PeerJS server and gets an ID.
            peer.on('open', (id: string) => {
                console.log('My peer ID is: ' + id);
                setMyId(id);
                setLobbyState('idle');
            });

            // Fired when a remote peer tries to connect to you.
            peer.on('connection', (conn: PeerJSDataConnection) => {
                console.log(`Incoming connection from ${conn.peer}`);
                connRef.current = conn;
                conn.on('open', () => {
                    console.log('✅ Data connection is open (as host)');
                    onConnect(conn);
                });
            });
            
            peer.on('error', (err: any) => {
                console.error('PeerJS error:', err);
                let userMessage = 'Произошла неизвестная ошибка.';
                if (err.type === 'network') {
                    userMessage = 'Ошибка сети. Не удалось подключиться к сигнальному серверу.';
                } else if (err.type === 'peer-unavailable') {
                    userMessage = `Не удалось найти игрока с кодом: ${joinId}. Проверьте код и попробуйте снова.`;
                } else if (err.type === 'server-error') {
                     userMessage = 'Серверная ошибка. Попробуйте позже.';
                }
                setError(userMessage);
                setLobbyState('error');
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
    }, []);

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

        conn.on('open', () => {
            console.log(`✅ Data connection is open (as client) to ${trimmedId}`);
            onConnect(conn);
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
                 return <p className="text-2xl animate-pulse">Инициализация...</p>;
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
                        <p className="mb-4">Отправьте этот код другу.</p>
                        <div className="relative mb-6">
                            <input readOnly value={myId} className="px-4 py-3 bg-gray-800 text-white rounded-lg text-lg w-full text-center border-2 border-green-500 font-mono select-all" />
                            <button onClick={() => copyToClipboard(myId)} className="absolute top-2 right-2 px-3 py-1 bg-green-700 rounded-md text-sm">Копировать</button>
                        </div>
                        <p className="text-xl animate-pulse">Ожидание игрока...</p>
                    </div>
                );
            case 'connecting':
                return <p className="text-2xl animate-pulse">Присоединение к игре {joinId}...</p>;
            case 'idle':
            default:
                return (
                     <>
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