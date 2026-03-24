/**
 * MT5Services HTTP 客户端
 *
 * 所有请求通过 Vite proxy：/api/* → http://localhost:8808/v1/*
 * 生产环境可通过环境变量 VITE_API_BASE 覆盖。
 */

import { config } from "@/config";
import type { ApiResponse } from "./types";

const BASE = import.meta.env.VITE_API_BASE ?? config.apiBase;

class ApiClient {
  private apiKey: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
  }

  async request<T>(
    path: string,
    init?: RequestInit,
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(this.apiKey ? { "X-API-Key": this.apiKey } : {}),
    };

    let res: Response;
    try {
      res = await fetch(`${BASE}${path}`, {
        ...init,
        headers: { ...headers, ...init?.headers },
      });
    } catch {
      // 网络错误（后端不在线、proxy 连接拒绝等）
      return {
        success: false,
        data: null,
        error: "Network error: backend unreachable",
        error_code: "NETWORK_ERROR",
        metadata: null,
      };
    }

    if (!res.ok) {
      return {
        success: false,
        data: null,
        error: `HTTP ${res.status}: ${res.statusText}`,
        error_code: "HTTP_ERROR",
        metadata: null,
      };
    }

    try {
      return (await res.json()) as ApiResponse<T>;
    } catch {
      return {
        success: false,
        data: null,
        error: "Invalid JSON response",
        error_code: "PARSE_ERROR",
        metadata: null,
      };
    }
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

/** 全局单例 */
export const apiClient = new ApiClient();
