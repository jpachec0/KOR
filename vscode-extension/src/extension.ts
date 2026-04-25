import * as vscode from "vscode";
import { AgentSidebarProvider } from "./panel/AgentSidebarProvider";
import { CoreClient } from "./services/coreClient";

export function activate(context: vscode.ExtensionContext): void {
  const coreClient = new CoreClient();
  const sidebarProvider = new AgentSidebarProvider(context, coreClient);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(AgentSidebarProvider.viewType, sidebarProvider, {
      webviewOptions: {
        retainContextWhenHidden: true
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("korAgent.openChat", async () => {
      await sidebarProvider.reveal();
      await sidebarProvider.refresh();
    }),
    vscode.commands.registerCommand("korAgent.askSelection", async () => {
      await sidebarProvider.askSelection();
    }),
    vscode.commands.registerCommand("korAgent.newChat", async () => {
      await sidebarProvider.reveal();
      await sidebarProvider.promptNewChat();
    }),
    vscode.window.onDidChangeActiveTextEditor(() => {
      sidebarProvider.syncEditorContext();
    }),
    vscode.window.onDidChangeTextEditorSelection(() => {
      sidebarProvider.syncEditorContext();
    })
  );
}

export function deactivate(): void {}
