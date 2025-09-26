
import React from 'react';

const PlayerModel: React.FC = () => {
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            {/* The viewBox is adjusted to be more square, making the character appear larger within the container. */}
            <svg width="100%" height="100%" viewBox="-15 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <clipPath id="leg-shape-left">
                        <rect x="11" y="64" width="13" height="44" rx="4" />
                    </clipPath>
                    <clipPath id="leg-shape-right">
                        <rect x="26" y="64" width="13" height="44" rx="4" />
                    </clipPath>
                </defs>

                {/* Левая нога (штаны и ступня) */}
                <g clipPath="url(#leg-shape-left)">
                    <rect x="11" y="64" width="13" height="36" fill="#3B82F6"/>
                    <rect x="11" y="100" width="13" height="8" fill="#F6AD55"/>
                </g>
                
                {/* Правая нога (штаны и ступня) */}
                <g clipPath="url(#leg-shape-right)">
                    <rect x="26" y="64" width="13" height="36" fill="#3B82F6"/>
                    <rect x="26" y="100" width="13" height="8" fill="#F6AD55"/>
                </g>
                
                {/* Руки - будут частично перекрыты футболкой */}
                <rect x="-1" y="30" width="12" height="38" rx="3.5" fill="#F6AD55"/>
                <rect x="39" y="30" width="12" height="38" rx="3.5" fill="#F6AD55"/>
                
                {/* Верхняя часть груди для заполнения выреза */}
                <rect x="16" y="28" width="18" height="10" fill="#F6AD55"/>
                
                {/* Шея (поднята) */}
                <rect x="20" y="26" width="10" height="8" fill="#F6AD55"/>
                
                {/* Футболка с закругленными плечами и вырезом */}
                <path d="M 11 68 L 11 42 L -1 42 L -1 32 A 4 4 0 0 1 3 28 L 16 28 Q 25 38 34 28 L 47 28 A 4 4 0 0 1 51 32 L 51 42 L 39 42 L 39 68 Z" fill="#E53E3E"/>

                {/* Голова (поднята) */}
                <circle cx="25" cy="14" r="12" fill="#F6AD55"/>
                
                {/* Волосы (перемещены выше и обрезаны по контуру головы) */}
                <path d="M 13.7 10 A 12 12 0 0 1 36.3 10 Z" fill="#713F12"/>
            </svg>
        </div>
    );
};

export default PlayerModel;
