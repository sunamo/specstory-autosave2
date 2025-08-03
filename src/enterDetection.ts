import * as vscode from 'vscode';

let lastDetectedTime = 0;
let isInCopilotChat = false;
let lastTextContent = '';
let textChangeTimer: NodeJS.Timeout | undefined;

export function initializeEnterKeyDetection(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel
): vscode.Disposable[] {
    debugChannel.appendLine('[DEBUG] 🚀 Enter key detection initialized');
    
    // Check if Copilot extensions are active
    const copilotExt = vscode.extensions.getExtension('github.copilot');
    const copilotChatExt = vscode.extensions.getExtension('github.copilot-chat');
    debugChannel.appendLine(`[DEBUG] 🔌 Copilot extensions: main=${!!copilotExt}, chat=${!!copilotChatExt}`);
    
    // Check current active editor immediately
    const currentEditor = vscode.window.activeTextEditor;
    if (currentEditor?.document.uri.scheme === 'chat-editing-snapshot-text-model') {
        debugChannel.appendLine('[DEBUG] 🎯 Already in Copilot Chat - detection ON');
        isInCopilotChat = true;
    }
    
    // Method 1: Track when user is in Copilot Chat
    const editorChangeListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
        debugChannel.appendLine(`[DEBUG] 👁️ EDITOR CHANGE EVENT: ${editor ? 'editor exists' : 'no editor'}`);
        
        if (!editor) {
            isInCopilotChat = false;
            debugChannel.appendLine('[DEBUG] 📤 No editor - Copilot detection OFF');
            return;
        }
        
        const scheme = editor.document.uri.scheme;
        const uri = editor.document.uri.toString();
        
        debugChannel.appendLine(`[DEBUG] 👁️ Editor details: scheme="${scheme}", uri="${uri.substring(0, 100)}..."`);
        
        // Detect Copilot Chat using official extension IDs
        const isCopilotChat = (
            scheme === 'chat-editing-snapshot-text-model' ||
            (scheme === 'webview-panel' && (uri.includes('github.copilot-chat') || uri.includes('github.copilot'))) ||
            scheme === 'vscode-chat' ||
            uri.toLowerCase().includes('github.copilot') ||
            uri.includes('copilot-chat') ||
            scheme.includes('chat')
        );
        
        debugChannel.appendLine(`[DEBUG] 👁️ Detection result: isCopilotChat=${isCopilotChat}, current=${isInCopilotChat}`);
        
        if (isCopilotChat !== isInCopilotChat) {
            isInCopilotChat = isCopilotChat;
            debugChannel.appendLine(`[DEBUG] ${isCopilotChat ? '🎯 Copilot Chat ACTIVE' : '📤 Copilot Chat OFF'} (${scheme})`);
            if (isInCopilotChat) {
                lastTextContent = '';
                debugChannel.appendLine('[DEBUG] 🎯 Ready to detect message sending!');
            }
        }
    });
    
    // Method 2: Text change detection for message sending
    const textChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
        const uri = event.document.uri.toString();
        const scheme = event.document.uri.scheme;
        
        // Skip our own debug channels
        if (uri.includes('SpecStoryAutoSave')) {
            return;
        }
        
        debugChannel.appendLine(`[DEBUG] 📝 TEXT CHANGE: scheme="${scheme}", uri="${uri.substring(0, 80)}...", isInCopilot=${isInCopilotChat}`);
        
        if (!isInCopilotChat) {
            debugChannel.appendLine('[DEBUG] 📝 Skipping - not in Copilot Chat');
            return;
        }
        
        if (event.contentChanges.length > 0) {
            const currentTextContent = event.document.getText();
            const previousLength = lastTextContent.length;
            const currentLength = currentTextContent.length;
            
            debugChannel.appendLine(`[DEBUG] 📝 Processing changes: ${previousLength}→${currentLength} chars, changes=${event.contentChanges.length}`);
            
            event.contentChanges.forEach((change, index) => {
                const isTextCleared = (
                    (change.text === '' && change.rangeLength > 5) || // Complete text removal
                    (previousLength > 10 && currentLength === 0) ||    // All text cleared
                    (currentLength < previousLength * 0.3 && previousLength > 15) // Major reduction
                );
                
                debugChannel.appendLine(`[DEBUG] 📝 Change ${index}: text="${change.text.substring(0, 20)}...", rangeLength=${change.rangeLength}, isCleared=${isTextCleared}`);
                
                if (isTextCleared) {
                    const now = Date.now();
                    if (now - lastDetectedTime > 500) {
                        lastDetectedTime = now;
                        debugChannel.appendLine(`[DEBUG] 🚀 MESSAGE SENT VIA ENTER DETECTION - Text cleared: ${previousLength}→${currentLength} chars`);
                        handleAIActivity();
                    } else {
                        debugChannel.appendLine(`[DEBUG] 🔄 Message detection debounced (${now - lastDetectedTime}ms ago)`);
                    }
                }
            });
            
            lastTextContent = currentTextContent;
        }
    });
    
    debugChannel.appendLine('[DEBUG] 💡 Detection ready - Focus on Copilot Chat and send a message');
    
    return [editorChangeListener, textChangeListener];
}
