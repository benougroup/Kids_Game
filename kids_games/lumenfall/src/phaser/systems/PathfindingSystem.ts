import Phaser from 'phaser';

/**
 * Simple A* pathfinding for click-to-move
 */
export class PathfindingSystem {
  private tileSize: number = 32;

  /**
   * Find path from start to goal using A* algorithm
   */
  findPath(
    startX: number,
    startY: number,
    goalX: number,
    goalY: number,
    isWalkable: (x: number, y: number) => boolean
  ): { x: number; y: number }[] {
    const startTileX = Math.floor(startX / this.tileSize);
    const startTileY = Math.floor(startY / this.tileSize);
    const goalTileX = Math.floor(goalX / this.tileSize);
    const goalTileY = Math.floor(goalY / this.tileSize);

    // Simple direct path if close
    const distance = Phaser.Math.Distance.Between(startTileX, startTileY, goalTileX, goalTileY);
    if (distance < 2) {
      return [{ x: goalX, y: goalY }];
    }

    // A* pathfinding
    const openSet: PathNode[] = [];
    const closedSet = new Set<string>();
    const startNode: PathNode = {
      x: startTileX,
      y: startTileY,
      g: 0,
      h: this.heuristic(startTileX, startTileY, goalTileX, goalTileY),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    while (openSet.length > 0) {
      // Find node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      // Check if reached goal
      if (current.x === goalTileX && current.y === goalTileY) {
        return this.reconstructPath(current);
      }

      closedSet.add(`${current.x},${current.y}`);

      // Check neighbors (4-direction for simplicity)
      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      ];

      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (closedSet.has(key)) continue;

        // Check if walkable
        if (!isWalkable(neighbor.x * this.tileSize, neighbor.y * this.tileSize)) {
          closedSet.add(key);
          continue;
        }

        const g = current.g + 1;
        const h = this.heuristic(neighbor.x, neighbor.y, goalTileX, goalTileY);
        const f = g + h;

        // Check if already in open set
        const existing = openSet.find((n) => n.x === neighbor.x && n.y === neighbor.y);
        if (existing && g >= existing.g) continue;

        const node: PathNode = {
          x: neighbor.x,
          y: neighbor.y,
          g,
          h,
          f,
          parent: current,
        };

        if (existing) {
          // Update existing node
          existing.g = g;
          existing.f = f;
          existing.parent = current;
        } else {
          openSet.push(node);
        }
      }

      // Limit search to prevent infinite loops
      if (closedSet.size > 500) {
        console.warn('Pathfinding exceeded max iterations');
        return [{ x: goalX, y: goalY }]; // Return direct path as fallback
      }
    }

    // No path found - return direct path
    return [{ x: goalX, y: goalY }];
  }

  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    // Manhattan distance
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  private reconstructPath(node: PathNode): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    let current: PathNode | null = node;

    while (current) {
      path.unshift({
        x: current.x * this.tileSize + this.tileSize / 2,
        y: current.y * this.tileSize + this.tileSize / 2,
      });
      current = current.parent;
    }

    // Remove first point (starting position)
    path.shift();

    return path;
  }
}

interface PathNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic to goal
  f: number; // Total cost
  parent: PathNode | null;
}
