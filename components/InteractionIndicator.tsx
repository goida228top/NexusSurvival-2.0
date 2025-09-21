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
    const punchIndicatorStyle: React.CSSProperties = {
        ...baseIndicatorStyle,
        transform: 'translateX(-50%)',
        width: '80px',
        height: '60px',
    };
    return (
        <div style={rotatorStyle}>
            <div style={punchIndicatorStyle} className="animate-indicator">
                <svg width="80" height="60" viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Redrew the path using a quadratic bezier curve for perfect symmetry */}
                    <path d="M40 60 L10 0 Q 40 25 70 0 Z" fill="none" stroke="rgba(255, 0, 0, 0.8)" strokeWidth="4" />
                </svg>
            </div>
        </div>
    );
  }

  return null;
};

export default InteractionIndicator;