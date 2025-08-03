import * as vscode from 'vscode';
import { logDebug, logAIActivity } from '../utils/logger';

/**
 * Basic detection methods - command hooks, webview monitoring, panel focus
 */
export function initializeBasicDetection(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel,
    lastDetectedTime: { value: number },
    enableCommandHook: boolean = true, 
    enableWebview: boolean = true, 
    enablePanelFocus: boolean = true
) {
    logDebug(`🎯 Initializing BASIC detection - CommandHook: ${enableCommandHook}, Webview: ${enableWebview}, PanelFocus: ${enablePanelFocus}`);
    
    const disposables: vscode.Disposable[] = [];
    
    // Method 1: Monitor chat panel visibility and focus (if enabled)
    if (enableWebview) {
        const disposable1 = vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (!editor) return;
            
            const uri = editor.document.uri.toString();
            logDebug(`📝 Active editor: ${uri}`);
            
            // Detect Copilot Chat webview panels
            if (uri.includes('webview-panel') && uri.includes('copilot')) {
                logDebug(`🎯 COPILOT CHAT PANEL DETECTED: ${uri}`);
                logAIActivity(`Copilot Chat panel activated: ${uri}`);
                
                logDebug('🚀 BASIC WEBVIEW DETECTION!');
                logAIActivity('AI activity detected via webview panel activation');
                handleAIActivity();
            }
        });
        disposables.push(disposable1);
    }
    
    // Method 2: Monitor panel state changes (if enabled)
    if (enablePanelFocus) {
        const disposable2 = vscode.window.onDidChangeWindowState((state) => {
            if (state.focused) {
                logDebug('🖼️ Window focus changed - checking for chat activity');
                
                // Check if any chat-related commands are available
                vscode.commands.getCommands(true).then(commands => {
                    const activeChatCommands = commands.filter(cmd => 
                        cmd.includes('github.copilot-chat') || 
                        cmd.includes('workbench.panel.chat.view.copilot')
                    );
                    
                    if (activeChatCommands.length > 0) {
                        debugChannel.appendLine(`[DEBUG] 💬 Found ${activeChatCommands.length} active chat commands`);
                    }
                });
            }
        });
        disposables.push(disposable2);
    }
    
    // Method 3: Try command hook (if enabled)
    if (enableCommandHook) {
        try {
            const originalExecuteCommand = vscode.commands.executeCommand;
            
            (vscode.commands as any).executeCommand = async function(command: string, ...args: any[]) {
                const cmd = command.toLowerCase();
                
                // Only log specific commands to reduce noise
                if (cmd.includes('copilot') || cmd.includes('chat')) {
                    debugChannel.appendLine(`[DEBUG] 🔧 COMMAND: ${command}`);
                    
                    // Copilot command detection
                    if (cmd.startsWith('github.copilot') || 
                        cmd.includes('copilot-chat') ||
                        cmd.includes('chat.send') ||
                        cmd === 'workbench.panel.chat.view.copilot.focus') {
                        
                        debugChannel.appendLine(`[DEBUG] 🎯 COPILOT COMMAND: ${command}`);
                        debugChannel.appendLine('[DEBUG] 🚀 COMMAND HOOK DETECTION!');
                        handleAIActivity();
                    }
                }
                
                return originalExecuteCommand.apply(this, [command, ...args]);
            };
            
            debugChannel.appendLine('[DEBUG] ✅ Command hook attempted (may not work in dev host)');
        } catch (error) {
            debugChannel.appendLine(`[DEBUG] ⚠️ Command hook failed: ${error}`);
        }
    }
    
    debugChannel.appendLine('[DEBUG] ✅ Basic detection with selected methods installed');
    debugChannel.appendLine('[DEBUG] 💡 If automatic detection fails, use Ctrl+Shift+P → "SpecStoryAutoSave: Force AI Notification"');
    
    return disposables;
}
