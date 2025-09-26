import React from 'react';
import type { InventoryItem, InventoryItemType, Recipe } from '../types';
import PlayerModel from './PlayerModel';
import ItemIcon from './ItemIcon';

interface InventoryProps {
    inventory: (InventoryItem | undefined)[];
    onClose: () => void;
    craftingInput: (InventoryItem | undefined)[];
    craftingOutput: (InventoryItem | undefined);
    filteredRecipes: Recipe[];
    onInventorySlotClick: (slotIndex: number) => void;
    onCraftingSlotClick: (slotIndex: number) => void;
    onTakeOutput: () => void;
}

const Slot: React.FC<{ 
    item?: InventoryItem, 
    onClick?: () => void,
    className?: string,
}> = ({ item, onClick, className = '' }) => {
    const sizeClasses = "w-16 h-16";
    const emojiSize = "text-4xl";
    const itemIconClass = item?.type === 'stone' || !item?.type ? emojiSize : 'w-full h-full p-1';

    return (
        <div 
            className={`flex-shrink-0 ${sizeClasses} bg-black/40 border border-gray-600 rounded-md flex items-center justify-center relative aspect-square transition-colors ${onClick ? 'cursor-pointer hover:bg-black/60' : ''} ${className}`}
            onClick={onClick}
        >
            {item && (
                 <>
                    <ItemIcon type={item.type} className={itemIconClass} />
                    <span className="absolute bottom-1 right-1 text-white text-base font-bold" style={{ textShadow: '1px 1px 2px black' }}>
                        {item.quantity > 1 ? item.quantity : ''}
                    </span>
                </>
            )}
        </div>
    );
};

const LockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C9.243 2 7 4.243 7 7V9H6C4.897 9 4 9.897 4 11V19C4 20.103 4.897 21 6 21H18C19.103 21 20 20.103 20 19V11C20 9.897 19.103 9 18 9H17V7C17 4.243 14.757 2 12 2ZM12 4C13.654 4 15 5.346 15 7V9H9V7C9 5.346 10.346 4 12 4Z"/>
    </svg>
);


const LockedSlot: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
    <div 
        className="w-16 h-16 bg-black/60 border border-gray-800 rounded-md flex items-center justify-center relative aspect-square cursor-pointer"
        onClick={onClick}
        title="Заблокировано"
    >
        <LockIcon className="w-8 h-8 text-gray-700" />
    </div>
);


const EquipmentSlot: React.FC<{ icon: string, type: string }> = ({ icon, type }) => {
    return (
         <div title={type} className="w-16 h-16 bg-black/40 border border-gray-600 rounded-md flex items-center justify-center relative aspect-square text-4xl text-gray-500">
            {icon}
        </div>
    );
};

const Inventory: React.FC<InventoryProps> = ({ 
    inventory, 
    onClose,
    craftingInput,
    craftingOutput,
    filteredRecipes,
    onInventorySlotClick,
    onCraftingSlotClick,
    onTakeOutput,
}) => {
    const unlockedItems = inventory.slice(0, 5);
    
    const handleLockedSlotClick = () => {
        alert('Чтобы открыть эти слоты, вам нужен рюкзак');
    };

    return (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 p-2 sm:p-4" onClick={onClose}>
            <div 
                className="bg-[#2d2d2d] border-2 border-gray-700 rounded-lg p-4 sm:p-6 shadow-2xl max-w-5xl w-full text-white overflow-y-auto max-h-[95vh]" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-end items-center mb-4">
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-4xl leading-none">&times;</button>
                </div>

                {/* Main Content Area (responsive layout) */}
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Left Column: Character & Inventory */}
                    <div className="flex-1 md:max-w-xs">
                        {/* Character */}
                        <div className="flex justify-center items-start gap-2 sm:gap-4 p-2 bg-black/20 rounded-lg">
                            <div className="flex flex-col gap-2">
                                <EquipmentSlot icon="👑" type="Шлем" />
                                <EquipmentSlot icon="👕" type="Нагрудник" />
                                <EquipmentSlot icon="👖" type="Поножи" />
                                <EquipmentSlot icon="👟" type="Ботинки" />
                            </div>
                            <PlayerModel />
                            <div className="flex flex-col gap-2">
                                <EquipmentSlot icon="💍" type="Кольцо" />
                                <EquipmentSlot icon="🧿" type="Амулет" />
                                <EquipmentSlot icon="🎒" type="Рюкзак" />
                                <EquipmentSlot icon="🛡️" type="Щит" />
                            </div>
                        </div>

                        {/* Inventory */}
                        <div className="mt-6">
                            <div className="flex justify-center sm:justify-start gap-2 flex-wrap">
                                {unlockedItems.map((item, i) => <Slot key={`inventory-${i}`} item={item} onClick={() => onInventorySlotClick(i)} />)}
                                {Array.from({ length: 7 }).map((_, i) => (
                                    <LockedSlot key={`locked-${i}`} onClick={handleLockedSlotClick} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Crafting */}
                    <div className="flex-1">
                        <div className="p-2 bg-black/20 rounded-lg flex flex-col">
                             <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                                 {craftingInput.map((item, i) => <Slot key={`craft-input-${i}`} item={item} onClick={() => onCraftingSlotClick(i)} />)}
                                <div className="text-3xl sm:text-5xl mx-2 sm:mx-4 text-gray-500 font-bold">&rarr;</div>
                                <Slot item={craftingOutput} onClick={onTakeOutput} className={!!craftingOutput ? 'border-green-500' : ''} />
                            </div>

                            <div className="w-full h-px bg-gray-600 my-4"></div>
                            
                            <div className="bg-black/30 rounded-md p-2 overflow-y-auto space-y-1">
                                {filteredRecipes.length > 0 ? (
                                    filteredRecipes.map((recipe) => (
                                        <div key={recipe.id} className="flex items-center justify-between w-full bg-black/20 p-1 rounded-md text-sm">
                                            {/* Ingredients */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {recipe.ingredients.map((ing, index) => (
                                                    <div key={index} className="flex items-center gap-1" title={`${ing.quantity} ${ing.type}`}>
                                                        <div className="w-5 h-5 bg-black/40 rounded-sm flex items-center justify-center">
                                                            <ItemIcon type={ing.type} className={ing.type === 'stone' ? 'text-sm' : 'w-3.5 h-3.5'} />
                                                        </div>
                                                        <span className="text-gray-300">x{ing.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="text-lg mx-2 text-gray-500 font-bold">&rarr;</div>

                                            {/* Output */}
                                            <div className="flex items-center gap-1" title={`${recipe.output.quantity} ${recipe.output.type}`}>
                                                <div className="w-6 h-6 bg-green-900/50 rounded-sm flex items-center justify-center border border-green-700">
                                                    <ItemIcon type={recipe.output.type} className={recipe.output.type === 'stone' ? 'text-base' : 'w-4 h-4'} />
                                                </div>
                                                <span className="font-semibold">x{recipe.output.quantity}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex items-center justify-center p-4">
                                        <p className="text-gray-500">Нет доступных рецептов.</p>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Inventory;