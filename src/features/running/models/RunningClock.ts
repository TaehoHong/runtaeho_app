/** One millisecond clock for active duration; GPS timestamps remain wall-clock time. */
export class RunningClock {
  private startedAt: number | null = null;
  private pausedAt: number | null = null;
  private pausedMs = 0;

  start(now: number): void {
    this.startedAt = now;
    this.pausedAt = null;
    this.pausedMs = 0;
  }

  pause(now: number): void {
    if (this.startedAt !== null && this.pausedAt === null) this.pausedAt = now;
  }

  resume(now: number): void {
    if (this.pausedAt !== null) {
      this.pausedMs += now - this.pausedAt;
      this.pausedAt = null;
    }
  }

  elapsed(now: number): number {
    if (this.startedAt === null) return 0;
    return Math.max(0, (this.pausedAt ?? now) - this.startedAt - this.pausedMs);
  }

  reset(): void {
    this.startedAt = null;
    this.pausedAt = null;
    this.pausedMs = 0;
  }
}
