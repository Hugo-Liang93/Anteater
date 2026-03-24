import { useMarketStore } from "@/store/market";
import { useSignalStore } from "@/store/signals";

export function DataPanel() {
  const account = useMarketStore((s) => s.account);
  const positions = useMarketStore((s) => s.positions);
  const strategies = useSignalStore((s) => s.strategies);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold text-text-secondary">
        实时数据
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {/* 账户摘要 */}
        <section>
          <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            账户
          </h4>
          {account ? (
            <div className="grid grid-cols-2 gap-1 text-xs">
              <Stat label="余额" value={`$${account.balance.toFixed(2)}`} />
              <Stat label="净值" value={`$${account.equity.toFixed(2)}`} />
              <Stat label="已用保证金" value={`$${account.margin.toFixed(2)}`} />
              <Stat
                label="可用保证金"
                value={`$${account.free_margin.toFixed(2)}`}
              />
              <Stat
                label="浮动盈亏"
                value={`$${account.profit.toFixed(2)}`}
                color={account.profit >= 0 ? "text-buy" : "text-sell"}
              />
              <Stat label="杠杆" value={`1:${account.leverage}`} />
            </div>
          ) : (
            <p className="text-xs text-text-muted">未连接</p>
          )}
        </section>

        {/* 持仓 */}
        <section>
          <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            持仓 ({positions.length})
          </h4>
          {positions.length === 0 ? (
            <p className="text-xs text-text-muted">无持仓</p>
          ) : (
            positions.map((p) => (
              <div
                key={p.ticket}
                className="mb-1 flex items-center justify-between rounded bg-bg-secondary px-2 py-1 text-xs"
              >
                <span>
                  <span
                    className={p.type === "buy" ? "text-buy" : "text-sell"}
                  >
                    {p.type.toUpperCase()}
                  </span>{" "}
                  {p.volume} lot
                </span>
                <span
                  className={p.profit >= 0 ? "text-buy" : "text-sell"}
                >
                  {p.profit >= 0 ? "+" : ""}
                  {p.profit.toFixed(2)}
                </span>
              </div>
            ))
          )}
        </section>

        {/* 策略 */}
        <section>
          <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            策略 ({strategies.length})
          </h4>
          <div className="flex flex-wrap gap-1">
            {strategies.map((s) => (
              <span
                key={s.name}
                className="rounded bg-bg-secondary px-1.5 py-0.5 text-[10px] text-text-secondary"
              >
                {s.name}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <span className="text-text-muted">{label}</span>
      <div className={`font-mono ${color ?? "text-text-primary"}`}>{value}</div>
    </div>
  );
}
