
import React from 'react';
import type { InventoryItem, Recipe } from '../types';
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

// Адаптивный компонент слота
const Slot: React.FC<{ 
    item?: InventoryItem, 
    onClick?: () => void,
    className?: string,
}> = ({ item, onClick, className = '' }) => {
    // Размеры для мобильных устройств, увеличивающиеся на больших экранах
    const sizeClasses = "w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14";
    const emojiSize = "text-xl sm:text-2xl md:text-3xl";
    const itemIconClass = item?.type === 'stone' || !item?.type ? emojiSize : 'w-full h-full p-1';
    const quantitySize = "text-[10px] sm:text-xs md:text-sm";

    return (
        <div 
            className={`flex-shrink-0 ${sizeClasses} bg-black/40 border border-gray-600 rounded-md flex items-center justify-center relative aspect-square transition-colors ${onClick ? 'cursor-pointer hover:bg-black/60' : ''} ${className}`}
            onClick={onClick}
        >
            {item && (
                 <>
                    <ItemIcon type={item.type} className={itemIconClass} />
                    <span className={`absolute bottom-0.5 right-1.5 text-white font-bold ${quantitySize}`} style={{ textShadow: '1px 1px 2px black' }}>
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
        className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-black/60 border border-gray-800 rounded-md flex items-center justify-center relative aspect-square cursor-pointer flex-shrink-0"
        onClick={onClick}
        title="Заблокировано"
    >
        <LockIcon className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-700" />
    </div>
);


const EquipmentSlot: React.FC<{ icon: string, type: string }> = ({ icon, type }) => {
    return (
         <div title={type} className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-black/40 border border-gray-600 rounded-md flex items-center justify-center relative aspect-square text-xl sm:text-2xl md:text-3xl text-gray-500">
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
    
    const handleLockedSlotClick = () => {
        alert('Чтобы открыть эти слоты, вам нужен рюкзак');
    };

    return (
        // Основной полноэкранный контейнер с отступами, центрируется на средних и больших экранах
        <div className="absolute inset-0 bg-black/70 z-20 flex flex-col sm:p-4 text-white md:items-center md:justify-center" onClick={onClose}>
            
            {/* Модальное окно: полная высота/ширина на мобильных, авто на десктопе */}
            <div 
                className="relative w-full h-full flex flex-col bg-black/50 md:rounded-xl border-t sm:border border-gray-700 shadow-lg md:w-auto md:h-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Кнопка закрытия для мобильных устройств */}
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-600/80 rounded-full flex items-center justify-center text-white text-xl font-bold z-30 sm:hidden"
                    aria-label="Закрыть инвентарь"
                >
                    &times;
                </button>

                {/* Верхняя секция: Игрок и Крафт. Вертикальная на мобильных, горизонтальная на больших экранах */}
                <div className="flex flex-col sm:flex-row p-2 pt-8 sm:p-4 gap-2 sm:gap-4 items-center sm:items-start">
                
                    {/* Левая сторона: Персонаж и Экипировка */}
                    <div className="flex justify-center items-start gap-2 md:gap-4 flex-shrink-0">
                        <div className="flex flex-col gap-2">
                            <EquipmentSlot icon="👑" type="Шлем" />
                            <EquipmentSlot icon="👕" type="Нагрудник" />
                            <EquipmentSlot icon="👖" type="Поножи" />
                            <EquipmentSlot icon="👟" type="Ботинки" />
                        </div>
                        {/* Адаптивная модель игрока */}
                        <div className="w-20 h-32 sm:w-24 sm:h-36 lg:w-32 lg:h-48">
                           <PlayerModel />
                        </div>
                        <div className="flex flex-col gap-2">
                            <EquipmentSlot icon="💍" type="Кольцо" />
                            <EquipmentSlot icon="🧿" type="Амулет" />
                            <EquipmentSlot icon="🎒" type="Рюкзак" />
                            <EquipmentSlot icon="🛡️" type="Щит" />
                        </div>
                    </div>
                    
                    {/* Правая сторона: Крафт и Рецепты */}
                    <div className="flex flex-col items-center sm:items-start gap-2 md:gap-4 w-full sm:w-auto">
                        <h3 className="text-lg font-bold text-gray-300 self-start">Крафт</h3>
                        {/* Сетка крафта */}
                        <div className="flex items-center justify-start gap-1 sm:gap-2">
                           {craftingInput.map((item, i) => <Slot key={`craft-input-${i}`} item={item} onClick={() => onCraftingSlotClick(i)} />)}
                            <div className="text-2xl sm:text-3xl mx-1 sm:mx-2 text-gray-500 font-bold">&rarr;</div>
                            <Slot item={craftingOutput} onClick={onTakeOutput} className={!!craftingOutput ? 'border-green-500' : ''} />
                        </div>
                        {/* Список рецептов */}
                         <div className="bg-black/30 rounded-md p-2 space-y-1 h-28 sm:h-36 lg:h-48 overflow-y-auto w-full max-w-sm lg:max-w-md">
                            {filteredRecipes.length > 0 ? (
                                filteredRecipes.map((recipe) => (
                                    <div key={recipe.id} className="flex items-center justify-between w-full bg-black/20 p-1 rounded-md text-sm">
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
                                        <div className="flex items-center gap-1" title={`${recipe.output.quantity} ${recipe.output.type}`}>
                                            <div className="w-6 h-6 bg-green-900/50 rounded-sm flex items-center justify-center border border-green-700">
                                                <ItemIcon type={recipe.output.type} className={recipe.output.type === 'stone' ? 'text-base' : 'w-4 h-4'} />
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

                </div>

                {/* Нижняя секция: Полный инвентарь (прокручиваемый) */}
                <div className="flex-grow p-2 sm:p-4 border-t border-gray-700 overflow-y-auto">
                    <div className="flex flex-wrap justify-center gap-2">
                        {inventory.map((item, i) => {
                            if (i < 5) {
                                return <Slot key={`inventory-${i}`} item={item} onClick={() => onInventorySlotClick(i)} />;
                            } else {
                                return <LockedSlot key={`locked-${i}`} onClick={handleLockedSlotClick} />;
                            }
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Inventory;
