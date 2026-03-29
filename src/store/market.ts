import { create } from "zustand";
import type { AccountInfo, OhlcBar, Position, Quote } from "@/api/types";

interface MarketState {
  /** 当前报价（按品种） */
  quotes: Record<string, Quote>;
  latestOhlcBars: Record<string, OhlcBar>;
  /** 账户信息 */
  account: AccountInfo | null;
  /** 当前持仓 */
  positions: Position[];
  /** 连接状态 */
  connected: boolean;

  setQuote: (symbol: string, quote: Quote) => void;
  setLatestOhlcBar: (symbol: string, timeframe: string, bar: OhlcBar) => void;
  setAccount: (info: AccountInfo) => void;
  setPositions: (positions: Position[]) => void;
  setConnected: (v: boolean) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  quotes: {},
  latestOhlcBars: {},
  account: null,
  positions: [],
  connected: false,

  setQuote: (symbol, quote) =>
    set((s) => ({ quotes: { ...s.quotes, [symbol]: quote } })),
  setLatestOhlcBar: (symbol, timeframe, bar) =>
    set((s) => ({
      latestOhlcBars: {
        ...s.latestOhlcBars,
        [`${symbol}:${timeframe}`]: bar,
      },
    })),
  setAccount: (account) => set({ account }),
  setPositions: (positions) => set({ positions }),
  setConnected: (connected) => set({ connected }),
}));

/** 选择器 */
export const selectQuote = (symbol: string) =>
  (s: MarketState) => s.quotes[symbol];
export const selectLatestOhlcBar = (symbol: string, timeframe: string) =>
  (s: MarketState) => s.latestOhlcBars[`${symbol}:${timeframe}`];
export const selectAccount = (s: MarketState) => s.account;
export const selectPositions = (s: MarketState) => s.positions;
export const selectConnected = (s: MarketState) => s.connected;
export const selectTotalPnL = (s: MarketState) =>
  s.positions.reduce((sum, p) => sum + p.profit, 0);
