
import React, { useState, useEffect, useRef } from 'react';
import type { GameSettings, GameState, UILayout } from '../types';
import PlayerModel from './PlayerModel';
import ItemIcon from './ItemIcon';

interface SettingsProps {
    settings: GameSettings;
    setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
    onBack: () => void;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
    customizeMode: boolean;
    defaultLayouts: { player: UILayout; crafting: UILayout; grid: UILayout; };
}

// Dummy Panel Components for display in settings
const DummySlot: React.FC<{className?: string}> = ({className}) => <div className={`w-12 h-12 bg-black/40 border border-gray-600 rounded-md flex-shrink-0 ${className}`} />;
const DummyEquipmentSlot: React.FC = () => <div className="w-12 h-12 bg-black/40 border border-gray-600 rounded-md" />;

const PlayerPanel = () => (
    <div className="flex justify-center items-start gap-3 p-3 bg-black/50 border border-gray-700 rounded-xl">
        <div className="flex flex-col gap-1.5"><DummyEquipmentSlot /><DummyEquipmentSlot /><DummyEquipmentSlot /><DummyEquipmentSlot /></div>
        <div className="w-28 h-40"><PlayerModel /></div>
        <div className="flex flex-col gap-1.5"><DummyEquipmentSlot /><DummyEquipmentSlot /><DummyEquipmentSlot /><DummyEquipmentSlot /></div>
    </div>
);

const CraftingPanel = () => (
    <div className="flex flex-col items-start gap-3 p-3 bg-black/50 border border-gray-700 rounded-xl">
        <div className="flex items-center justify-start gap-1.5">
            <DummySlot /><DummySlot /><DummySlot /><DummySlot />
            <div className="text-2xl mx-1.5 text-gray-500 font-bold">&rarr;</div>
            <DummySlot className="border-green-500" />
        </div>
        <div className="bg-black/30 rounded-md p-1.5 space-y-1 h-40 w-[350px] overflow-y-auto">
            <div className="text-gray-500 p-4 text-center">Рецепты</div>
        </div>
    </div>
);

const GridPanel = () => (
    <div className="p-3 bg-black/50 border border-gray-700 rounded-xl">
        <div className="flex flex-wrap justify-center gap-1.5 w-[300px]">
            {Array.from({ length: 12 }).map((_, i) => <DummySlot key={i} />)}
        </div>
    </div>
);

// Helper to manage RGBA colors
const parseRgba = (rgba: string): { r: number, g: number, b: number, a: number } => {
    try {
        const result = rgba.match(/\d+(\.\d+)?/g);
        if (!result || result.length < 4) throw new Error("Invalid RGBA string");
        const [r, g, b, a] = result.map(Number);
        return { r, g, b, a };
    } catch (e) {
        console.error("Failed to parse RGBA color:", rgba, e);
        return { r: 0, g: 0, b: 0, a: 0.7 }; // fallback
    }
};

const toRgba = (color: { r: number, g: number, b: number, a: number }): string => {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
};


const Settings: React.FC<SettingsProps> = ({ settings, setSettings, onBack, setGameState, customizeMode, defaultLayouts }) => {

    const [currentLayouts, setCurrentLayouts] = useState(settings.layouts);
    const dragState = useRef<{
        active: boolean;
        panel: keyof typeof settings.layouts | null;
        action: 'drag' | 'resize' | null;
        startX: number;
        startY: number;
        startLayout: UILayout | null;
        startWidth: number;
        startHeight: number;
    }>({ active: false, panel: null, action: null, startX: 0, startY: 0, startLayout: null, startWidth: 0, startHeight: 0 });

    const panelRefs = {
        player: useRef<HTMLDivElement>(null),
        crafting: useRef<HTMLDivElement>(null),
        grid: useRef<HTMLDivElement>(null),
    };


    useEffect(() => {
        const handleMouseMove = (e: MouseEvent | TouchEvent) => {
            if (!dragState.current.active || !dragState.current.panel || !dragState.current.startLayout) return;

            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            const dx = (clientX - dragState.current.startX) / window.innerWidth * 100;
            const dy = (clientY - dragState.current.startY) / window.innerHeight * 100;
            
            const panel = dragState.current.panel;

            if (dragState.current.action === 'drag') {
                setCurrentLayouts(prev => ({
                    ...prev,
                    [panel]: {
                        ...prev[panel],
                        x: dragState.current.startLayout!.x + dx,
                        y: dragState.current.startLayout!.y + dy,
                    }
                }));
            } else if (dragState.current.action === 'resize') {
                 const currentWidth = dragState.current.startWidth + (clientX - dragState.current.startX);
                 const scale = currentWidth / dragState.current.startWidth;

                 setCurrentLayouts(prev => ({
                    ...prev,
                    [panel]: {
                        ...prev[panel],
                        scale: Math.max(0.5, Math.min(2.5, dragState.current.startLayout!.scale * scale)),
                    }
                }));
            }
        };

        const handleMouseUp = () => {
            dragState.current.active = false;
        };
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchend', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, []);

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, panel: keyof typeof settings.layouts, action: 'drag' | 'resize') => {
        e.preventDefault();
        e.stopPropagation();
        
        const panelRef = panelRefs[panel].current;
        if (!panelRef) return;

        dragState.current = {
            active: true,
            panel,
            action,
            startX: 'touches' in e.nativeEvent ? e.nativeEvent.touches[0].clientX : e.nativeEvent.clientX,
            startY: 'touches' in e.nativeEvent ? e.nativeEvent.touches[0].clientY : e.nativeEvent.clientY,
            startLayout: currentLayouts[panel],
            startWidth: panelRef.offsetWidth,
            startHeight: panelRef.offsetHeight,
        };
    };

    const handleSaveLayout = () => {
        setSettings(prev => ({ ...prev, layouts: currentLayouts }));
        onBack(); // Go back to regular settings screen
    };

    const handleResetLayout = () => {
        setCurrentLayouts(defaultLayouts);
    };

    const handleSettingChange = (setting: keyof GameSettings, value: string | boolean | number) => {
        setSettings(prev => ({
            ...prev,
            [setting]: value,
        }));
    };
    
    // --- Background Color Handlers ---
    const color = parseRgba(settings.inventoryBackgroundColor || 'rgba(0,0,0,0.7)');

    const handleColorChange = (r: number, g: number, b: number) => {
        const newColor = { ...color, r, g, b };
        handleSettingChange('inventoryBackgroundColor', toRgba(newColor));
    };
    
    const handleAlphaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newAlpha = parseFloat(e.target.value);
        const newColor = { ...color, a: newAlpha };
        handleSettingChange('inventoryBackgroundColor', toRgba(newColor));
    };


    if (customizeMode) {
        const globalScale = settings.inventorySize / 64;
        return (
            <div className="w-full h-full bg-black/50 text-white relative overflow-hidden">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
                    <p className="text-xl font-bold bg-black/70 px-4 py-2 rounded-lg">Режим настройки интерфейса</p>
                    <div className="flex gap-4">
                       <button onClick={handleSaveLayout} className="px-6 py-2 bg-green-600 rounded-lg font-semibold">Сохранить</button>
                       <button onClick={handleResetLayout} className="px-6 py-2 bg-yellow-600 rounded-lg font-semibold">Сбросить</button>
                       <button onClick={onBack} className="px-6 py-2 bg-red-600 rounded-lg font-semibold">Отмена</button>
                    </div>
                </div>
                
                {Object.keys(currentLayouts).map(panelKey => {
                    const key = panelKey as keyof typeof currentLayouts;
                    const layout = currentLayouts[key];
                    const panelStyle: React.CSSProperties = {
                        position: 'absolute',
                        left: `${layout.x}%`,
                        top: `${layout.y}%`,
                        transform: `translate(-50%, -50%) scale(${layout.scale * globalScale})`,
                        cursor: 'move',
                        touchAction: 'none'
                    };
                    
                    return (
                        <div key={key} ref={panelRefs[key]} style={panelStyle} onMouseDown={(e) => handleDragStart(e, key, 'drag')} onTouchStart={(e) => handleDragStart(e, key, 'drag')}>
                             {key === 'player' && <PlayerPanel />}
                             {key === 'crafting' && <CraftingPanel />}
                             {key === 'grid' && <GridPanel />}
                             <div 
                                 className="absolute -right-1 -bottom-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-white cursor-nwse-resize"
                                 onMouseDown={(e) => handleDragStart(e, key, 'resize')}
                                 onTouchStart={(e) => handleDragStart(e, key, 'resize')}
                             />
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col bg-black text-white">
            <header className="flex-shrink-0 py-6 text-center">
                <h2 className="text-4xl font-bold">Настройки</h2>
            </header>
            
            <main className="flex-grow overflow-y-auto px-6">
                <div className="max-w-2xl mx-auto w-full space-y-6">
                    <div className="flex flex-col">
                        <label htmlFor="joystickSize" className="text-lg mb-2">Размер джойстика: {settings.joystickSize}px</label>
                        <input 
                            type="range"
                            id="joystickSize"
                            min="80"
                            max="240"
                            step="8"
                            value={settings.joystickSize}
                            onChange={(e) => handleSettingChange('joystickSize', Number(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    
                    <div className="flex flex-col">
                        <label htmlFor="buttonSize" className="text-lg mb-2">Размер кнопок: {settings.buttonSize}px</label>
                        <input 
                            type="range"
                            id="buttonSize"
                            min="64"
                            max="128"
                            step="8"
                            value={settings.buttonSize}
                            onChange={(e) => handleSettingChange('buttonSize', Number(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    <div className="flex flex-col">
                        <label htmlFor="inventorySize" className="text-lg mb-2">Масштаб интерфейса: {Math.round(settings.inventorySize / 64 * 100)}%</label>
                        <input 
                            type="range"
                            id="inventorySize"
                            min="48"
                            max="96"
                            step="8"
                            value={settings.inventorySize}
                            onChange={(e) => handleSettingChange('inventorySize', Number(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    <div className="flex flex-col">
                        <label className="text-lg mb-2">Фон инвентаря</label>
                        <div className="flex items-center gap-4 p-2 bg-gray-900/50 rounded-lg">
                            <div className="flex gap-2">
                                <button aria-label="Set background to black" onClick={() => handleColorChange(0, 0, 0)} className={`w-8 h-8 rounded-full bg-black border-2 ${color.r === 0 && color.g === 0 && color.b === 0 ? 'border-yellow-400' : 'border-white'}`} />
                                <button aria-label="Set background to dark blue" onClick={() => handleColorChange(31, 41, 55)} className={`w-8 h-8 rounded-full bg-slate-800 border-2 ${color.r === 31 ? 'border-yellow-400' : 'border-white'}`} />
                                <button aria-label="Set background to gray" onClick={() => handleColorChange(75, 85, 99)} className={`w-8 h-8 rounded-full bg-slate-600 border-2 ${color.r === 75 ? 'border-yellow-400' : 'border-white'}`} />
                            </div>
                            <div className="flex-grow flex flex-col">
                                <label htmlFor="bgOpacity" className="text-sm">Прозрачность: {Math.round(color.a * 100)}%</label>
                                <input
                                    type="range"
                                    id="bgOpacity"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={color.a}
                                    onChange={handleAlphaChange}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                     <div className="pt-4">
                        <button 
                            onClick={() => setGameState('customize-ui')}
                            className="w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg text-xl hover:bg-indigo-700 transition-colors"
                        >
                            Настроить интерфейс
                        </button>
                    </div>


                    <div className="flex items-center justify-between py-2">
                        <label htmlFor="showFps" className="text-lg">Показывать FPS</label>
                        <button
                            id="showFps"
                            role="switch"
                            aria-checked={settings.showFps}
                            onClick={() => handleSettingChange('showFps', !settings.showFps)}
                            className={`relative inline-flex items-center h-8 w-14 rounded-full transition-colors ${settings.showFps ? 'bg-green-500' : 'bg-gray-600'}`}
                        >
                            <span
                                className={`inline-block w-6 h-6 transform bg-white rounded-full transition-transform ${settings.showFps ? 'translate-x-7' : 'translate-x-1'}`}
                            />
                        </button>
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <label htmlFor="showHitboxes" className="text-lg">Показывать хитбоксы</label>
                        <button
                            id="showHitboxes"
                            role="switch"
                            aria-checked={settings.showHitboxes}
                            onClick={() => handleSettingChange('showHitboxes', !settings.showHitboxes)}
                            className={`relative inline-flex items-center h-8 w-14 rounded-full transition-colors ${settings.showHitboxes ? 'bg-green-500' : 'bg-gray-600'}`}
                        >
                            <span
                                className={`inline-block w-6 h-6 transform bg-white rounded-full transition-transform ${settings.showHitboxes ? 'translate-x-7' : 'translate-x-1'}`}
                            />
                        </button>
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <label htmlFor="showPunchHitbox" className="text-lg">Показывать хитбокс удара</label>
                        <button
                            id="showPunchHitbox"
                            role="switch"
                            aria-checked={settings.showPunchHitbox}
                            onClick={() => handleSettingChange('showPunchHitbox', !settings.showPunchHitbox)}
                            className={`relative inline-flex items-center h-8 w-14 rounded-full transition-colors ${settings.showPunchHitbox ? 'bg-green-500' : 'bg-gray-600'}`}
                        >
                            <span
                                className={`inline-block w-6 h-6 transform bg-white rounded-full transition-transform ${settings.showPunchHitbox ? 'translate-x-7' : 'translate-x-1'}`}
                            />
                        </button>
                    </div>
                </div>
            </main>

            <footer className="flex-shrink-0 py-4 flex items-center justify-center">
                <button
                    onClick={onBack}
                    className="px-8 py-4 bg-red-600 text-white font-bold rounded-lg text-2xl hover:bg-red-700 transition-colors"
                >
                    Назад
                </button>
            </footer>
        </div>
    );
};

export default Settings;