export interface TerrainPoint {
  x: number;
  y: number;
}

export function generateTerrainSegment(
  startX: number,
  endX: number,
  minY: number,
  maxY: number,
  previousPoint?: TerrainPoint
): TerrainPoint[] {
  const points: TerrainPoint[] = [];
  const segmentWidth = endX - startX;
  const numPoints = Math.ceil(segmentWidth / 20);
  
  if (previousPoint) {
    points.push(previousPoint);
  }

  let prevY = previousPoint ? previousPoint.y : (maxY + minY) / 2;
  let isFlat = Math.random() < 0.3; // 30% chance of flat segment
  let flatY = prevY;
  let flatLength = 0;
  let maxFlatLength = Math.random() * 5 + 3; // 3-8 points of flat terrain
  
  // Decide if this segment should have a dramatic drop
  const shouldDrop = previousPoint && prevY > (maxY + minY) / 2 && Math.random() < 0.3;
  const dropTarget = shouldDrop ? minY + 100 + Math.random() * 100 : prevY;
  let dropProgress = 0;
  
  // Or a dramatic rise
  const shouldRise = previousPoint && prevY < (maxY + minY) / 2 && Math.random() < 0.2;
  const riseTarget = shouldRise ? maxY - 150 + Math.random() * 50 : prevY;
  let riseProgress = 0;

  for (let i = points.length; i <= numPoints; i++) {
    const x = startX + (i * segmentWidth) / numPoints;
    let y = prevY;

    if (shouldDrop) {
      // Create dramatic drops for long jumps
      dropProgress = Math.min(1, dropProgress + 0.1);
      const dropAmount = (dropTarget - points[0].y) * Math.pow(dropProgress, 2);
      y = points[0].y + dropAmount;
      isFlat = false;
    } else if (shouldRise) {
      // Create dramatic rises
      riseProgress = Math.min(1, riseProgress + 0.08);
      const riseAmount = (riseTarget - points[0].y) * Math.pow(riseProgress, 2);
      y = points[0].y + riseAmount;
      isFlat = false;
    } else if (isFlat) {
      // Create flat or slightly inclined terrain
      flatLength++;
      if (flatLength >= maxFlatLength) {
        isFlat = Math.random() < 0.3;
        flatLength = 0;
        maxFlatLength = Math.random() * 5 + 3;
      }
      // Slight incline possible on flat segments
      const incline = (Math.random() - 0.5) * 2;
      flatY += incline;
      y = flatY;
    } else {
      // Create rolling hills with moderate slopes
      const hillHeight = Math.random() * 30 - 15;
      
      // Sometimes start a new flat section
      if (Math.random() < 0.2) {
        isFlat = true;
        flatLength = 0;
        flatY = y;
      }
      
      y += hillHeight;
    }

    // Smooth transition from previous point (unless dropping or rising)
    if (!shouldDrop && !shouldRise) {
      const maxChange = 25;
      const heightDiff = y - prevY;
      if (Math.abs(heightDiff) > maxChange) {
        y = prevY + (Math.sign(heightDiff) * maxChange);
      }
    }

    // Ensure y stays within bounds
    y = Math.max(minY + 50, Math.min(maxY - 100, y));
    
    points.push({ x, y });
    prevY = y;
  }

  return points;
}

export function getTerrainHeightAt(x: number, terrain: TerrainPoint[]): number {
  let p1: TerrainPoint | undefined;
  let p2: TerrainPoint | undefined;

  for (let i = 0; i < terrain.length - 1; i++) {
    if (x >= terrain[i].x && x <= terrain[i + 1].x) {
      p1 = terrain[i];
      p2 = terrain[i + 1];
      break;
    }
  }

  if (!p1 || !p2) return 0;

  const t = (x - p1.x) / (p2.x - p1.x);
  return p1.y + t * (p2.y - p1.y);
}