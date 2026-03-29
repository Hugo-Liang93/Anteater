import type { Quote } from "@/api/types";
import { Empty, KV } from "./shared";

interface CollectorMetricsProps {
  quote: Quote | undefined;
}

export function CollectorMetrics({ quote }: CollectorMetricsProps): React.ReactNode {
  if (!quote) return <Empty text="等待行情数据" />;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <KV k="买价" v={quote.bid.toFixed(2)} color="text-buy" />
        <KV k="卖价" v={quote.ask.toFixed(2)} color="text-sell" />
        <KV k="点差" v={quote.spread.toFixed(1)} />
      </div>
      <div className="text-[10px] text-text-muted">
        最新更新时间：{quote.time || "--"}
      </div>
    </div>
  );
}
