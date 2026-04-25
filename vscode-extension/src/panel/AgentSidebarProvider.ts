import * as vscode from "vscode";
import * as path from "path";
import { CoreClient, EditorContextPayload, PendingChange, SidebarState } from "../services/coreClient";
import { renderMarkdown } from "../utils/markdown";

type WebviewIncomingMessage =
  | { type: "ready" }
  | { type: "refresh" }
  | { type: "newChat"; name?: string }
  | { type: "switchChat"; chatId: string }
  | { type: "sendPrompt"; question: string }
  | { type: "applyChanges" };

interface RenderedMessage {
  id: string;
  role: "user" | "assistant";
  html: string;
  timestamp: string;
}

export class AgentSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "korAgent.chatView";

  private view?: vscode.WebviewView;
  private state?: SidebarState;
  private busy = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly coreClient: CoreClient
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message: WebviewIncomingMessage) => this.handleMessage(message));
    void this.refresh();
  }

  async reveal(): Promise<void> {
    await vscode.commands.executeCommand("workbench.view.extension.korAgent");
    this.view?.show?.(true);
  }

  async refresh(): Promise<void> {
    if (!this.view) {
      return;
    }

    const workspacePath = this.getWorkspaceRootPath();
    if (!workspacePath) {
      this.postMessage({
        type: "connection",
        connected: false
      });
      return;
    }

    this.postMessage({
      type: "connection",
      connected: true
    });

    this.state = await this.coreClient.getState(workspacePath);
    this.postState();
  }

  async createChat(name?: string): Promise<void> {
    const workspacePath = this.getWorkspaceRootPathOrThrow();
    this.setBusy(true);
    try {
      this.state = await this.coreClient.createChat(workspacePath, name);
      this.postState();
    } finally {
      this.setBusy(false);
    }
  }

  async activateChat(chatId: string): Promise<void> {
    const workspacePath = this.getWorkspaceRootPathOrThrow();
    this.setBusy(true);
    try {
      this.state = await this.coreClient.activateChat(workspacePath, chatId);
      this.postState();
    } finally {
      this.setBusy(false);
    }
  }

  async ask(question: string): Promise<void> {
    if (!this.state?.activeChat?.id) {
      return;
    }

    const workspacePath = this.getWorkspaceRootPathOrThrow();
    this.setBusy(true, "IA pensando...");
    try {
      const response = await this.coreClient.ask(
        workspacePath,
        this.state.activeChat.id,
        question,
        this.getEditorContext()
      );
      this.state = response.state;
      this.postState();
    } catch (error) {
      this.showError(error);
    } finally {
      this.setBusy(false);
    }
  }

  async askSelection(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selection.isEmpty) {
      void vscode.window.showInformationMessage("Selecione um trecho no editor para perguntar sobre ele.");
      return;
    }

    await this.reveal();
    await this.ask("Analise a selecao atual, explique o que ela faz e proponha melhorias objetivas.");
  }

  async applyPendingChanges(): Promise<void> {
    if (!this.state?.activeChat?.id) {
      return;
    }

    const workspacePath = this.getWorkspaceRootPathOrThrow();
    this.setBusy(true, "Aplicando alteracoes...");
    try {
      const pending = await this.coreClient.getPending(workspacePath, this.state.activeChat.id);
      if (!pending.changes?.length) {
        void vscode.window.showInformationMessage("Nao ha alteracoes pendentes para aplicar.");
        return;
      }

      await this.applyWorkspaceEdit(pending.changes);
      this.state = await this.coreClient.clearPending(workspacePath, this.state.activeChat.id);
      this.postState();
      void vscode.window.showInformationMessage("Alteracoes aplicadas no workspace.");
    } catch (error) {
      this.showError(error);
    } finally {
      this.setBusy(false);
    }
  }

  async promptNewChat(): Promise<void> {
    const name = await vscode.window.showInputBox({
      prompt: "Nome do novo chat",
      placeHolder: "ex: refactor-auth"
    });
    if (typeof name === "undefined") {
      return;
    }
    await this.createChat(name);
  }

  syncEditorContext(): void {
    if (!this.state) {
      return;
    }

    this.postState();
  }

  private async applyWorkspaceEdit(changes: PendingChange[]): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) {
      throw new Error("Abra uma pasta no VS Code para aplicar alteracoes.");
    }

    const edit = new vscode.WorkspaceEdit();
    const documentsToSave = new Set<string>();

    for (const change of changes) {
      const uri = vscode.Uri.joinPath(workspaceFolder.uri, change.path);

      if (change.action === "delete") {
        edit.deleteFile(uri, { ignoreIfNotExists: true });
        continue;
      }

      const directory = path.posix.dirname(change.path);
      if (directory && directory !== ".") {
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(workspaceFolder.uri, directory));
      }

      const encoded = Buffer.from(change.content || "", "utf8");
      let document: vscode.TextDocument | undefined;

      try {
        document = await vscode.workspace.openTextDocument(uri);
      } catch (_error) {
        edit.createFile(uri, { overwrite: true, ignoreIfExists: false });
      }

      if (document) {
        const fullRange = new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length)
        );
        edit.replace(uri, fullRange, change.content || "");
      } else {
        edit.insert(uri, new vscode.Position(0, 0), encoded.toString("utf8"));
      }

      documentsToSave.add(uri.toString());
    }

    const applied = await vscode.workspace.applyEdit(edit);
    if (!applied) {
      throw new Error("O VS Code nao conseguiu aplicar as alteracoes propostas.");
    }

    for (const documentUri of documentsToSave) {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(documentUri));
      await document.save();
    }
  }

  private getEditorContext(): EditorContextPayload {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return {};
    }

    const document = editor.document;
    const activeFile = vscode.workspace.asRelativePath(document.uri, false);
    const selectedText = editor.selection.isEmpty ? "" : document.getText(editor.selection).trim();
    const startLine = Math.max(0, editor.selection.start.line - 12);
    const endLine = Math.min(document.lineCount - 1, editor.selection.end.line + 12);
    const surroundingText = document.getText(
      new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length)
    );

    return {
      activeFile,
      selectedText,
      surroundingText
    };
  }

  private getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    const activeEditorUri = vscode.window.activeTextEditor?.document.uri;
    if (activeEditorUri) {
      const activeWorkspace = vscode.workspace.getWorkspaceFolder(activeEditorUri);
      if (activeWorkspace) {
        return activeWorkspace;
      }
    }

    return vscode.workspace.workspaceFolders?.[0];
  }

  private getWorkspaceRootPath(): string | undefined {
    return this.getWorkspaceFolder()?.uri.fsPath;
  }

  private getWorkspaceRootPathOrThrow(): string {
    const workspacePath = this.getWorkspaceRootPath();
    if (!workspacePath) {
      throw new Error("Abra uma pasta no VS Code para usar o agente.");
    }
    return workspacePath;
  }

  private postState(): void {
    if (!this.state) {
      return;
    }

    const renderedMessages: RenderedMessage[] = this.state.history.map((message) => ({
      id: message.id,
      role: message.role,
      timestamp: message.timestamp,
      html: renderMarkdown(message.content)
    }));

    this.postMessage({
      type: "state",
      state: {
        activeChat: this.state.activeChat,
        chats: this.state.chats,
        messages: renderedMessages,
        pendingDiffPreview: this.state.pendingDiffPreview,
        pendingCount: this.state.pendingChanges.length,
        editorContext: this.getEditorContext()
      }
    });
  }

  private async handleMessage(message: WebviewIncomingMessage): Promise<void> {
    switch (message.type) {
      case "ready":
      case "refresh":
        await this.refresh();
        break;
      case "newChat":
        if (message.name) {
          await this.createChat(message.name);
        } else {
          await this.promptNewChat();
        }
        break;
      case "switchChat":
        await this.activateChat(message.chatId);
        break;
      case "sendPrompt":
        await this.ask(message.question);
        break;
      case "applyChanges":
        await this.applyPendingChanges();
        break;
      default:
        break;
    }
  }

  private setBusy(busy: boolean, label = ""): void {
    this.busy = busy;
    this.postMessage({
      type: "busy",
      busy,
      label
    });
  }

  private showError(error: unknown): void {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    this.postMessage({
      type: "error",
      message
    });
    void vscode.window.showErrorMessage(message);
  }

  private postMessage(payload: unknown): void {
    this.view?.webview.postMessage(payload);
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "webview", "main.js"));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "webview", "styles.css"));
    const nonce = String(Date.now());

    return `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}';">
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link rel="stylesheet" href="${styleUri}">
          <title>KOR Local Agent</title>
        </head>
        <body>
          <div id="app"></div>
          <script nonce="${nonce}">
            window.__KOR_INITIAL_THEME__ = "${vscode.window.activeColorTheme.kind}";
          </script>
          <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>`;
  }
}
