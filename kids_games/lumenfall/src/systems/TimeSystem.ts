import type { EventBus } from '../app/EventBus';
import type { ModeMachine } from '../app/ModeMachine';
import type { DraftTx } from '../state/StateStore';
import type { GameState } from '../state/StateTypes';
import timeConfig from '../data/timeConfig.json';

export type TimePhase = 'DAY' | 'DUSK' | 'NIGHT' | 'DAWN';

const EPSILON = 1e-9;

interface TimeCycleConfig {
  daySeconds: number;
  duskSeconds: number;
  nightSeconds: number;
  dawnSeconds: number;
}

interface TimeSystemDeps {
  readonly bus: EventBus;
  readonly modeMachine: ModeMachine;
}

interface BoundaryInfo {
  readonly phase: TimePhase;
  readonly endSecond: number;
}

export class TimeSystem {
  private readonly cycle: TimeCycleConfig = timeConfig.cycle;
  private readonly tickSeconds = timeConfig.tickSeconds;
  private readonly totalCycleSeconds =
    this.cycle.daySeconds + this.cycle.duskSeconds + this.cycle.nightSeconds + this.cycle.dawnSeconds;

  constructor(private readonly deps: TimeSystemDeps) {}

  update(dtMs: number, tx: DraftTx): void {
    tx.touchRuntimeTime();
    const time = tx.draftState.runtime.time;
    const paused = this.deps.modeMachine.timePausedInMode(tx.draftState.runtime.mode);
    time.paused = paused;

    if (paused || dtMs <= 0) {
      return;
    }

    this.advanceBySeconds(tx.draftState, dtMs / 1000);
  }

  debugSkipSeconds(seconds: number, tx: DraftTx): void {
    if (seconds <= 0) {
      return;
    }

    tx.touchRuntimeTime();
    const time = tx.draftState.runtime.time;
    const paused = this.deps.modeMachine.timePausedInMode(tx.draftState.runtime.mode);
    time.paused = paused;
    this.advanceBySeconds(tx.draftState, seconds);
  }

  private advanceBySeconds(state: GameState, seconds: number): void {
    let remaining = seconds;
    const time = state.runtime.time;

    while (remaining > EPSILON) {
      const current = time.secondsIntoCycle;
      const boundary = this.getBoundaryInfo(current);
      const secondsToBoundary = Math.max(0, boundary.endSecond - current);
      const step = secondsToBoundary <= EPSILON ? remaining : Math.min(remaining, secondsToBoundary);

      if (step > EPSILON) {
        this.advanceClockAndEmitTicks(time, step);
        remaining -= step;
      } else {
        remaining = 0;
      }

      if (secondsToBoundary <= step + EPSILON) {
        const wrapped = time.secondsIntoCycle >= this.totalCycleSeconds - EPSILON;
        if (wrapped) {
          time.secondsIntoCycle = this.normalizeCycleSeconds(time.secondsIntoCycle - this.totalCycleSeconds);
          time.dayCount += 1;
          this.deps.bus.emit({ type: 'DAY_START', dayCount: time.dayCount });
        }

        const nextPhase = this.getPhase(time.secondsIntoCycle);
        if (nextPhase !== boundary.phase) {
          this.deps.bus.emit({ type: 'TIME_PHASE_CHANGED', from: boundary.phase, to: nextPhase });
          this.deps.bus.emit({ type: 'TIME_PHASE_START', phase: nextPhase });
          time.phase = nextPhase;
        }
      }
    }

    time.secondsIntoCycle = this.normalizeCycleSeconds(time.secondsIntoCycle);
  }

  private advanceClockAndEmitTicks(time: GameState['runtime']['time'], seconds: number): void {
    const absoluteBefore = this.toAbsoluteSeconds(time);
    time.secondsIntoCycle += seconds;
    const absoluteAfter = absoluteBefore + seconds;

    while (time.lastTickAtSeconds + this.tickSeconds <= absoluteAfter + EPSILON) {
      time.lastTickAtSeconds += this.tickSeconds;
      this.deps.bus.emit({ type: 'TIME_TICK', atSeconds: time.lastTickAtSeconds });
    }
  }

  private getBoundaryInfo(secondsIntoCycle: number): BoundaryInfo {
    const dayEnd = this.cycle.daySeconds;
    const duskEnd = dayEnd + this.cycle.duskSeconds;
    const nightEnd = duskEnd + this.cycle.nightSeconds;
    const cycleEnd = nightEnd + this.cycle.dawnSeconds;

    if (secondsIntoCycle < dayEnd - EPSILON) {
      return { phase: 'DAY', endSecond: dayEnd };
    }

    if (secondsIntoCycle < duskEnd - EPSILON) {
      return { phase: 'DUSK', endSecond: duskEnd };
    }

    if (secondsIntoCycle < nightEnd - EPSILON) {
      return { phase: 'NIGHT', endSecond: nightEnd };
    }

    return { phase: 'DAWN', endSecond: cycleEnd };
  }

  private getPhase(secondsIntoCycle: number): TimePhase {
    return this.getBoundaryInfo(secondsIntoCycle).phase;
  }

  private toAbsoluteSeconds(time: GameState['runtime']['time']): number {
    return (time.dayCount - 1) * this.totalCycleSeconds + time.secondsIntoCycle;
  }

  private normalizeCycleSeconds(secondsIntoCycle: number): number {
    if (secondsIntoCycle < 0) {
      return 0;
    }

    if (secondsIntoCycle >= this.totalCycleSeconds) {
      return secondsIntoCycle % this.totalCycleSeconds;
    }

    return secondsIntoCycle;
  }
}
