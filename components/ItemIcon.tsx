import React from 'react';
import type { InventoryItemType } from '../types';

interface ItemIconProps {
    type: InventoryItemType;
    className?: string;
}

const PlankIcon: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <svg
            className={className}
            width="100%"
            height="100%"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <g transform="rotate(-15 32 32)">
                {/* Plank 3 (bottom) */}
                <rect x="8" y="38" width="48" height="12" rx="2" fill="#C19A6B" />
                <path d="M 12 42 H 52 M 14 46 H 50" stroke="#8B5A2B" strokeWidth="1.5" strokeLinecap="round" />

                {/* Plank 2 (middle) */}
                <rect x="11" y="25" width="48" height="12" rx="2" fill="#C19A6B" />
                <path d="M 15 29 H 55 M 17 33 H 53" stroke="#8B5A2B" strokeWidth="1.5" strokeLinecap="round" />

                {/* Plank 1 (top) */}
                <rect x="5" y="12" width="48" height="12" rx="2" fill="#C19A6B" />
                <path d="M 9 16 H 49 M 11 20 H 47" stroke="#8B5A2B" strokeWidth="1.5" strokeLinecap="round" />
            </g>
        </svg>
    );
};

const StickIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="rotate(45 32 32)">
            <rect x="8" y="28" width="48" height="8" rx="3" fill="#A0522D" />
            <path d="M 12 32 H 52" stroke="#663300" strokeWidth="1" />
        </g>
    </svg>
);

const WorkbenchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="12" y="48" width="10" height="14" fill="#8B5A2B" />
        <rect x="42" y="48" width="10" height="14" fill="#8B5A2B" />
        <rect x="4" y="28" width="56" height="20" rx="2" fill="#C19A6B" />
        <path d="M 8 34 H 56 M 8 42 H 56" stroke="#8B5A2B" strokeWidth="2" strokeLinecap="round" />
        {/* Hammer */}
        <g transform="translate(10, -4)">
            <rect x="25" y="18" width="18" height="8" rx="1" fill="#A9A9A9" stroke="#696969" strokeWidth="1.5" />
            <rect x="31" y="26" width="6" height="10" fill="#8B5A2B" />
        </g>
    </svg>
);


const ItemIcon: React.FC<ItemIconProps> = ({ type, className }) => {
    switch (type) {
        case 'plank':
            return <PlankIcon className={className} />;
        case 'stick':
            return <StickIcon className={className} />;
        case 'workbench':
            return <WorkbenchIcon className={className} />;
        case 'stone':
            return <span className={className}>🪨</span>;
        default:
            return null;
    }
};

export default ItemIcon;