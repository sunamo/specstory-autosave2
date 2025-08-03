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
    debugChannel.appendLine("🚀 WEBVIEW-FOCUSED Enter interception!");
    
    // Our main Enter key interceptor - different approach
    const cmd = vscode.commands.registerCommand("specstoryautosave.interceptEnter", async () => {
        debugChannel.appendLine("🎯 ENTER INTERCEPTED - USING SELECTION APPROACH!");
        
        let realUserPrompt = "";
        
        // NEW APPROACH: Try to get selected text or text from selection
        try {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                // Method 1: Get selected text first
                const selection = activeEditor.selection;
                if (!selection.isEmpty) {
                    realUserPrompt = activeEditor.document.getText(selection);
                    debugChannel.appendLine(`📝 Got SELECTED text: "${realUserPrompt}"`);
                }
                
                // Method 2: If no selection, get all text from current line or document
                if (!realUserPrompt) {
                    const currentLine = activeEditor.document.lineAt(selection.active.line);
                    const lineText = currentLine.text.trim();
                    
                    if (lineText && lineText.length > 0) {
                        realUserPrompt = lineText;
                        debugChannel.appendLine(`📝 Got LINE text: "${realUserPrompt}"`);
                    } else {
                        // Last resort - get full document text
                        const fullText = activeEditor.document.getText().trim();
                        if (fullText && fullText.length > 0 && fullText.length < 2000) {
                            realUserPrompt = fullText;
                            debugChannel.appendLine(`� Got FULL text: "${realUserPrompt}"`);
                        }
                    }
                }
                
                debugChannel.appendLine(`🔍 Editor details:`);
                debugChannel.appendLine(`  - Scheme: ${activeEditor.document.uri.scheme}`);
                debugChannel.appendLine(`  - Language: ${activeEditor.document.languageId}`);
                debugChannel.appendLine(`  - URI: ${activeEditor.document.uri.toString()}`);
            }
            
            // Method 3: Manual prompt if nothing found
            if (!realUserPrompt) {
                debugChannel.appendLine("📋 No text found - trying manual input...");
                
                // Ask user to type the prompt manually (for testing)
                realUserPrompt = await vscode.window.showInputBox({
                    prompt: "Enter your Copilot prompt (for testing)",
                    placeHolder: "Type your question here..."
                }) || "";
                
                if (realUserPrompt) {
                    debugChannel.appendLine(`📝 Got MANUAL input: "${realUserPrompt}"`);
                }
            }
            
        } catch (error) {
            debugChannel.appendLine(`❌ Error in capture: ${error}`);
        }
        
        // Add to Activity Bar
        if (realUserPrompt && realUserPrompt.length > 0) {
            debugChannel.appendLine(`✅ Adding user prompt to Activity Bar`);
            await addRealPromptToActivityBar(realUserPrompt, debugChannel);
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
    
    debugChannel.appendLine("🚀 Manual input approach is ACTIVE!");
    return [cmd];
}

export function disposeEnterKeyDetection(): void {}
