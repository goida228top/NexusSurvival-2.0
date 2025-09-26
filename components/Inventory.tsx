
import React from 'react';
import type { InventoryItem, Recipe, GameSettings } from '../types';
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
    settings: GameSettings;
}

const Slot: React.FC<{ 
    item?: InventoryItem, 
    onClick?: () => void,
    className?: string,
}> = ({ item, onClick, className = '' }) => {
    const sizeClasses = "w-12 h-12";
    const itemIconClass = item?.type === 'stone' || !item?.type ? "text-2xl" : 'w-full h-full p-1';
    const quantitySize = "text-xs";

    return (
        <div 
            className={`flex-shrink-0 ${sizeClasses} bg-black/40 border border-gray-600 rounded-md flex items-center justify-center relative aspect-square transition-colors ${onClick ? 'cursor-pointer hover:bg-black/60' : ''} ${className}`}
            onClick={onClick}
        >
            {item && (
                 <>
                    <ItemIcon type={item.type} className={itemIconClass} />
                    <span className={`absolute bottom-0.5 right-1 text-white font-bold ${quantitySize}`} style={{ textShadow: '1px 1px 2px black' }}>
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
        className="w-12 h-12 bg-black/60 border border-gray-800 rounded-md flex items-center justify-center relative aspect-square cursor-pointer flex-shrink-0"
        onClick={onClick}
        title="Заблокировано"
    >
        <LockIcon className="w-5 h-5 text-gray-700" />
    </div>
);

const EquipmentSlot: React.FC<{ icon: string, type: string }> = ({ icon, type }) => {
    return (
         <div title={type} className="w-12 h-12 bg-black/40 border border-gray-600 rounded-md flex items-center justify-center relative aspect-square text-2xl text-gray-500">
            {icon}
        </div>
    );
};

// --- Reusable Panel Components ---

const PlayerPanel: React.FC = () => (
    <div className="flex justify-center items-start gap-3 p-3 bg-black/50 border border-gray-700 rounded-xl pointer-events-auto">
        <div className="flex flex-col gap-1.5">
            <EquipmentSlot icon="👑" type="Шлем" />
            <EquipmentSlot icon="👕" type="Нагрудник" />
            <EquipmentSlot icon="👖" type="Поножи" />
            <EquipmentSlot icon="👟" type="Ботинки" />
        </div>
        <div className="w-28 h-40">
           <PlayerModel />
        </div>
        <div className="flex flex-col gap-1.5">
            <EquipmentSlot icon="💍" type="Кольцо" />
            <EquipmentSlot icon="🧿" type="Амулет" />
            <EquipmentSlot icon="🎒" type="Рюкзак" />
            <EquipmentSlot icon="🛡️" type="Щит" />
        </div>
    </div>
);

const CraftingPanel: React.FC<Pick<InventoryProps, 'craftingInput' | 'craftingOutput' | 'filteredRecipes' | 'onCraftingSlotClick' | 'onTakeOutput'>> = 
({ craftingInput, craftingOutput, filteredRecipes, onCraftingSlotClick, onTakeOutput }) => (
    <div className="flex flex-col items-start gap-3 p-3 bg-black/50 border border-gray-700 rounded-xl pointer-events-auto w-[350px]">
        <div className="flex items-center justify-start gap-1.5">
           {craftingInput.map((item, i) => <Slot key={`craft-input-${i}`} item={item} onClick={() => onCraftingSlotClick(i)} />)}
            <div className="text-2xl mx-1.5 text-gray-500 font-bold">&rarr;</div>
            <Slot item={craftingOutput} onClick={onTakeOutput} className={!!craftingOutput ? 'border-green-500' : ''} />
        </div>
        <div className="bg-black/30 rounded-md p-1.5 space-y-1 h-40 w-full overflow-y-auto">
            {filteredRecipes.length > 0 ? (
                filteredRecipes.map((recipe) => (
                    <div key={recipe.id} className="flex items-center justify-between w-full bg-black/20 p-1 rounded-md text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {recipe.ingredients.map((ing, index) => (
                                <div key={index} className="flex items-center gap-1" title={`${ing.quantity} ${ing.type}`}>
                                    <div className="w-4 h-4 bg-black/40 rounded-sm flex items-center justify-center">
                                        <ItemIcon type={ing.type} className={ing.type === 'stone' ? 'text-xs' : 'w-3 h-3'} />
                                    </div>
                                    <span className="text-gray-300">x{ing.quantity}</span>
                                </div>
                            ))}
                        </div>
                        <div className="text-base mx-1.5 text-gray-500 font-bold">&rarr;</div>
                        <div className="flex items-center gap-1" title={`${recipe.output.quantity} ${recipe.output.type}`}>
                            <div className="w-5 h-5 bg-green-900/50 rounded-sm flex items-center justify-center border border-green-700">
                                <ItemIcon type={recipe.output.type} className={recipe.output.type === 'stone' ? 'text-sm' : 'w-3.5 h-3.5'} />
                            </div>
                            <span className="font-semibold">x{recipe.output.quantity}</span>
                        </div>
                    </div>
                ))
            ) : (
                <div className="flex items-center justify-center p-4 h-full">
                    <p className="text-gray-500">Нет доступных рецептов.</p>
                </div>
            )}
        </div>
    </div>
);

const GridPanel: React.FC<Pick<InventoryProps, 'inventory' | 'onInventorySlotClick'>> = ({ inventory, onInventorySlotClick }) => {
    const handleLockedSlotClick = () => {
        alert('Чтобы открыть эти слоты, вам нужен рюкзак');
    };
    return (
        <div className="p-3 bg-black/50 border border-gray-700 rounded-xl pointer-events-auto">
            <div className="flex flex-wrap justify-center gap-1.5 w-[300px]">
                {inventory.map((item, i) => {
                    if (i < 5) {
                        return <Slot key={`inventory-${i}`} item={item} onClick={() => onInventorySlotClick(i)} />;
                    } else {
                        return <LockedSlot key={`locked-${i}`} onClick={handleLockedSlotClick} />;
                    }
                })}
            </div>
        </div>
    );
};


const Inventory: React.FC<InventoryProps> = (props) => {
    const { onClose, settings } = props;
    const globalScale = settings.inventorySize / 64; // Base size is 64

    const getPanelStyle = (panel: keyof typeof settings.layouts): React.CSSProperties => {
        const layout = settings.layouts[panel];
        return {
            position: 'absolute',
            left: `${layout.x}%`,
            top: `${layout.y}%`,
            transform: `translate(-50%, -50%) scale(${layout.scale * globalScale})`,
            willChange: 'transform'
        };
    };

    return (
        <div 
            className="absolute inset-0 z-20 text-white" 
            style={{ backgroundColor: settings.inventoryBackgroundColor }}
            onClick={onClose}
        >
            <div className="relative w-full h-full pointer-events-none" onClick={e => e.stopPropagation()}>
                
                <div style={getPanelStyle('player')}>
                    <PlayerPanel />
                </div>

                <div style={getPanelStyle('crafting')}>
                    <CraftingPanel {...props} />
                </div>
                
                <div style={getPanelStyle('grid')}>
                    <GridPanel {...props} />
                </div>

                {/* Close button for mobile, always visible */}
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 w-10 h-10 bg-red-600/80 rounded-full flex items-center justify-center text-white text-2xl font-bold z-30 pointer-events-auto sm:hidden"
                    aria-label="Закрыть инвентарь"
                >
                    &times;
                </button>
            </div>
        </div>
    );
};

export default Inventory;