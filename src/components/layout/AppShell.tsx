import { usePolling } from "@/hooks/usePolling";
import { useStudioSSE } from "@/hooks/useStudioSSE";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { BottomEventFeed } from "./BottomEventFeed";
import { Studio3D } from "../studio/Studio3D";
import { EmployeeDetail } from "../overlay/EmployeeDetail";

export function AppShell() {
  usePolling();
  useStudioSSE();

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="relative flex-1 overflow-hidden">
          <Studio3D />
          <EmployeeDetail />
        </main>
      </div>
      <BottomEventFeed />
    </div>
  );
}
