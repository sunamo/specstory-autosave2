import * as vscode from 'vscode';

let debugChannel: vscode.OutputChannel;
let outputChannel: vscode.OutputChannel;
let exportChannel: vscode.OutputChannel;

export function initializeLogger(debug: vscode.OutputChannel, output: vscode.OutputChannel, exportLog?: vscode.OutputChannel) {
    debugChannel = debug;
    outputChannel = output;
    if (exportLog) {
        exportChannel = exportLog;
    }
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

export function logExport(message: string) {
    if (exportChannel) {
        const timestamp = new Date().toLocaleString();
        exportChannel.appendLine(`[${timestamp}] ${message}`);
    }
    // Also log to main output for compatibility
    if (outputChannel) {
        outputChannel.appendLine(`[EXPORT] ${message}`);
    }
}
