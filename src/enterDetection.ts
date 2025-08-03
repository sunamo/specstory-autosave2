import * as vscode from 'vscode';

let lastDetectedTime = 0;
let isInCopilotChat = false;
let lastTextLength = 0;

export function initializeEnterKeyDetection(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel
): vscode.Disposable[] {
    debugChannel.appendLine('[DEBUG] 🚀 INITIALIZING SIMPLE COPILOT ENTER DETECTION');
    
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
                debugChannel.appendLine('[DEBUG] 🎯 USER ENTERED COPILOT CHAT - Detection active');
                lastTextLength = 0; // Reset text tracking
            } else {
                debugChannel.appendLine('[DEBUG] 📤 USER LEFT COPILOT CHAT - Detection paused');
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
                    const isSignificantDecrease = (currentTextLength < lastTextLength - 5);
                    
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
                
                lastTextLength = currentTextLength;
            }
        }
    });
    
    debugChannel.appendLine('[DEBUG] 🎹 SIMPLE COPILOT ENTER DETECTION ACTIVE');
    debugChannel.appendLine('[DEBUG] 💡 Will detect when you send messages in Copilot Chat');
    debugChannel.appendLine('[DEBUG] 💡 Backup: Use Ctrl+Shift+A after sending a message');
    
    return [editorChangeListener, textChangeListener];
}
