import React, { useState, useRef } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  size: number;
}

const Joystick: React.FC<JoystickProps> = ({ onMove, size }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);
  const touchId = useRef<number | null>(null);

  const handleMove = (touch: React.Touch | Touch) => {
    if (!baseRef.current) return;
    
    const baseRect = baseRef.current.getBoundingClientRect();
    
    let x = touch.clientX - (baseRect.left + baseRect.width / 2);
    let y = touch.clientY - (baseRect.top + baseRect.height / 2);

    const maxDistance = baseRect.width / 2;
    const distance = Math.sqrt(x * x + y * y);

    if (distance > maxDistance) {
      x = (x / distance) * maxDistance;
      y = (y / distance) * maxDistance;
    }

    setPosition({ x, y });
    onMove(x / maxDistance, y / maxDistance);
  };


  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchId.current !== null) return; // Already tracking a touch
    
    const touch = e.changedTouches[0];
    touchId.current = touch.identifier;
    setIsDragging(true);
    handleMove(touch); // Process move immediately on start
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || touchId.current === null) return;
    
    // Find the touch we are tracking
    const touch = Array.from(e.targetTouches).find(t => t.identifier === touchId.current);
    if (!touch) return; 

    handleMove(touch);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    // Check if our tracked touch was among those that were lifted
    const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId.current);
    if (!touch) return; // A different touch was lifted

    touchId.current = null;
    setIsDragging(false);
    setPosition({ x: 0, y: 0 });
    onMove(0,0);
  };

  const baseStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
  };

  const handleStyle: React.CSSProperties = {
    width: `${size / 2}px`,
    height: `${size / 2}px`,
    transform: `translate(${position.x}px, ${position.y}px)`,
    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
  };

  return (
    <div
      ref={baseRef}
      className="relative bg-gray-500/30 rounded-full flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd} // Handle cases like the finger leaving the screen
      style={{ ...baseStyle, touchAction: 'none' }} // Prevents page scroll on touch
    >
      <div
        className="absolute bg-gray-600/70 rounded-full border-2 border-gray-400"
        style={handleStyle}
      ></div>
    </div>
  );
};

export default Joystick;
