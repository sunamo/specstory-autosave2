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
    debugChannel.appendLine("🚀 ENHANCED Enter interception with DETAILED DEBUGGING active!");
    
    const cmd = vscode.commands.registerCommand("specstoryautosave.interceptEnter", async () => {
        debugChannel.appendLine("🎯 ENTER INTERCEPTED - ENHANCED CAPTURE MODE...");
        debugChannel.appendLine("============================================");
        
        let realUserPrompt = "";
        
        try {
            // Method 1: Detailed active editor analysis
            debugChannel.appendLine("📋 METHOD 1: Active Editor Analysis");
            const activeEditor = vscode.window.activeTextEditor;
            
            if (activeEditor) {
                const document = activeEditor.document;
                const scheme = document.uri.scheme;
                const languageId = document.languageId;
                const uri = document.uri.toString();
                const text = document.getText();
                const trimmedText = text.trim();
                
                debugChannel.appendLine(`  ✓ Active editor found!`);
                debugChannel.appendLine(`  - Scheme: "${scheme}"`);
                debugChannel.appendLine(`  - Language: "${languageId}"`);
                debugChannel.appendLine(`  - URI: "${uri}"`);
                debugChannel.appendLine(`  - Raw text length: ${text.length}`);
                debugChannel.appendLine(`  - Trimmed text length: ${trimmedText.length}`);
                debugChannel.appendLine(`  - Raw text: "${text}"`);
                debugChannel.appendLine(`  - Trimmed text: "${trimmedText}"`);
                
                if (trimmedText && trimmedText.length > 0) {
                    realUserPrompt = trimmedText;
                    debugChannel.appendLine(`  ✅ SUCCESS: Captured from active editor!`);
                } else {
                    debugChannel.appendLine(`  ❌ No usable text in active editor`);
                }
            } else {
                debugChannel.appendLine(`  ❌ No active editor found`);
            }
            
            // Method 2: Scan ALL visible editors
            if (!realUserPrompt) {
                debugChannel.appendLine("📋 METHOD 2: All Visible Editors Scan");
                const visibleEditors = vscode.window.visibleTextEditors;
                debugChannel.appendLine(`  Found ${visibleEditors.length} visible editors`);
                
                for (let i = 0; i < visibleEditors.length; i++) {
                    const editor = visibleEditors[i];
                    const scheme = editor.document.uri.scheme;
                    const languageId = editor.document.languageId;
                    const uri = editor.document.uri.toString();
                    const text = editor.document.getText().trim();
                    
                    debugChannel.appendLine(`  Editor ${i + 1}:`);
                    debugChannel.appendLine(`    - Scheme: "${scheme}"`);
                    debugChannel.appendLine(`    - Language: "${languageId}"`);
                    debugChannel.appendLine(`    - URI: "${uri}"`);
                    debugChannel.appendLine(`    - Text length: ${text.length}`);
                    debugChannel.appendLine(`    - Text: "${text}"`);
                    
                    if (text && text.length > 0) {
                        realUserPrompt = text;
                        debugChannel.appendLine(`    ✅ SUCCESS: Using text from editor ${i + 1}!`);
                        break;
                    } else {
                        debugChannel.appendLine(`    ❌ No text in this editor`);
                    }
                }
                
                if (!realUserPrompt) {
                    debugChannel.appendLine(`  ❌ No text found in any visible editor`);
                }
            }
            
            // Method 3: Clipboard fallback
            if (!realUserPrompt) {
                debugChannel.appendLine("📋 METHOD 3: Clipboard Fallback");
                try {
                    const clipboardText = await vscode.env.clipboard.readText();
                    debugChannel.appendLine(`  Clipboard content length: ${clipboardText ? clipboardText.length : 0}`);
                    
                    if (clipboardText && clipboardText.trim().length > 0) {
                        realUserPrompt = clipboardText.trim();
                        debugChannel.appendLine(`  ✅ SUCCESS: Using clipboard content!`);
                        debugChannel.appendLine(`  - Content: "${realUserPrompt}"`);
                    } else {
                        debugChannel.appendLine(`  ❌ No usable clipboard content`);
                    }
                } catch (clipError) {
                    debugChannel.appendLine(`  ❌ Clipboard access failed: ${clipError}`);
                }
            }
            
        } catch (error) {
            debugChannel.appendLine(`❌ Error in capture process: ${error}`);
        }
        
        debugChannel.appendLine("============================================");
        debugChannel.appendLine(`📊 CAPTURE RESULT: ${realUserPrompt ? 'SUCCESS' : 'FAILED'}`);
        if (realUserPrompt) {
            debugChannel.appendLine(`📝 Final captured text: "${realUserPrompt}"`);
        }
        
        // Add to Activity Bar
        if (realUserPrompt && realUserPrompt.length > 0) {
            debugChannel.appendLine(`✅ Adding REAL PROMPT to Activity Bar...`);
            await addRealPromptToActivityBar(realUserPrompt, debugChannel);
        } else {
            debugChannel.appendLine(`⚠️ No prompt captured - using test prompt`);
            const testPrompt = "Test prompt - ENHANCED capture failed";
            await addRealPromptToActivityBar(testPrompt, debugChannel);
            handleAIActivity(); // Fallback to standard detection
        }
        
        // Forward to Copilot Chat
        setTimeout(async () => {
            try {
                await vscode.commands.executeCommand("workbench.action.chat.submit");
                debugChannel.appendLine("✅ Successfully forwarded to Copilot Chat");
            } catch (error) {
                debugChannel.appendLine(`⚠️ Error forwarding to Copilot: ${error}`);
            }
        }, 100);
        
        debugChannel.appendLine("🔄 Enhanced prompt processing completed");
        debugChannel.appendLine("============================================");
    });
    
    debugChannel.appendLine("🚀 Enhanced Enter interception is ACTIVE!");
    return [cmd];
}

export function disposeEnterKeyDetection(): void {}
