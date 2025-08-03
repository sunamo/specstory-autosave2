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
        
        // STEP 1: Zachytit SKUTEČNÝ text z Copilot Chat inputu
        let realUserPrompt = "";
        try {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const document = activeEditor.document;
                const uri = document.uri.toString();
                
                // Pokud je to chat input (untitled nebo chat-related)
                if (uri.includes('untitled') || uri.includes('chat') || uri.includes('copilot')) {
                    realUserPrompt = document.getText().trim();
                    debugChannel.appendLine(`📝 REAL PROMPT captured: "${realUserPrompt.substring(0, 100)}${realUserPrompt.length > 100 ? '...' : ''}"`);
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
            debugChannel.appendLine(`⚠️ No real prompt captured - will use standard detection`);
            
            // Fallback na standardní detekci, pokud se nepodaří zachytit prompt
            handleAIActivity();
        }
        
        // STEP 3: Forward to Copilot Chat
        try {
            await vscode.commands.executeCommand("workbench.action.chat.submit");
            debugChannel.appendLine("✅ Successfully forwarded to Copilot Chat");
        } catch (error) {
            debugChannel.appendLine(`⚠️ Error forwarding to Copilot: ${error}`);
        }
        
        debugChannel.appendLine("🔄 Real prompt processing completed");
    });
    
    debugChannel.appendLine("🚀 Enter interception with REAL PROMPT capture active!");
    return [cmd];
}

export function disposeEnterKeyDetection(): void {}
