import * as vscode from "vscode";
import * as path from "path";
import * as cp from "child_process";
import * as util from "util";
import { CoreClient, EditorContextPayload, PendingChange, SidebarState } from "../services/coreClient";
import { renderMarkdown } from "../utils/markdown";

const execAsync = util.promisify(cp.exec);

type WebviewIncomingMessage =
  | { type: "ready" }
  | { type: "refresh" }
  | { type: "newChat"; name?: string }
  | { type: "switchChat"; chatId: string }
  | { type: "sendPrompt"; question: string }
  | { type: "applyChanges" }
  | { type: "getAiConfig" }
  | { type: "fetchModels"; provider: string; apiKey: string }
  | { type: "saveAiConfig"; config: any };

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
  ) { }

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

    try {
      const config = await this.coreClient.getAiConfig(workspacePath);
      this.postMessage({ type: "aiConfig", config });
    } catch (error) {
      // Ignore if ai.json doesn't exist yet
    }
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

      const commandResults = await this.applyWorkspaceEdit(pending.changes);
      this.state = await this.coreClient.clearPending(workspacePath, this.state.activeChat.id);
      this.postState();
      void vscode.window.showInformationMessage("Alteracoes aplicadas com sucesso.");

      if (commandResults && commandResults.length > 0) {
        const feedback = `Os comandos solicitados foram executados no terminal pelo sistema.\nResultados:\n\n${commandResults.join("\n\n")}\n\nPor favor, analise o resultado. Se houver erros, sugira a correção. Se finalizou a tarefa, apenas confirme.`;
        await this.ask(feedback);
      }
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

  private async applyWorkspaceEdit(changes: PendingChange[]): Promise<string[]> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) {
      throw new Error("Abra uma pasta no VS Code para aplicar alteracoes.");
    }

    const edit = new vscode.WorkspaceEdit();
    const documentsToSave = new Set<string>();
    const commandOutputs: string[] = [];

    for (const change of changes) {
      if (change.action === "executeCommand") {
        try {
          const { stdout, stderr } = await execAsync(change.content || "", { cwd: workspaceFolder.uri.fsPath });
          commandOutputs.push(`[SUCESSO] Comando: \`${change.content}\`\n\`\`\`\nSTDOUT: ${stdout}\nSTDERR: ${stderr}\n\`\`\``);
        } catch (err: any) {
          commandOutputs.push(`[ERRO] Comando: \`${change.content}\`\n\`\`\`\nSTDOUT: ${err.stdout}\nSTDERR: ${err.stderr}\nMESSAGE: ${err.message}\n\`\`\``);
        }
        continue;
      }

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

    if (edit.size > 0) {
      const applied = await vscode.workspace.applyEdit(edit);
      if (!applied) {
        throw new Error(`O VS Code nao conseguiu aplicar as alteracoes propostas. (Tamanho do Edit: ${edit.size})`);
      }
    }

    for (const documentUri of documentsToSave) {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(documentUri));
      await document.save();
    }

    return commandOutputs;
  }

  private getEditorContext(): EditorContextPayload {
    const editor = vscode.window.activeTextEditor;
    const document = editor?.document;
    const activeFile = document ? vscode.workspace.asRelativePath(document.uri, false) : undefined;
    const selectedText = editor && !editor.selection.isEmpty ? document?.getText(editor.selection).trim() : undefined;
    let surroundingText = undefined;

    if (editor && document) {
      const startLine = Math.max(0, editor.selection.start.line - 12);
      const endLine = Math.min(document.lineCount - 1, editor.selection.end.line + 12);
      surroundingText = document.getText(
        new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length)
      );
    }

    const openFiles = vscode.workspace.textDocuments
      .filter((doc) => !doc.isClosed && doc.uri.scheme === "file")
      .filter((doc) => doc.getText().length < 50000) // Limit to 50KB per file to avoid massive payloads
      .slice(0, 10) // Limit to 10 files max to prevent ECONNRESET on API
      .map((doc) => ({
        path: vscode.workspace.asRelativePath(doc.uri, false),
        content: doc.getText()
      }));

    return {
      activeFile,
      selectedText,
      surroundingText,
      openFiles
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
      case "getAiConfig":
        try {
          const workspacePath = this.getWorkspaceRootPathOrThrow();
          const config = await this.coreClient.getAiConfig(workspacePath);
          this.postMessage({ type: "aiConfig", config });
        } catch (error) {
          this.showError(error);
        }
        break;
      case "fetchModels":
        try {
          const workspacePath = this.getWorkspaceRootPathOrThrow();
          this.setBusy(true, "Buscando modelos...");
          const models = await this.coreClient.fetchModels(workspacePath, message.provider, message.apiKey);
          this.postMessage({ type: "modelsLoaded", models });
        } catch (error) {
          this.showError(error);
        } finally {
          this.setBusy(false);
        }
        break;
      case "saveAiConfig":
        try {
          const workspacePath = this.getWorkspaceRootPathOrThrow();
          await this.coreClient.saveAiConfig(workspacePath, message.config);
          void vscode.window.showInformationMessage("Configurações de IA salvas com sucesso.");
          // Refresh config to UI
          const updatedConfig = await this.coreClient.getAiConfig(workspacePath);
          this.postMessage({ type: "aiConfig", config: updatedConfig });
        } catch (error) {
          this.showError(error);
        }
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
