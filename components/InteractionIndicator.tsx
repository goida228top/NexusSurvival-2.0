
import React from 'react';

interface InteractionIndicatorProps {
  rotation: number;
  type: 'build' | 'punch' | 'none';
}

const InteractionIndicator: React.FC<InteractionIndicatorProps> = ({ rotation, type }) => {
  if (type === 'none') {
    return null;
  }

  const rotatorStyle: React.CSSProperties = {
    position: 'absolute',
    left: '0',
    top: '0',
    width: '1px',
    height: '1px',
    transform: `rotate(${rotation}deg)`,
    pointerEvents: 'none',
    // zIndex was removed as it was causing the indicator to render behind the background.
    // Render order in Game.tsx now correctly handles layering.
  };

  const baseIndicatorStyle: React.CSSProperties = {
      position: 'absolute',
      left: '50%', 
      bottom: '0', 
      transformOrigin: 'bottom center',
  };

  if (type === 'build') {
    const buildIndicatorStyle: React.CSSProperties = {
        ...baseIndicatorStyle,
        transform: 'translateX(-50%)',
        width: '10px',
        height: '50px',
    };
    return (
      <div style={rotatorStyle}>
          <div style={buildIndicatorStyle}>
               <svg width="10" height="50" viewBox="0 0 10 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <line x1="5" y1="50" x2="5" y2="0" stroke="rgba(255, 220, 0, 0.8)" strokeWidth="4" strokeLinecap="round"/>
               </svg>
          </div>
      </div>
    );
  }

  if (type === 'punch') {
    // This logic precisely positions the indicator's origin point relative to the player's hitbox center.
    const punchIndicatorStyle: React.CSSProperties = {
        position: 'absolute',
        // We position the container so that the SVG's vertex (the attack origin at coordinate 60,58)
        // aligns with the player's hitbox center.
        // The player hitbox is offset by -5px vertically from the logical position.
        // left: Place the container's left edge at -60px so the center (at 60px) aligns with 0.
        left: '-60px',
        // top: Place the container's top edge at -63px. This makes the vertex y-position (at 58px from top)
        // end up at -5px (-63 + 58 = -5).
        top: '-63px',
        width: '120px',
        height: '60px',
    };
    return (
        <div style={rotatorStyle}>
            <div style={punchIndicatorStyle} className="animate-indicator">
                <svg width="120" height="60" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* A path for a segment of a ring (annulus), creating a cutout for the player */}
                    <path
                        d="M 28.2 26.2 A 45 45 0 0 1 91.8 26.2 L 70.6 47.4 A 15 15 0 0 0 49.4 47.4 Z"
                        fill="rgba(255, 0, 0, 0.3)"
                        stroke="rgba(255, 0, 0, 0.8)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
        </div>
    );
  }

  return null;
};

export default InteractionIndicator;