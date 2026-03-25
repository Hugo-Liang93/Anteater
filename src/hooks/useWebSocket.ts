/**
 * WebSocket 连接 Hook
 *
 * 在 App 启动时建立 WS 连接，注册消息处理器。
 * Mock 模式下跳过连接。
 */

import { useEffect } from "react";
import { config } from "@/config";
import { getStudioWs } from "@/api/ws";
import { handleWsMessage } from "@/api/wsHandlers";

export function useWebSocket() {
  useEffect(() => {
    // Mock 模式下不连接 WebSocket
    if (config.mockMode) return;

    const ws = getStudioWs();
    const unsub = ws.onMessage(handleWsMessage);

    ws.connect();

    return () => {
      unsub();
      ws.dispose();
    };
  }, []);
}
