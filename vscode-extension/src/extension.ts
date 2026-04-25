import * as vscode from "vscode";
import { AgentSidebarProvider } from "./panel/AgentSidebarProvider";
import { BackendClient } from "./services/backendClient";

export function activate(context: vscode.ExtensionContext): void {
  const backendClient = new BackendClient(context);
  const sidebarProvider = new AgentSidebarProvider(context, backendClient);

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
