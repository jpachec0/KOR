import * as path from "path";

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
  openFiles?: { path: string; content: string }[];
}

interface KorCoreFacade {
  ensureRuntime(): Promise<void>;
  getState(chatId?: string | null): Promise<SidebarState>;
  createChat(name?: string): Promise<ChatMeta>;
  useChat(chatId: string): Promise<ChatMeta>;
  askAgent(chatId: string, question: string, options?: { editorContext?: EditorContextPayload }): Promise<unknown>;
  clearPendingChanges(chatId: string): Promise<SidebarState>;
  getAiConfig(): Promise<any>;
  saveAiConfig(config: any): Promise<any>;
  fetchModels(provider: string, apiKey: string): Promise<any>;
  getApiKey(provider: string): Promise<string>;
}

const coreModulePath = path.resolve(__dirname, "../../../core");
const { createKorCore } = require(coreModulePath) as {
  createKorCore: (rootDir: string) => KorCoreFacade;
};

export class CoreClient {
  private getCore(workspacePath: string): KorCoreFacade {
    return createKorCore(workspacePath);
  }

  async getState(workspacePath: string): Promise<SidebarState> {
    const core = this.getCore(workspacePath);
    await core.ensureRuntime();
    return core.getState();
  }

  async createChat(workspacePath: string, name?: string): Promise<SidebarState> {
    const core = this.getCore(workspacePath);
    await core.createChat(name);
    return core.getState();
  }

  async activateChat(workspacePath: string, chatId: string): Promise<SidebarState> {
    const core = this.getCore(workspacePath);
    await core.useChat(chatId);
    return core.getState(chatId);
  }

  async ask(
    workspacePath: string,
    chatId: string,
    question: string,
    editorContext?: EditorContextPayload
  ): Promise<{ state: SidebarState }> {
    const core = this.getCore(workspacePath);
    await core.askAgent(chatId, question, { editorContext });
    return {
      state: await core.getState(chatId)
    };
  }

  async getPending(workspacePath: string, chatId: string): Promise<{ changes: PendingChange[]; diffPreview: PendingDiffPreview[] }> {
    const state = await this.getCore(workspacePath).getState(chatId);
    return {
      changes: state.pendingChanges,
      diffPreview: state.pendingDiffPreview
    };
  }

  async clearPending(workspacePath: string, chatId: string): Promise<SidebarState> {
    return this.getCore(workspacePath).clearPendingChanges(chatId);
  }

  async getAiConfig(workspacePath: string): Promise<any> {
    return this.getCore(workspacePath).getAiConfig();
  }

  async saveAiConfig(workspacePath: string, config: any): Promise<any> {
    return this.getCore(workspacePath).saveAiConfig(config);
  }

  async fetchModels(workspacePath: string, provider: string, apiKey: string): Promise<any> {
    return this.getCore(workspacePath).fetchModels(provider, apiKey);
  }

  async getApiKey(workspacePath: string, provider: string): Promise<string> {
    return this.getCore(workspacePath).getApiKey(provider);
  }
}
