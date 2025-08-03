import * as vscode from 'vscode';

let lastDetectedTime = 0;
let isInCopilotChat = false;
let lastTextContent = '';
let textChangeTimer: NodeJS.Timeout | undefined;

export function initializeEnterKeyDetection(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel
): vscode.Disposable[] {
    debugChannel.appendLine('[DEBUG] 🚀 INITIALIZING FOCUS + TEXT CHANGE DETECTION');
    
    // Method 1: Track when user is in Copilot Chat
    const editorChangeListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (!editor) {
            isInCopilotChat = false;
            return;
        }
        
        const uri = editor.document.uri.toString();
        const scheme = editor.document.uri.scheme;
        
        // Detect Copilot Chat
        const isCopilotChat = scheme === 'webview-panel' && 
                             (uri.includes('copilot') || uri.includes('chat') || uri.includes('github-copilot'));
        
        if (isCopilotChat !== isInCopilotChat) {
            isInCopilotChat = isCopilotChat;
            if (isInCopilotChat) {
                debugChannel.appendLine('[DEBUG] 🎯 USER FOCUSED ON COPILOT CHAT - Detection active');
                lastTextContent = ''; // Reset text tracking
            } else {
                debugChannel.appendLine('[DEBUG] 📤 USER LEFT COPILOT CHAT - Detection paused');
                if (textChangeTimer) {
                    clearTimeout(textChangeTimer);
                    textChangeTimer = undefined;
                }
            }
        }
    });
    
    // Method 2: Simple text change detection - only when in Copilot Chat
    const textChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
        // Only detect when user is in Copilot Chat
        if (!isInCopilotChat) {
            return;
        }
        
        const uri = event.document.uri.toString();
        const scheme = event.document.uri.scheme;
        
        // Skip our own debug channels
        if (uri.includes('SpecStoryAutoSave')) {
            return;
        }
        
        // Only process Copilot Chat related documents
        if (scheme === 'webview-panel' || uri.includes('copilot') || uri.includes('chat')) {
            if (event.contentChanges.length > 0) {
                const currentTextLength = event.document.getText().length;
                
                event.contentChanges.forEach(change => {
                    const newText = change.text;
                    const isTextCleared = (newText.length === 0 && change.rangeLength > 10);
                    const isSignificantDecrease = (currentTextLength < lastTextContent.length - 5);
                    
                    // Simple detection: text was cleared or significantly reduced (message sent)
                    if (isTextCleared || isSignificantDecrease) {
                        const now = Date.now();
                        if (now - lastDetectedTime > 1000) { // 1 second debounce
                            lastDetectedTime = now;
                            debugChannel.appendLine(`[DEBUG] 🚀 COPILOT MESSAGE SENT DETECTED! (text cleared: ${isTextCleared}, text reduced: ${isSignificantDecrease})`);
                            handleAIActivity();
                        }
                    }
                    
                    // Track text changes for message detection
                    if (newText.length > 0) {
                        debugChannel.appendLine(`[DEBUG] � Text in Copilot: "${newText.substring(0, 20)}..." (len: ${currentTextLength})`);
                    }
                });
                
                lastTextContent = event.document.getText();
            }
        }
    });
    
    debugChannel.appendLine('[DEBUG] 🎹 FOCUS + TEXT CHANGE DETECTION ACTIVE');
    debugChannel.appendLine('[DEBUG] 💡 Focus on Copilot Chat and send a message - it should be detected!');
    debugChannel.appendLine('[DEBUG] 💡 Backup: Use Ctrl+Shift+A after sending a message');
    
    return [editorChangeListener, textChangeListener];
}
