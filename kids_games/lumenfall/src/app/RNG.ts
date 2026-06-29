export class RNG {
  private seed: number;

  constructor(seed = 0x12345678) {
    this.seed = seed >>> 0;
  }

  nextFloat(): number {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 0xffffffff;
  }

  next(): number {
    return this.nextFloat();
  }

  nextInt(minInclusive: number, maxInclusive: number): number {
    const min = Math.ceil(minInclusive);
    const max = Math.floor(maxInclusive);
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }
}

export const hashStringToSeed = (input: string): number => {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
};
