/**
 * MT5Services HTTP 客户端
 *
 * 所有请求通过 Vite proxy：/api/* → http://localhost:8808/v1/*
 * 生产环境可通过环境变量 VITE_API_BASE 覆盖。
 */

import { config } from "@/config";
import type { ApiError, ApiResponse } from "./types";

const BASE = config.apiBase;

function buildApiError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ApiError {
  return { code, message, details };
}

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return (
    value != null &&
    typeof value === "object" &&
    "success" in value &&
    typeof (value as { success?: unknown }).success === "boolean"
  );
}

class ApiClient {
  private apiKey: string | null = config.apiKey || null;

  setApiKey(key: string) {
    this.apiKey = key;
  }

  getApiKey() {
    return this.apiKey;
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
        error: buildApiError("network_error", "Network error: backend unreachable"),
        metadata: null,
      };
    }

    let body: unknown = null;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        body = await res.json();
      } catch {
        body = null;
      }
    }

    if (isApiResponse<T>(body)) {
      return body;
    }

    if (!res.ok) {
      return {
        success: false,
        data: null,
        error: buildApiError(
          "http_error",
          `HTTP ${res.status}: ${res.statusText}`,
          body != null && typeof body === "object"
            ? { body: body as Record<string, unknown> }
            : { status: res.status },
        ),
        metadata: null,
      };
    }

    if (body !== null) {
      return {
        success: true,
        data: body as T,
        error: null,
        metadata: null,
      };
    }

    return {
      success: false,
      data: null,
      error: buildApiError("parse_error", "Invalid JSON response"),
      metadata: null,
    };
  }

  get<T>(path: string, init?: RequestInit) {
    return this.request<T>(path, init);
  }

  post<T>(path: string, body?: unknown, init?: Omit<RequestInit, "method" | "body">) {
    return this.request<T>(path, {
      ...init,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

/** 全局单例 */
export const apiClient = new ApiClient();
