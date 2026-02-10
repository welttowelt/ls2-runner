import { logger } from "../utils/logger.js";

export class TxRateLimiter {
  private txTimestamps: number[] = [];
  private sessionCount = 0;

  constructor(
    private readonly maxTxPerMinute: number,
    private readonly maxTxPerSession: number
  ) {}

  canProceed(): boolean {
    const now = Date.now();
    this.txTimestamps = this.txTimestamps.filter((t) => now - t < 60_000);

    if (this.txTimestamps.length >= this.maxTxPerMinute) {
      logger.warn({ maxTxPerMinute: this.maxTxPerMinute }, "tx rate limit per minute hit");
      return false;
    }
    if (this.sessionCount >= this.maxTxPerSession) {
      logger.warn({ maxTxPerSession: this.maxTxPerSession }, "tx rate limit per session hit");
      return false;
    }

    this.txTimestamps.push(now);
    this.sessionCount++;
    return true;
  }
}
