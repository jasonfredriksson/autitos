import React, { useRef, useState } from 'react';
import { useGameLoop } from '../hooks/useGameLoop';
import { generateTerrainSegment, type TerrainPoint } from '../utils/terrain';
import { Truck } from '../utils/truck';
import { GameUI } from './GameUI';
import { Dashboard } from './Dashboard';
import { useGameControls } from '../hooks/useGameControls';
import { CANVAS_HEIGHT, CANVAS_WIDTH, SEGMENT_WIDTH, SEGMENTS_TO_KEEP } from '../utils/constants';
import { SkyManager } from '../utils/sky';
import '../styles/game.css';

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [truck] = useState(() => new Truck(150, 200));
  const [score, setScore] = useState(0);
  const [lastPoints, setLastPoints] = useState(0);
  const [skyManager] = useState(() => new SkyManager());
  const [terrainSegments, setTerrainSegments] = useState(() => {
    const segments = [];
    for (let i = 0; i < SEGMENTS_TO_KEEP; i++) {
      segments.push(
        generateTerrainSegment(
          i * SEGMENT_WIDTH,
          (i + 1) * SEGMENT_WIDTH,
          50,
          CANVAS_HEIGHT,
          segments[i - 1]?.[segments[i - 1].length - 1]
        )
      );
    }
    return segments;
  });
  const [gameStarted, setGameStarted] = useState(false);

  const keys = useGameControls();
  const [airTime, setAirTime] = useState(0);

  const update = (deltaTime: number) => {
    if (!canvasRef.current || !gameStarted) return;

    // Update sky
    skyManager.update(deltaTime);

    const useNitro = keys.has(' ');
    if (keys.has('ArrowRight')) truck.accelerate(deltaTime, useNitro);
    if (keys.has('ArrowLeft')) truck.reverse(deltaTime);
    if (!keys.has('ArrowRight') && !keys.has('ArrowLeft')) truck.idle(deltaTime);

    const allTerrainPoints = terrainSegments.flat();
    truck.update(deltaTime, allTerrainPoints);
    setAirTime(truck.getAirTime());

    // Update score and points
    const currentScore = truck.scoreManager.getScore();
    if (currentScore.lastTrickScore > 0 && currentScore.lastTrickScore !== lastPoints) {
      setLastPoints(currentScore.lastTrickScore);
      // Clear points after 1 second
      setTimeout(() => setLastPoints(0), 1000);
    }
    
    setScore(currentScore.totalScore);

    const lastSegment = terrainSegments[terrainSegments.length - 1];
    if (truck.x > lastSegment[0].x) {
      setTerrainSegments(prev => {
        const newSegments = [...prev.slice(1)];
        const lastPoint = prev[prev.length - 1][prev[prev.length - 1].length - 1];
        newSegments.push(
          generateTerrainSegment(
            lastSegment[0].x + SEGMENT_WIDTH,
            lastSegment[0].x + SEGMENT_WIDTH * 2,
            50,
            CANVAS_HEIGHT,
            lastPoint
          )
        );
        return newSegments;
      });
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    if (!canvasRef.current || !gameStarted) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.save();

    // Camera follow
    const cameraX = Math.max(0, truck.x - CANVAS_WIDTH / 3);
    ctx.translate(-cameraX, 0);

    // Draw sky gradient
    const { top, bottom } = skyManager.getSkyGradient();
    const gradient = ctx.createLinearGradient(cameraX, 0, cameraX, CANVAS_HEIGHT);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(cameraX, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw stars
    const stars = skyManager.getStars();
    stars.forEach(star => {
      const x = cameraX + star.x * CANVAS_WIDTH;
      const y = star.y * CANVAS_HEIGHT;
      const alpha = star.brightness;
      
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw terrain
    ctx.beginPath();
    const allTerrainPoints = terrainSegments.flat();
    ctx.moveTo(allTerrainPoints[0].x, allTerrainPoints[0].y);
    
    allTerrainPoints.forEach((point, index) => {
      if (index > 0) {
        ctx.lineTo(point.x, point.y);
      }
    });

    // Complete the terrain path
    ctx.lineTo(allTerrainPoints[allTerrainPoints.length - 1].x, CANVAS_HEIGHT);
    ctx.lineTo(allTerrainPoints[0].x, CANVAS_HEIGHT);
    ctx.closePath();

    // Create terrain pattern
    const terrainPattern = ctx.createPattern(createTerrainTexture(), 'repeat');
    if (terrainPattern) {
      ctx.fillStyle = terrainPattern;
      ctx.fill();
    }

    truck.draw(ctx);
    ctx.restore();
  };

  // Create terrain texture
  const createTerrainTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Fill base color
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, 0, 128, 128);

    // Add noise pattern
    for (let x = 0; x < 128; x++) {
      for (let y = 0; y < 128; y++) {
        if (Math.random() < 0.1) {
          ctx.fillStyle = `rgba(139, 69, 19, ${0.1 + Math.random() * 0.2})`;
          ctx.fillRect(x, y, 2, 2);
        }
      }
    }

    // Add some variation lines
    ctx.strokeStyle = 'rgba(160, 82, 45, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 128, 0);
      ctx.lineTo(Math.random() * 128, 128);
      ctx.stroke();
    }

    return canvas;
  };

  useGameLoop(canvasRef, update, draw);

  return (
    <div className="game-container">
      <h1 className="game-title">TOYO VAN THROUGH THE DESERT</h1>
      <h2 className="game-subtitle">A game by Jason Playing Games</h2>
      <div className="game-canvas-container">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="game-canvas"
        />
        {!gameStarted && (
          <div className="game-instructions">
            <h2>How to Play</h2>
            <ul>
              <li>Use ← and → to accelerate or reverse</li>
              <li>Press Space bar to activate Nitro</li>
            </ul>
            <button 
              className="start-button"
              onClick={() => setGameStarted(true)}
            >
              START GAME
            </button>
          </div>
        )}
        <GameUI 
          lastPoints={lastPoints}
          position={{ 
            x: truck.x - Math.max(0, truck.x - CANVAS_WIDTH / 3), 
            y: truck.y 
          }} 
        />
        <Dashboard 
          speed={truck.getSpeed()} 
          nitro={truck.nitroFuel} 
          maxSpeed={truck.MAX_SPEED}
          score={score}
          airTime={{ current: truck.currentAirTime, max: truck.maxAirTime }}
        />
      </div>
    </div>
  );
}