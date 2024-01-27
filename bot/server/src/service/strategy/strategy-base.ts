export type TickData = any;

export type Pair = {
  baseToken: string;
  quoteToken: string;
};

export type TokenPair = string; // = `${basetoken}-${quoteToken}`

export type Trade = {
  pair: Pair;
  amount: number;
  openAt: number;
  closedAt: number;
  // TBA
};

export interface IStrategy {
  /**
   * Name of the strategy
   */
  readonly name: string;

  /**
   * In-memory list of active trades
   */
  readonly activeTrades: Record<TokenPair, Trade>;
  // readonly version: number;

  /**
   * Function called right when the strategy is being started
   */
  onStart: () => Promise<void>;

  onTick: (data: TickData) => Promise<void>;
}

export interface StrategyBaseOptions {
  readonly name: string;
}

export abstract class StrategyBase implements IStrategy {
  readonly name: string;
  readonly activeTrades: Record<TokenPair, Trade>;

  constructor(options: StrategyBaseOptions) {
    this.name = options.name;
    this.activeTrades = {};
  }

  async onStart(): Promise<void> {
    // TODO: cleanup all non-SOL coins
  }

  // onTick must be implemented by concrete strategy
  abstract onTick(data: TickData): Promise<void>;
}
