import React, { useEffect } from 'react';
import type { InventoryItemType, WorldObject } from '../types';
import ItemIcon from './ItemIcon';

interface DebugMenuProps {
    onClose: () => void;
    onGiveItem: (itemType: InventoryItemType, quantity: number) => void;
    onSpawnObject: (objectType: WorldObject['type']) => void;
}

const ALL_ITEM_TYPES: { type: InventoryItemType; name: string }[] = [
    { type: 'plank', name: 'Plank' },
    { type: 'stone', name: 'Stone' },
    { type: 'stick', name: 'Stick' },
    { type: 'workbench', name: 'Workbench' }
];

const ALL_SPAWNABLE_OBJECTS: { type: WorldObject['type']; name: string; emoji: string }[] = [
    { type: 'tree', name: 'Tree', emoji: '🌳' },
    { type: 'rock', name: 'Rock', emoji: '🪨' },
    { type: 'workbench', name: 'Workbench', emoji: '🛠️' }
];


const DebugMenu: React.FC<DebugMenuProps> = ({ onClose, onGiveItem, onSpawnObject }) => {
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 pointer-events-auto">
            <div className="bg-gray-800 border-2 border-indigo-500 rounded-lg p-6 w-full max-w-md text-white shadow-2xl relative">
                <button 
                    onClick={onClose}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-xl font-bold z-10"
                    aria-label="Close debug menu"
                >
                    &times;
                </button>

                <h2 className="text-2xl font-bold mb-4 text-center text-indigo-300">Debug Menu</h2>

                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2 border-b border-gray-600 pb-1">Give Items (Stack of 64)</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                        {ALL_ITEM_TYPES.map(({ type, name }) => (
                            <button
                                key={type}
                                onClick={() => onGiveItem(type, 64)}
                                className="flex flex-col items-center p-2 bg-gray-700 rounded-md hover:bg-indigo-700 transition-colors"
                                title={`Give 64 ${name}`}
                            >
                                <div className="w-12 h-12 flex items-center justify-center">
                                    <ItemIcon type={type} className={type === 'stone' ? 'text-4xl' : 'w-10 h-10'}/>
                                </div>
                                <span className="text-sm mt-1">{name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold mb-2 border-b border-gray-600 pb-1">Spawn Objects</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                        {ALL_SPAWNABLE_OBJECTS.map(({ type, name, emoji }) => (
                            <button
                                key={type}
                                onClick={() => onSpawnObject(type)}
                                className="flex flex-col items-center p-2 bg-gray-700 rounded-md hover:bg-indigo-700 transition-colors"
                                title={`Spawn ${name}`}
                            >
                                <span className="text-4xl">{emoji}</span>
                                <span className="text-sm mt-1">{name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DebugMenu;