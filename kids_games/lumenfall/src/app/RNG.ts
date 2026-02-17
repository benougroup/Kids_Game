export class RNG {
  private seed: number;

  constructor(seed = 0x12345678) {
    this.seed = seed >>> 0;
  }

  next(): number {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 0xffffffff;
  }

  nextInt(minInclusive: number, maxInclusive: number): number {
    const min = Math.ceil(minInclusive);
    const max = Math.floor(maxInclusive);
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}
