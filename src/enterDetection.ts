import * as vscode from 'vscode';

let lastHandleTime = 0;
const THROTTLE_DELAY = 1; // 1ms - zero delay

/**
 * REVOLUTIONARY DETECTION SYSTEM - ZERO DELAY
 * Ultra-aggressive monitoring všech VS Code events
 */
let disposables: vscode.Disposable[] = [];

export function initializeEnterKeyDetection(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel
): vscode.Disposable[] {
    debugChannel.appendLine('🚀 REVOLUTIONARY ZERO-DELAY DETECTION ACTIVATED');
    
    disposables.forEach(d => d.dispose());
    disposables = [];

    // METHOD 1: ULTRA-AGGRESSIVE TEXT MONITORING
    const textWatcher = vscode.workspace.onDidChangeTextDocument((e) => {
        const now = Date.now();
        if (now - lastHandleTime < THROTTLE_DELAY) return;
        lastHandleTime = now;

        debugChannel.appendLine(`📝 TEXT CHANGE at ${new Date().toISOString()}`);
        handleAIActivity();
    });
    disposables.push(textWatcher);

    // METHOD 2: ACTIVE EDITOR CHANGES
    const editorWatcher = vscode.window.onDidChangeActiveTextEditor(() => {
        const now = Date.now();
        if (now - lastHandleTime < THROTTLE_DELAY) return;
        lastHandleTime = now;

        debugChannel.appendLine(`📄 EDITOR CHANGE at ${new Date().toISOString()}`);
        handleAIActivity();
    });
    disposables.push(editorWatcher);

    // METHOD 3: SELECTION CHANGES
    const selectionWatcher = vscode.window.onDidChangeTextEditorSelection(() => {
        const now = Date.now();
        if (now - lastHandleTime < THROTTLE_DELAY) return;
        lastHandleTime = now;

        debugChannel.appendLine(`🔍 SELECTION CHANGE at ${new Date().toISOString()}`);
        handleAIActivity();
    });
    disposables.push(selectionWatcher);

    debugChannel.appendLine('🎯 3 ULTRA-AGGRESSIVE METHODS ACTIVE - ZERO DELAY!');
    return disposables;
}

export function disposeEnterKeyDetection(): void {
    disposables.forEach(d => d.dispose());
    disposables = [];
}
