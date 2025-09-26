
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GameSettings, GameState, UILayout } from '../types';
import PlayerModel from './PlayerModel';
import Joystick from './Joystick';

interface SettingsProps {
    settings: GameSettings;
    setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
    onBack: () => void;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
    customizeMode: boolean;
    defaultSettings: GameSettings;
}

// --- Dummy Components for display in settings ---
const DummySlot: React.FC<{className?: string}> = ({className}) => <div className={`w-12 h-12 bg-black/40 border border-gray-600 rounded-md flex-shrink-0 ${className}`} />;
const DummyEquipmentSlot: React.FC = () => <div className="w-12 h-12 bg-black/40 border border-gray-600 rounded-md" />;
const DummyPlayerPanel: React.FC<{layout: UILayout}> = ({layout}) => (
    <div style={{ backgroundColor: layout.backgroundColor }} className="flex justify-center items-start gap-3 p-3 border border-gray-700 rounded-xl">
        <div className="flex flex-col gap-1.5"><DummyEquipmentSlot /><DummyEquipmentSlot /><DummyEquipmentSlot /><DummyEquipmentSlot /></div>
        <div className="w-28 h-40"><PlayerModel /></div>
        <div className="flex flex-col gap-1.5"><DummyEquipmentSlot /><DummyEquipmentSlot /><DummyEquipmentSlot /><DummyEquipmentSlot /></div>
    </div>
);
const DummyCraftingPanel: React.FC<{layout: UILayout}> = ({layout}) => (
    <div style={{ backgroundColor: layout.backgroundColor }} className="flex flex-col items-start gap-3 p-3 border border-gray-700 rounded-xl">
        <div className="flex items-center justify-start gap-1.5">
            <DummySlot /><DummySlot /><DummySlot /><DummySlot />
            <div className="text-2xl mx-1.5 text-gray-500 font-bold">&rarr;</div>
            <DummySlot className="border-green-500" />
        </div>
        <div className="bg-black/30 rounded-md p-1.5 space-y-1 h-40 w-[326px] overflow-y-auto">
            <div className="text-gray-500 p-4 text-center">Рецепты</div>
        </div>
    </div>
);
const DummyGridPanel: React.FC<{layout: UILayout}> = ({layout}) => {
    const layoutClasses = { grid: 'flex-wrap w-[300px]', row: 'flex-nowrap', column: 'flex-col flex-nowrap' };
    return (
        <div style={{ backgroundColor: layout.backgroundColor }} className="p-3 border border-gray-700 rounded-xl">
            <div className={`flex justify-center gap-1.5 ${layoutClasses[layout.gridStyle || 'grid']}`}>
                {Array.from({ length: 12 }).map((_, i) => <DummySlot key={i} />)}
            </div>
        </div>
    );
};
const DummyJoystick: React.FC<{layout: UILayout; size: number}> = ({ size }) => <div className="pointer-events-none"><Joystick onMove={()=>{}} size={size} /></div>;

const DummyActionButton: React.FC<{layout: UILayout; size: number; text: string; colorClasses: string}> = ({ layout, size, text, colorClasses }) => {
    const shapeClass = layout.shape === 'circle' ? 'rounded-full' : 'rounded-lg';
    const style: React.CSSProperties = { width: `${size}px`, height: `${size}px`, fontSize: `${size / 5}px` };
    return (
        <div style={style} className={`flex items-center justify-center font-bold text-white ${colorClasses} ${shapeClass}`}>
            {text}
        </div>
    );
};

const DummyHotbar: React.FC<{layout: UILayout; size: number}> = ({ layout, size }) => {
    const flexDirection = layout.gridStyle === 'column' ? 'flex-col' : 'flex-row';
    const style: React.CSSProperties = { width: `${size}px`, height: `${size}px` };
    return (
        <div style={{ backgroundColor: layout.backgroundColor }} className={`flex items-end gap-2 p-2 rounded-lg ${flexDirection}`}>
             {Array.from({ length: 5 }).map((_, i) => <div key={i} style={style} className="bg-black/30 border-2 border-gray-500 rounded-md" />)}
             <div style={style} className="bg-black/30 border-2 border-gray-500 rounded-md flex items-center justify-center text-2xl">🎒</div>
        </div>
    )
};

// Helper to manage RGBA colors
const parseRgba = (rgba: string): { r: number, g: number, b: number, a: number } => {
    try {
        const result = (rgba || 'rgba(0,0,0,0.5)').match(/\d+(\.\d+)?/g);
        if (!result || result.length < 4) throw new Error("Invalid RGBA string");
        const [r, g, b, a] = result.map(Number);
        return { r, g, b, a };
    } catch (e) {
        console.error("Failed to parse RGBA color:", rgba, e);
        return { r: 0, g: 0, b: 0, a: 0.5 }; // fallback
    }
};

const toRgba = (color: { r: number, g: number, b: number, a: number }): string => {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
};

type PanelKey = keyof GameSettings['layouts'];

// --- Settings Pop-up Component ---
const PanelSettingsPopup: React.FC<{
    panelLayout: UILayout;
    onLayoutChange: (newLayout: Partial<UILayout>) => void;
    onClose: () => void;
}> = ({ panelLayout, onLayoutChange, onClose }) => {
    const popupRef = useRef<HTMLDivElement>(null);
    const color = parseRgba(panelLayout.backgroundColor || 'rgba(0,0,0,0.5)');

    const handleColorChange = (r: number, g: number, b: number) => {
        onLayoutChange({ backgroundColor: toRgba({ ...color, r, g, b }) });
    };
    const handleAlphaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onLayoutChange({ backgroundColor: toRgba({ ...color, a: parseFloat(e.target.value) }) });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    return (
        <div ref={popupRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-lg w-80 space-y-4">
            <h4 className="text-lg font-bold text-center">Настройки элемента</h4>

            {panelLayout.backgroundColor !== undefined && (
                 <div>
                    <label className="text-md mb-2 block">Цвет и прозрачность фона</label>
                    <div className="flex items-center gap-4 p-2 bg-gray-900/50 rounded-lg">
                        <div className="flex gap-2">
                            <button aria-label="Set background to black" onClick={() => handleColorChange(0, 0, 0)} className={`w-8 h-8 rounded-full bg-black border-2 ${color.r === 0 && color.g === 0 && color.b === 0 ? 'border-yellow-400' : 'border-white'}`} />
                            <button aria-label="Set background to dark blue" onClick={() => handleColorChange(31, 41, 55)} className={`w-8 h-8 rounded-full bg-slate-800 border-2 ${color.r === 31 ? 'border-yellow-400' : 'border-white'}`} />
                            <button aria-label="Set background to gray" onClick={() => handleColorChange(75, 85, 99)} className={`w-8 h-8 rounded-full bg-slate-600 border-2 ${color.r === 75 ? 'border-yellow-400' : 'border-white'}`} />
                        </div>
                        <input type="range" min="0" max="1" step="0.05" value={color.a} onChange={handleAlphaChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                    </div>
                </div>
            )}

            {panelLayout.gridStyle !== undefined && (
                <div>
                    <label className="text-md mb-2 block">Стиль</label>
                    <div className="flex justify-around bg-gray-900/50 rounded-lg p-1">
                        {(['grid', 'row', 'column'] as const).map(style => (
                            <button key={style} onClick={() => onLayoutChange({ gridStyle: style })} className={`px-3 py-1 rounded-md text-sm ${panelLayout.gridStyle === style ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                                {style === 'grid' ? 'Сетка' : style === 'row' ? 'Ряд' : 'Колонка'}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {panelLayout.shape !== undefined && (
                 <div>
                    <label className="text-md mb-2 block">Форма кнопок</label>
                    <div className="flex justify-around bg-gray-900/50 rounded-lg p-1">
                         {(['square', 'circle'] as const).map(shape => (
                            <button key={shape} onClick={() => onLayoutChange({ shape: shape })} className={`px-3 py-1 rounded-md text-sm ${panelLayout.shape === shape ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                               {shape === 'square' ? 'Квадрат' : 'Круг'}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            <button onClick={onClose} className="w-full mt-2 px-4 py-2 bg-red-600 rounded-lg font-semibold">Закрыть</button>
        </div>
    );
};


const Settings: React.FC<SettingsProps> = ({ settings, setSettings, onBack, setGameState, customizeMode, defaultSettings }) => {

    const [currentLayouts, setCurrentLayouts] = useState(settings.layouts);
    const [customizeTab, setCustomizeTab] = useState<'inventory' | 'hud'>('inventory');
    const [editingPanelKey, setEditingPanelKey] = useState<PanelKey | null>(null);

    const dragState = useRef<{
        active: boolean; panel: PanelKey | null; action: 'drag' | 'resize' | null;
        startX: number; startY: number; startLayout: UILayout | null;
        startWidth: number; startHeight: number;
    }>({ active: false, panel: null, action: null, startX: 0, startY: 0, startLayout: null, startWidth: 0, startHeight: 0 });

    const panelRefs: { [key in PanelKey]?: React.RefObject<HTMLDivElement> } = {
        player: useRef<HTMLDivElement>(null), crafting: useRef<HTMLDivElement>(null), grid: useRef<HTMLDivElement>(null),
        joystick: useRef<HTMLDivElement>(null), 
        punchButton: useRef<HTMLDivElement>(null),
        buildButton: useRef<HTMLDivElement>(null),
        hotbar: useRef<HTMLDivElement>(null),
    };

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!dragState.current.active || !dragState.current.panel || !dragState.current.startLayout || editingPanelKey) return;

            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            const dx = (clientX - dragState.current.startX) / window.innerWidth * 100;
            const dy = (clientY - dragState.current.startY) / window.innerHeight * 100;
            
            const panel = dragState.current.panel;

            if (dragState.current.action === 'drag') {
                setCurrentLayouts(prev => ({ ...prev, [panel]: { ...prev[panel], x: dragState.current.startLayout!.x + dx, y: dragState.current.startLayout!.y + dy }}));
            } else if (dragState.current.action === 'resize') {
                 const currentWidth = dragState.current.startWidth + (clientX - dragState.current.startX);
                 const scale = currentWidth / dragState.current.startWidth;
                 setCurrentLayouts(prev => ({ ...prev, [panel]: { ...prev[panel], scale: Math.max(0.5, Math.min(2.5, dragState.current.startLayout!.scale * scale)) }}));
            }
        };
        const handleEnd = () => { dragState.current.active = false; };
        
        window.addEventListener('mousemove', handleMove); window.addEventListener('touchmove', handleMove);
        window.addEventListener('mouseup', handleEnd); window.addEventListener('touchend', handleEnd);
        return () => {
            window.removeEventListener('mousemove', handleMove); window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('mouseup', handleEnd); window.removeEventListener('touchend', handleEnd);
        };
    }, [editingPanelKey]);

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, panel: PanelKey, action: 'drag' | 'resize') => {
        e.preventDefault(); e.stopPropagation();
        const panelRef = panelRefs[panel]?.current;
        if (!panelRef) return;
        dragState.current = {
            active: true, panel, action,
            startX: 'touches' in e.nativeEvent ? e.nativeEvent.touches[0].clientX : e.nativeEvent.clientX,
            startY: 'touches' in e.nativeEvent ? e.nativeEvent.touches[0].clientY : e.nativeEvent.clientY,
            startLayout: currentLayouts[panel],
            startWidth: panelRef.offsetWidth, startHeight: panelRef.offsetHeight,
        };
    };

    const handleSaveLayout = () => {
        setSettings(prev => ({ ...prev, layouts: currentLayouts }));
        setGameState('settings');
    };
    const handleResetLayout = () => setCurrentLayouts(defaultSettings.layouts);
    const handleSettingChange = (setting: keyof GameSettings, value: any) => setSettings(prev => ({ ...prev, [setting]: value }));

    const handleUpdatePanelLayout = useCallback((panelKey: PanelKey, newLayout: Partial<UILayout>) => {
        setCurrentLayouts(prev => ({ ...prev, [panelKey]: { ...prev[panelKey], ...newLayout } }));
    }, []);

    if (customizeMode) {
        const inventoryPanels: PanelKey[] = ['player', 'crafting', 'grid'];
        const hudPanels: PanelKey[] = ['joystick', 'punchButton', 'buildButton', 'hotbar'];
        const panelsToShow = customizeTab === 'inventory' ? inventoryPanels : hudPanels;

        const globalScale = settings.inventorySize / 64;

        return (
            <div className="w-full h-full bg-black/50 text-white relative overflow-hidden">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2">
                    <p className="text-xl font-bold bg-black/70 px-4 py-2 rounded-lg">Режим настройки интерфейса</p>
                    <div className="flex gap-2 p-1 bg-black/50 rounded-lg">
                        <button onClick={() => setCustomizeTab('inventory')} className={`px-4 py-1 rounded-md ${customizeTab === 'inventory' ? 'bg-indigo-600' : 'bg-gray-700'}`}>Инвентарь</button>
                        <button onClick={() => setCustomizeTab('hud')} className={`px-4 py-1 rounded-md ${customizeTab === 'hud' ? 'bg-indigo-600' : 'bg-gray-700'}`}>Интерфейс</button>
                    </div>
                    <div className="flex gap-4">
                       <button onClick={handleSaveLayout} className="px-6 py-2 bg-green-600 rounded-lg font-semibold">Сохранить</button>
                       <button onClick={handleResetLayout} className="px-6 py-2 bg-yellow-600 rounded-lg font-semibold">Сбросить</button>
                       <button onClick={() => setGameState('settings')} className="px-6 py-2 bg-red-600 rounded-lg font-semibold">Отмена</button>
                    </div>
                </div>
                
                {panelsToShow.map(key => {
                    const layout = currentLayouts[key as keyof typeof currentLayouts];
                    if (!layout) return null;
                    const scale = ['joystick', 'punchButton', 'buildButton', 'hotbar'].includes(key) ? 1 : globalScale;
                    const panelStyle: React.CSSProperties = {
                        position: 'absolute', left: `${layout.x}%`, top: `${layout.y}%`,
                        transform: `translate(-50%, -50%) scale(${layout.scale * scale})`,
                        cursor: 'move', touchAction: 'none'
                    };
                    
                    return (
                        <div key={key} ref={panelRefs[key as keyof typeof panelRefs]} style={panelStyle} onMouseDown={(e) => handleDragStart(e, key, 'drag')} onTouchStart={(e) => handleDragStart(e, key, 'drag')}>
                            <div className="relative">
                                {key === 'player' && <DummyPlayerPanel layout={layout} />}
                                {key === 'crafting' && <DummyCraftingPanel layout={layout} />}
                                {key === 'grid' && <DummyGridPanel layout={layout} />}
                                {key === 'joystick' && <DummyJoystick layout={layout} size={settings.joystickSize} />}
                                {key === 'punchButton' && <DummyActionButton layout={layout} size={settings.buttonSize} text="Бить" colorClasses="bg-red-500/80 border-2 border-red-800" />}
                                {key === 'buildButton' && <DummyActionButton layout={layout} size={settings.buttonSize} text="Строить" colorClasses="bg-yellow-500/80 border-2 border-yellow-800" />}
                                {key === 'hotbar' && <DummyHotbar layout={layout} size={settings.inventorySize} />}
                                
                                <button onClick={(e) => { e.stopPropagation(); setEditingPanelKey(key); }} className="absolute -top-2 -right-2 w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center text-lg border-2 border-white cursor-pointer z-10">⚙️</button>
                                <div className="absolute -right-1 -bottom-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-white cursor-nwse-resize" onMouseDown={(e) => handleDragStart(e, key, 'resize')} onTouchStart={(e) => handleDragStart(e, key, 'resize')} />
                            </div>
                        </div>
                    );
                })}
                {editingPanelKey && (
                    <PanelSettingsPopup
                        panelLayout={currentLayouts[editingPanelKey as keyof typeof currentLayouts]}
                        onLayoutChange={(newLayout) => handleUpdatePanelLayout(editingPanelKey, newLayout)}
                        onClose={() => setEditingPanelKey(null)}
                    />
                )}
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
                        <label htmlFor="inventorySize" className="text-lg mb-2">Масштаб интерфейса: {Math.round(settings.inventorySize / 64 * 100)}%</label>
                        <input type="range" id="inventorySize" min="48" max="96" step="8" value={settings.inventorySize} onChange={(e) => handleSettingChange('inventorySize', Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                    </div>

                    <div className="pt-4">
                        <button onClick={() => setGameState('customize-ui')} className="w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg text-xl hover:bg-indigo-700 transition-colors">
                            Настроить интерфейс
                        </button>
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <label htmlFor="showFps" className="text-lg">Показывать FPS</label>
                        <button id="showFps" role="switch" aria-checked={settings.showFps} onClick={() => handleSettingChange('showFps', !settings.showFps)} className={`relative inline-flex items-center h-8 w-14 rounded-full transition-colors ${settings.showFps ? 'bg-green-500' : 'bg-gray-600'}`}>
                            <span className={`inline-block w-6 h-6 transform bg-white rounded-full transition-transform ${settings.showFps ? 'translate-x-7' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <label htmlFor="showHitboxes" className="text-lg">Показывать хитбоксы</label>
                        <button id="showHitboxes" role="switch" aria-checked={settings.showHitboxes} onClick={() => handleSettingChange('showHitboxes', !settings.showHitboxes)} className={`relative inline-flex items-center h-8 w-14 rounded-full transition-colors ${settings.showHitboxes ? 'bg-green-500' : 'bg-gray-600'}`}>
                            <span className={`inline-block w-6 h-6 transform bg-white rounded-full transition-transform ${settings.showHitboxes ? 'translate-x-7' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <label htmlFor="showPunchHitbox" className="text-lg">Показывать хитбокс удара</label>
                        <button id="showPunchHitbox" role="switch" aria-checked={settings.showPunchHitbox} onClick={() => handleSettingChange('showPunchHitbox', !settings.showPunchHitbox)} className={`relative inline-flex items-center h-8 w-14 rounded-full transition-colors ${settings.showPunchHitbox ? 'bg-green-500' : 'bg-gray-600'}`}>
                            <span className={`inline-block w-6 h-6 transform bg-white rounded-full transition-transform ${settings.showPunchHitbox ? 'translate-x-7' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
            </main>

            <footer className="flex-shrink-0 py-4 flex items-center justify-center">
                <button onClick={onBack} className="px-8 py-4 bg-red-600 text-white font-bold rounded-lg text-2xl hover:bg-red-700 transition-colors">
                    Назад
                </button>
            </footer>
        </div>
    );
};

export default Settings;