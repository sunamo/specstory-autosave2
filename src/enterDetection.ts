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
        if (!editor) {
            isInCopilotChat = false;
            return;
        }
        
        const scheme = editor.document.uri.scheme;
        const uri = editor.document.uri.toString();
        
        // Detect Copilot Chat using official extension IDs
        const isCopilotChat = (
            scheme === 'chat-editing-snapshot-text-model' ||
            (scheme === 'webview-panel' && (uri.includes('github.copilot-chat') || uri.includes('github.copilot'))) ||
            scheme === 'vscode-chat' ||
            uri.toLowerCase().includes('github.copilot') ||
            uri.includes('copilot-chat') ||
            scheme.includes('chat')
        );
        
        if (isCopilotChat !== isInCopilotChat) {
            isInCopilotChat = isCopilotChat;
            debugChannel.appendLine(`[DEBUG] ${isCopilotChat ? '🎯 Copilot Chat ACTIVE' : '📤 Copilot Chat OFF'} (${scheme})`);
            if (isInCopilotChat) {
                lastTextContent = '';
            }
        }
    });
    
    // Method 2: Text change detection for message sending
    const textChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
        const uri = event.document.uri.toString();
        
        // Skip our own debug channels
        if (uri.includes('SpecStoryAutoSave') || !isInCopilotChat) {
            return;
        }
        
        if (event.contentChanges.length > 0) {
            const currentTextContent = event.document.getText();
            const previousLength = lastTextContent.length;
            const currentLength = currentTextContent.length;
            
            event.contentChanges.forEach((change) => {
                const isTextCleared = (
                    (change.text === '' && change.rangeLength > 5) || // Complete text removal
                    (previousLength > 10 && currentLength === 0) ||    // All text cleared
                    (currentLength < previousLength * 0.3 && previousLength > 15) // Major reduction
                );
                
                if (isTextCleared) {
                    const now = Date.now();
                    if (now - lastDetectedTime > 500) {
                        lastDetectedTime = now;
                        debugChannel.appendLine(`[DEBUG] 🚀 MESSAGE SENT - Text cleared: ${previousLength}→${currentLength} chars`);
                        handleAIActivity();
                    }
                }
            });
            
            lastTextContent = currentTextContent;
        }
    });
    
    debugChannel.appendLine('[DEBUG] 💡 Detection ready - Focus on Copilot Chat and send a message');
    
    return [editorChangeListener, textChangeListener];
}
