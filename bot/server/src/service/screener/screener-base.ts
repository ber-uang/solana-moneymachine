export interface ScreenerOptions {
  baseUrl: string;
  filters?: Record<string, string | number>;
}

/**
 * Base class for Screeners which help to discover new tokens we can apply some funky strategies on.
 */
export abstract class Screener {
  protected options: ScreenerOptions;

  constructor(options: ScreenerOptions) {
    this.options = options;
  }

  abstract start(): Promise<void>;
}
