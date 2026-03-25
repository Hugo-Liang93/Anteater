/**
 * WebSocket 连接 Hook
 *
 * 在 App 启动时建立 WS 连接，注册消息处理器。
 * WS 作为实时增强通道，polling 仍作为兜底保证。
 */

import { useEffect } from "react";
import { getStudioWs } from "@/api/ws";
import { handleWsMessage } from "@/api/wsHandlers";

export function useWebSocket() {
  useEffect(() => {
    const ws = getStudioWs();
    const unsub = ws.onMessage(handleWsMessage);

    // 尝试连接（失败会自动重连）
    ws.connect();

    return () => {
      unsub();
      ws.dispose();
    };
  }, []);
}
