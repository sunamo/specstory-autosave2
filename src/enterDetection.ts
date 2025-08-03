import * as vscode from 'vscode';

let lastDetectedTime = 0;

export function initializeEnterKeyDetection(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel
): vscode.Disposable[] {
    debugChannel.appendLine('[DEBUG] 🚀 INITIALIZING ENTER KEY DETECTION FOR COPILOT CHAT');
    
    // Method 1: Monitor text document changes for Enter key patterns
    const textChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
        const uri = event.document.uri.toString();
        const scheme = event.document.uri.scheme;
        
        // Skip our own debug channels
        if (uri.includes('SpecStoryAutoSave')) {
            return;
        }
        
        // Focus on webview panels (where Copilot Chat runs)
        if (scheme === 'webview-panel' || uri.includes('copilot') || uri.includes('chat')) {
            debugChannel.appendLine(`[DEBUG] 📝 Text change in chat panel: ${uri.substring(0, 60)}...`);
            
            if (event.contentChanges.length > 0) {
                const changes = event.contentChanges;
                let messageWasSent = false;
                
                changes.forEach(change => {
                    const newText = change.text;
                    
                    // Detect patterns that indicate message was sent
                    if (newText.includes('User:') || 
                        newText.includes('You:') ||
                        (newText.length === 0 && change.rangeLength > 5)) { // Text cleared after sending
                        messageWasSent = true;
                        debugChannel.appendLine(`[DEBUG] 🎯 MESSAGE SENT PATTERN DETECTED!`);
                    }
                });
                
                if (messageWasSent) {
                    const now = Date.now();
                    if (now - lastDetectedTime > 1000) {
                        lastDetectedTime = now;
                        debugChannel.appendLine('[DEBUG] 🚀 ENTER KEY DETECTION - MESSAGE SENT!');
                        handleAIActivity();
                    }
                }
            }
        }
    });
    
    // Method 2: Command interception has been removed due to instability.
    // We now rely on text document changes and editor focus for detection.
    
    // Method 3: Monitor when chat panel becomes active (user switched to it)
    const editorChangeListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (!editor) return;
        
        const uri = editor.document.uri.toString();
        const scheme = editor.document.uri.scheme;
        
        // Detect when user switches to Copilot Chat
        if (scheme === 'webview-panel' && (uri.includes('copilot') || uri.includes('chat'))) {
            debugChannel.appendLine(`[DEBUG] 🎯 USER SWITCHED TO COPILOT CHAT`);
            
            // Small delay to see if this was due to sending a message
            setTimeout(() => {
                const now = Date.now();
                if (now - lastDetectedTime > 2000) {
                    lastDetectedTime = now;
                    debugChannel.appendLine('[DEBUG] 🚀 CHAT FOCUS DETECTION!');
                    handleAIActivity();
                }
            }, 800);
        }
    });
    
    debugChannel.appendLine('[DEBUG] 🎹 ENTER KEY DETECTION ACTIVE');
    debugChannel.appendLine('[DEBUG] 💡 Send a message in Copilot Chat and it should be detected!');
    debugChannel.appendLine('[DEBUG] 💡 Backup: Use Ctrl+Shift+A after sending a message');
    
    return [textChangeListener, editorChangeListener];
}
