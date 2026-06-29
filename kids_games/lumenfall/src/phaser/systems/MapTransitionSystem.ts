import Phaser from 'phaser';

/**
 * Map Transition System
 * Handles portals and map-to-map transitions
 */

export interface Portal {
  x: number;
  y: number;
  width: number;
  height: number;
  targetMap: string;
  targetX: number;
  targetY: number;
  direction: 'north' | 'south' | 'east' | 'west';
}

export class MapTransitionSystem {
  private scene: Phaser.Scene;
  private portals: Portal[] = [];
  private currentMap: string;

  constructor(scene: Phaser.Scene, initialMap: string) {
    this.scene = scene;
    this.currentMap = initialMap;
  }

  /**
   * Add a portal zone
   */
  public addPortal(portal: Portal): void {
    this.portals.push(portal);
  }

  /**
   * Check if player is in a portal zone
   */
  public checkPortalCollision(playerX: number, playerY: number): Portal | null {
    for (const portal of this.portals) {
      if (
        playerX >= portal.x &&
        playerX <= portal.x + portal.width &&
        playerY >= portal.y &&
        playerY <= portal.y + portal.height
      ) {
        return portal;
      }
    }
    return null;
  }

  /**
   * Create edge portals for a map
   */
  public createEdgePortals(mapWidth: number, mapHeight: number, mapName: string): void {
    const portalWidth = 160; // 5 tiles wide
    const portalDepth = 32; // 1 tile deep

    // North portal
    this.addPortal({
      x: (mapWidth / 2) - (portalWidth / 2),
      y: 0,
      width: portalWidth,
      height: portalDepth,
      targetMap: this.getTargetMap(mapName, 'north'),
      targetX: mapWidth / 2,
      targetY: mapHeight - 64,
      direction: 'north'
    });

    // South portal
    this.addPortal({
      x: (mapWidth / 2) - (portalWidth / 2),
      y: mapHeight - portalDepth,
      width: portalWidth,
      height: portalDepth,
      targetMap: this.getTargetMap(mapName, 'south'),
      targetX: mapWidth / 2,
      targetY: 64,
      direction: 'south'
    });

    // East portal
    this.addPortal({
      x: mapWidth - portalDepth,
      y: (mapHeight / 2) - (portalWidth / 2),
      width: portalDepth,
      height: portalWidth,
      targetMap: this.getTargetMap(mapName, 'east'),
      targetX: 64,
      targetY: mapHeight / 2,
      direction: 'east'
    });

    // West portal
    this.addPortal({
      x: 0,
      y: (mapHeight / 2) - (portalWidth / 2),
      width: portalDepth,
      height: portalWidth,
      targetMap: this.getTargetMap(mapName, 'west'),
      targetX: mapWidth - 64,
      targetY: mapHeight / 2,
      direction: 'west'
    });
  }

  /**
   * Get target map based on current map and direction
   */
  private getTargetMap(currentMap: string, direction: string): string {
    // Map connections
    const connections: { [key: string]: { [key: string]: string } } = {
      'town': {
        'north': 'forest_north',
        'south': 'forest_south',
        'east': 'forest_east',
        'west': 'forest_west'
      },
      'forest_north': {
        'south': 'town',
        'north': 'forest_deep',
        'east': 'forest_east',
        'west': 'forest_west'
      },
      'forest_south': {
        'north': 'town',
        'south': 'ruins',
        'east': 'forest_east',
        'west': 'forest_west'
      },
      'forest_east': {
        'west': 'town',
        'north': 'forest_north',
        'south': 'forest_south'
      },
      'forest_west': {
        'east': 'town',
        'north': 'forest_north',
        'south': 'forest_south'
      },
      'ruins': {
        'north': 'forest_south'
      }
    };

    return connections[currentMap]?.[direction] || currentMap;
  }

  /**
   * Trigger map transition
   */
  public transitionToMap(portal: Portal, onTransition: (mapName: string, x: number, y: number) => void): void {
    // Fade out effect
    this.scene.cameras.main.fadeOut(500, 0, 0, 0);

    this.scene.cameras.main.once('camerafadeoutcomplete', () => {
      // Call transition callback
      onTransition(portal.targetMap, portal.targetX, portal.targetY);

      // Fade back in
      this.scene.cameras.main.fadeIn(500, 0, 0, 0);
    });
  }

  public getCurrentMap(): string {
    return this.currentMap;
  }

  public setCurrentMap(mapName: string): void {
    this.currentMap = mapName;
  }

  public clearPortals(): void {
    this.portals = [];
  }
}
