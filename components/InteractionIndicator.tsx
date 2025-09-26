
import React from 'react';

interface InteractionIndicatorProps {
  rotation: number;
  type: 'build' | 'punch' | 'charging' | 'none';
  isDebug?: boolean;
  chargeLevel?: number;
  isCrit?: boolean;
}

const InteractionIndicator: React.FC<InteractionIndicatorProps> = ({ rotation, type, isDebug, chargeLevel = 0, isCrit = false }) => {
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

  const punchIndicatorBaseStyle: React.CSSProperties = {
      position: 'absolute',
      left: '-60px',
      top: '-63px',
      width: '120px',
      height: '60px',
  };

  if (type === 'charging') {
      const chargeColors = [
          'rgba(200, 200, 200, 0.5)', // Level 0
          'rgba(255, 220, 0, 0.6)',   // Level 1
          'rgba(255, 100, 0, 0.7)'    // Level 2 (crit ready)
      ];
      const chargeStrokeColors = [
          'rgba(200, 200, 200, 0.8)',
          'rgba(255, 220, 0, 0.9)',
          'rgba(255, 100, 0, 1)'
      ];

      return (
           <div style={rotatorStyle}>
              <div style={punchIndicatorBaseStyle}>
                  <svg width="120" height="60" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                          d="M 34.3 27.4 A 40 40 0 0 1 85.7 27.4 L 69.6 46.5 A 15 15 0 0 0 50.4 46.5 Z"
                          fill={chargeColors[chargeLevel]}
                          stroke={chargeStrokeColors[chargeLevel]}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                      />
                  </svg>
              </div>
          </div>
      );
  }

  if (type === 'punch') {
      if (isCrit) {
          // Critical Hit Indicator
          return (
              <div style={rotatorStyle}>
                  <div style={punchIndicatorBaseStyle} className={"animate-indicator"}>
                      <svg width="120" height="60" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                              d="M 26.8 19.3 A 50 50 0 0 1 93.2 19.3 L 72.1 46.5 A 20 20 0 0 0 47.9 46.5 Z"
                              fill="rgba(255, 220, 0, 0.5)"
                              stroke="rgba(255, 255, 255, 0.9)"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                          />
                      </svg>
                  </div>
              </div>
          );
      }
      // Normal Punch Indicator
      return (
          <div style={rotatorStyle}>
              <div style={punchIndicatorBaseStyle} className={!isDebug ? "animate-indicator" : ""}>
                  <svg width="120" height="60" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                          d="M 34.3 27.4 A 40 40 0 0 1 85.7 27.4 L 69.6 46.5 A 15 15 0 0 0 50.4 46.5 Z"
                          fill="rgba(255, 0, 0, 0.3)"
                          stroke="rgba(255, 0, 0, 0.8)"
                          strokeWidth="2"
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