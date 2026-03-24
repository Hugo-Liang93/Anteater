import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui";
import {
  AlertTriangle,
  ClipboardList,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
} from "lucide-react";
import { TaskPanel } from "../panels/TaskPanel";
import { DataPanel } from "../panels/DataPanel";
import { LogPanel } from "../panels/LogPanel";
import { AlertPanel } from "../panels/AlertPanel";

const tabs = [
  { key: "tasks" as const, icon: ClipboardList, label: "任务" },
  { key: "data" as const, icon: Database, label: "数据" },
  { key: "logs" as const, icon: ScrollText, label: "日志" },
  { key: "alerts" as const, icon: AlertTriangle, label: "告警" },
];

export function Sidebar() {
  const { sidebarTab, setSidebarTab, sidebarCollapsed, toggleSidebar } =
    useUIStore();

  return (
    <aside
      className={cn(
        "flex shrink-0 border-r border-border bg-bg-panel transition-all duration-200",
        sidebarCollapsed ? "w-12" : "w-80",
      )}
    >
      {/* Tab 图标栏 */}
      <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border py-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setSidebarTab(t.key)}
            title={t.label}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
              sidebarTab === t.key
                ? "bg-bg-hover text-accent"
                : "text-text-muted hover:text-text-secondary",
            )}
          >
            <t.icon size={18} />
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={toggleSidebar}
          className="flex h-10 w-10 items-center justify-center text-text-muted hover:text-text-secondary"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen size={18} />
          ) : (
            <PanelLeftClose size={18} />
          )}
        </button>
      </div>

      {/* 面板内容 */}
      {!sidebarCollapsed && (
        <div className="flex-1 overflow-hidden">
          {sidebarTab === "tasks" && <TaskPanel />}
          {sidebarTab === "data" && <DataPanel />}
          {sidebarTab === "logs" && <LogPanel />}
          {sidebarTab === "alerts" && <AlertPanel />}
        </div>
      )}
    </aside>
  );
}
