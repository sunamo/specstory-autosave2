import * as vscode from "vscode";

export function initializeEnterKeyDetection(handleAIActivity: () => void, debugChannel: vscode.OutputChannel): vscode.Disposable[] {
    // Register command that matches package.json keybinding
    const cmd = vscode.commands.registerCommand("specstoryautosave.detectEnterInChat", async () => {
        // STEP 1: OKAMŽITÁ notifikace (první věc!)
        vscode.window.showInformationMessage("🤖 AI Prompt detected! Processing...");
        debugChannel.appendLine("🎯 ENTER INTERCEPTED - Processing...");
        
        // STEP 2: Zachytit SKUTEČNÝ text z Copilot Chat inputu
        let realUserPrompt = "";
        try {
            // Zkusíme různé způsoby zachycení chat inputu
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const document = activeEditor.document;
                const uri = document.uri.toString();
                
                // Pokud je to chat input (untitled nebo chat-related)
                if (uri.includes('untitled') || uri.includes('chat') || uri.includes('copilot')) {
                    realUserPrompt = document.getText().trim();
                    debugChannel.appendLine(`📝 REAL PROMPT captured: "${realUserPrompt.substring(0, 100)}${realUserPrompt.length > 100 ? '...' : ''}"`);
                }
                
                // Pokud máme skutečný text, předáme ho jako context pro handleAIActivity
                if (realUserPrompt) {
                    debugChannel.appendLine(`✅ REAL DATA AVAILABLE - No dummy message needed`);
                    // TODO: Předat realUserPrompt do handleAIActivity jako context
                    handleAIActivity(); // Momentálně bez parametru, ale máme skutečná data
                } else {
                    debugChannel.appendLine(`⚠️ No real prompt captured - will rely on disk detection`);
                    handleAIActivity();
                }
            } else {
                debugChannel.appendLine(`⚠️ No active editor - will rely on disk detection`);
                handleAIActivity();
            }
        } catch (error) {
            debugChannel.appendLine(`⚠️ Error capturing real prompt: ${error}`);
            handleAIActivity();
        }
        
        // STEP 3: Forward to Copilot Chat
        try {
            await vscode.commands.executeCommand("workbench.action.chat.submit");
            debugChannel.appendLine("✅ Successfully forwarded to Copilot Chat");
        } catch (error) {
            debugChannel.appendLine(`⚠️ Error forwarding to Copilot: ${error}`);
        }
        
        debugChannel.appendLine("🔄 Real prompt processing initiated");
    });
    
    debugChannel.appendLine("🚀 Enter interception with REAL PROMPT capture active!");
    return [cmd];
}

export function disposeEnterKeyDetection(): void {}
