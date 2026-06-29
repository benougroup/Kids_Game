import worldProfileJson from '../data/world_profile.v1.json';
import type { GameState } from '../state/StateTypes';

export type WeatherType = 'CLEAR' | 'FOG' | 'STORM';
export type TimePhase = GameState['runtime']['time']['phase'];

export interface SpatialVector {
  x: number;
  y: number;
  depth: number;
  hazard: number;
  perspective: number;
  aux1: number;
  aux2: number;
}

export interface NpcBehaviorProfile {
  id: string;
  panicThreshold: number;
  hideThreshold: number;
  statuses: {
    calm: string;
    watch: string;
    panic: string;
    hide: string;
  };
}

interface WorldProfile {
  id: string;
  spatialAxes: {
    walkability: {
      blockedDepthAtOrBelow: number;
      blockedDepthAtOrAbove: number;
      maxDepthStepDelta: number;
    };
    defaults: Omit<SpatialVector, 'x' | 'y'>;
  };
  environment: {
    shadowSpawnMultiplierByPhase: Record<TimePhase, number>;
    shadowSpawnMultiplierByWeather: Record<WeatherType, number>;
    panicBoostByPhase: Record<TimePhase, number>;
    panicBoostByWeather: Record<WeatherType, number>;
  };
  npcBehaviorProfiles: NpcBehaviorProfile[];
  combatRules: {
    damageAffinities: Record<string, string[]>;
  };
}

const defaultWorldProfile = worldProfileJson as WorldProfile;

export class WorldProfileSystem {
  private readonly behaviorProfiles = new Map<string, NpcBehaviorProfile>();

  constructor(private readonly profile: WorldProfile = defaultWorldProfile) {
    for (const npcProfile of profile.npcBehaviorProfiles) {
      this.behaviorProfiles.set(npcProfile.id, npcProfile);
    }
  }

  getProfileId(): string {
    return this.profile.id;
  }

  getDefaultSpatialVector(x: number, y: number): SpatialVector {
    return {
      x,
      y,
      ...this.profile.spatialAxes.defaults,
    };
  }

  canStepDepth(fromDepth: number, toDepth: number): boolean {
    if (toDepth <= this.profile.spatialAxes.walkability.blockedDepthAtOrBelow) {
      return false;
    }
    if (toDepth >= this.profile.spatialAxes.walkability.blockedDepthAtOrAbove) {
      return false;
    }
    return Math.abs(toDepth - fromDepth) <= this.profile.spatialAxes.walkability.maxDepthStepDelta;
  }

  getShadowSpawnMultiplier(phase: TimePhase, weather: WeatherType): number {
    const byPhase = this.profile.environment.shadowSpawnMultiplierByPhase[phase] ?? 1;
    const byWeather = this.profile.environment.shadowSpawnMultiplierByWeather[weather] ?? 1;
    return Number((byPhase * byWeather).toFixed(3));
  }

  resolveNpcStatus(opts: {
    behaviorProfileId?: string;
    basePanic: number;
    phase: TimePhase;
    weather: WeatherType;
  }): string {
    const profile = opts.behaviorProfileId ? this.behaviorProfiles.get(opts.behaviorProfileId) : undefined;
    if (!profile) {
      return opts.basePanic >= 75 ? 'panic' : 'standing';
    }

    const panicScore =
      opts.basePanic
      + (this.profile.environment.panicBoostByPhase[opts.phase] ?? 0)
      + (this.profile.environment.panicBoostByWeather[opts.weather] ?? 0);

    if (panicScore >= profile.hideThreshold) return profile.statuses.hide;
    if (panicScore >= profile.panicThreshold) return profile.statuses.panic;
    if (panicScore >= profile.panicThreshold * 0.65) return profile.statuses.watch;
    return profile.statuses.calm;
  }

  getDamageAffinities(targetType: string): string[] {
    return this.profile.combatRules.damageAffinities[targetType] ?? [];
  }
}

export const worldProfileSystem = new WorldProfileSystem();
