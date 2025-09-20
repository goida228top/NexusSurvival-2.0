import React, { useState } from 'react';
import Game from './components/Game';

type GameState = 'menu' | 'mode-select' | 'playing' | 'paused';

const App: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>('menu');

    const handlePlayClick = () => {
        setGameState('mode-select');
    };

    const handleOfflineClick = () => {
        setGameState('playing');
    };

    const handleBackToMenu = () => {
        setGameState('menu');
    };

    const renderContent = () => {
        switch (gameState) {
            case 'menu':
                return (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-black">
                        <h1 className="text-6xl font-bold mb-8 animate-pulse">Survival Game</h1>
                        <button
                            onClick={handlePlayClick}
                            className="px-8 py-4 bg-green-600 text-white font-bold rounded-lg text-2xl hover:bg-green-700 transition-colors"
                        >
                            Играть
                        </button>
                    </div>
                );
            case 'mode-select':
                return (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-black">
                        <h2 className="text-4xl font-bold mb-8">Выберите режим</h2>
                        <div className="flex gap-4">
                            <button
                                onClick={handleOfflineClick}
                                className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg text-2xl hover:bg-blue-700 transition-colors"
                            >
                                Офлайн
                            </button>
                            <button
                                disabled
                                className="px-8 py-4 bg-gray-600 text-gray-400 font-bold rounded-lg text-2xl cursor-not-allowed"
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
            case 'playing':
            case 'paused':
                return <Game gameState={gameState} setGameState={setGameState} />;
        }
    };

    return <>{renderContent()}</>;
};

export default App;
