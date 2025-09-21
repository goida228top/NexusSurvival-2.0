import React from 'react';
import type { GameSettings } from '../types';

interface SettingsProps {
    settings: GameSettings;
    setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
    onBack: () => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, setSettings, onBack }) => {

    const handleSettingChange = (setting: keyof GameSettings, value: string | boolean) => {
        const isNumber = typeof settings[setting] === 'number';
        setSettings(prev => ({
            ...prev,
            [setting]: isNumber ? Number(value) : value,
        }));
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white p-4">
            <h2 className="text-4xl font-bold mb-8">Настройки</h2>
            
            <div className="w-full max-w-md space-y-6">
                <div className="flex flex-col">
                    <label htmlFor="joystickSize" className="text-lg mb-2">Размер джойстика: {settings.joystickSize}px</label>
                    <input 
                        type="range"
                        id="joystickSize"
                        min="80"
                        max="240"
                        step="8"
                        value={settings.joystickSize}
                        onChange={(e) => handleSettingChange('joystickSize', e.target.value)}
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
                        onChange={(e) => handleSettingChange('buttonSize', e.target.value)}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <div className="flex flex-col">
                    <label htmlFor="inventorySize" className="text-lg mb-2">Размер инвентаря: {settings.inventorySize}px</label>
                    <input 
                        type="range"
                        id="inventorySize"
                        min="48"
                        max="96"
                        step="8"
                        value={settings.inventorySize}
                        onChange={(e) => handleSettingChange('inventorySize', e.target.value)}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                 <div className="flex items-center justify-between">
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

                <div className="flex items-center justify-between">
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
            </div>

            <button
                onClick={onBack}
                className="mt-12 px-8 py-4 bg-red-600 text-white font-bold rounded-lg text-2xl hover:bg-red-700 transition-colors"
            >
                Назад
            </button>
        </div>
    );
};

export default Settings;