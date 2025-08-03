import * as vscode from 'vscode';

let lastDetectedTime = 0;
let isInCopilotChat = false;
let lastTextContent = '';
let textChangeTimer: NodeJS.Timeout | undefined;

export function initializeEnterKeyDetection(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel
): vscode.Disposable[] {
    debugChannel.appendLine('[DEBUG] 🚀 INITIALIZING FOCUS + TEXT CHANGE DETECTION WITH DEBUG');
    
    // Method 1: Track when user is in Copilot Chat
    const editorChangeListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (!editor) {
            isInCopilotChat = false;
            debugChannel.appendLine('[DEBUG] 🔍 No active editor - Copilot detection OFF');
            return;
        }
        
        const uri = editor.document.uri.toString();
        const scheme = editor.document.uri.scheme;
        
        // Debug: Log all editor changes to see what URIs we get
        debugChannel.appendLine(`[DEBUG] 🔍 Editor changed: scheme="${scheme}", uri="${uri}"`);
        
        // Detect Copilot Chat - expanded detection
        const isCopilotChat = (
            (scheme === 'webview-panel' && (uri.includes('copilot') || uri.includes('chat') || uri.includes('github-copilot'))) ||
            (scheme === 'vscode-interactive') ||
            (uri.includes('copilot')) ||
            (uri.includes('chat')) ||
            (uri.includes('github-copilot'))
        );
        
        if (isCopilotChat !== isInCopilotChat) {
            isInCopilotChat = isCopilotChat;
            if (isInCopilotChat) {
                debugChannel.appendLine('[DEBUG] 🎯 USER FOCUSED ON COPILOT CHAT - Detection active');
                debugChannel.appendLine(`[DEBUG] 🎯 Detected via: scheme="${scheme}", uri="${uri.substring(0, 80)}..."`);
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
    
    // Method 2: Enhanced text change detection - only when in Copilot Chat
    const textChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
        const uri = event.document.uri.toString();
        const scheme = event.document.uri.scheme;
        
        // Debug: Log ALL text changes to see what documents are changing
        if (!uri.includes('SpecStoryAutoSave')) {
            debugChannel.appendLine(`[DEBUG] 📄 Text change: scheme="${scheme}", uri="${uri.substring(0, 60)}...", isInCopilot=${isInCopilotChat}`);
        }
        
        // Only detect when user is in Copilot Chat
        if (!isInCopilotChat) {
            return;
        }
        
        // Skip our own debug channels
        if (uri.includes('SpecStoryAutoSave')) {
            return;
        }
        
        // Process ALL documents when user is focused on Copilot - not just webview-panel
        if (event.contentChanges.length > 0) {
            const currentTextContent = event.document.getText();
            debugChannel.appendLine(`[DEBUG] 📝 Processing text changes in: ${scheme}:${uri.substring(0, 40)}... (changes: ${event.contentChanges.length})`);
            
            event.contentChanges.forEach((change, index) => {
                const newText = change.text;
                const isTextCleared = (newText.length === 0 && change.rangeLength > 5); // Reduced threshold
                const isSignificantDecrease = (currentTextContent.length < lastTextContent.length - 3); // Reduced threshold
                
                debugChannel.appendLine(`[DEBUG] 📝 Change ${index}: newText="${newText.replace(/\n/g, '\\n')}" (len: ${newText.length}), rangeLength: ${change.rangeLength}`);
                debugChannel.appendLine(`[DEBUG] 📝 Current text length: ${currentTextContent.length}, last: ${lastTextContent.length}`);
                
                // Simple detection: text was cleared or significantly reduced (message sent)
                if (isTextCleared || isSignificantDecrease) {
                    const now = Date.now();
                    if (now - lastDetectedTime > 800) { // Reduced debounce
                        lastDetectedTime = now;
                        debugChannel.appendLine(`[DEBUG] 🚀 ENTER DETECTED! (cleared: ${isTextCleared}, decreased: ${isSignificantDecrease})`);
                        handleAIActivity();
                    } else {
                        debugChannel.appendLine(`[DEBUG] 🔄 Enter detection ignored (debounce): ${now - lastDetectedTime}ms ago`);
                    }
                }
                
                // Track ALL text changes for debugging
                if (newText.length > 0) {
                    debugChannel.appendLine(`[DEBUG] 📝 Text added: "${newText.substring(0, 20)}..." (total len: ${currentTextContent.length})`);
                }
            });
            
            lastTextContent = currentTextContent;
        }
    });
    
    debugChannel.appendLine('[DEBUG] 🎹 FOCUS + TEXT CHANGE DETECTION WITH DEBUG ACTIVE');
    debugChannel.appendLine('[DEBUG] 💡 Focus on Copilot Chat and send a message - it should be detected!');
    debugChannel.appendLine('[DEBUG] 💡 Watch debug output to see what URIs and text changes occur');
    debugChannel.appendLine('[DEBUG] 💡 Backup: Use Ctrl+Shift+A after sending a message');
    
    return [editorChangeListener, textChangeListener];
}
