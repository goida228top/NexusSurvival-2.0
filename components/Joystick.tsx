import React, { useState, useRef } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  size: number;
}

const Joystick: React.FC<JoystickProps> = ({ onMove, size }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !baseRef.current) return;
    
    const baseRect = baseRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    
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

  const handleTouchEnd = () => {
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