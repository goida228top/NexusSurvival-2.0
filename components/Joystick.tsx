import React, { useState, useRef, useEffect, useCallback } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  size: number;
}

const Joystick: React.FC<JoystickProps> = ({ onMove, size }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);
  const touchId = useRef<number | null>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!baseRef.current) return;
    
    const baseRect = baseRef.current.getBoundingClientRect();
    
    let x = clientX - (baseRect.left + baseRect.width / 2);
    let y = clientY - (baseRect.top + baseRect.height / 2);

    const maxDistance = baseRect.width / 2;
    const distance = Math.sqrt(x * x + y * y);

    if (distance > maxDistance) {
      x = (x / distance) * maxDistance;
      y = (y / distance) * maxDistance;
    }

    setPosition({ x, y });
    onMove(x / maxDistance, y / maxDistance);
  }, [onMove]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (touchId.current !== null) return;
    
    const touch = e.changedTouches[0];
    touchId.current = touch.identifier;
    isDragging.current = true;
    
    handleMove(touch.clientX, touch.clientY);
  };
  
  const handleWindowTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || touchId.current === null) return;
    
    const touch = Array.from(e.targetTouches).find(t => t.identifier === touchId.current);
    if (!touch) return; 
    
    // Prevent scrolling while dragging the joystick
    e.preventDefault();
    handleMove(touch.clientX, touch.clientY);
  }, [handleMove]);

  const handleWindowTouchEnd = useCallback((e: TouchEvent) => {
    if (touchId.current === null) return;

    const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId.current);
    if (!touch) return; 

    touchId.current = null;
    isDragging.current = false;
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  }, [onMove]);

  useEffect(() => {
    // Add listeners to the window to track movement/end even if the finger leaves the joystick area.
    // { passive: false } is crucial to allow preventDefault() to work and stop browser scrolling.
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleWindowTouchEnd, { passive: false });

    return () => {
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
    };
  }, [handleWindowTouchMove, handleWindowTouchEnd]);

  const baseStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
  };

  const handleStyle: React.CSSProperties = {
    width: `${size / 2}px`,
    height: `${size / 2}px`,
    transform: `translate(${position.x}px, ${position.y}px)`,
    transition: !isDragging.current ? 'transform 0.1s ease-out' : 'none'
  };

  return (
    <div
      ref={baseRef}
      className="relative bg-gray-500/30 rounded-full flex items-center justify-center"
      onTouchStart={handleTouchStart}
      style={{ ...baseStyle, touchAction: 'none' }} 
    >
      <div
        className="absolute bg-gray-600/70 rounded-full border-2 border-gray-400"
        style={handleStyle}
      ></div>
    </div>
  );
};

export default Joystick;