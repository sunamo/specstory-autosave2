import * as vscode from "vscode";

// Enhanced function for adding real prompt to Activity Bar
async function addRealPromptToActivityBar(realPrompt: string, debugChannel: vscode.OutputChannel) {
    try {
        const aiExtension = vscode.extensions.getExtension('sunamocz.specstory-autosave');
        if (aiExtension && aiExtension.isActive) {
            await vscode.commands.executeCommand('specstoryautosave.forceAINotification', realPrompt);
            debugChannel.appendLine(`✅ Real prompt sent to Activity Bar: "${realPrompt.substring(0, 100)}..."`);
        } else {
            debugChannel.appendLine(`⚠️ Extension not active - cannot add to Activity Bar`);
        }
    } catch (error) {
        debugChannel.appendLine(`⚠️ Error adding to Activity Bar: ${error}`);
    }
}

export function initializeEnterKeyDetection(handleAIActivity: () => void, debugChannel: vscode.OutputChannel): vscode.Disposable[] {
    debugChannel.appendLine("🚀 SIMPLIFIED Enter interception - Focus on REAL text capture!");
    
    // Storage for the last user input before it gets cleared
    let lastUserInput = "";
    
    // Monitor text document changes to capture user input as they type
    const textChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
        const uri = event.document.uri.toString();
        const scheme = event.document.uri.scheme;
        
        // Skip our own output and other irrelevant documents
        if (uri.includes('SpecStoryAutoSave') || 
            uri.includes('output') || 
            scheme === 'output') {
            return;
        }
        
        // Look for Copilot Chat related schemes or untitled documents that might contain user input
        if (scheme === 'untitled' || 
            scheme === 'chat-editing-snapshot-text-model' ||
            scheme.includes('copilot') ||
            scheme.includes('chat')) {
            
            const currentText = event.document.getText().trim();
            
            // Only store if it looks like user input (not empty, not too long, not debug text)
            if (currentText && 
                currentText.length > 0 && 
                currentText.length < 3000 &&
                !currentText.includes('[DEBUG]') &&
                !currentText.includes('Activity Bar') &&
                !currentText.includes('constructor') &&
                !currentText.includes('📋') &&
                !currentText.includes('✅')) {
                
                lastUserInput = currentText;
                debugChannel.appendLine(`💾 Captured user input: "${lastUserInput.substring(0, 100)}..."`);
            }
        }
    });
    
    // Our main Enter key interceptor
    const cmd = vscode.commands.registerCommand("specstoryautosave.interceptEnter", async () => {
        debugChannel.appendLine("🎯 ENTER INTERCEPTED!");
        
        let realUserPrompt = "";
        
        // Method 1: Use the last captured user input
        if (lastUserInput && lastUserInput.length > 0) {
            realUserPrompt = lastUserInput;
            debugChannel.appendLine(`📝 Using stored user input: "${realUserPrompt}"`);
        }
        
        // Method 2: Try to capture current state if no stored input
        if (!realUserPrompt) {
            debugChannel.appendLine("📋 No stored input - trying current capture...");
            
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const text = activeEditor.document.getText().trim();
                const scheme = activeEditor.document.uri.scheme;
                
                debugChannel.appendLine(`🔍 Active editor: ${scheme} - "${text}"`);
                
                if (text && 
                    text.length > 0 && 
                    text.length < 3000 &&
                    !text.includes('[DEBUG]') &&
                    !text.includes('Activity Bar') &&
                    !text.includes('constructor')) {
                    realUserPrompt = text;
                    debugChannel.appendLine(`📝 Using active editor text: "${realUserPrompt}"`);
                }
            }
            
            // Try visible editors
            if (!realUserPrompt) {
                const visibleEditors = vscode.window.visibleTextEditors;
                for (const editor of visibleEditors) {
                    const text = editor.document.getText().trim();
                    const scheme = editor.document.uri.scheme;
                    
                    if (text && 
                        text.length > 0 && 
                        text.length < 3000 &&
                        !text.includes('[DEBUG]') &&
                        !text.includes('Activity Bar')) {
                        realUserPrompt = text;
                        debugChannel.appendLine(`📝 Using visible editor (${scheme}): "${realUserPrompt}"`);
                        break;
                    }
                }
            }
        }
        
        // Add to Activity Bar
        if (realUserPrompt && realUserPrompt.length > 0) {
            debugChannel.appendLine(`✅ Adding user prompt to Activity Bar`);
            await addRealPromptToActivityBar(realUserPrompt, debugChannel);
            
            // Clear the stored input after using it
            lastUserInput = "";
        } else {
            debugChannel.appendLine(`⚠️ No user prompt captured`);
            const fallbackPrompt = "Enter pressed in Copilot Chat";
            await addRealPromptToActivityBar(fallbackPrompt, debugChannel);
            handleAIActivity();
        }
        
        // Forward to Copilot Chat
        setTimeout(async () => {
            try {
                await vscode.commands.executeCommand("workbench.action.chat.submit");
                debugChannel.appendLine("✅ Forwarded to Copilot Chat");
            } catch (error) {
                debugChannel.appendLine(`⚠️ Forward error: ${error}`);
            }
        }, 50);
        
        debugChannel.appendLine("🔄 Processing completed");
    });
    
    debugChannel.appendLine("🚀 Simplified Enter interception is ACTIVE!");
    return [cmd, textChangeListener];
}

export function disposeEnterKeyDetection(): void {}
