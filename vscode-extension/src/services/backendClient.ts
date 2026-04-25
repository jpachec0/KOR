import axios, { AxiosInstance } from "axios";
import * as vscode from "vscode";

export interface ChatMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface PendingChange {
  path: string;
  action: "create" | "update" | "delete";
  content?: string;
  reason?: string;
}

export interface PendingDiffPreview {
  path: string;
  action: string;
  reason?: string;
  diff: string;
}

export interface SidebarState {
  activeChat: ChatMeta;
  chats: ChatMeta[];
  history: ChatMessage[];
  pendingChanges: PendingChange[];
  pendingDiffPreview: PendingDiffPreview[];
}

export interface EditorContextPayload {
  activeFile?: string;
  selectedText?: string;
  surroundingText?: string;
}

export class BackendClient {
  private readonly http: AxiosInstance;

  constructor(private readonly extensionContext: vscode.ExtensionContext) {
    this.http = axios.create({
      timeout: 120000
    });
  }

  private getBaseUrl(): string {
    const config = vscode.workspace.getConfiguration("korAgent");
    return config.get<string>("backendUrl", "http://localhost:3000").replace(/\/$/, "");
  }

  private async request<T>(path: string, options?: { method?: "GET" | "POST"; data?: unknown }): Promise<T> {
    const response = await this.http.request<T>({
      url: `${this.getBaseUrl()}${path}`,
      method: options?.method || "GET",
      data: options?.data
    });

    return response.data;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.request("/health");
      return true;
    } catch (_error) {
      return false;
    }
  }

  async getState(): Promise<SidebarState> {
    return this.request<SidebarState>("/api/state");
  }

  async createChat(name?: string): Promise<SidebarState> {
    return this.request<SidebarState>("/api/chats", {
      method: "POST",
      data: { name }
    });
  }

  async activateChat(chatId: string): Promise<SidebarState> {
    return this.request<SidebarState>(`/api/chats/${chatId}/activate`, {
      method: "POST"
    });
  }

  async ask(chatId: string, question: string, editorContext?: EditorContextPayload): Promise<{ state: SidebarState }> {
    return this.request<{ state: SidebarState }>(`/api/chats/${chatId}/ask`, {
      method: "POST",
      data: {
        question,
        editorContext
      }
    });
  }

  async getPending(chatId: string): Promise<{ changes: PendingChange[]; diffPreview: PendingDiffPreview[] }> {
    return this.request<{ changes: PendingChange[]; diffPreview: PendingDiffPreview[] }>(`/api/chats/${chatId}/pending`);
  }

  async clearPending(chatId: string): Promise<SidebarState> {
    return this.request<SidebarState>(`/api/chats/${chatId}/pending/clear`, {
      method: "POST"
    });
  }
}
