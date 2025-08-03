import * as vscode from 'vscode';

let debugChannel: vscode.OutputChannel;
let outputChannel: vscode.OutputChannel;

export function initializeLogger(debug: vscode.OutputChannel, output: vscode.OutputChannel) {
    debugChannel = debug;
    outputChannel = output;
}

export function logDebug(message: string) {
    const config = vscode.workspace.getConfiguration('specstoryautosave');
    const enableDebugLogs = config.get<boolean>('enableDebugLogs', false);
    
    if (enableDebugLogs && debugChannel) {
        debugChannel.appendLine(`[DEBUG] ${message}`);
    }
}

export function logInfo(message: string) {
    if (outputChannel) {
        outputChannel.appendLine(`[INFO] ${message}`);
    }
}

export function logWarning(message: string) {
    if (outputChannel) {
        outputChannel.appendLine(`[WARNING] ${message}`);
    }
}

export function logError(message: string) {
    if (outputChannel) {
        outputChannel.appendLine(`[ERROR] ${message}`);
    }
}

export function logAIActivity(message: string) {
    if (outputChannel) {
        outputChannel.appendLine(`[AI ACTIVITY] ${message}`);
    }
}
