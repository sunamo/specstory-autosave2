import * as vscode from "vscode";

// Jednoduchá funkce pro aktualizaci Activity Bar bez dummy zpráv
async function addRealPromptToActivityBar(realPrompt: string, debugChannel: vscode.OutputChannel) {
    try {
        // Najdeme Activity Bar provider přes extension API
        const aiExtension = vscode.extensions.getExtension('sunamocz.specstory-autosave');
        if (aiExtension && aiExtension.isActive) {
            // Pošleme event pro přidání do Activity Bar
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
    // Register command that matches package.json keybinding
    const cmd = vscode.commands.registerCommand("specstoryautosave.interceptEnter", async () => {
        debugChannel.appendLine("🎯 ENTER INTERCEPTED - Processing...");
        
        // STEP 1: Zachytit SKUTEČNÝ text z Copilot Chat inputu pomocí různých metod
        let realUserPrompt = "";
        try {
            // Method 1: Try to get from active text document
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const document = activeEditor.document;
                const uri = document.uri.toString();
                const scheme = document.uri.scheme;
                
                debugChannel.appendLine(`🔍 Active document: ${scheme} - ${uri}`);
                
                // Copilot Chat používá různé schemes
                if (scheme === 'chat-editing-snapshot-text-model' || 
                    scheme === 'untitled' || 
                    scheme === 'copilot' ||
                    uri.includes('chat') || 
                    uri.includes('copilot') ||
                    uri.includes('untitled')) {
                    
                    const text = document.getText().trim();
                    if (text && text.length > 0) {
                        realUserPrompt = text;
                        debugChannel.appendLine(`📝 METHOD 1 SUCCESS - Document text: "${realUserPrompt.substring(0, 100)}${realUserPrompt.length > 100 ? '...' : ''}"`);
                    }
                }
            }
            
            // Method 2: Try to get from clipboard if document failed
            if (!realUserPrompt || realUserPrompt.length === 0) {
                try {
                    const clipboardText = await vscode.env.clipboard.readText();
                    if (clipboardText && clipboardText.trim().length > 0 && clipboardText.trim().length < 2000) {
                        realUserPrompt = clipboardText.trim();
                        debugChannel.appendLine(`📋 METHOD 2 SUCCESS - Clipboard text: "${realUserPrompt.substring(0, 100)}${realUserPrompt.length > 100 ? '...' : ''}"`);
                    }
                } catch (clipError) {
                    debugChannel.appendLine(`⚠️ Clipboard access failed: ${clipError}`);
                }
            }
            
            // Method 3: Try to get text from all visible text editors
            if (!realUserPrompt || realUserPrompt.length === 0) {
                const visibleEditors = vscode.window.visibleTextEditors;
                for (const editor of visibleEditors) {
                    const scheme = editor.document.uri.scheme;
                    const text = editor.document.getText().trim();
                    
                    debugChannel.appendLine(`� Checking visible editor: ${scheme} - text length: ${text.length}`);
                    
                    if (text && text.length > 0 && text.length < 2000 && 
                        (scheme === 'chat-editing-snapshot-text-model' ||
                         scheme === 'untitled' ||
                         scheme === 'copilot')) {
                        realUserPrompt = text;
                        debugChannel.appendLine(`📝 METHOD 3 SUCCESS - Visible editor: "${realUserPrompt.substring(0, 100)}${realUserPrompt.length > 100 ? '...' : ''}"`);
                        break;
                    }
                }
            }
            
        } catch (error) {
            debugChannel.appendLine(`⚠️ Error capturing real prompt: ${error}`);
        }
        
        // STEP 2: Přidat skutečný prompt přímo do Activity Bar (BEZ dummy zpráv!)
        if (realUserPrompt && realUserPrompt.length > 0) {
            debugChannel.appendLine(`✅ ADDING REAL PROMPT TO ACTIVITY BAR: "${realUserPrompt.substring(0, 100)}..."`);
            
            // Přidáme skutečný prompt přímo pomocí command
            await addRealPromptToActivityBar(realUserPrompt, debugChannel);
            
            debugChannel.appendLine(`🎯 REAL PROMPT PROCESSING COMPLETED!`);
        } else {
            debugChannel.appendLine(`⚠️ No real prompt captured - using fallback with test prompt`);
            
            // Fallback with test prompt to verify activity bar functionality
            const testPrompt = "Test prompt captured from Enter key interception";
            await addRealPromptToActivityBar(testPrompt, debugChannel);
            
            // Also trigger standard detection
            handleAIActivity();
        }
        
        // STEP 3: Forward to Copilot Chat (delayed to allow text capture)
        setTimeout(async () => {
            try {
                await vscode.commands.executeCommand("workbench.action.chat.submit");
                debugChannel.appendLine("✅ Successfully forwarded to Copilot Chat");
            } catch (error) {
                debugChannel.appendLine(`⚠️ Error forwarding to Copilot: ${error}`);
            }
        }, 50); // Small delay to ensure text capture happens first
        
        debugChannel.appendLine("🔄 Real prompt processing completed");
    });
    
    debugChannel.appendLine("🚀 Enter interception with REAL PROMPT capture active!");
    return [cmd];
}

export function disposeEnterKeyDetection(): void {}
