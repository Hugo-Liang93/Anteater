import { create } from "zustand";
import type { AccountInfo, Position, Quote } from "@/api/types";

interface MarketState {
  /** 当前报价（按品种） */
  quotes: Record<string, Quote>;
  /** 账户信息 */
  account: AccountInfo | null;
  /** 当前持仓 */
  positions: Position[];
  /** 连接状态 */
  connected: boolean;

  setQuote: (symbol: string, quote: Quote) => void;
  setAccount: (info: AccountInfo) => void;
  setPositions: (positions: Position[]) => void;
  setConnected: (v: boolean) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  quotes: {},
  account: null,
  positions: [],
  connected: false,

  setQuote: (symbol, quote) =>
    set((s) => ({ quotes: { ...s.quotes, [symbol]: quote } })),
  setAccount: (account) => set({ account }),
  setPositions: (positions) => set({ positions }),
  setConnected: (connected) => set({ connected }),
}));
