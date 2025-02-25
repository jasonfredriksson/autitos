import React from 'react';

interface GameUIProps {
  lastPoints?: number;
  position: { x: number; y: number };
}

export function GameUI({ lastPoints, position }: GameUIProps) {
  if (!lastPoints || lastPoints <= 0) return null;

  return (
    <div 
      className="absolute transform -translate-x-1/2 -translate-y-full"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y - 40}px`
      }}
    >
      <div className="text-green-400 text-xl font-bold font-digital animate-bounce">
        +{lastPoints}
      </div>
    </div>
  );
}