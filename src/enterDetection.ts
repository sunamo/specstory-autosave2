import * as vscode from 'vscode';

let lastHandleTime = 0;
const THROTTLE_DELAY = 500; // 500ms - rozumné zpoždění pro zamezení spamu

/**
 * BALANCED DETECTION SYSTEM
 * Rozumná detekce s ochranou proti spam
 */
let disposables: vscode.Disposable[] = [];

export function initializeEnterKeyDetection(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel
): vscode.Disposable[] {
    debugChannel.appendLine('🚀 BALANCED DETECTION ACTIVATED - Anti-spam protected');
    
    disposables.forEach(d => d.dispose());
    disposables = [];

    // METHOD 1: SMART TEXT MONITORING - jen chat-související soubory
    const textWatcher = vscode.workspace.onDidChangeTextDocument((e) => {
        try {
            const uri = e.document.uri;
            
            // POUZE chat-související URI - ne náš vlastní output!
            const isChatRelated = uri.scheme === 'untitled' || 
                                uri.toString().includes('copilot') ||
                                uri.toString().includes('chat');
            
            // IGNORUJ náš vlastní output channel!
            if (uri.toString().includes('output') || 
                uri.toString().includes('SpecStory') ||
                !isChatRelated) {
                return;
            }

            for (const change of e.contentChanges) {
                // Detekce Enter nebo čištění textu
                const isEnter = change.text === '\n' || change.text === '\r\n';
                const isClearing = change.text === '' && change.rangeLength > 3;
                
                if (isEnter || isClearing) {
                    const now = Date.now();
                    if (now - lastHandleTime < THROTTLE_DELAY) return;
                    lastHandleTime = now;

                    debugChannel.appendLine(`� CHAT: ${isEnter ? 'Enter' : 'Clear'} detected`);
                    handleAIActivity();
                    break;
                }
            }
        } catch (error) {
            // Tichá chyba - nelogovat do output
        }
    });
    disposables.push(textWatcher);

    debugChannel.appendLine('🎯 SMART DETECTION ACTIVE - Protected against spam');
    return disposables;
    return disposables;
}

export function disposeEnterKeyDetection(): void {
    disposables.forEach(d => d.dispose());
    disposables = [];
}
