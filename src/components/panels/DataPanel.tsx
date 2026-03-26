import { config } from "@/config";
import { useMarketStore } from "@/store/market";
import { useLiveStore } from "@/store/live";

export function DataPanel() {
  const account = useMarketStore((s) => s.account);
  const positions = useMarketStore((s) => s.positions);
  const quote = useMarketStore((s) => s.quotes["XAUUSD"]);
  const indicators = useLiveStore((s) => s.indicators[config.defaultTimeframe]);
  const queues = useLiveStore((s) => s.queues);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold text-text-secondary">
        实时数据
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {/* 行情 */}
        <Section title="XAUUSD">
          {quote ? (
            <div className="grid grid-cols-3 gap-1 text-xs">
              <Stat label="Bid" value={quote.bid.toFixed(2)} color="text-buy" />
              <Stat label="Ask" value={quote.ask.toFixed(2)} color="text-sell" />
              <Stat label="Spread" value={quote.spread.toFixed(1)} />
            </div>
          ) : (
            <p className="text-xs text-text-muted">未连接</p>
          )}
        </Section>

        {/* 账户 */}
        <Section title="账户">
          {account ? (
            <div className="grid grid-cols-2 gap-1 text-xs">
              <Stat label="余额" value={`$${account.balance.toFixed(2)}`} />
              <Stat label="净值" value={`$${account.equity.toFixed(2)}`} />
              <Stat label="保证金" value={`$${account.margin.toFixed(2)}`} />
              <Stat label="可用" value={`$${account.free_margin.toFixed(2)}`} />
            </div>
          ) : (
            <p className="text-xs text-text-muted">未连接</p>
          )}
        </Section>

        {/* 持仓 */}
        <Section title={`持仓 (${positions.length})`}>
          {positions.length === 0 ? (
            <p className="text-xs text-text-muted">无持仓</p>
          ) : (
            positions.map((p) => (
              <div
                key={p.ticket}
                className="mb-1 flex items-center justify-between rounded bg-bg-secondary px-2 py-1 text-xs"
              >
                <span>
                  <span className={p.type === "buy" ? "text-buy" : "text-sell"}>
                    {p.type === "buy" ? "多" : "空"}
                  </span>{" "}
                  {p.volume}手 @{p.price_open.toFixed(2)}
                </span>
                <span className={p.profit >= 0 ? "text-buy" : "text-sell"}>
                  {p.profit >= 0 ? "+" : ""}{p.profit.toFixed(2)}
                </span>
              </div>
            ))
          )}
        </Section>

        {/* 关键指标 */}
        <Section title={`${config.defaultTimeframe} 指标`}>
          {indicators ? (
            <div className="grid grid-cols-2 gap-1 text-xs">
              <IndStat ind={indicators.indicators} name="rsi14" field="rsi" label="RSI" />
              <IndStat ind={indicators.indicators} name="atr14" field="atr" label="ATR" />
              <IndStat ind={indicators.indicators} name="adx14" field="adx" label="ADX" />
              <IndStat ind={indicators.indicators} name="cci20" field="cci" label="CCI" />
              <IndStat ind={indicators.indicators} name="macd" field="macd" label="MACD" />
              <IndStat ind={indicators.indicators} name="supertrend14" field="direction" label="Trend" />
            </div>
          ) : (
            <p className="text-xs text-text-muted">加载中...</p>
          )}
        </Section>

        {/* 队列 */}
        {queues.length > 0 && (
          <Section title="队列">
            <div className="space-y-1">
              {queues.map((q) => (
                <div key={q.name} className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">{q.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-bg-secondary">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(q.utilization_pct, 100)}%`,
                          backgroundColor: q.utilization_pct > 80 ? "#ff4757" : q.utilization_pct > 50 ? "#ffa726" : "#00d4aa",
                        }}
                      />
                    </div>
                    <span className="w-8 text-right text-text-muted">
                      {q.utilization_pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {title}
      </h4>
      {children}
    </section>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <span className="text-text-muted">{label}</span>
      <div className={`font-mono ${color ?? "text-text-primary"}`}>{value}</div>
    </div>
  );
}

function IndStat({ ind, name, field, label }: {
  ind: Record<string, Record<string, number | null>>;
  name: string;
  field: string;
  label: string;
}) {
  const val = ind[name]?.[field];
  return (
    <div>
      <span className="text-text-muted">{label}</span>
      <div className="font-mono text-text-primary">
        {val != null ? (typeof val === "number" ? val.toFixed(2) : String(val)) : "—"}
      </div>
    </div>
  );
}
