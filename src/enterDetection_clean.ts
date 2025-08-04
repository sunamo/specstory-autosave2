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
    debugChannel.appendLine("🚀 TEXT MONITORING Enter interception!");
    
    // Storage for captured user input as they type
    let lastCapturedText = "";
    let lastCaptureTime = 0;
    
    // Monitor ALL text document changes to capture user input in real-time
    const textChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
        const uri = event.document.uri.toString();
        const scheme = event.document.uri.scheme;
        
        // Skip our own extension output
        if (uri.includes('SpecStoryAutoSave') || scheme === 'output') {
            return;
        }
        
        // Monitor ANY document that might contain user input
        const currentText = event.document.getText().trim();
        
        // Store text if it looks like user input (reasonable length, not system/debug text)
        if (currentText && 
            currentText.length > 0 && 
            currentText.length < 5000 &&
            !currentText.includes('[DEBUG]') &&
            !currentText.includes('Activity Bar') &&
            !currentText.includes('constructor') &&
            !currentText.includes('📋') &&
            !currentText.includes('✅') &&
            !currentText.includes('❌') &&
            !currentText.includes('SpecStoryAutoSave')) {
            
            lastCapturedText = currentText;
            lastCaptureTime = Date.now();
            
            // Only log occasionally to avoid spam
            if (Math.random() < 0.05) { // 5% chance to log
                debugChannel.appendLine(`💾 Captured text from ${scheme}: "${currentText.substring(0, 50)}..."`);
            }
        }
    });
    
    // Our Enter key interceptor - uses stored text
    const cmd = vscode.commands.registerCommand("specstoryautosave.interceptEnter", async () => {
        debugChannel.appendLine("🎯 ENTER INTERCEPTED!");
        
        let realUserPrompt = "";
        
        // Method 1: Use recently captured text (within last 30 seconds)
        const now = Date.now();
        if (lastCapturedText && (now - lastCaptureTime) < 30000) {
            realUserPrompt = lastCapturedText;
            debugChannel.appendLine(`📝 Using recently captured text: "${realUserPrompt}"`);
        }
        
        // Method 2: Try current active editor as backup
        if (!realUserPrompt) {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const text = activeEditor.document.getText().trim();
                const scheme = activeEditor.document.uri.scheme;
                
                debugChannel.appendLine(`🔍 Checking active editor: ${scheme}`);
                
                if (text && 
                    text.length > 0 && 
                    text.length < 5000 &&
                    !text.includes('[DEBUG]') &&
                    !text.includes('SpecStoryAutoSave')) {
                    realUserPrompt = text;
                    debugChannel.appendLine(`📝 Using active editor text: "${realUserPrompt}"`);
                }
            }
        }
        
        // Method 3: Check all visible editors as last resort
        if (!realUserPrompt) {
            const visibleEditors = vscode.window.visibleTextEditors;
            for (const editor of visibleEditors) {
                const text = editor.document.getText().trim();
                const scheme = editor.document.uri.scheme;
                
                if (text && 
                    text.length > 0 && 
                    text.length < 5000 &&
                    !text.includes('[DEBUG]') &&
                    !text.includes('SpecStoryAutoSave')) {
                    realUserPrompt = text;
                    debugChannel.appendLine(`📝 Using visible editor (${scheme}): "${realUserPrompt}"`);
                    break;
                }
            }
        }
        
        // Add to Activity Bar
        if (realUserPrompt && realUserPrompt.length > 0) {
            debugChannel.appendLine(`✅ Adding CAPTURED prompt to Activity Bar`);
            await addRealPromptToActivityBar(realUserPrompt, debugChannel);
            
            // Clear captured text after use
            lastCapturedText = "";
        } else {
            debugChannel.appendLine(`⚠️ No prompt captured - using fallback`);
            const fallbackPrompt = "Enter pressed - no text captured";
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
    
    debugChannel.appendLine("🚀 Text monitoring approach is ACTIVE!");
    return [cmd, textChangeListener];
}

export function disposeEnterKeyDetection(): void {}
