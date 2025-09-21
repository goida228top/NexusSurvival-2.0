import React, { useState, useRef, useEffect, useCallback } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  size: number;
}

const Joystick: React.FC<JoystickProps> = ({ onMove, size }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);
  const touchId = useRef<number | null>(null);
  const dragSource = useRef<'touch' | 'mouse' | null>(null);

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

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (dragSource.current) return;
    dragSource.current = 'mouse';
    handleMove(e.clientX, e.clientY);
  };

  const handleWindowMouseMove = useCallback((e: MouseEvent) => {
    if (dragSource.current !== 'mouse') return;
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleWindowMouseUp = useCallback((e: MouseEvent) => {
    if (dragSource.current !== 'mouse') return;
    dragSource.current = null;
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  }, [onMove]);


  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (dragSource.current) return;
    
    const touch = e.changedTouches[0];
    touchId.current = touch.identifier;
    dragSource.current = 'touch';
    
    handleMove(touch.clientX, touch.clientY);
  };
  
  const handleWindowTouchMove = useCallback((e: TouchEvent) => {
    if (dragSource.current !== 'touch' || touchId.current === null) return;
    
    const touch = Array.from(e.targetTouches).find(t => t.identifier === touchId.current);
    if (!touch) return; 
    
    e.preventDefault();
    handleMove(touch.clientX, touch.clientY);
  }, [handleMove]);

  const handleWindowTouchEnd = useCallback((e: TouchEvent) => {
    if (dragSource.current !== 'touch' || touchId.current === null) return;

    const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId.current);
    if (!touch) return; 

    touchId.current = null;
    dragSource.current = null;
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  }, [onMove]);


  useEffect(() => {
    // Add listeners to the window to track movement/end even if the finger/cursor leaves the joystick area.
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleWindowTouchEnd, { passive: false });

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);

      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [handleWindowTouchMove, handleWindowTouchEnd, handleWindowMouseMove, handleWindowMouseUp]);

  const baseStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
  };

  const handleStyle: React.CSSProperties = {
    width: `${size / 2}px`,
    height: `${size / 2}px`,
    transform: `translate(${position.x}px, ${position.y}px)`,
    transition: dragSource.current ? 'none' : 'transform 0.1s ease-out'
  };

  return (
    <div
      ref={baseRef}
      className="relative bg-gray-500/30 rounded-full flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onMouseDown={handleMouseDown}
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