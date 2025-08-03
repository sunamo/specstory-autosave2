import * as vscode from 'vscode';

let lastDetectedTime = 0;
let isInCopilotChat = false;
let lastTextContent = '';
let textChangeTimer: NodeJS.Timeout | undefined;

export function initializeEnterKeyDetection(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel
): vscode.Disposable[] {
    debugChannel.appendLine('[DEBUG] 🚀 Enter key detection initialized - Using UNIVERSAL TEXT MONITORING approach');
    
    // Check if Copilot extensions are active
    const copilotExt = vscode.extensions.getExtension('github.copilot');
    const copilotChatExt = vscode.extensions.getExtension('github.copilot-chat');
    debugChannel.appendLine(`[DEBUG] 🔌 Copilot extensions: main=${!!copilotExt}, chat=${!!copilotChatExt}`);
    
    // Method 1: UNIVERSAL text change monitoring - monitor ALL documents
    const universalTextChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
        const uri = event.document.uri.toString();
        const scheme = event.document.uri.scheme;
        
        // Skip our own debug channels
        if (uri.includes('SpecStoryAutoSave')) {
            return;
        }
        
        // Monitor ALL schemes that could be Copilot Chat
        const isPotentiallyCopilotChat = (
            scheme === 'chat-editing-snapshot-text-model' ||
            scheme === 'vscode-chat' ||
            scheme === 'webview-panel' ||
            scheme === 'untitled' ||
            scheme === 'inmemory' ||
            uri.includes('copilot') ||
            uri.includes('chat') ||
            uri.includes('github')
        );
        
        if (isPotentiallyCopilotChat && event.contentChanges.length > 0) {
            debugChannel.appendLine(`[DEBUG] � POTENTIAL COPILOT TEXT CHANGE: scheme="${scheme}", uri="${uri.substring(0, 60)}..."`);
            
            const currentTextContent = event.document.getText();
            const previousLength = lastTextContent.length;
            const currentLength = currentTextContent.length;
            
            debugChannel.appendLine(`[DEBUG] 🔍 Text analysis: ${previousLength}→${currentLength} chars, changes=${event.contentChanges.length}`);
            
            event.contentChanges.forEach((change, index) => {
                const newText = change.text;
                const rangeLength = change.rangeLength;
                
                debugChannel.appendLine(`[DEBUG] � Change ${index}: newText="${newText.substring(0, 15)}...", rangeLength=${rangeLength}`);
                
                // Detect message sending patterns
                const isLikelyCopilotMessageSent = (
                    // Pattern 1: Complete text removal after typing
                    (newText === '' && rangeLength > 3 && previousLength > 5) ||
                    
                    // Pattern 2: Large text reduction (message sent and cleared)
                    (currentLength < previousLength * 0.5 && previousLength > 10) ||
                    
                    // Pattern 3: Complete document clearing
                    (previousLength > 0 && currentLength === 0) ||
                    
                    // Pattern 4: Text replaced with empty (Enter pressed)
                    (rangeLength > 0 && newText === '' && rangeLength === previousLength)
                );
                
                if (isLikelyCopilotMessageSent) {
                    const now = Date.now();
                    if (now - lastDetectedTime > 800) { // Increased debounce
                        lastDetectedTime = now;
                        debugChannel.appendLine(`[DEBUG] 🚀 COPILOT MESSAGE DETECTED via universal monitoring!`);
                        debugChannel.appendLine(`[DEBUG] 🚀 Pattern: ${rangeLength > 0 ? 'TextReplaced' : 'TextCleared'}, scheme: ${scheme}`);
                        debugChannel.appendLine(`[DEBUG] � Text change: ${previousLength}→${currentLength} chars`);
                        isInCopilotChat = true; // Set flag for future reference
                        handleAIActivity();
                    }
                }
            });
            
            lastTextContent = currentTextContent;
        }
    });
    
    debugChannel.appendLine('[DEBUG] 💡 Universal detection ready - Will monitor ALL text changes for Copilot patterns');
    
    return [universalTextChangeListener];
}
