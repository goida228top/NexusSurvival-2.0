import React, { useState, useRef } from 'react';
import { createHostOffer, createClientAnswer, finalizeHostConnection } from '../services/peerService';

interface OnlineLobbyProps {
    onBack: () => void;
    onConnect: (dataChannel: RTCDataChannel) => void;
}

type LobbyState = 'idle' | 'hosting' | 'joining' | 'connecting';

const OnlineLobby: React.FC<OnlineLobbyProps> = ({ onBack, onConnect }) => {
    const [lobbyState, setLobbyState] = useState<LobbyState>('idle');
    const [roomCode, setRoomCode] = useState('');
    const [answerCode, setAnswerCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    
    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            alert('Код скопирован в буфер обмена!');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Не удалось скопировать. Пожалуйста, сделайте это вручную.');
        }
    };

    const handleCreateGame = async () => {
        setLobbyState('connecting');
        setError(null);
        try {
            const { pc, offer, dataChannel } = await createHostOffer();
            peerConnectionRef.current = pc;
            setRoomCode(btoa(JSON.stringify(offer))); // Base64 encode the offer
            setLobbyState('hosting');

            dataChannel.onopen = () => {
                console.log('HOST: Data channel is open');
                onConnect(dataChannel);
            };
            dataChannel.onerror = (err) => console.error('HOST: DC error', err);

        } catch (e) {
            console.error(e);
            setError('Не удалось создать игру. Проверьте консоль на наличие ошибок.');
            setLobbyState('idle');
        }
    };
    
    const handleJoinGame = async () => {
        if (!roomCode) {
            setError('Пожалуйста, введите код комнаты.');
            return;
        }
        setLobbyState('connecting');
        setError(null);
        try {
            const offer = JSON.parse(atob(roomCode));
            const { answer, dataChannel } = await createClientAnswer(offer);
            
            dataChannel.onopen = () => {
                console.log('CLIENT: Data channel is open');
                onConnect(dataChannel);
            };
            dataChannel.onerror = (err) => console.error('CLIENT: DC error', err);

            const encodedAnswer = btoa(JSON.stringify(answer));
            setAnswerCode(encodedAnswer);
            setLobbyState('joining');

        } catch (e) {
            console.error(e);
            setError('Не удалось присоединиться. Убедитесь, что код комнаты правильный.');
            setLobbyState('idle');
        }
    };

    const handleFinalize = async () => {
        if (!answerCode) {
            setError('Пожалуйста, введите код ответа.');
            return;
        }
        if (!peerConnectionRef.current) {
             setError('Ошибка: соединение не было создано.');
             return;
        }
        setError(null);
        try {
            const answer = JSON.parse(atob(answerCode));
            await finalizeHostConnection(peerConnectionRef.current, answer);
            // The onopen event on the data channel will fire, triggering onConnect
        } catch (e) {
            console.error(e);
            setError('Не удалось подключиться. Убедитесь, что код ответа правильный.');
        }
    };


    const renderIdle = () => (
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
                    <textarea
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value)}
                        placeholder="Вставьте код комнаты..."
                        className="px-4 py-3 bg-gray-800 text-white rounded-lg text-lg w-80 text-center placeholder-gray-500 border-2 border-gray-700 focus:border-purple-500 focus:outline-none resize-none"
                        rows={3}
                    />
                    <button
                        onClick={handleJoinGame}
                        className="px-8 py-4 bg-purple-600 text-white font-bold rounded-lg text-2xl hover:bg-purple-700 transition-colors w-64"
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

    const renderHosting = () => (
         <div className="w-full max-w-lg text-center">
            <h3 className="text-2xl font-bold mb-2">1. Ваш Код комнаты:</h3>
            <p className="mb-4">Отправьте этот код другому игроку.</p>
            <div className="relative mb-6">
                <textarea
                    readOnly
                    value={roomCode}
                    className="px-4 py-3 bg-gray-800 text-white rounded-lg text-lg w-full text-center placeholder-gray-500 border-2 border-green-500 resize-none"
                    rows={3}
                />
                <button onClick={() => copyToClipboard(roomCode)} className="absolute top-2 right-2 px-3 py-1 bg-green-700 rounded-md text-sm">Копировать</button>
            </div>

            <h3 className="text-2xl font-bold mb-2">2. Вставьте код ответа:</h3>
             <p className="mb-4">Получите код от другого игрока и вставьте его сюда.</p>
            <div className="flex flex-col gap-2 items-center">
                <textarea
                    value={answerCode}
                    onChange={(e) => setAnswerCode(e.target.value)}
                    placeholder="Код ответа от друга..."
                    className="px-4 py-3 bg-gray-800 text-white rounded-lg text-lg w-full text-center placeholder-gray-500 border-2 border-gray-700 focus:border-purple-500 focus:outline-none resize-none"
                    rows={3}
                />
                <button
                    onClick={handleFinalize}
                    className="px-8 py-4 bg-purple-600 text-white font-bold rounded-lg text-2xl hover:bg-purple-700 transition-colors w-64"
                >
                    Подключиться
                </button>
            </div>
         </div>
    );
    
    const renderJoining = () => (
         <div className="w-full max-w-lg text-center">
            <h3 className="text-2xl font-bold mb-2">Отправьте этот Код ответа хосту:</h3>
             <div className="relative mb-6">
                 <textarea
                    readOnly
                    value={answerCode}
                    className="px-4 py-3 bg-gray-800 text-white rounded-lg text-lg w-full text-center placeholder-gray-500 border-2 border-purple-500 resize-none"
                    rows={3}
                />
                 <button onClick={() => copyToClipboard(answerCode)} className="absolute top-2 right-2 px-3 py-1 bg-purple-700 rounded-md text-sm">Копировать</button>
            </div>
            <p className="text-xl animate-pulse">Ожидание подключения от хоста...</p>
         </div>
    );

    const renderConnecting = () => (
        <p className="text-2xl animate-pulse">Установка соединения...</p>
    );

    const renderContent = () => {
        switch(lobbyState) {
            case 'idle': return renderIdle();
            case 'hosting': return renderHosting();
            case 'joining': return renderJoining();
            case 'connecting': return renderConnecting();
        }
    }

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white p-4">
            <h2 className="text-4xl font-bold mb-8">Онлайн Лобби</h2>
            {error && <p className="text-red-500 mb-4 bg-red-900/50 p-3 rounded-md">{error}</p>}
            {renderContent()}
        </div>
    );
};

export default OnlineLobby;
