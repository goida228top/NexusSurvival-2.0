import React from 'react';

interface PlayerProps {
  rotation: number;
}

// A simple SVG character for the player with a top-down view
const Player: React.FC<PlayerProps> = ({ rotation }) => {
  return (
    <div style={{
        position: 'absolute',
        width: '40px',
        height: '40px',
        // The player's logical position is their center/feet area.
        // Translate X by -50% to center horizontally.
        // Translate Y to align the player's visual center with the hitbox center for correct rotation.
        transform: `translate(-50%, -62.5%) rotate(${rotation}deg)`,
    }}>
      <svg width="100%" height="100%" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Arms (skin tone) - slightly visible at the sides */}
        <circle cx="7" cy="25" r="5" fill="#F6AD55"/>
        <circle cx="33" cy="25" r="5" fill="#F6AD55"/>
        
        {/* Body/Shoulders (red shirt) */}
        <rect x="8" y="18" width="24" height="18" rx="12" fill="#E53E3E"/>
        
        {/* Head (skin tone) - The full circle of the head is now the base */}
        <circle cx="20" cy="20" r="8" fill="#F6AD55"/>
        
        {/* Hair (brown) - Made slightly wider on the sides */}
        <rect x="14" y="14" width="12" height="14" rx="6" fill="#713F12"/>
      </svg>
    </div>
  );
};

export default Player;