import * as vscode from "vscode";

export function initializeEnterKeyDetection(handleAIActivity: () => void, debugChannel: vscode.OutputChannel): vscode.Disposable[] {
    const cmd = vscode.commands.registerCommand("specstory.interceptEnter", () => {
        handleAIActivity();
        vscode.commands.executeCommand("workbench.action.chat.submit");
    });
    return [cmd];
}

export function disposeEnterKeyDetection(): void {}
