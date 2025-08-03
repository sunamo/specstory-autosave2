import * as vscode from 'vscode';

let lastDetectedTime = 0;
let lastTextContent = '';

export function initializeEnterKeyDetection(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel
): vscode.Disposable[] {
    debugChannel.appendLine('🚀 Copilot detection ready');
    
    // Check if Copilot extensions are active
    const copilotExt = vscode.extensions.getExtension('github.copilot');
    const copilotChatExt = vscode.extensions.getExtension('github.copilot-chat');
    if (copilotExt && copilotChatExt) {
        debugChannel.appendLine('✅ Copilot extensions found');
    } else {
        debugChannel.appendLine('❌ Missing Copilot extensions');
    }
    
    // FAST text change monitoring - ONLY for Copilot Chat
    const textChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
        const uri = event.document.uri.toString();
        const scheme = event.document.uri.scheme;
        
        // Skip output panels and debug channels
        if (uri.includes('SpecStoryAutoSave') || scheme === 'output') {
            return;
        }
        
        // ONLY monitor actual Copilot Chat scheme
        const isCopilotChat = scheme === 'chat-editing-snapshot-text-model';
        
        if (isCopilotChat && event.contentChanges.length > 0) {
            const currentText = event.document.getText();
            const previousLength = lastTextContent.length;
            const currentLength = currentText.length;
            
            // Log only significant changes
            if (Math.abs(currentLength - previousLength) > 1) {
                debugChannel.appendLine(`💬 Copilot: ${previousLength}→${currentLength} chars`);
            }
            
            // IMMEDIATE detection of message sending
            for (const change of event.contentChanges) {
                const newText = change.text;
                const rangeLength = change.rangeLength;
                
                // Message sent = text cleared or significantly reduced
                const isMessageSent = (
                    // Complete text removal
                    (newText === '' && rangeLength > 0) ||
                    // Large text reduction (>70% removed)
                    (currentLength < previousLength * 0.3 && previousLength > 3)
                );
                
                if (isMessageSent) {
                    const now = Date.now();
                    if (now - lastDetectedTime > 100) { // Very fast response
                        lastDetectedTime = now;
                        debugChannel.appendLine(`🚀 COPILOT MESSAGE SENT!`);
                        handleAIActivity();
                        break;
                    }
                }
            }
            
            lastTextContent = currentText;
        }
    });
    
    // Keyboard monitoring for Enter key detection
    const keyboardListener = vscode.commands.registerCommand('type', (args) => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.uri.scheme === 'chat-editing-snapshot-text-model') {
            // Check for Enter key
            if (args && typeof args.text === 'string' && args.text.includes('\n')) {
                const now = Date.now();
                if (now - lastDetectedTime > 50) { // Instant response
                    lastDetectedTime = now;
                    debugChannel.appendLine(`⚡ ENTER in Copilot!`);
                    handleAIActivity();
                }
            }
        }
        
        // Continue with normal typing
        return vscode.commands.executeCommand('default:type', args);
    });
    
    debugChannel.appendLine('✅ Fast Copilot detection active');
    
    return [textChangeListener, keyboardListener];
}
