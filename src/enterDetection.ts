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
        const fileName = editor.document.fileName || 'no-filename';
        const languageId = editor.document.languageId || 'no-language';
        
        // Enhanced debug logging for ALL editor changes
        debugChannel.appendLine(`[DEBUG] 🔍 EDITOR CHANGE FULL INFO:`);
        debugChannel.appendLine(`[DEBUG] 🔍   - scheme: "${scheme}"`);
        debugChannel.appendLine(`[DEBUG] 🔍   - uri: "${uri}"`);
        debugChannel.appendLine(`[DEBUG] 🔍   - fileName: "${fileName}"`);
        debugChannel.appendLine(`[DEBUG] 🔍   - languageId: "${languageId}"`);
        debugChannel.appendLine(`[DEBUG] 🔍   - isUntitled: ${editor.document.isUntitled}`);
        
        // Show workspace folder context
        if (vscode.workspace.workspaceFolders) {
            debugChannel.appendLine(`[DEBUG] 🔍   - workspaceFolders: ${vscode.workspace.workspaceFolders.map(f => f.name).join(', ')}`);
        }
        
        // Detect Copilot Chat - comprehensive detection
        const isCopilotChat = (
            // Webview panels containing copilot/chat
            (scheme === 'webview-panel' && (uri.includes('copilot') || uri.includes('chat') || uri.includes('github-copilot') || uri.includes('GitHub.copilot'))) ||
            
            // Interactive windows and notebooks
            (scheme === 'vscode-interactive' || scheme === 'vscode-notebook-cell') ||
            
            // Chat views and panels
            (scheme === 'vscode-chat' || scheme === 'chat') ||
            
            // Any URI containing copilot or chat keywords
            (uri.toLowerCase().includes('copilot') || uri.toLowerCase().includes('chat') || uri.toLowerCase().includes('github.copilot')) ||
            
            // Specific VS Code chat schemes
            (scheme.includes('chat') || scheme.includes('copilot')) ||
            
            // Fallback: any scheme that might be chat-related
            (scheme === 'untitled' && uri.includes('chat')) ||
            (scheme === 'inmemory' && uri.includes('copilot'))
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
    
    // Method 2: Enhanced text change detection with better clearing detection
    const textChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
        const uri = event.document.uri.toString();
        const scheme = event.document.uri.scheme;
        
        // Skip our own debug channels early
        if (uri.includes('SpecStoryAutoSave')) {
            return;
        }
        
        // Debug: Log ALL text changes to see what documents are changing
        debugChannel.appendLine(`[DEBUG] 📄 TEXT CHANGE: scheme="${scheme}", uri="${uri.substring(0, 60)}...", isInCopilot=${isInCopilotChat}, changes=${event.contentChanges.length}`);
        
        // Only detect when user is in Copilot Chat
        if (!isInCopilotChat) {
            return;
        }
        
        // Process ALL documents when user is focused on Copilot - not just webview-panel
        if (event.contentChanges.length > 0) {
            const currentTextContent = event.document.getText();
            const previousLength = lastTextContent.length;
            const currentLength = currentTextContent.length;
            
            debugChannel.appendLine(`[DEBUG] 📝 PROCESSING COPILOT TEXT CHANGES:`);
            debugChannel.appendLine(`[DEBUG] 📝   - Document: ${scheme}:${uri.substring(0, 40)}...`);
            debugChannel.appendLine(`[DEBUG] 📝   - Changes count: ${event.contentChanges.length}`);
            debugChannel.appendLine(`[DEBUG] 📝   - Text length: ${previousLength} → ${currentLength} (diff: ${currentLength - previousLength})`);
            
            event.contentChanges.forEach((change, index) => {
                const newText = change.text;
                const rangeLength = change.rangeLength;
                
                // Enhanced clearing detection
                const isCompleteClearing = (newText.length === 0 && rangeLength > 10); // Complete text removal
                const isLargeReduction = (currentLength < previousLength * 0.5 && previousLength > 20); // Text reduced by 50%+
                const isInputClearing = (newText === '' && rangeLength > 3 && currentLength < 5); // Small input cleared
                const isSentAndCleared = (previousLength > 5 && currentLength === 0); // Any text completely cleared
                
                debugChannel.appendLine(`[DEBUG] 📝   Change ${index}:`);
                debugChannel.appendLine(`[DEBUG] 📝     - newText: "${newText.replace(/\n/g, '\\n')}" (len: ${newText.length})`);
                debugChannel.appendLine(`[DEBUG] 📝     - rangeLength: ${rangeLength}`);
                debugChannel.appendLine(`[DEBUG] 📝     - isCompleteClearing: ${isCompleteClearing}`);
                debugChannel.appendLine(`[DEBUG] 📝     - isLargeReduction: ${isLargeReduction}`);
                debugChannel.appendLine(`[DEBUG] 📝     - isInputClearing: ${isInputClearing}`);
                debugChannel.appendLine(`[DEBUG] 📝     - isSentAndCleared: ${isSentAndCleared}`);
                
                if (isCompleteClearing || isLargeReduction || isInputClearing || isSentAndCleared) {
                    const now = Date.now();
                    if (now - lastDetectedTime > 500) { // Reduced debounce to 500ms
                        lastDetectedTime = now;
                        debugChannel.appendLine(`[DEBUG] 🚀 COPILOT MESSAGE SENT DETECTED!`);
                        debugChannel.appendLine(`[DEBUG] 🚀   - Detection type: ${isCompleteClearing ? 'CompleteClearing' : isLargeReduction ? 'LargeReduction' : isInputClearing ? 'InputClearing' : 'SentAndCleared'}`);
                        debugChannel.appendLine(`[DEBUG] 🚀   - Text change: ${previousLength} chars → ${currentLength} chars`);
                        handleAIActivity();
                    } else {
                        debugChannel.appendLine(`[DEBUG] 🔄 Detection debounced: ${now - lastDetectedTime}ms ago`);
                    }
                }
                
                // Track ALL text additions for debugging
                if (newText.length > 0) {
                    debugChannel.appendLine(`[DEBUG] 📝   - Text added: "${newText.substring(0, 30)}..." (total now: ${currentLength})`);
                }
            });
            
            lastTextContent = currentTextContent;
        }
    });
    
    debugChannel.appendLine('[DEBUG] 🎹 ENHANCED COPILOT DETECTION ACTIVE');
    debugChannel.appendLine('[DEBUG] 💡 Open GitHub Copilot Chat and send a message');
    debugChannel.appendLine('[DEBUG] 💡 Watch debug output for detailed URI and text change analysis');
    debugChannel.appendLine('[DEBUG] 💡 Looking for text clearing patterns when messages are sent');
    debugChannel.appendLine('[DEBUG] 💡 Backup: Use Ctrl+Shift+A after sending a message');
    
    // Additional monitoring: visible editors (Copilot might be visible but not active)
    const visibleEditorsMonitor = vscode.window.onDidChangeVisibleTextEditors((editors) => {
        debugChannel.appendLine(`[DEBUG] 👀 VISIBLE EDITORS CHANGED (${editors.length} total):`);
        editors.forEach((editor, index) => {
            const uri = editor.document.uri.toString();
            const scheme = editor.document.uri.scheme;
            debugChannel.appendLine(`[DEBUG] 👀   Editor ${index}: scheme="${scheme}", uri="${uri.substring(0, 60)}..."`);
            
            // Check if any visible editor is Copilot Chat
            const isVisibleCopilotChat = (
                (scheme === 'webview-panel' && (uri.includes('copilot') || uri.includes('chat') || uri.includes('github-copilot') || uri.includes('GitHub.copilot'))) ||
                (scheme === 'vscode-interactive' || scheme === 'vscode-notebook-cell') ||
                (scheme === 'vscode-chat' || scheme === 'chat') ||
                (uri.toLowerCase().includes('copilot') || uri.toLowerCase().includes('chat') || uri.toLowerCase().includes('github.copilot'))
            );
            
            if (isVisibleCopilotChat) {
                debugChannel.appendLine(`[DEBUG] 👀   ✅ FOUND VISIBLE COPILOT CHAT: ${scheme}:${uri.substring(0, 60)}...`);
                if (!isInCopilotChat) {
                    debugChannel.appendLine(`[DEBUG] 👀   📝 Setting Copilot detection ON due to visible chat`);
                    isInCopilotChat = true;
                }
            }
        });
    });
    
    return [editorChangeListener, textChangeListener, visibleEditorsMonitor];
}
